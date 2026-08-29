// apps/orchestrator/src/graphs/feature-understanding/nodes/summarize-pages.ts
//
// Nommé "summarize" car conceptuellement c'est la suite de la
// compression commencée dans load-pages.ts — ici on répartit les
// résumés déjà compacts en lots de taille fixe (FEATURE_ANALYSIS_BATCH_SIZE),
// le paramètre concret qui borne le volume de tokens par appel LLM.

import { config } from "@platform/config";
import type { FeatureUnderstandingStateType, PageSummary } from "../state.js";

export function batchPages(state: FeatureUnderstandingStateType) {
  const batchSize = config.FEATURE_ANALYSIS_BATCH_SIZE;
  const batches: PageSummary[][] = [];

  for (let i = 0; i < state.pageSummaries.length; i += batchSize) {
    batches.push(state.pageSummaries.slice(i, i + batchSize));
  }

  return { batches };
}
