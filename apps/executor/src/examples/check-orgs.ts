import { prisma } from "@platform/database";

async function main() {
  await prisma.project.update({
    where: { id: "cmrxxhit10002128ermtbp825" },
    data: { organizationId: "cmrxxo1tn0001izpw3kllqi04" }
  });
  console.log("P2 reassigned to user org");
}

main().finally(() => prisma.$disconnect());
