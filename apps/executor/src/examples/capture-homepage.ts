// apps/executor/src/examples/capture-homepage.ts
//
// Script manuel de vérification de la Phase 6 : exécute le runner
// contre une URL réelle et confirme que les quatre types d'artefacts
// sont bien produits. Sert de test de fumée avant de brancher le
// moteur de découverte (Phase 7) par-dessus ce runner.
//
// Exécution : pnpm --filter @platform/executor exec tsx src/examples/capture-homepage.ts

import { runPlaywrightTask } from "../runner/playwright-runner.js";
import { shutdownBrowser } from "../browser/browser-manager.js";

async function main() {
  const result = await runPlaywrightTask("demo-execution-001", "https://example.com", async (page: import("playwright").Page) => {
    await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
    return page.title();
  });

  console.log("Statut :", result.status);
  console.log("Titre capturé :", result.result);
  console.log("Durée :", result.durationMs, "ms");
  console.log("Artefacts :", result.artifacts);

  await shutdownBrowser();
}

main().catch((err) => {
  console.error("Échec du script de démonstration :", err);
  process.exit(1);
});