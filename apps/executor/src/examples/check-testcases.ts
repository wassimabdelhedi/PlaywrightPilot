import { prisma } from "@platform/database";

async function main() {
  const testCases = await prisma.testCase.findMany({
    include: { scenario: true }
  });

  console.log(`Found ${testCases.length} TestCases`);
  for (const tc of testCases) {
    console.log(`- TestCase ID: ${tc.id} Status: ${tc.status} For Scenario: ${tc.scenario.title}`);
    console.log(`  Source Code length: ${tc.sourceCode?.length ?? 0}`);
  }
}

main().catch(console.error);
