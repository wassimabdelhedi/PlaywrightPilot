import { prisma } from "@platform/database";
import { runDiscovery } from "../discovery/crawl-orchestrator.js";
import { logger } from "@platform/logger";

async function main() {
  logger.info("Démarrage du test de la Phase 6 & 7 (Crawl & Playwright)...");

  // 1. On nettoie ou prépare l'organisation et le projet
  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
    },
  });

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: "Finlogick Test 1 ",
      baseUrl: "https://www.saucedemo.com",
      maxCrawlDepth: 3, // Augmenté à 3 pour tester le crawl sur plusieurs pages
    },
  });

  logger.info(`Projet créé : ${project.name} (${project.baseUrl})`);

  // 2. On crée l'enregistrement de découverte
  const discovery = await prisma.discovery.create({
    data: {
      projectId: project.id,
      maxDepth: project.maxCrawlDepth,
      status: "PENDING",
    },
  });

  logger.info(`Lancement de runDiscovery pour ID: ${discovery.id}...`);

  // 3. On appelle runDiscovery directement (contourne BullMQ/Redis)
  try {
    await runDiscovery({
      discoveryId: discovery.id,
      projectId: project.id,
      baseUrl: project.baseUrl,
      maxDepth: project.maxCrawlDepth,
      denylistPaths: project.denylistPaths,
    });
    
    logger.info("runDiscovery terminé avec succès.");
  } catch (error) {
    logger.error({ error }, "Erreur lors du crawl.");
  }

  // 4. On affiche les résultats stockés en base
  const pages = await prisma.page.findMany({
    where: { discoveryId: discovery.id },
    include: {
      elements: true,
    },
  });

  logger.info("=================================================");
  logger.info(`Résultats du Crawl : ${pages.length} pages visitées`);
  logger.info("=================================================");

  for (const page of pages) {
    logger.info(`- Page [Profondeur ${page.depth}] : ${page.title} (${page.url})`);
    logger.info(`  -> ${page.elements.length} éléments DOM capturés.`);
    
    // On affiche quelques éléments pour vérifier la classification (Phase 7)
    const links = page.elements.filter(e => e.type === "LINK");
    const buttons = page.elements.filter(e => e.type === "BUTTON");
    const inputs = page.elements.filter(e => e.type === "INPUT");
    
    logger.info(`     (Liens: ${links.length}, Boutons: ${buttons.length}, Inputs: ${inputs.length})`);
    
    if (page.screenshotUrl) {
      logger.info(`  -> Screenshot sauvegardé: ${page.screenshotUrl}`);
    }
  }

  logger.info("=================================================");
  logger.info("Fin du test.");
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
