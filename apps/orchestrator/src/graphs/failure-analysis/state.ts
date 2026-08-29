// apps/orchestrator/src/graphs/failure-analysis/state.ts

import { Annotation } from "@langchain/langgraph";

export type FailureClassificationType = "SITE_DEFECT" | "STALE_TEST" | "FLAKY_ENVIRONMENT" | "UNKNOWN";
export type SeverityType = "BLOCKER" | "CRITICAL" | "MAJOR" | "MINOR" | "INFO";

export interface AnalysisResult {
  classification: FailureClassificationType;
  rootCause: string;
  severity: SeverityType;
  confidence: number;
  suggestedFix?: string;
}

export const FailureAnalysisState = Annotation.Root({
  executionId: Annotation<string>(),
  
  // Contexte récupéré (artefacts)
  errorMessage: Annotation<string | null>({ reducer: (_p, n) => n, default: () => null }),
  executionLogs: Annotation<string | null>({ reducer: (_p, n) => n, default: () => null }),
  screenshotUrl: Annotation<string | null>({ reducer: (_p, n) => n, default: () => null }),
  traceSummary: Annotation<string | null>({ reducer: (_p, n) => n, default: () => null }),
  selectorReliabilityHistory: Annotation<string | null>({ reducer: (_p, n) => n, default: () => null }),

  // Résultat de l'analyse
  analysis: Annotation<AnalysisResult | null>({ reducer: (_p, n) => n, default: () => null }),
});

export type FailureAnalysisStateType = typeof FailureAnalysisState.State;
