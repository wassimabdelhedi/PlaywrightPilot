// apps/orchestrator/src/graphs/scenario-generation/nodes/persist-scenarios.ts
//
// Upsert fiable par clé composite (featureMemoryId + scenarioType).
// Cette clé est stable entre deux exécutions : même si le LLM reformule
// le titre ("Nominal Scenario" vs "Nominal Path"), la combinaison
// featureMemoryId + scenarioType identifie toujours le même slot de test.
//
// Priorité de déduplication :
//   1. (featureMemoryId, scenarioType) → mise à jour du scénario existant
//   2. Sinon → création d'un nouveau scénario
//
// Statut : toujours DRAFT après une régénération (re-validation humaine requise).

import { prisma } from "@platform/database";
import { logger } from "@platform/logger";
import type { ScenarioDraft, ScenarioGenerationStateType } from "../state.js";

export async function persistScenarios(state: ScenarioGenerationStateType) {
  if (state.drafts.length === 0) {
    logger.warn({ projectId: state.projectId }, "aucun scénario généré pour ce projet");
    return {};
  }

  // Récupérer les scénarios existants (tous statuts) pour ce projet
  const existingScenarios = await prisma.scenario.findMany({
    where: { projectId: state.projectId },
    select: { id: true, title: true, featureMemoryId: true, scenarioType: true },
  });

  let createdCount = 0;
  let updatedCount = 0;

  for (const { feature, candidate } of state.drafts) {
    // Clé de déduplication fiable : featureMemoryId + scenarioType
    const existing = existingScenarios.find(
      (s) =>
        s.featureMemoryId === feature.memoryId &&
        s.scenarioType === (candidate.scenarioType ?? null)
    );

    if (existing) {
      // Mise à jour du slot existant — le titre peut changer sans créer de doublon
      await prisma.scenario.update({
        where: { id: existing.id },
        data: {
          title: candidate.title,
          description: candidate.description,
          businessGoal: candidate.businessGoal,
          priority: candidate.priority,
          scenarioType: candidate.scenarioType ?? null,
          featureMemoryId: feature.memoryId,
          // Repasse en DRAFT pour forcer une re-validation humaine
          status: "DRAFT",
        },
      });
      updatedCount++;
      logger.info(
        { title: candidate.title, scenarioType: candidate.scenarioType, featureMemoryId: feature.memoryId },
        "scénario mis à jour (upsert par featureMemoryId + scenarioType)"
      );
    } else {
      // Création d'un nouveau slot
      await prisma.scenario.create({
        data: {
          projectId: state.projectId,
          title: candidate.title,
          description: candidate.description,
          businessGoal: candidate.businessGoal,
          priority: candidate.priority,
          scenarioType: candidate.scenarioType ?? null,
          featureMemoryId: feature.memoryId,
          status: "DRAFT",
        },
      });
      createdCount++;
    }
  }

  logger.info(
    { projectId: state.projectId, created: createdCount, updated: updatedCount },
    "scénarios persistés sans doublon (upsert par featureMemoryId + scenarioType)"
  );

  return {};
}
