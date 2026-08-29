// apps/orchestrator/src/graphs/report-generation/state.ts
import { Annotation } from "@langchain/langgraph";
import type { Prisma } from "@platform/database";

// Define the shape of our stats so we can share it with stats-calculator
export interface ReportStats {
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  successRate: number;
  topFailingTests: {
    testId: string;
    scenarioTitle: string;
    failures: number;
  }[];
  failureClassifications: Record<string, number>;
}

export const ReportGenerationState = Annotation.Root({
  projectId: Annotation<string>(),
  attempt: Annotation<number>({ reducer: (_p, n) => n, default: () => 0 }),
  
  // Data loaded from DB
  executions: Annotation<any[]>({ reducer: (_p, n) => n, default: () => [] }),
  
  // Calculated stats (pure numbers)
  stats: Annotation<ReportStats | null>({ reducer: (_p, n) => n, default: () => null }),
  
  // Qualitative translation for the LLM (no numbers)
  qualitativeStats: Annotation<string>({ reducer: (_p, n) => n, default: () => "" }),
  
  // Resulting narrative from LLM
  narrativeSummary: Annotation<string>({ reducer: (_p, n) => n, default: () => "" }),
  
  // Final saved report ID
  reportId: Annotation<string>({ reducer: (_p, n) => n, default: () => "" }),
});

export type ReportGenerationStateType = typeof ReportGenerationState.State;
