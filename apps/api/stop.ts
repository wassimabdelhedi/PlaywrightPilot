import { prisma } from '@platform/database';

async function stopEverything() {
  console.log('Force stopping everything...');

  // Stop queued generations
  const updatedScenarios = await prisma.scenario.updateMany({
    where: { status: 'APPROVED', testCases: { none: {} } },
    data: { status: 'DRAFT' }
  });
  console.log(`Reverted ${updatedScenarios.count} APPROVED scenarios to DRAFT.`);

  // Stop running executions
  const updatedExecs = await prisma.execution.updateMany({
    where: { status: 'RUNNING' },
    data: { 
      status: 'FAILED',
      errorMessage: 'Arrêt forcé par l\'utilisateur.'
    }
  });
  console.log(`Failed ${updatedExecs.count} RUNNING executions.`);
  
  // Also clean up any QUEUED executions just in case
  const queuedExecs = await prisma.execution.updateMany({
    where: { status: 'QUEUED' },
    data: { 
      status: 'FAILED',
      errorMessage: 'Annulé (file d\'attente) par l\'utilisateur.'
    }
  });
  console.log(`Failed ${queuedExecs.count} QUEUED executions.`);

  console.log('Done.');
}

stopEverything().catch(console.error).finally(() => prisma.$disconnect());
