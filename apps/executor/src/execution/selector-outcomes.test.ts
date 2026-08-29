// apps/executor/src/execution/selector-outcomes.test.ts

import { describe, it, expect } from "vitest";
import { extractSelectorsFromSource } from "./selector-outcomes.js";

describe("extractSelectorsFromSource", () => {
  it("extrait tous les sélecteurs utilisés dans un fichier de test généré", () => {
    const source = `
      import { test, expect } from '@playwright/test';
      test('connexion', async ({ page }) => {
        await page.goto('https://example.com/login');
        await page.locator('[data-testid="email"]').fill('a@b.com');
        await page.locator('[data-testid="submit"]').click();
        await expect(page.locator('[data-testid="welcome"]')).toBeVisible();
      });
    `;

    const selectors = extractSelectorsFromSource(source);

    expect(selectors).toEqual(['[data-testid="email"]', '[data-testid="submit"]', '[data-testid="welcome"]']);
  });

  it("dédoublonne un sélecteur utilisé plusieurs fois", () => {
    const source = `
      await page.locator('#submit').click();
      await page.locator('#submit').click();
    `;

    expect(extractSelectorsFromSource(source)).toEqual(["#submit"]);
  });

  it("renvoie un tableau vide si aucun sélecteur n'est présent", () => {
    expect(extractSelectorsFromSource("const x = 1;")).toEqual([]);
  });
});
