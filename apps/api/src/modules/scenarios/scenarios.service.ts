// apps/api/src/modules/scenarios/scenarios.service.ts

import { prisma } from "@platform/database";
import { createScenarioGenerationQueue, createTestGenerationQueue } from "@platform/queue";
import { NotFoundError } from "../../lib/errors.js";
import type { UpdateScenarioStatusInput } from "./scenarios.schema.js";

const scenarioQueue = createScenarioGenerationQueue();
const testQueue = createTestGenerationQueue();

export async function triggerGeneration(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  await scenarioQueue.add("generate", { projectId });
}

export async function listScenarios(organizationId: string, projectId: string, status?: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  return prisma.scenario.findMany({
    where: { projectId, ...(status ? { status: status as never } : {}) },
    include: { testCases: { orderBy: { createdAt: "desc" }, take: 1, include: { executions: { orderBy: { createdAt: "desc" }, take: 5, include: { artifacts: true } } } } },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });
}

export async function updateScenarioStatus(organizationId: string, scenarioId: string, input: UpdateScenarioStatusInput) {
  const scenario = await prisma.scenario.findFirst({
    where: { id: scenarioId, project: { organizationId } },
  });
  if (!scenario) {
    throw new NotFoundError("Scenario", scenarioId);
  }

  const updated = await prisma.scenario.update({ where: { id: scenarioId }, data: { status: input.status } });

  // Si le statut passe en APPROVED, on déclenche le worker de la Phase 11
  if (input.status === "APPROVED") {
    await testQueue.add("generate-test", { scenarioId: updated.id });
  }

  return updated;
}

export async function deleteScenario(organizationId: string, scenarioId: string) {
  // Check existence and verify organization
  const scenario = await prisma.scenario.findFirst({
    where: { id: scenarioId, project: { organizationId } },
  });

  if (!scenario) {
    throw new NotFoundError("Scenario", scenarioId);
  }

  // Delete via cascade
  await prisma.scenario.delete({ where: { id: scenarioId } });
}

