// apps/orchestrator/src/graphs/failure-analysis/nodes/persist.ts

import { prisma } from "@platform/database";
import type { FailureAnalysisStateType } from "../state.js";
import { logger } from "@platform/logger";

export async function persistAnalysis(state: FailureAnalysisStateType) {
  if (!state.analysis) {
    throw new Error("Impossible de persister l'analyse : résultat vide.");
  }

  // Create or update FailureAnalysis record
  const failureAnalysis = await prisma.failureAnalysis.upsert({
    where: { executionId: state.executionId },
    update: {
      classification: state.analysis.classification as any,
      rootCause: state.analysis.rootCause,
      severity: state.analysis.severity as any,
      confidence: state.analysis.confidence,
      suggestedFix: state.analysis.suggestedFix,
      analysisModel: "gpt-4o",
    },
    create: {
      executionId: state.executionId,
      classification: state.analysis.classification as any,
      rootCause: state.analysis.rootCause,
      severity: state.analysis.severity as any,
      confidence: state.analysis.confidence,
      suggestedFix: state.analysis.suggestedFix,
      analysisModel: "gpt-4o",
    },
  });

  logger.info(
    { executionId: state.executionId, classification: failureAnalysis.classification },
    "Analyse d'échec persistée avec succès."
  );

  return { analysis: state.analysis };
}
