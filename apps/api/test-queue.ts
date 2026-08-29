import { createTestGenerationQueue } from "@platform/queue";
async function main() {
  const queue = createTestGenerationQueue();
  console.log("Adding dummy job to see if worker picks it up...");
  await queue.add("generate-test", { scenarioId: "dummy" });
  console.log("Job added.");
  process.exit(0);
}
main();
