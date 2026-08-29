// apps/executor/src/execution/execution-worker.ts

import { createExecutionWorker, type Job, type ExecutionJobPayload } from "@platform/queue";
import { logger } from "@platform/logger";
import { runExecution } from "./execution-orchestrator.js";

const worker = createExecutionWorker(async (job) => {
  logger.info({ jobId: job.id, executionId: job.data.executionId }, "job d'exécution reçu");
  await runExecution(job.data.executionId);
});

worker.on("failed", (job: Job<ExecutionJobPayload> | undefined, err: Error) => {
  logger.error({ jobId: job?.id, executionId: job?.data.executionId, err }, "job d'exécution échoué");
});

worker.on("completed", (job: Job<ExecutionJobPayload>) => {
  logger.info({ jobId: job.id, executionId: job.data.executionId }, "job d'exécution terminé");
});

logger.info("worker d'exécution démarré, en attente de jobs");
