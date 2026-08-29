// apps/executor/src/examples/test-scenario-generation.ts

import { prisma } from "@platform/database";
import { createScenarioGenerationQueue } from "@platform/queue";

async function main() {
  const memory = await prisma.agentMemory.findFirst({
    where: { category: "FEATURE_MAP" }
  });

  if (!memory) {
    console.error("❌ Aucune fonctionnalité trouvée en base. Lancez la phase 7 et 8.");
    process.exit(1);
  }

  const project = await prisma.project.findUnique({
    where: { id: memory.projectId }
  });

  if (!project) {
    console.error("❌ Aucun projet trouvé. Lancez d'abord run-saucedemo-full-pipeline.ts");
    process.exit(1);
  }

  console.log(`🚀 Mise en file d'attente pour la génération de scénarios du projet: ${project.name} (${project.id})`);

  try {
    const scenarioQueue = createScenarioGenerationQueue();
    await scenarioQueue.add("generate-scenarios", { projectId: project.id });

    console.log("✅ Job ajouté dans la queue BullMQ avec succès !");
    console.log("👉 Vérifiez les logs de votre terminal `dev:worker` pour l'orchestrateur.");

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout dans la file d'attente.");
    console.error(error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
