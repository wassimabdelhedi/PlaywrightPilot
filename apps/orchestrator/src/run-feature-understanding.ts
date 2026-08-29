// apps/orchestrator/src/run-feature-understanding.ts
//
// Exécution manuelle : pnpm --filter @platform/orchestrator exec tsx
// src/run-feature-understanding.ts <discoveryId> <projectId>
//
// La Phase 9 remplacera cet entry point manuel par un worker BullMQ
// (même pattern que discovery-worker.ts en Phase 7), déclenché
// automatiquement à la complétion d'une Discovery.

import { prisma } from "@platform/database";
import { logger } from "@platform/logger";
import { buildFeatureUnderstandingGraph } from "./graphs/feature-understanding/graph.js";

async function main() {
  const [discoveryId] = process.argv.slice(2);
  if (!discoveryId) {
    throw new Error("Usage : tsx run-feature-understanding.ts <discoveryId>");
  }

  const discovery = await prisma.discovery.findUniqueOrThrow({
    where: { id: discoveryId },
    select: { projectId: true },
  });

  const graph = buildFeatureUnderstandingGraph();

  const finalState = await graph.invoke({
    discoveryId,
    projectId: discovery.projectId,
  });

  logger.info(
    { discoveryId, featuresDetected: finalState.mergedFeatures.length },
    "analyse de fonctionnalités terminée"
  );

  for (const feature of finalState.mergedFeatures) {
    console.log(`- ${feature.name} (confiance ${feature.confidence.toFixed(2)}) : ${feature.relatedPageUrls.length} page(s)`);
  }
}

main()
  .catch((err) => {
    logger.error({ err }, "échec de l'analyse de fonctionnalités");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
