// apps/orchestrator/src/graphs/feature-understanding/nodes/persist-features.ts
//
// Écrit UNE entrée AgentMemory par fonctionnalité détectée, avec
// category: FEATURE_MAP — le type prévu à cet effet dans le schéma de
// la Phase 2. Une entrée par fonctionnalité (plutôt qu'un unique blob
// JSON contenant toute la carte) permet à la Phase 10 de sélectionner
// des fonctionnalités individuellement pour la génération de
// scénarios, et à la Phase 9 de les indexer séparément.

import { prisma } from "@platform/database";
import { logger } from "@platform/logger";
import type { FeatureCandidate } from "../schema.js";
import type { FeatureUnderstandingStateType } from "../state.js";

export async function persistFeatures(state: FeatureUnderstandingStateType) {
  if (state.mergedFeatures.length === 0) {
    logger.info({ discoveryId: state.discoveryId }, "Aucune feature à persister");
    return {};
  }

  // On sauvegarde chaque feature détectée comme un AgentMemory
  for (const feature of state.mergedFeatures as FeatureCandidate[]) {
    await prisma.agentMemory.create({
      data: {
        projectId: state.projectId,
        category: "FEATURE_MAP",
        content: {
          name: feature.name,
          description: feature.description,
          relatedPageUrls: feature.relatedPageUrls,
          confidence: feature.confidence,
          discoveryId: state.discoveryId,
        },
      },
    });
  }

  logger.info(
    { discoveryId: state.discoveryId, count: state.mergedFeatures.length },
    "carte de fonctionnalités persistée dans AgentMemory"
  );

  return {};
}
