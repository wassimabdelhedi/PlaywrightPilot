// apps/orchestrator/src/graphs/feature-understanding/state.ts
//
// LangGraph fait transiter un objet d'état unique entre les nœuds.
// Chaque nœud lit ce dont il a besoin et renvoie un patch partiel —
// LangGraph fusionne automatiquement selon le "reducer" défini par
// Annotation (ici : remplacement simple, pas d'accumulation, sauf
// pour featureBatches qui accumule au fil des lots traités).

import { Annotation } from "@langchain/langgraph";
import type { FeatureCandidate } from "./schema.js";

export interface PageSummary {
  pageId: string;
  url: string;
  title: string | null;
  elementSummary: string; // ex: "3 formulaires, 12 boutons, 1 menu de navigation..."
}

export const FeatureUnderstandingState = Annotation.Root({
  discoveryId: Annotation<string>(),
  projectId: Annotation<string>(),
  pageSummaries: Annotation<PageSummary[]>({
    reducer: (_prev: PageSummary[], next: PageSummary[]) => next,
    default: () => [],
  }),
  batches: Annotation<PageSummary[][]>({
    reducer: (_prev: PageSummary[][], next: PageSummary[][]) => next,
    default: () => [],
  }),
  rawCandidates: Annotation<FeatureCandidate[]>({
    // Accumule les candidats de CHAQUE lot analysé plutôt que de les
    // remplacer — c'est ce qui permet au nœud analyze-batch d'être
    // invoqué plusieurs fois (une fois par lot) sans perdre les
    // résultats des lots précédents.
    reducer: (prev: FeatureCandidate[], next: FeatureCandidate[]) => [...prev, ...next],
    default: () => [],
  }),
  mergedFeatures: Annotation<FeatureCandidate[]>({
    reducer: (_prev: FeatureCandidate[], next: FeatureCandidate[]) => next,
    default: () => [],
  }),
});

export type FeatureUnderstandingStateType = typeof FeatureUnderstandingState.State;
