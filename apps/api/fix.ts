import { prisma } from '@platform/database';

async function fix() {
  const pId = 'cmt8t7wca0001w3gyy4i11aln';
  const scenarios = await prisma.scenario.findMany({ 
    where: { projectId: pId, status: 'APPROVED', testCases: { none: {} } } 
  });
  console.log('Stuck scenarios:', scenarios.length);
  for (const s of scenarios) {
    await prisma.scenario.update({ where: { id: s.id }, data: { status: 'DRAFT' } });
  }
  console.log('Fixed.');
}
fix().catch(console.error).finally(() => prisma.$disconnect());
