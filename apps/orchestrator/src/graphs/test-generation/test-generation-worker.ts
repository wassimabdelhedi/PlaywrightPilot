// apps/orchestrator/src/graphs/test-generation/test-generation-worker.ts

import { createTestGenerationWorker, type Job, type TestGenerationJobPayload } from "@platform/queue";
import { logger } from "@platform/logger";
import { buildTestGenerationGraph } from "./graph.js";

const graph = buildTestGenerationGraph();

const worker = createTestGenerationWorker(async (job: Job<TestGenerationJobPayload>) => {
  logger.info({ jobId: job.id, scenarioId: job.data.scenarioId }, "job de gÃ©nÃ©ration de test reÃ§u");
  await graph.invoke({ scenarioId: job.data.scenarioId });
});

import { prisma } from "@platform/database";

worker.on("failed", async (job: Job<TestGenerationJobPayload> | undefined, err: Error) => {
  logger.error({ jobId: job?.id, scenarioId: job?.data.scenarioId, err }, "génération de test échouée");
  
  if (job?.data.scenarioId) {
    try {
      // 1. Remettre le scenario en DRAFT pour ne pas bloquer l'AutoPilot
      const scenario = await prisma.scenario.update({
        where: { id: job.data.scenarioId },
        data: { status: "DRAFT" }
      });
      
      // 2. Chercher une erreur de quota (429) et le délai
      const errMsg = err.message || "";
      if (errMsg.includes("429 Too Many Requests") || errMsg.includes("Quota exceeded")) {
        // Ex: "Please retry in 56.448340618s."
        const match = errMsg.match(/retry in ([\d.]+)s/i);
        let waitSeconds = 60; // defaut 60s
        if (match && match[1]) {
           waitSeconds = Math.ceil(parseFloat(match[1])) + 2; // +2s de marge
        }
        
        const resetAt = new Date(Date.now() + waitSeconds * 1000);
        
        await prisma.project.update({
          where: { id: scenario.projectId },
          data: { 
            llmRateLimitResetAt: resetAt,
            lastLlmError: "Quota IA atteint. Reprise possible dans " + waitSeconds + " secondes."
          }
        });
        
        logger.warn({ projectId: scenario.projectId, resetAt }, "Quota IA atteint, projet mis à jour");
      }
    } catch (dbErr) {
      logger.error({ err: dbErr }, "Erreur lors de la mise à jour du statut post-échec");
    }
  }
});

worker.on("completed", (job: Job<TestGenerationJobPayload>) => {
  logger.info({ jobId: job.id, scenarioId: job.data.scenarioId }, "gÃ©nÃ©ration de test terminÃ©e");
});

logger.info("worker de gÃ©nÃ©ration de tests dÃ©marrÃ©, en attente de jobs");

