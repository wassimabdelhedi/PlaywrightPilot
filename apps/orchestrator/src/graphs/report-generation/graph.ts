// apps/orchestrator/src/graphs/report-generation/graph.ts
import { StateGraph } from "@langchain/langgraph";
import { ReportGenerationState } from "./state.js";
import { aggregateStats } from "./nodes/aggregate-stats.js";
import { generateNarrative } from "./nodes/generate-narrative.js";
import { persistReport } from "./nodes/persist-report.js";

const builder = new StateGraph(ReportGenerationState)
  .addNode("aggregateStats", aggregateStats)
  .addNode("generateNarrative", generateNarrative)
  .addNode("persistReport", persistReport)
  
  .addEdge("__start__", "aggregateStats")
  .addEdge("aggregateStats", "generateNarrative")
  .addEdge("generateNarrative", "persistReport")
  .addEdge("persistReport", "__end__");

export const ReportGenerationGraph = builder.compile();
