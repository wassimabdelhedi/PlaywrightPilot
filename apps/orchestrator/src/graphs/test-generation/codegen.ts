// apps/orchestrator/src/graphs/test-generation/codegen.ts

import type { TestPlan } from "./step-schema.js";
import type { ScenarioType } from "./scenario-type-detector.js";

function escapeString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function cleanUrl(url: string): string {
  // EnlÃ¨ve le HTML (ex: <a href="...">...</a>) ou les backticks Markdown (\`\`\`) accidentels
  let cleaned = url.replace(/<[^>]+>/g, "").replace(/`/g, "").trim();
  // Si le LLM a mis des guillemets autour
  cleaned = cleaned.replace(/^["']|["']$/g, "");
  return cleaned;
}

// URLs that indicate a successful login/navigation â€” used to detect wrong assertions in NEGATIVE scenarios
const SUCCESS_URL_PATTERNS = ["/inventory", "/dashboard", "/home", "/profile", "/cart", "/checkout", "/account"];

// Common error element selectors tried in order when the LLM doesn't provide one
const ERROR_ELEMENT_FALLBACKS = [
  '[data-test="error"]',
  '[data-testid="error"]',
  '.error-message',
  '[role="alert"]',
  '.error',
  '#error',
  '.alert-danger',
  '.notification-error',
];

function autoGenerateValue(el: any, scenarioType: ScenarioType): string {
  const attrs = el.attributes || {};
  const type = (attrs.type || "").toLowerCase();
  const name = (attrs.name || "").toLowerCase();
  const id = (attrs.id || "").toLowerCase();

  // NEGATIVE scenarios must use INVALID credentials to trigger error conditions
  if (scenarioType === "NEGATIVE" || scenarioType === "EDGE_CASE") {
    if (type === "email" || name.includes("email")) return "invalid_email@notexist.xyz";
    if (type === "password" || name.includes("password") || name.includes("pwd") || id.includes("password")) return "wrong_password_123";
    if (name.includes("user") || id.includes("user") || name.includes("login")) return "invalid_user";
    return "INVALID_VALUE";
  }

  // POSITIVE scenarios use valid credentials
  if (type === "email" || name.includes("email")) return "testuser@example.com";
  if (type === "password" || name.includes("password") || name.includes("pwd") || id.includes("password")) return "secret_sauce";
  if (name.includes("user") || id.includes("user") || name.includes("login")) return "standard_user";
  if (type === "number") return "42";
  if (type === "date") return "2026-01-01";
  if (type === "time") return "12:00";
  if (type === "datetime-local") return "2026-01-01T12:00";
  if (type === "month") return "2026-01";
  if (type === "week") return "2026-W01";
  if (type === "color") return "#ff0000";
  if (type === "url" || name.includes("url") || name.includes("website")) return "https://example.com";
  if (type === "tel" || name.includes("tel") || name.includes("phone")) return "+1234567890";

  return "Test Value";
}

function deriveAction(element: any): "fill" | "click" | "check" | "select" {
  if (!element) return "click"; // fallback par dÃ©faut

  const tag = (element.tag || "").toLowerCase();
  const elementType = (element.type || "").toLowerCase();
  const attrs = element.attributes || {};
  const inputType = (attrs.type || "").toLowerCase();

  if (tag === "select" || elementType === "select") return "select";
  if (inputType === "checkbox" || inputType === "radio" || elementType === "checkbox" || elementType === "radio") return "check";

  // CRITICAL: input type="submit" or "button" MUST be clicked, not filled
  if (tag === "input" && (inputType === "submit" || inputType === "button")) return "click";
  if (tag === "input" || tag === "textarea" || elementType === "input" || elementType === "textarea") return "fill";

  return "click"; // button, link, etc.
}

/**
 * Generate the assertions block for the test, taking scenario type into account.
 *
 * POSITIVE: standard URL check + visibility check
 * NEGATIVE / VALIDATION: transforms success-URL assertions into NOT checks,
 *   and adds error-element detection (with multi-selector fallback if no
 *   visibleElementSelector was provided by the LLM).
 */
function generateAssertions(plan: TestPlan, scenarioType: ScenarioType): string {
  const sc = plan.successCriteria;
  let code = "";

  if (scenarioType === "NEGATIVE" || scenarioType === "VALIDATION") {
    // Transform success-URL pattern into a NOT assertion
    if (sc.expectedUrlPattern) {
      const isSuccessUrl = SUCCESS_URL_PATTERNS.some(
        (u) => sc.expectedUrlPattern!.toLowerCase().includes(u)
      );
      if (isSuccessUrl) {
        const escapedRegex = sc.expectedUrlPattern.replace(/\//g, "\\/");
        code += `  // ScÃ©nario nÃ©gatif : l'URL ne doit PAS changer vers la page de succÃ¨s\n`;
        code += `  await expect(page).not.toHaveURL(/.*${escapedRegex}.*/);\n`;
      } else {
        // Not a typical success URL â€” keep it as a regular assertion
        const escapedStr = escapeString(sc.expectedUrlPattern);
        const escapedRegex = sc.expectedUrlPattern.replace(/\//g, "\\/");
        code += `  await page.waitForURL('**/*${escapedStr}*');\n`;
        code += `  await expect(page).toHaveURL(/.*${escapedRegex}.*/);\n`;
      }
    }

    // Error element assertion
    if (sc.visibleElementSelector) {
      // The LLM provided an error element â€” use it directly
      code += `  await expect(page.locator('${escapeString(sc.visibleElementSelector)}').first()).toBeVisible({ timeout: 10000 });\n`;
    } else {
      // Fallback: probe a list of common error selectors at runtime
      const fallbackList = JSON.stringify(ERROR_ELEMENT_FALLBACKS);
      code += `  // DÃ©tection automatique du message d'erreur (fallback multi-sÃ©lecteurs)\n`;
      code += `  {\n`;
      code += `    const errorSelectors: string[] = ${fallbackList};\n`;
      code += `    let errorFound = false;\n`;
      code += `    for (const sel of errorSelectors) {\n`;
      code += `      if (await page.locator(sel).count() > 0) {\n`;
      code += `        await expect(page.locator(sel).first()).toBeVisible({ timeout: 5000 });\n`;
      code += `        errorFound = true;\n`;
      code += `        break;\n`;
      code += `      }\n`;
      code += `    }\n`;
      code += `    if (!errorFound) {\n`;
      code += `      throw new Error('Scénario négatif : aucun message d\\'erreur visible après soumission de données invalides.');\n`;
      code += `    }\n`;
      code += `  }\n`;
    }

    if (sc.hiddenElementSelector) {
      code += `  await expect(page.locator('${escapeString(sc.hiddenElementSelector)}').first()).not.toBeVisible();\n`;
    }
    
    if (sc.expectedText) {
      code += `  await expect(page.locator('body')).not.toContainText('${escapeString(sc.expectedText)}', { timeout: 10000 });\n`;
    }
  } else {
    // POSITIVE / EDGE_CASE: standard assertions
    if (sc.expectedUrlPattern) {
      const escapedStr = escapeString(sc.expectedUrlPattern);
      const escapedRegex = sc.expectedUrlPattern.replace(/\//g, "\\/");
      code += `  await page.waitForURL('**/*${escapedStr}*');\n`;
      code += `  await expect(page).toHaveURL(/.*${escapedRegex}.*/);\n`;
    }
    if (sc.visibleElementSelector) {
      code += `  await expect(page.locator('${escapeString(sc.visibleElementSelector)}').first()).toBeVisible({ timeout: 10000 });\n`;
    }
    if (sc.hiddenElementSelector) {
      code += `  await expect(page.locator('${escapeString(sc.hiddenElementSelector)}').first()).not.toBeVisible();\n`;
    }
    if (sc.expectedText) {
      code += `  await expect(page.locator('body')).toContainText('${escapeString(sc.expectedText)}', { timeout: 10000 });\n`;
    }
  }

  return code;
}

