// apps/executor/src/execution/execution-orchestrator.ts

import { rm } from "node:fs/promises";
import { prisma } from "@platform/database";
import { logger } from "@platform/logger";
import { createWorkspace } from "./workspace.js";
import { runTestProcess } from "./process-runner.js";
import { collectArtifacts } from "./artifact-collector.js";
import { recordOutcomesForExecution } from "./selector-outcomes.js";
import { createFailureAnalysisQueue } from "@platform/queue";

const OUTCOME_TO_STATUS = {
  passed: "PASSED",
  failed: "FAILED",
  timeout: "TIMEOUT",
} as const;

export async function runExecution(executionId: string): Promise<void> {
  const execution = await prisma.execution.findUniqueOrThrow({
    where: { id: executionId },
    include: { testCase: { include: { scenario: { include: { project: true } } } } },
  });

  const { testCase } = execution;
  const projectId = testCase.scenario.projectId;

  await prisma.execution.update({
    where: { id: executionId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const startedAt = Date.now();
  const workspace = await createWorkspace(executionId, testCase.sourceCode);

  try {
    let result: any;
    let artifacts: any[] = [];
    
    result = await runTestProcess(workspace, executionId);
    artifacts = await collectArtifacts(workspace.resultsDir, executionId);
    
    const success = result.outcome === "passed";

    await prisma.$transaction([
      prisma.execution.update({
        where: { id: executionId },
        data: {
          status: OUTCOME_TO_STATUS[result.outcome as keyof typeof OUTCOME_TO_STATUS],
          completedAt: new Date(),
          durationMs: Date.now() - startedAt,
          errorMessage: result.errorMessage,
        },
      }),
      prisma.executionArtifact.createMany({
        data: artifacts.map((a: { kind: string; storageUrl: string; sizeBytes: number }) => ({
          executionId,
          type: a.kind.toUpperCase() as "SCREENSHOT" | "VIDEO" | "TRACE",
          storageUrl: a.storageUrl,
          sizeBytes: a.sizeBytes,
        })),
      }),
      // ACTIVE n'est atteint que par une exécution réussie — jamais
      // par la validation statique de la Phase 11 seule.
      ...(success && testCase.status !== "ACTIVE"
        ? [prisma.testCase.update({ where: { id: testCase.id }, data: { status: "ACTIVE" as const } })]
        : []),
    ]);

    await recordOutcomesForExecution(projectId, testCase.sourceCode, success);

    logger.info({ executionId, outcome: result.outcome, artifacts: artifacts.length }, "exécution terminée");

    // Phase 13: Déclencher l'analyse IA si échec ou timeout
    if (result.outcome === "failed" || result.outcome === "timeout") {
      const failureQueue = createFailureAnalysisQueue();
      await failureQueue.add("analyze", { executionId });
      logger.info({ executionId }, "Job d'analyse d'échec envoyé");
      await failureQueue.close();
    }
  } catch (err) {
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        durationMs: Date.now() - startedAt,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  } finally {
    await rm(workspace.dir, { recursive: true, force: true });
  }
}
