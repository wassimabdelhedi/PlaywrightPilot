import { prisma } from '@platform/database';
async function check() {
  const queued = await prisma.execution.count({ where: { status: 'QUEUED' } });
  const running = await prisma.execution.count({ where: { status: 'RUNNING' } });
  
  const genQueued = await prisma.scenario.count({ where: { status: 'APPROVED', testCases: { none: {} } } });
  const genRunning = await prisma.testCase.count({ where: { status: 'GENERATED' } });
  
  console.log({ 
    executionQueued: queued, 
    executionRunning: running,
    generationQueued: genQueued,
    generationRunning: genRunning
  });
}
check().catch(console.error).finally(() => prisma.$disconnect());
