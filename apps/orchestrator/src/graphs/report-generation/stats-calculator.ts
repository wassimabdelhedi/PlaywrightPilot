// apps/orchestrator/src/graphs/report-generation/stats-calculator.ts
import type { ReportStats } from "./state.js";

/**
 * Calcul déterministe pur des statistiques à partir des exécutions.
 * Ne dépend ni de Prisma, ni d'OpenAI.
 */
export function calculateStats(executions: any[]): ReportStats {
  const terminalExecutions = executions.filter(e => e.status === "PASSED" || e.status === "FAILED");
  
  const totalExecutions = terminalExecutions.length;
  const passedCount = terminalExecutions.filter(e => e.status === "PASSED").length;
  const failedCount = terminalExecutions.filter(e => e.status === "FAILED").length;
  const successRate = totalExecutions > 0 ? (passedCount / totalExecutions) * 100 : 0;
  
  const failureClassifications: Record<string, number> = {};
  const failureCountsByTest: Record<string, { scenarioTitle: string; count: number }> = {};
  
  for (const exec of terminalExecutions) {
    if (exec.status === "FAILED") {
      // Classification counting
      const classification = exec.classification || "UNCLASSIFIED";
      failureClassifications[classification] = (failureClassifications[classification] || 0) + 1;
      
      // Test failure counting
      const testId = exec.testCaseId || exec.id; // fallback
      const scenarioTitle = exec.testCase?.scenario?.title || "Unknown Scenario";
      
      if (!failureCountsByTest[testId]) {
        failureCountsByTest[testId] = { scenarioTitle, count: 0 };
      }
      failureCountsByTest[testId].count += 1;
    }
  }
  
  // Sort tests by number of failures (descending) and take top 5
  const topFailingTests = Object.entries(failureCountsByTest)
    .map(([testId, data]) => ({
      testId,
      scenarioTitle: data.scenarioTitle,
      failures: data.count,
    }))
    .sort((a, b) => b.failures - a.failures)
    .slice(0, 5);
    
  return {
    totalExecutions,
    passedCount,
    failedCount,
    successRate,
    topFailingTests,
    failureClassifications,
  };
}

/**
 * Traduit les statistiques exactes en texte purement qualitatif
 * pour éviter toute hallucination numérique par le LLM.
 */
export function translateToQualitative(stats: ReportStats): string {
  if (stats.totalExecutions === 0) {
    return "Aucune exécution terminée n'a été enregistrée pour cette période.";
  }
  
  let rateDesc = "";
  if (stats.successRate === 100) rateDesc = "Parfait";
  else if (stats.successRate >= 90) rateDesc = "Très élevé";
  else if (stats.successRate >= 75) rateDesc = "Élevé mais avec quelques régressions";
  else if (stats.successRate >= 50) rateDesc = "Moyen, instabilité significative";
  else rateDesc = "Critique, la majorité des tests échouent";
  
  let classificationsDesc = "Aucune erreur classifiée.";
  if (Object.keys(stats.failureClassifications).length > 0) {
    // Sort classifications by frequency to say which is most common
    const sortedClasses = Object.entries(stats.failureClassifications)
      .sort((a, b) => b[1] - a[1]);
    
    classificationsDesc = `Les erreurs les plus fréquentes sont de type : ${sortedClasses.map(c => c[0]).join(", ")}.`;
  }
  
  let topFailingDesc = "Aucun test en échec récurrent.";
  if (stats.topFailingTests.length > 0) {
    const titles = stats.topFailingTests.map(t => `"${t.scenarioTitle}"`).join(", ");
    topFailingDesc = `Les scénarios causant le plus de problèmes sont : ${titles}.`;
  }

  return `
    Tendance générale du taux de succès : ${rateDesc}
    Profil des erreurs : ${classificationsDesc}
    Points de friction principaux : ${topFailingDesc}
  `.trim();
}
