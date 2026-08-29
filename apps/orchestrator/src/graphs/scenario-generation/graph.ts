// apps/orchestrator/src/graphs/scenario-generation/graph.ts

import { StateGraph, END, START } from "@langchain/langgraph";
import { ScenarioGenerationState } from "./state.js";
import { loadFeatures } from "./nodes/load-features.js";
import { filterCovered } from "./nodes/filter-covered.js";
import { generateScenarios } from "./nodes/generate-scenarios.js";
import { reviewScenarios } from "./nodes/review-scenarios.js";
import { persistScenarios } from "./nodes/persist-scenarios.js";

export function buildScenarioGenerationGraph() {
  const graph = new StateGraph(ScenarioGenerationState)
    .addNode("loadFeatures", loadFeatures)
    .addNode("filterCovered", filterCovered)
    .addNode("generateScenarios", generateScenarios)
    .addNode("reviewScenarios", reviewScenarios)
    .addNode("persistScenarios", persistScenarios)
    .addEdge(START, "loadFeatures")
    .addEdge("loadFeatures", "filterCovered")
    .addEdge("filterCovered", "generateScenarios")
    .addEdge("generateScenarios", "reviewScenarios")
    .addEdge("reviewScenarios", "persistScenarios")
    .addEdge("persistScenarios", END);

  return graph.compile();
}
