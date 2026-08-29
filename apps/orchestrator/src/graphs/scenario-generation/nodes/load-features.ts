// apps/orchestrator/src/graphs/scenario-generation/nodes/load-features.ts

import { listMemoriesByCategory } from "@platform/agent-memory";
import type { ScenarioGenerationStateType, FeatureRecord } from "../state.js";

export async function loadFeatures(state: ScenarioGenerationStateType) {
  const memories = await listMemoriesByCategory(state.projectId, "FEATURE_MAP");

  const features: FeatureRecord[] = memories.map((memory) => {
    const content = memory.content as Record<string, unknown>;
    return {
      memoryId: memory.id,
      name: String(content.name ?? "Fonctionnalité sans nom"),
      description: String(content.description ?? ""),
      relatedPageUrls: Array.isArray(content.relatedPageUrls) ? (content.relatedPageUrls as string[]) : [],
      confidence: typeof content.confidence === "number" ? content.confidence : 0,
    };
  });

  if (features.length === 0) {
    throw new Error(
      `Aucune fonctionnalité connue pour le projet ${state.projectId} — lancez d'abord une découverte (Phase 7) et une analyse (Phase 8)`
    );
  }

  return { features };
}
