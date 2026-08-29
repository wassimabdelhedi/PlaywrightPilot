// apps/orchestrator/src/graphs/report-generation/nodes/persist-report.ts
import { prisma } from "@platform/database";
import type { ReportGenerationStateType } from "../state.js";

export async function persistReport(state: ReportGenerationStateType) {
  const dateStr = new Date().toLocaleDateString("fr-FR");
  
  const report = await prisma.report.create({
    data: {
      projectId: state.projectId,
      title: `Bilan d'exécution du ${dateStr}`,
      summary: state.narrativeSummary,
      content: state.stats as any, // Raw numbers stored as JSON for the dashboard
    },
  });

  return { reportId: report.id };
}
