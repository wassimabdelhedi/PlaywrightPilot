import { createWorkspace } from "./src/execution/workspace.js";
import { runTestProcess } from "./src/execution/process-runner.js";

const code = `// Généré automatiquement par l'orchestrateur IA (Phase 11) — Moteur Déterministe
// Ne pas éditer à la main.

import { test, expect, Page } from '@playwright/test';

// Fonction utilitaire embarquée pour garantir la résilience des sélecteurs (Fallback stratégique)
async function performAction(page: Page, selectors: string[], action: 'fill' | 'click' | 'check' | 'select', value?: string) {
  for (const sel of selectors) {
    if (await page.locator(sel).count() > 0) {
      const loc = page.locator(sel).first();
      if (action === 'fill') {
        await loc.fill(value!);
      } else if (action === 'click') {
        await loc.click();
      } else if (action === 'check') {
        await loc.check();
      } else if (action === 'select') {
        await loc.selectOption(value!);
      }
      return;
    }
  }
  throw new Error(\`Action \${action} échouée : Aucun des sélecteurs de secours n'a ciblé un élément valide. Sélecteurs essayés : \${selectors.join(', ')}\`);
}

test('Nominal Scenario: Successful Login', async ({ page }) => {
  // 1. Navigation initiale
  await page.goto('https://www.saucedemo.com');
  await page.waitForLoadState('domcontentloaded');

  // 2. Actions déterministes (Remplissages puis Clics)
  await performAction(page, ["[data-test=\\"username\\"]","#user-name","input[name=\\"user-name\\"]","[name=\\"user-name\\"]","div#login_button_container > div > form > div:nth-of-type(1) > input#user-name"], 'fill', 'standard_user');
  await performAction(page, ["[data-test=\\"password\\"]","#password","input[name=\\"password\\"]","[name=\\"password\\"]","div#login_button_container > div > form > div:nth-of-type(2) > input#password"], 'fill', 'secret_sauce');
  await performAction(page, ["[data-test=\\"login-button\\"]","#login-button","input[name=\\"login-button\\"]","[name=\\"login-button\\"]","div:nth-of-type(1) > div#login_button_container > div > form > input#login-button"], 'click', undefined);

  // 3. Assertions (Vérification de l'état final)
  await page.waitForURL('**/*/inventory*');
  await expect(page).toHaveURL(/.*\\/inventory.*/);
});`;

async function main() {
  const ws = await createWorkspace("test-123", code);
  console.log("Workspace created:", ws.dir);
  const result = await runTestProcess(ws, "test-123");
  console.log("Result:", result);
}

main().catch(console.error);
