// apps/orchestrator/src/graphs/feature-understanding/feature-understanding-worker.ts

import { createFeatureUnderstandingWorker, type Job, type FeatureUnderstandingJobPayload } from "@platform/queue";
import { logger } from "@platform/logger";
import { buildFeatureUnderstandingGraph } from "./graph.js";

const worker = createFeatureUnderstandingWorker(async (job) => {
  logger.info({ jobId: job.id, discoveryId: job.data.discoveryId }, "job feature-understanding reÃ§u");
  
  const graph = buildFeatureUnderstandingGraph();
  const finalState = await graph.invoke({
    discoveryId: job.data.discoveryId,
    projectId: job.data.projectId,
  });

  logger.info(
    { discoveryId: job.data.discoveryId, featuresDetected: finalState.mergedFeatures.length },
    "analyse de fonctionnalitÃ©s terminÃ©e"
  );
});

worker.on("failed", (job: Job<FeatureUnderstandingJobPayload> | undefined, err: Error) => {
  logger.error({ jobId: job?.id, discoveryId: job?.data.discoveryId, err }, "job feature-understanding Ã©chouÃ©");
});

worker.on("completed", (job: Job<FeatureUnderstandingJobPayload>) => {
  logger.info({ jobId: job.id, discoveryId: job.data.discoveryId }, "job feature-understanding terminÃ© avec succÃ¨s");
});

logger.info("worker feature-understanding dÃ©marrÃ©");

