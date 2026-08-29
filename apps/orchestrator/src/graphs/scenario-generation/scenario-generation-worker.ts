// apps/orchestrator/src/graphs/scenario-generation/scenario-generation-worker.ts
//
// MÃªme pattern que discovery-worker.ts (Phase 7) : le worker ne fait
// que brancher le graphe sur la file, toute la logique reste dans
// graph.ts et ses nÅ“uds, testable indÃ©pendamment de BullMQ.

import { createScenarioGenerationWorker, type Job, type ScenarioGenerationJobPayload } from "@platform/queue";
import { logger } from "@platform/logger";
import { buildScenarioGenerationGraph } from "./graph.js";

const graph = buildScenarioGenerationGraph();

const worker = createScenarioGenerationWorker(async (job: Job<ScenarioGenerationJobPayload>) => {
  logger.info({ jobId: job.id, projectId: job.data.projectId }, "job de gÃ©nÃ©ration de scÃ©narios reÃ§u");
  await graph.invoke({ projectId: job.data.projectId });
});

worker.on("failed", (job: Job<ScenarioGenerationJobPayload> | undefined, err: Error) => {
  logger.error({ jobId: job?.id, projectId: job?.data.projectId, err }, "gÃ©nÃ©ration de scÃ©narios Ã©chouÃ©e");
});

worker.on("completed", (job: Job<ScenarioGenerationJobPayload>) => {
  logger.info({ jobId: job.id, projectId: job.data.projectId }, "gÃ©nÃ©ration de scÃ©narios terminÃ©e");
});

logger.info("worker de gÃ©nÃ©ration de scÃ©narios dÃ©marrÃ©, en attente de jobs");

