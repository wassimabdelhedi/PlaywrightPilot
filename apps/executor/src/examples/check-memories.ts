import { prisma } from "@platform/database";

async function main() {
  const memories = await prisma.agentMemory.findMany({
    where: { category: "FEATURE_MAP" }
  });
  console.log(memories.map(m => m.projectId));

  const allMemories = await prisma.agentMemory.findMany();
  console.log(`All memories count: ${allMemories.length}`);
}

main().finally(() => prisma.$disconnect());
