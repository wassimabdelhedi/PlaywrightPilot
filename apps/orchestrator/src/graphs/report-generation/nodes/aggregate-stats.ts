// apps/orchestrator/src/graphs/report-generation/nodes/aggregate-stats.ts
import { prisma } from "@platform/database";
import { logger } from "@platform/logger";
import type { ReportGenerationStateType } from "../state.js";
import { calculateStats, translateToQualitative } from "../stats-calculator.js";

export async function aggregateStats(state: ReportGenerationStateType) {
  // Une seule requête avec `include` pour éviter les requêtes N+1
  const executions = await prisma.execution.findMany({
    where: {
      testCase: {
        scenario: {
          projectId: state.projectId
        }
      },
      status: { in: ["PASSED", "FAILED"] },
      // OPTIONAL: Limit to last 30 days or last 1000 executions to prevent massive payload
      // createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    include: {
      testCase: {
        include: {
          scenario: { select: { title: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const stats = calculateStats(executions);
  const qualitativeStats = translateToQualitative(stats);
  
  logger.info({ projectId: state.projectId, totalExecutions: stats.totalExecutions }, "Statistiques agrégées avec succès");

  return { executions, stats, qualitativeStats };
}
