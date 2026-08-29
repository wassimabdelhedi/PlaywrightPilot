// apps/orchestrator/src/graphs/test-generation/plan.test.ts

import { describe, it, expect } from "vitest";
import { validatePlan } from "./step-validator.js";
import { renderPlaywrightTest } from "./codegen.js";
import type { TestPlan } from "./step-schema.js";

const allowedSelectors = new Set([
  '[data-testid="email"]',
  '[data-testid="password"]',
  '[data-testid="submit"]',
  '[data-testid="welcome"]',
]);
const allowedUrls = new Set(["https://example.com/login"]);

// Éléments simulés (catalogue du Discovery)
const mockElements = [
  { tag: "input", type: "INPUT", text: null, selectors: ['[data-testid="email"]'], attributes: { type: "email", name: "email" } },
  { tag: "input", type: "INPUT", text: null, selectors: ['[data-testid="password"]'], attributes: { type: "password", name: "password" } },
  { tag: "button", type: "BUTTON", text: "Se connecter", selectors: ['[data-testid="submit"]'], attributes: { type: "submit" } },
  { tag: "div", type: "OTHER", text: "Bienvenue", selectors: ['[data-testid="welcome"]'], attributes: {} },
];

describe("validatePlan (workflow schema)", () => {
  it("accepte un plan valide avec workflow et successCriteria", () => {
    const plan: TestPlan = {
      testTitle: "Connexion réussie",
      targetPageUrl: "https://example.com/login",
      workflow: ['[data-testid="email"]', '[data-testid="password"]', '[data-testid="submit"]'],
      successCriteria: {
        visibleElementSelector: '[data-testid="welcome"]',
      },
    };

    const result = validatePlan(plan, allowedSelectors, allowedUrls);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejette un plan référençant un sélecteur halluciné", () => {
    const plan: TestPlan = {
      testTitle: "Connexion réussie",
      targetPageUrl: "https://example.com/login",
      workflow: ['[data-testid="email"]', '[data-testid="inventé"]'],
      successCriteria: {
        visibleElementSelector: '[data-testid="welcome"]',
      },
    };

    const result = validatePlan(plan, allowedSelectors, allowedUrls);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("n'existe pas"))).toBe(true);
  });

  it("rejette un plan sans aucun critère de succès", () => {
    const plan: TestPlan = {
      testTitle: "Sans assertion",
      targetPageUrl: "https://example.com/login",
      workflow: ['[data-testid="submit"]'],
      successCriteria: {},
    };

    const result = validatePlan(plan, allowedSelectors, allowedUrls);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("critère de succès"))).toBe(true);
  });

  it("rejette une URL hors périmètre", () => {
    const plan: TestPlan = {
      testTitle: "Hors périmètre",
      targetPageUrl: "https://malicious.example/admin",
      workflow: ['[data-testid="submit"]'],
      successCriteria: {
        visibleElementSelector: '[data-testid="welcome"]',
      },
    };

    const result = validatePlan(plan, allowedSelectors, allowedUrls);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("non autorisée"))).toBe(true);
  });

  it("détecte les doublons dans le workflow", () => {
    const plan: TestPlan = {
      testTitle: "Doublons",
      targetPageUrl: "https://example.com/login",
      workflow: ['[data-testid="email"]', '[data-testid="email"]'],
      successCriteria: {
        visibleElementSelector: '[data-testid="welcome"]',
      },
    };

    const result = validatePlan(plan, allowedSelectors, allowedUrls);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("doublon"))).toBe(true);
  });
});

describe("renderPlaywrightTest (deterministic codegen)", () => {
  it("produit un fichier Playwright avec des actions déduites du type d'élément", () => {
    const plan: TestPlan = {
      testTitle: "Connexion réussie",
      targetPageUrl: "https://example.com/login",
      workflow: ['[data-testid="email"]', '[data-testid="password"]', '[data-testid="submit"]'],
      successCriteria: {
        visibleElementSelector: '[data-testid="welcome"]',
      },
    };

    const code = renderPlaywrightTest(plan, mockElements);

    expect(code).toContain("import { test, expect, Page } from '@playwright/test'");
    expect(code).toContain("test('Connexion réussie'");
    expect(code).toContain("await page.goto('https://example.com/login')");
    // Le moteur déduit fill pour les inputs et click pour le button
    expect(code).toContain("'fill'");
    expect(code).toContain("'click'");
    // Il doit y avoir performAction (helper de fallback)
    expect(code).toContain("async function performAction");
    // Assertion de succès
    expect(code).toContain("toBeVisible");
  });

  it("ordonne les fills avant les clicks", () => {
    const plan: TestPlan = {
      testTitle: "Ordre déterministe",
      targetPageUrl: "https://example.com/login",
      workflow: ['[data-testid="submit"]', '[data-testid="email"]'],
      successCriteria: {
        expectedUrlPattern: "/dashboard",
      },
    };

    const code = renderPlaywrightTest(plan, mockElements);

    // fill doit apparaître AVANT click dans le code généré
    const fillIndex = code.indexOf("'fill'");
    const clickIndex = code.indexOf("'click'");
    expect(fillIndex).toBeLessThan(clickIndex);
  });
});
