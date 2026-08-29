import { prisma } from "@platform/database";
async function main() {
  const p = await prisma.project.findUnique({where: {id: 'cmtbze8q8000b8k91kvewmpad'}});
  console.log("Project:", p);
}
main().finally(() => prisma.$disconnect());
