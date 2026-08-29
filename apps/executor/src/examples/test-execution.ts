// apps/executor/src/examples/test-execution.ts
//
// Script de test Phase 12 : déclenche l'exécution d'un TestCase via l'API.

import { prisma } from "@platform/database";

async function main() {
  // 1. Trouver un TestCase VALIDATED
  const testCase = await prisma.testCase.findFirst({
    where: { status: "VALIDATED" },
    include: { scenario: { include: { project: true } } },
  });

  if (!testCase) {
    console.log("❌ Aucun TestCase VALIDATED trouvé. Approuvez d'abord un scénario.");
    return;
  }

  console.log(`✅ TestCase trouvé: ${testCase.id}`);
  console.log(`   Scénario: ${testCase.scenario.title}`);
  console.log(`   Projet: ${testCase.scenario.project.name}`);
  console.log(`   Code source (${testCase.sourceCode.length} chars):`);
  console.log(testCase.sourceCode);
  console.log("\n--- Lancement de l'exécution directe (sans passer par l'API) ---\n");

  // 2. Créer l'exécution en base de données
  const execution = await prisma.execution.create({
    data: {
      testCaseId: testCase.id,
      status: "QUEUED",
    },
  });

  console.log(`📦 Exécution créée: ${execution.id} (status: QUEUED)`);

  // 3. Importer et lancer l'orchestrateur directement
  const { runExecution } = await import("../execution/execution-orchestrator.js");

  console.log("🚀 Lancement de runExecution...\n");

  try {
    await runExecution(execution.id);
    console.log("\n✅ Exécution terminée avec succès !");
  } catch (err) {
    console.error("\n❌ Exécution échouée:", err);
  }

  // 4. Vérifier le résultat
  const result = await prisma.execution.findUnique({
    where: { id: execution.id },
    include: { artifacts: true },
  });

  console.log("\n--- Résultat ---");
  console.log(`Status: ${result?.status}`);
  console.log(`Durée: ${result?.durationMs}ms`);
  console.log(`Erreur: ${result?.errorMessage ?? "aucune"}`);
  console.log(`Artefacts: ${result?.artifacts.length ?? 0}`);
  
  if (result?.artifacts.length) {
    for (const a of result.artifacts) {
      console.log(`  - ${a.type}: ${a.storageUrl} (${a.sizeBytes} bytes)`);
    }
  }
}

main().catch(console.error);
