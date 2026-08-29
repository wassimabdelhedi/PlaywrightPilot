import { prisma } from '@platform/database';

async function test() {
  const project = await prisma.project.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!project) return;
  
  console.log('Project:', project.id);
  
  // Repasser les scenarios approuves en DRAFT
  const res1 = await prisma.scenario.updateMany({
    where: { projectId: project.id, status: 'APPROVED' },
    data: { status: 'DRAFT' }
  });
  console.log('Scenarios reverted:', res1.count);

  // Annuler les executions en attente
  const res2 = await prisma.execution.updateMany({
    where: { 
      status: 'QUEUED',
      testCase: { scenario: { projectId: project.id } }
    },
    data: { 
      status: 'FAILED', 
      errorMessage: 'Annule par utilisateur' 
    }
  });
  console.log('Executions cancelled:', res2.count);
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });