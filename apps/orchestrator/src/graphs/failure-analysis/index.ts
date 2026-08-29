// apps/orchestrator/src/graphs/failure-analysis/index.ts

import { StateGraph, END, START } from "@langchain/langgraph";
import { FailureAnalysisState } from "./state.js";
import { loadContext } from "./nodes/load-context.js";
import { analyzeFailure } from "./nodes/analyze.js";
import { persistAnalysis } from "./nodes/persist.js";

const workflow = new StateGraph(FailureAnalysisState)
  .addNode("loadContext", loadContext)
  .addNode("analyzeFailure", analyzeFailure)
  .addNode("persistAnalysis", persistAnalysis)
  
  .addEdge(START, "loadContext")
  .addEdge("loadContext", "analyzeFailure")
  .addEdge("analyzeFailure", "persistAnalysis")
  .addEdge("persistAnalysis", END);

export const failureAnalysisGraph = workflow.compile();
