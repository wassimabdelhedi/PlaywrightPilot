// apps/orchestrator/src/graphs/failure-analysis/schema.ts

import { z } from "zod";

export const failureAnalysisSchema = z.object({
  classification: z.enum(["SITE_DEFECT", "STALE_TEST", "FLAKY_ENVIRONMENT"]).describe("The category of the failure"),
  rootCause: z.string().describe("Detailed explanation of why the test failed"),
  severity: z.enum(["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"]).describe("Impact severity of this failure"),
  confidence: z.number().min(0).max(1).describe("Confidence score (0.0 to 1.0) of the classification and root cause"),
  suggestedFix: z.string().nullable().optional().describe("Actionable suggestion to fix the failure (code change, selector update, or infrastructure tweak)"),
});

