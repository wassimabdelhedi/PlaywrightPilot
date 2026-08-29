// apps/executor/src/discovery/selector-strategy.ts
//
// Priorité de sélecteurs pour générer une liste robuste pour le LLM.
// L'ordre est essentiel : le LLM doit pouvoir choisir le plus pertinent,
// et Playwright ne doit utiliser que des sélecteurs validés.
//
// Ordre de priorité :
//   1. data-test / data-testid / data-cy
//   2. id (si stable)
//   3. name
//   4. aria-label
//   5. role
//   6. css (fallback)
//   7. xpath (fallback)

import type { ElementHandle, Page } from "playwright";

export async function computeSelectors(element: ElementHandle, page: Page): Promise<string[]> {
  const selectors: string[] = [];
  const tagName = await element.evaluate((el) => (el as Element).tagName.toLowerCase());

  // Helper pour valider l'unicité
  const addIfUnique = async (sel: string) => {
    try {
      const count = await page.locator(sel).count();
      if (count === 1 && !selectors.includes(sel)) {
        selectors.push(sel);
      }
    } catch {
      // Ignorer les erreurs Playwright sur des sélecteurs invalides
    }
  };

  // 1. data-test, data-testid, data-cy
  for (const attr of ["data-test", "data-testid", "data-cy"]) {
    const value = await element.getAttribute(attr).catch(() => null);
    if (value) {
      await addIfUnique(`[${attr}="${escapeQuotes(value)}"]`);
      // Parfois le LLM utilise des single quotes, on fournit aussi la version sans quote si c'est un mot simple, 
      // ou on comptera sur le fait que l'orchestrateur passera ces choix littéraux au LLM.
    }
  }

  // 2. ID
  const id = await element.getAttribute("id").catch(() => null);
  if (id && !looksGenerated(id)) {
    const escapedId = await element.evaluate((_, idStr) => CSS.escape(idStr), id);
    await addIfUnique(`#${escapedId}`);
  }

  // 3. Name
  const name = await element.getAttribute("name").catch(() => null);
  if (name) {
    await addIfUnique(`${tagName}[name="${escapeQuotes(name)}"]`);
    await addIfUnique(`[name="${escapeQuotes(name)}"]`);
  }

  // 4. Aria-label
  const ariaLabel = await element.getAttribute("aria-label").catch(() => null);
  if (ariaLabel) {
    await addIfUnique(`[aria-label="${escapeQuotes(ariaLabel)}"]`);
  }

  // 5. Role
  const role = await element.getAttribute("role").catch(() => null);
  if (role) {
    await addIfUnique(`[role="${escapeQuotes(role)}"]`);
  }

  // 6. Texte (pour boutons / liens)
  const text = (await element.textContent().catch(() => null))?.trim();
  if (text && text.length > 0 && text.length <= 40 && ["button", "a"].includes(tagName)) {
    await addIfUnique(`${tagName}:has-text("${escapeQuotes(text)}")`);
  }

  // 7. CSS path (dernier recours)
  const cssPathStr = await cssPath(element);
  if (cssPathStr) {
    await addIfUnique(cssPathStr);
  }

  // 8. XPath (dernier recours ultime)
  const xpathStr = await xpathGenerator(element);
  if (xpathStr) {
    await addIfUnique(xpathStr);
  }

  return selectors;
}

function looksGenerated(id: string): boolean {
  return /^(radix-|mui-|:r\d|[a-z]+-\d{4,})/i.test(id) || /^[0-9a-f]{8,}$/i.test(id);
}

function escapeQuotes(text: string): string {
  return text.replace(/"/g, '\\"');
}

async function cssPath(element: ElementHandle): Promise<string> {
  return element.evaluate((el) => {
    const parts: string[] = [];
    let node = el as Element;
    while (node && node.nodeType === 1 /* ELEMENT_NODE */ && parts.length < 5) {
      let selector = node.nodeName.toLowerCase();
      const parent = node.parentElement;
      if (parent) {
        const allChildren = Array.from(parent.children) as Element[];
        const siblings = allChildren.filter((c) => c.nodeName === node.nodeName);
        if (siblings.length > 1) {
          selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
      }
      if (node.id) {
        selector += `#${CSS.escape(node.id)}`;
      }
      parts.unshift(selector);
      node = (node.parentElement as Element);
      if (!node) break;
    }
    return parts.join(" > ");
  });
}

async function xpathGenerator(element: ElementHandle): Promise<string> {
  return element.evaluate((el) => {
    let node = el as Element;
    const paths: string[] = [];
    for (; node && node.nodeType === 1; node = node.parentNode as Element) {
      let index = 0;
      for (let sibling = node.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
        if (sibling.nodeName === node.nodeName) ++index;
      }
      const tagName = node.nodeName.toLowerCase();
      const pathIndex = (index ? `[${index + 1}]` : '');
      paths.splice(0, 0, tagName + pathIndex);
    }
    return paths.length ? '/' + paths.join('/') : '';
  });
}
