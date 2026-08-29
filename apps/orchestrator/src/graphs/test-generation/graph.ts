// apps/orchestrator/src/graphs/test-generation/graph.ts
//
// Boucle bornée : après validation, on revient à generatePlan si le
// plan est invalide ET que le nombre de tentatives n'est pas épuisé
// (FEATURE_ANALYSIS_MAX_RETRIES, réutilisé tel quel depuis la Phase
// 8 — même politique de retry pour tout appel LLM structuré du
// système, pas une variable de configuration de plus à retenir).

import { StateGraph, END, START } from "@langchain/langgraph";
import { config } from "@platform/config";
import { TestGenerationState } from "./state.js";
import { loadScenario } from "./nodes/load-scenario.js";
import { generatePlan } from "./nodes/generate-plan.js";
import { selfCheckPlan } from "./nodes/self-check.js";
import { validatePlanNode } from "./nodes/validate-plan.js";
import { persistTestCase } from "./nodes/persist-test-case.js";

export function buildTestGenerationGraph() {
  const maxAttempts = config.FEATURE_ANALYSIS_MAX_RETRIES + 1;

  const graph = new StateGraph(TestGenerationState)
    .addNode("loadScenario", loadScenario)
    .addNode("generatePlan", generatePlan)
    .addNode("selfCheck", selfCheckPlan)
    .addNode("validatePlan", validatePlanNode)
    .addNode("persistTestCase", persistTestCase)
    .addEdge(START, "loadScenario")
    .addEdge("loadScenario", "generatePlan")
    .addEdge("generatePlan", "selfCheck")
    .addEdge("selfCheck", "validatePlan")
    .addConditionalEdges(
      "validatePlan",
      (state) => {
        const isValid = state.validationErrors.length === 0;
        if (isValid) return "persist";
        if (state.attempt < maxAttempts) return "retry";
        return "persist"; // tentatives épuisées : on persiste en VALIDATION_FAILED
      },
      { retry: "generatePlan", persist: "persistTestCase" }
    )
    .addEdge("persistTestCase", END);

  return graph.compile();
}
