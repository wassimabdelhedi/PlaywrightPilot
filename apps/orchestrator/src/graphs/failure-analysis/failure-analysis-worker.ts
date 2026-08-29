import { createFailureAnalysisWorker, type Job, type FailureAnalysisJobPayload } from "@platform/queue";
import { logger } from "@platform/logger";
import { failureAnalysisGraph } from "./index.js";

logger.info({ service: "orchestrator" }, "worker d'analyse d'échecs démarré, en attente de jobs");

createFailureAnalysisWorker(async (job: Job<FailureAnalysisJobPayload>) => {
  const { executionId } = job.data;
  logger.info({ jobId: job.id, executionId }, "job d'analyse d'échec reçu");

  try {
    const result = await failureAnalysisGraph.invoke({ executionId });
    logger.info(
      { jobId: job.id, executionId, classification: result.analysis?.classification },
      "analyse d'échec terminée"
    );
  } catch (err: any) {
    logger.error({ jobId: job.id, executionId, err }, "analyse d'échec échouée");
    throw err;
  }
});
