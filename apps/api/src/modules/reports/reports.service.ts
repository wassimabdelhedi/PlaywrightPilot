// apps/api/src/modules/reports/reports.service.ts
import { prisma } from "@platform/database";
import { createReportGenerationQueue } from "@platform/queue";
import { NotFoundError } from "../../lib/errors.js";

const reportQueue = createReportGenerationQueue();

export async function triggerGeneration(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  await reportQueue.add("generate-report", { projectId });
}

export async function listReports(organizationId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  return prisma.report.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}
