// apps/executor/src/examples/run-saucedemo-full-pipeline.ts
//
// Pipeline complet Phase 7 + Phase 8 pour le site https://www.saucedemo.com
// Lance le crawl, attend sa completion, puis lance l'analyse IA des fonctionnalités.
//
// Usage : pnpm --filter @platform/executor exec tsx --env-file=../../apps/api/.env src/examples/run-saucedemo-full-pipeline.ts

import { prisma } from "@platform/database";
import { runDiscovery } from "../discovery/crawl-orchestrator.js";
import { logger } from "@platform/logger";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../../..");

async function main() {
  logger.info("========================================================");
  logger.info("  PIPELINE COMPLET : SauceDemo Phase 7 (Crawl) + Phase 8 (IA)");
  logger.info("========================================================");

  // ─── Phase 7 : Crawl de saucedemo.com ─────────────────────────────────────

  // On réutilise ou crée l'organisation "demo-org"
  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: { name: "Demo Organization", slug: "demo-org" },
  });

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: `SauceDemo - ${new Date().toISOString()}`,
      baseUrl: "https://example.cypress.io",
      maxCrawlDepth: 3,
    },
  });

  logger.info(`✅ Projet créé : ${project.name} (${project.baseUrl})`);

  const discovery = await prisma.discovery.create({
    data: { projectId: project.id, maxDepth: project.maxCrawlDepth, status: "PENDING" },
  });

  logger.info(`🕷️  Lancement du crawl (discoveryId: ${discovery.id})...`);

  try {
    await runDiscovery({
      discoveryId: discovery.id,
      projectId: project.id,
      baseUrl: project.baseUrl,
      maxDepth: project.maxCrawlDepth,
      denylistPaths: project.denylistPaths,
    });
    logger.info("✅ Crawl terminé avec succès.");
  } catch (error) {
    logger.error({ error }, "❌ Erreur lors du crawl.");
    process.exit(1);
  }

  // ─── Résumé du crawl ───────────────────────────────────────────────────────

  const pages = await prisma.page.findMany({
    where: { discoveryId: discovery.id },
    include: { elements: true },
  });

  logger.info("─────────────────────────────────────────");
  logger.info(`📄 ${pages.length} pages crawlées sur saucedemo.com`);
  for (const page of pages) {
    const buttons = page.elements.filter(e => e.type === "BUTTON").length;
    const inputs  = page.elements.filter(e => e.type === "INPUT").length;
    const links   = page.elements.filter(e => e.type === "LINK").length;
    logger.info(`  → [${page.depth}] ${page.url}  (${buttons} boutons, ${inputs} inputs, ${links} liens)`);
  }

  // ─── Phase 8 : Analyse IA des fonctionnalités ─────────────────────────────

  logger.info("─────────────────────────────────────────");
  logger.info(`🤖 Lancement de l'analyse IA (Phase 8) pour discoveryId: ${discovery.id}...`);

  const orchestratorScript = path.join(ROOT, "apps/orchestrator/src/run-feature-understanding.ts");

  execFileSync(
    "pnpm",
    ["exec", "tsx", orchestratorScript, discovery.id],
    {
      cwd: path.join(ROOT, "apps/orchestrator"),
      stdio: "inherit",
      env: process.env, // propage les variables d'environnement (OLLAMA_BASE_URL, etc.)
    }
  );

  logger.info("========================================================");
  logger.info("  PIPELINE TERMINÉ ! Les fonctionnalités sont en base.");
  logger.info(`  Projet ID   : ${project.id}`);
  logger.info(`  Discovery ID: ${discovery.id}`);
  logger.info("========================================================");
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
});
