// apps/orchestrator/src/graphs/failure-analysis/nodes/load-context.ts

import { prisma } from "@platform/database";
import type { FailureAnalysisStateType } from "../state.js";

export async function loadContext(state: FailureAnalysisStateType) {
  const execution = await prisma.execution.findUnique({
    where: { id: state.executionId },
    include: {
      artifacts: true,
      testCase: {
        include: {
          scenario: true,
        },
      },
    },
  });

  if (!execution) {
    throw new Error(`Execution ${state.executionId} introuvable`);
  }

  // Load relevant artifacts
  const logs = execution.artifacts.find((a) => a.type === "LOG")?.storageUrl;
  const screenshot = execution.artifacts.find((a) => a.type === "SCREENSHOT")?.storageUrl;
  const trace = execution.artifacts.find((a) => a.type === "TRACE")?.storageUrl; // Can be a summary later

  // Load historical memory for this project (selector reliability)
  const memories = await prisma.agentMemory.findMany({
    where: {
      projectId: execution.testCase.scenario.projectId,
      category: "SELECTOR_RELIABILITY",
    },
    take: 50,
  });

  const selectorReliabilityHistory = memories.length > 0
    ? JSON.stringify({ knownFailures: memories.map(m => m.content) }, null, 2)
    : "No known historical failures.";

  // TODO: For a real system, we'd download the storageUrl contents if they are S3 links,
  // but for the sake of the LLM context, we assume they are either inline text (logs) or 
  // accessible public URLs for vision models, or we just pass the error message.
  
  return {
    errorMessage: execution.errorMessage || "Aucune erreur enregistrée.",
    executionLogs: logs || "Logs indisponibles.",
    screenshotUrl: screenshot || "Screenshot indisponible.",
    traceSummary: trace || "Trace indisponible.",
    selectorReliabilityHistory,
  };
}
