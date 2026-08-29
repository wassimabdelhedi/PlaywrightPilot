// apps/orchestrator/src/graphs/scenario-generation/state.ts

import { Annotation } from "@langchain/langgraph";
import type { ScenarioCandidate } from "./schema.js";

export interface FeatureRecord {
  memoryId: string;
  name: string;
  description: string;
  relatedPageUrls: string[];
  confidence: number;
}

export interface ScenarioDraft {
  feature: FeatureRecord;
  candidate: ScenarioCandidate;
}

export const ScenarioGenerationState = Annotation.Root({
  projectId: Annotation<string>(),
  features: Annotation<FeatureRecord[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  drafts: Annotation<ScenarioDraft[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
});

export type ScenarioGenerationStateType = typeof ScenarioGenerationState.State;
