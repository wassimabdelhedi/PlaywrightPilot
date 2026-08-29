// apps/orchestrator/src/graphs/feature-understanding/graph.ts
//
// Graphe linéaire à ce stade (pas de branchement conditionnel) :
// charger -> découper en lots -> analyser -> fusionner -> persister.
// La Phase 9 introduira une branche conditionnelle en amont ("la
// mémoire existe-t-elle déjà pour ce site inchangé ?") qui pourra
// court-circuiter ce graphe entièrement.

import { StateGraph, END, START } from "@langchain/langgraph";
import { FeatureUnderstandingState } from "./state.js";
import { loadPages } from "./nodes/load-pages.js";
import { batchPages } from "./nodes/summarize-pages.js";
import { analyzeBatches } from "./nodes/analyze-batch.js";
import { mergeFeatures } from "./nodes/merge-features.js";
import { persistFeatures } from "./nodes/persist-features.js";

export function buildFeatureUnderstandingGraph() {
  const graph = new StateGraph(FeatureUnderstandingState)
    .addNode("loadPages", loadPages)
    .addNode("batchPages", batchPages)
    .addNode("analyzeBatches", analyzeBatches)
    .addNode("mergeFeatures", mergeFeatures)
    .addNode("persistFeatures", persistFeatures)
    .addEdge(START, "loadPages")
    .addEdge("loadPages", "batchPages")
    .addEdge("batchPages", "analyzeBatches")
    .addEdge("analyzeBatches", "mergeFeatures")
    .addEdge("mergeFeatures", "persistFeatures")
    .addEdge("persistFeatures", END);

  return graph.compile();
}
