// apps/orchestrator/src/graphs/test-generation/state.ts

import { Annotation } from "@langchain/langgraph";
import type { TestPlan } from "./step-schema.js";
import type { ScenarioType } from "./scenario-type-detector.js";

export const TestGenerationState = Annotation.Root({
  scenarioId: Annotation<string>(),
  projectId: Annotation<string>(),
  scenarioTitle: Annotation<string>(),
  scenarioDescription: Annotation<string>(),
  scenarioType: Annotation<ScenarioType>({ reducer: (_p, n) => n, default: () => "POSITIVE" }),
  allowedSelectors: Annotation<string[]>({ reducer: (_p, n) => n, default: () => [] }),
  availableElements: Annotation<string>({ reducer: (_p, n) => n, default: () => "" }),
  availablePages: Annotation<string>({ reducer: (_p, n) => n, default: () => "" }),
  allElements: Annotation<any[]>({ reducer: (_p, n) => n, default: () => [] }),
  knownFailures: Annotation<string>({ reducer: (_p, n) => n, default: () => "" }),
  agentMemory: Annotation<string>({ reducer: (_p, n) => n, default: () => "" }),
  allowedUrls: Annotation<string[]>({ reducer: (_p, n) => n, default: () => [] }),
  attempt: Annotation<number>({ reducer: (_p, n) => n, default: () => 0 }),
  feedback: Annotation<string | null>({ reducer: (_p, n) => n, default: () => null }),
  plan: Annotation<TestPlan | null>({ reducer: (_p, n) => n, default: () => null }),
  validationErrors: Annotation<string[]>({ reducer: (_p, n) => n, default: () => [] }),
  sourceCode: Annotation<string | null>({ reducer: (_p, n) => n, default: () => null }),
});

export type TestGenerationStateType = typeof TestGenerationState.State;

