// apps/orchestrator/src/workers/report-worker.ts
import { createReportGenerationWorker, type Job, type ReportGenerationJobPayload } from "@platform/queue";
import { logger } from "@platform/logger";
import { ReportGenerationGraph } from "../graphs/report-generation/graph.js";

export const reportWorker = createReportGenerationWorker(
  async (job: Job<ReportGenerationJobPayload>) => {
    logger.info({ jobId: job.id, projectId: job.data.projectId }, "[Report Worker] Démarrage génération rapport");

    try {
      const result = await ReportGenerationGraph.invoke(
        { projectId: job.data.projectId },
        { recursionLimit: 10 }
      );

      logger.info(
        { jobId: job.id, reportId: result.reportId },
        "[Report Worker] Rapport généré avec succès"
      );
    } catch (error) {
      logger.error({ jobId: job.id, error }, "[Report Worker] Échec de la génération");
      throw error;
    }
  }
);

reportWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "[Report Worker] Job BullMQ échoué");
});
