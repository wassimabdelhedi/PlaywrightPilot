// apps/executor/src/discovery/crawl-orchestrator.ts
//
// Boucle BFS bornée par DEUX limites indépendantes (profondeur ET
// nombre total de pages), avec dédoublonnage par URL visitée. Un seul
// BrowserContext est réutilisé pour tout le crawl — les pages d'un
// même site partagent légitimement leurs cookies de session (Phase 8
// pourra plus tard authentifier ce contexte avant l'exploration de
// pages protégées).

import { prisma } from "@platform/database";
import { config } from "@platform/config";
import { logger } from "@platform/logger";
import { assertSafeUrl, UnsafeUrlError } from "../browser/url-guard.js";
import { createIsolatedContext, releaseContext } from "../browser/browser-manager.js";
import { saveArtifact } from "../artifacts/artifact-storage.js";
import { classifyPageElements } from "./element-classifier.js";
import { extractSameOriginLinks } from "./link-extractor.js";
import { createFeatureUnderstandingQueue, type DiscoveryJobPayload } from "@platform/queue";

const featureQueue = createFeatureUnderstandingQueue();

interface QueueItem {
  url: string;
  depth: number;
}

export async function runDiscovery(payload: DiscoveryJobPayload): Promise<void> {
  const { discoveryId, baseUrl, maxDepth, denylistPaths } = payload;
  const origin = new URL(baseUrl).origin;

  await prisma.discovery.update({
    where: { id: discoveryId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const visited = new Set<string>();
  const queue: QueueItem[] = [{ url: baseUrl, depth: 0 }];
  let pagesProcessed = 0;

  const context = await createIsolatedContext();

  // --- Auto-Login Heuristique ---
  const project = await prisma.project.findFirst({
    where: { discoveries: { some: { id: discoveryId } } }
  });

  if (project?.authLoginUrl && project?.authUsername && project?.authPassword) {
    logger.info({ discoveryId, loginUrl: project.authLoginUrl }, "Tentative de connexion heuristique avant le crawl");
    try {
      const loginPage = await context.newPage();
      await loginPage.goto(project.authLoginUrl, { waitUntil: "load" });
      
      await loginPage.fill('input[type="email"], input[name="username"], input[name="email"], input[id*="email"], input[id*="username"]', project.authUsername);
      await loginPage.fill('input[type="password"], input[name="password"], input[id*="password"]', project.authPassword);
      
      await Promise.all([
        loginPage.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => {}),
        loginPage.click('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Se connecter"), input[type="submit"]')
      ]);
      
      await loginPage.waitForLoadState("networkidle");
      await loginPage.close();
      logger.info({ discoveryId }, "Connexion reussie, le contexte est authentifie");
    } catch (error) {
      logger.error({ discoveryId, error }, "Echec de l'authentification heuristique");
    }
  }

  let isCancelled = false;

  try {
    while (queue.length > 0) {
      // Vérifier si le crawl a été annulé depuis l'interface
      const currentStatus = await prisma.discovery.findUnique({
        where: { id: discoveryId },
        select: { status: true }
      });
      if (currentStatus?.status === "CANCELLED") {
        logger.info({ discoveryId }, "Crawl annulé par l'utilisateur, interruption de la boucle");
        isCancelled = true;
        break;
      }
      if (pagesProcessed >= config.MAX_DISCOVERY_PAGES) {
        logger.info({ discoveryId, pagesProcessed }, "budget MAX_DISCOVERY_PAGES atteint, arrêt du crawl");
        break;
      }

      const item = queue.shift();
      if (!item || visited.has(item.url)) continue;
      visited.add(item.url);

      // Garde SSRF réappliquée à CHAQUE lien suivi, pas seulement à
      // l'URL de départ — un lien découvert peut pointer en interne.
      try {
        await assertSafeUrl(item.url);
      } catch (err: unknown) {
        if (err instanceof UnsafeUrlError) {
          logger.warn({ discoveryId, url: item.url, reason: err.message }, "lien ignoré par la garde SSRF");
        } else {
          logger.warn({ discoveryId, url: item.url, err }, "échec de la vérification de l'URL, lien ignoré");
        }
        continue;
      }

      const page = await context.newPage();

      try {
        await page.goto(item.url, {
          waitUntil: "load",
          timeout: config.DISCOVERY_PAGE_TIMEOUT_MS,
        });
        
        // Laissons le temps aux frameworks SPA (React/Angular) de s'hydrater et de rendre le DOM
        await page.waitForTimeout(3000);

        const title = await page.title();
        const screenshotBuffer = await page.screenshot({ fullPage: false });
        const screenshotUrl = await saveArtifact(discoveryId, "screenshot", `${pagesProcessed}.png`, screenshotBuffer);

        const pageRecord = await prisma.page.create({
          data: {
            discoveryId,
            url: item.url,
            title,
            depth: item.depth,
            screenshotUrl,
          },
        });

        const elements = await classifyPageElements(page);
        if (elements.length > 0) {
          await prisma.domElement.createMany({
            data: elements.map((el: import("./element-classifier.js").ClassifiedElement) => ({
              pageId: pageRecord.id,
              type: el.type,
              selectors: el.selectors,
              tag: el.tag,
              text: el.text,
              attributes: el.attributes,
              isVisible: el.isVisible,
            })),
          });
        }

        pagesProcessed += 1;
        logger.info({ discoveryId, url: item.url, depth: item.depth, elements: elements.length }, "page cataloguée");

        // On ne suit les liens que si la profondeur maximale n'est pas
        // encore atteinte — évite de récupérer des liens qu'on
        // n'explorera de toute façon jamais.
        if (item.depth < maxDepth) {
          const links = await extractSameOriginLinks(page, origin, denylistPaths);
          for (const link of links) {
            if (!visited.has(link)) {
              queue.push({ url: link, depth: item.depth + 1 });
            }
          }
        }
      } catch (err) {
        logger.warn({ discoveryId, url: item.url, err }, "échec du chargement d'une page, poursuite du crawl");
      } finally {
        await page.close();
      }
    }

    if (!isCancelled) {
      if (pagesProcessed === 0) {
        await prisma.discovery.update({
          where: { id: discoveryId },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            errorMessage: `Aucune page n'a pu être chargée à partir de ${baseUrl}. Vérifiez que l'URL est accessible et que le site est en ligne.`,
          },
        });
        logger.error({ discoveryId, baseUrl }, "Crawl terminé sans aucune page — discovery marquée FAILED");
      } else {
        await prisma.discovery.update({
          where: { id: discoveryId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });

        // Déclenche l'analyse des fonctionnalités (Phase 8) automatiquement
        logger.info({ discoveryId, projectId: payload.projectId, pagesProcessed }, "Crawl terminé, ajout à la file Feature Understanding");
        await featureQueue.add("analyze", { discoveryId, projectId: payload.projectId });
      }
    }
  } catch (err) {
    await prisma.discovery.update({
      where: { id: discoveryId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  } finally {
    await releaseContext(context);
  }
}
