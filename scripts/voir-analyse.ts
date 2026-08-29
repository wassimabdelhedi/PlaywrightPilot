import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Recherche des analyses d'échecs générées par la Phase 13...\n");

  const analyses = await prisma.failureAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      execution: true
    }
  });

  if (analyses.length === 0) {
    console.log("❌ Aucune analyse trouvée.");
    console.log("👉 Pour tester : Lancez un test depuis le Dashboard qui va échouer.");
    console.log("👉 Attendez quelques secondes que l'Orchestrateur (Phase 13) fasse son analyse, puis relancez ce script !");
    return;
  }

  for (const analysis of analyses) {
    console.log(`=======================================================`);
    console.log(`🤖 Analyse de l'exécution : ${analysis.executionId}`);
    console.log(`📅 Date : ${analysis.createdAt.toLocaleString()}`);
    console.log(`🏷️  Classification : ${analysis.classification}`);
    console.log(`🔥 Sévérité : ${analysis.severity}`);
    console.log(`💡 Cause racine (IA) :`);
    console.log(analysis.rootCause);
    if (analysis.suggestedFix) {
      console.log(`\n🛠️  Suggestion de réparation :`);
      console.log(analysis.suggestedFix);
    }
    console.log(`=======================================================\n`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
