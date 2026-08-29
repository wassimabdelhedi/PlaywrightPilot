import { prisma } from "@platform/database";

async function verify() {
  const project = await prisma.project.findFirst({ orderBy: { createdAt: "desc" } });
  if (!project) return console.log("Aucun projet.");
  
  const approved = await prisma.scenario.count({ where: { projectId: project.id, status: "APPROVED" } });
  const queued = await prisma.execution.count({ where: { testCase: { scenario: { projectId: project.id } }, status: "QUEUED" } });
  const running = await prisma.execution.count({ where: { testCase: { scenario: { projectId: project.id } }, status: "RUNNING" } });
  
  console.log(`\nVerifications pour le projet: ${project.id}`);
  console.log(`Scenarios approuves: ${approved}`);
  console.log(`Executions en attente: ${queued}`);
  console.log(`Executions en cours: ${running}`);
  
  if (approved === 0 && queued === 0 && running === 0) {
    console.log("\n[SUCCES] L'Auto-Pilot est completement arrete. Aucun scenario ou execution n'est en attente.");
  } else {
    console.log("\n[ATTENTION] L'Auto-Pilot est toujours en cours sur certains elements !");
  }
}

verify().then(() => process.exit(0)).catch(console.error);