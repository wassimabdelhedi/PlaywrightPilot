// apps/executor/src/discovery/discovery-worker.ts
//
// Point d'entrée du processus worker de apps/executor. Se contente de
// brancher runDiscovery sur la file BullMQ — toute la logique métier
// reste dans crawl-orchestrator.ts, testable indépendamment de
// l'infrastructure de file.

import { createDiscoveryWorker, type Job, type DiscoveryJobPayload } from "@platform/queue";
import { logger } from "@platform/logger";
import { runDiscovery } from "./crawl-orchestrator.js";

const worker = createDiscoveryWorker(async (job) => {
  logger.info({ jobId: job.id, discoveryId: job.data.discoveryId }, "job de découverte reçu");
  await runDiscovery(job.data);
});

worker.on("failed", (job: Job<DiscoveryJobPayload> | undefined, err: Error) => {
  logger.error({ jobId: job?.id, discoveryId: job?.data.discoveryId, err }, "job de découverte échoué");
});

worker.on("completed", (job: Job<DiscoveryJobPayload>) => {
  logger.info({ jobId: job.id, discoveryId: job.data.discoveryId }, "job de découverte terminé");
});

logger.info("worker de découverte démarré, en attente de jobs");
