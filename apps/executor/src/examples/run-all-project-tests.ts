import { prisma } from "@platform/database";
import { createTestGenerationQueue, createExecutionQueue } from "@platform/queue";

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("========================================================");
  console.log("  AUTO-PILOT : Generation et Execution de TOUS les tests");
  console.log("========================================================");

  // 1. Trouver le projet
  const targetProjectId = process.argv[2];
  const project = targetProjectId 
    ? await prisma.project.findUnique({ where: { id: targetProjectId } })
    : await prisma.project.findFirst({ orderBy: { createdAt: "desc" } });

  if (!project) {
    console.error("Aucun projet trouve.");
    return;
  }

  console.log(`\n1. Projet selectionne : ${project.name} (${project.baseUrl})`);

  // 2. Traiter les scenarios
  const testQueue = createTestGenerationQueue();

  const drafts = await prisma.scenario.findMany({
    where: { projectId: project.id, status: "DRAFT" }
  });

  const stalledApproved = await prisma.scenario.findMany({
    where: { 
      projectId: project.id, 
      status: "APPROVED",
      testCases: { none: {} } // n'ont aucun testCase!
    }
  });

  if (drafts.length === 0 && stalledApproved.length === 0) {
     console.log("Aucun scenario a generer.");
  } else {
    console.log(`\n2. Validation et generation de ${drafts.length + stalledApproved.length} scenarios...`);
    
    for (const scenario of drafts) {
      console.log(`   - Approuve (nouveau): ${scenario.title}`);
      await prisma.scenario.update({ where: { id: scenario.id }, data: { status: "APPROVED" } });
      await testQueue.add("generate-test", { scenarioId: scenario.id });
    }

    for (const scenario of stalledApproved) {
      console.log(`   - Relance generation (bloque): ${scenario.title}`);
      await testQueue.add("generate-test", { scenarioId: scenario.id });
    }
  }

  console.log("\n3. Attente de la generation de code (jusqu'a 2 minutes)...");
  
  let allValidated = false;
  let attempts = 0;
  let isCancelled = false;

  while (!allValidated && attempts < 120) {
    await delay(1000);
    attempts++;
    
    const approvedCount = await prisma.scenario.count({
      where: { projectId: project.id, status: "APPROVED" }
    });
    
    const testCases = await prisma.testCase.findMany({
      where: { scenario: { projectId: project.id } }
    });
    
    const generated = testCases.filter(tc => tc.status === "GENERATED").length;
    const validated = testCases.filter(tc => tc.status === "VALIDATED").length;
    const failed = testCases.filter(tc => tc.status === "VALIDATION_FAILED").length;
    
    console.log(`   [Patientez] Scenarios Approuves sans test: ${approvedCount - testCases.length} | TestCases en generation: ${generated} | Valides: ${validated} | Echoues: ${failed}`);
    
    // Si l'utilisateur a cliqué sur "Arrêter", les scénarios ont été remis en DRAFT.
    // Donc si approvedCount tombe soudainement à 0 alors qu'on avait lancé la génération, c'est une annulation.
    if (approvedCount === 0 && (drafts.length > 0 || stalledApproved.length > 0)) {
      console.log("   [STOP] Annulation détectée par l'utilisateur ! Arrêt de l'AutoPilot.");
      isCancelled = true;
      break;
    }
    
    if (approvedCount <= testCases.length && generated === 0) {
      allValidated = true;
    }
  }

  if (isCancelled) {
    await testQueue.close();
    console.log("========================================================");
    return;
  }

  // 4. Executer les tests valides
  const validTestCases = await prisma.testCase.findMany({
    where: { scenario: { projectId: project.id }, status: "VALIDATED" }
  });

  if (validTestCases.length === 0) {
      console.log("\nAucun test valide a executer.");
  } else {
    console.log(`\n4. Lancement de l'execution pour ${validTestCases.length} tests valides...`);
    
    const executionQueue = createExecutionQueue();
    for (const tc of validTestCases) {
      console.log(`   - Execute TestCase pour le scenario: ${tc.scenarioId}`);
      const execution = await prisma.execution.create({
        data: { testCaseId: tc.id, status: "QUEUED" },
      });
      await executionQueue.add("execute", { executionId: execution.id });
    }

    console.log("\n5. Tous les tests sont dans la file d'attente de l'executeur !");
    console.log("   Veuillez verifier votre tableau de bord ou les logs du worker 'executor'.");
  }

  await testQueue.close();
  console.log("========================================================");
}

main().catch(console.error).finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
});