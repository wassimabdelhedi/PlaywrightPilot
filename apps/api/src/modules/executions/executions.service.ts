// apps/api/src/modules/executions/executions.service.ts

import { prisma } from "@platform/database";
import { createExecutionQueue } from "@platform/queue";
import { NotFoundError, ConflictError } from "../../lib/errors.js";

const executionQueue = createExecutionQueue();

export async function triggerExecution(organizationId: string, testCaseId: string, triggeredById: string) {
  const testCase = await prisma.testCase.findFirst({
    where: { id: testCaseId, scenario: { project: { organizationId } } },
  });

  if (!testCase) throw new NotFoundError("TestCase", testCaseId);
  if (testCase.status === "VALIDATION_FAILED" || testCase.status === "GENERATED") {
    throw new ConflictError(`Ce test n'a pas passé la validation statique (statut : ${testCase.status})`);
  }

  const execution = await prisma.execution.create({
    data: { testCaseId: testCase.id, status: "QUEUED", triggeredById },
  });

  await executionQueue.add("execute", { executionId: execution.id });
  return execution;
}

export async function getExecution(organizationId: string, executionId: string) {
  const execution = await prisma.execution.findFirst({
    where: { id: executionId, testCase: { scenario: { project: { organizationId } } } },
  });
  if (!execution) throw new NotFoundError("Execution", executionId);
  return execution;
}

export async function getExecutionArtifacts(organizationId: string, executionId: string) {
  const execution = await prisma.execution.findFirst({
    where: { id: executionId, testCase: { scenario: { project: { organizationId } } } },
  });
  if (!execution) throw new NotFoundError("Execution", executionId);

  return prisma.executionArtifact.findMany({ where: { executionId: execution.id } });
}

export async function getExecutionAnalysis(organizationId: string, executionId: string) {
  const execution = await prisma.execution.findFirst({
    where: { id: executionId, testCase: { scenario: { project: { organizationId } } } },
  });
  if (!execution) throw new NotFoundError("Execution", executionId);

  return prisma.failureAnalysis.findUnique({
    where: { executionId: execution.id },
  });
}

