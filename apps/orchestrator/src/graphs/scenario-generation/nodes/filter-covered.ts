// apps/orchestrator/src/graphs/scenario-generation/nodes/filter-covered.ts
//
// Idempotence fiable : une fonctionnalité est considérée "déjà couverte"
// si au moins un scénario portant son featureMemoryId existe en base avec
// le statut DRAFT ou APPROVED.
// Cette clé (featureMemoryId) est stockée à la création et ne change
// jamais — contrairement au titre qui peut être reformulé par le LLM à
// chaque exécution.

import { prisma } from "@platform/database";
import { logger } from "@platform/logger";
import type { ScenarioGenerationStateType, FeatureRecord } from "../state.js";

export async function filterCovered(state: ScenarioGenerationStateType) {
  // Récupérer tous les featureMemoryId déjà couverts pour ce projet
  const coveredScenarios = await prisma.scenario.findMany({
    where: {
      projectId: state.projectId,
      status: { in: ["DRAFT", "APPROVED"] },
      featureMemoryId: { not: null },
    },
    select: { featureMemoryId: true },
  });

  // Construire un Set des memoryIds déjà couverts
  const coveredMemoryIds = new Set(
    coveredScenarios.map((s) => s.featureMemoryId).filter(Boolean) as string[]
  );

  // Filtrer les fonctionnalités qui n'ont PAS encore de scénario
  const uncovered = state.features.filter(
    (feature: FeatureRecord) => !coveredMemoryIds.has(feature.memoryId)
  );

  logger.info(
    {
      projectId: state.projectId,
      total: state.features.length,
      alreadyCovered: state.features.length - uncovered.length,
      toGenerate: uncovered.length,
    },
    "filtrage des fonctionnalités par featureMemoryId"
  );

  return { features: uncovered };
}