export function renderPlaywrightTest(plan: TestPlan, allElements: any[], scenarioType: ScenarioType = "POSITIVE", authConfig?: { loginUrl: string; username: string; password: string }): string {
  if (plan.infeasible) {
    return `// Généré automatiquement par l'orchestrateur IA — Moteur Déterministe\n// Type de scénario : Inréalisable\n// Raison : ${plan.infeasibleReason}\n\n// Ce test a été marqué comme impossible à générer avec les éléments actuels.`;
  }

  // Generate actions code (with scenario-type-aware values)
  const actionsCode = plan.steps.map((step) => {
    if (step.action === "goto") {
       return `  await page.goto('${escapeString(cleanUrl(step.url || ""))}?');\n  await page.waitForLoadState('domcontentloaded');`;
    }
    
    if (step.action === "expectURL") {
       const escapedRegex = (step.url || "").replace(/\//g, "\\/");
       return `  await expect(page).toHaveURL(/.*${escapedRegex}.*/);`;
    }
    
    if (step.action === "expectText") {
       return `  await expect(page.locator('body')).toContainText('${escapeString(step.value || "")}', { timeout: 10000 });`;
    }

    if (!step.selector) {
        return `  // Step ignorée: sélecteur manquant pour l'action ${step.action}`;
    }

    const element = allElements.find(e => e.selectors && e.selectors.includes(step.selector));
    
    if (!element) {
      return `  // Element non trouvé en base pour le sélecteur: ${step.selector}\n  await performAction(page, ['${escapeString(step.selector)}'], '${step.action}', '${escapeString(step.value || "")}');`;
    }

    const selectorsArray = JSON.stringify(element.selectors);
    let valueToPass = "undefined";

    if (step.action === "fill" || step.action === "selectOption") {
      let finalValue = step.value;
      // Fallback au generateur auto si le LLM n a pas fourni de valeur
      if (!finalValue) {
          finalValue = autoGenerateValue(element, scenarioType);
      }
      valueToPass = `'${escapeString(finalValue)}'`;
    }

    return `  await performAction(page, ${selectorsArray}, '${step.action === "selectOption" ? "select" : step.action}', ${valueToPass});`;
  }).join("\n");

  // 4. Generate assertions (scenario-type-aware)
  const assertionsCode = generateAssertions(plan, scenarioType);

  // 5. Build final test file
  const scenarioTypeLabel = scenarioType === "NEGATIVE" ? "Scénario Négatif"
    : scenarioType === "EDGE_CASE" ? "Cas Limite"
    : scenarioType === "VALIDATION" ? "Scénario de Validation"
    : "Scénario Nominal";

  const navigationCode = actionsCode.includes('page.goto')
    ? ''
    : `  await page.goto('${escapeString(cleanUrl(plan.targetPageUrl))}?');\n  await page.waitForLoadState('domcontentloaded');`;

  const authBlock = authConfig ? `
  // --- Connexion Automatique (Authentification du projet) ---
  await page.goto('${escapeString(authConfig.loginUrl)}');
  await page.fill('input[type="email"], input[name="username"], input[name="email"], input[id*="email"], input[id*="username"]', '${escapeString(authConfig.username)}');
  await page.fill('input[type="password"], input[name="password"], input[id*="password"]', '${escapeString(authConfig.password)}');
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }).catch(() => {}),
    page.click('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Se connecter"), input[type="submit"]')
  ]);
  await page.waitForLoadState("networkidle");
` : '';

  return `// Généré automatiquement par l'orchestrateur IA — Moteur LLM
// Type de scénario : ${scenarioTypeLabel}
// Raisonnement: ${escapeString(plan.reasoning || "Aucun")}
// Ne pas éditer à la main.

import { test, expect, Page } from '@playwright/test';

// Fonction utilitaire embarquée pour garantir la résilience des sélecteurs (Fallback stratégique)
async function performAction(page: Page, selectors: string[], action: 'fill' | 'click' | 'check' | 'uncheck' | 'select', value?: string) {
  for (const sel of selectors) {
    if (await page.locator(sel).count() > 0) {
      const loc = page.locator(sel).first();
      if (action === 'fill') {
        await loc.fill(value!);
      } else if (action === 'click') {
        await loc.click();
      } else if (action === 'check') {
        await loc.check();
      } else if (action === 'uncheck') {
        await loc.uncheck();
      } else if (action === 'select') {
        await loc.selectOption(value!);
      }
      return;
    }
  }
  throw new Error(\`Action \${action} échouée : Aucun des sélecteurs de secours n'a ciblé un élément valide. Sélecteurs essayés : \${selectors.join(', ')}\`);
}

test('${escapeString(plan.testTitle)}', async ({ page }) => {
${authBlock}
  // 1. Navigation initiale (si pas déjà gérée par les steps)
${navigationCode}

  // 2. Actions (Gérées par le LLM)
${actionsCode}

  // 3. Assertions (Vérification de l'état final)
${assertionsCode}
});
`;
}
