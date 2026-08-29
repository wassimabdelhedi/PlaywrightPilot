import { prisma } from "@platform/database";
import { buildScenarioGenerationGraph } from "../../src/graphs/scenario-generation/graph.js";

async function main() {
  const memory = await prisma.agentMemory.findFirst({
    where: { category: "FEATURE_MAP" }
  });
  if (!memory) throw new Error("No feature memory");

  const project = await prisma.project.findUnique({
    where: { id: memory.projectId }
  });

  if (!project) throw new Error("No project");

  const graph = buildScenarioGenerationGraph();
  console.log("Invoking graph for project", project.id);

  try {
    const result = await graph.invoke({ projectId: project.id });
    console.log("Graph success:", result);
  } catch (error) {
    console.error("Graph error:", error);
  }
}

main().finally(() => prisma.$disconnect());
