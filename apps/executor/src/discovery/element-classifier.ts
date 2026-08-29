// apps/executor/src/discovery/element-classifier.ts

import type { Page } from "playwright";
import { computeSelectors } from "./selector-strategy.js";

// Doit rester synchronisé avec l'enum Prisma ElementType (Phase 2).
export type ElementType =
  | "BUTTON"
  | "LINK"
  | "FORM"
  | "INPUT"
  | "SELECT"
  | "CHECKBOX"
  | "RADIO"
  | "NAVIGATION"
  | "MODAL"
  | "TABLE"
  | "OTHER";

export interface ClassifiedElement {
  type: ElementType;
  selectors: string[];
  tag: string;
  text: string | null;
  attributes: Record<string, string | null>;
  isVisible: boolean;
}

const DISCOVERY_SELECTOR =
  "button, a[href], form, input, select, textarea, nav, [role=navigation], [role=dialog], table, details, summary, option";

function classifyTag(tagName: string, inputType: string | null, role: string | null): ElementType {
  if (role === "navigation" || tagName === "nav") return "NAVIGATION";
  if (role === "dialog") return "MODAL";
  if (tagName === "table") return "TABLE";
  if (tagName === "form") return "FORM";
  if (tagName === "a") return "LINK";
  if (tagName === "button") return "BUTTON";
  if (tagName === "select" || tagName === "option") return "SELECT";
  if (tagName === "input") {
    if (inputType === "checkbox") return "CHECKBOX";
    if (inputType === "radio") return "RADIO";
    return "INPUT";
  }
  if (tagName === "textarea") return "INPUT";
  return "OTHER";
}

export async function classifyPageElements(page: Page): Promise<ClassifiedElement[]> {
  const handles = await page.$$(DISCOVERY_SELECTOR);
  const results: ClassifiedElement[] = [];

  for (const handle of handles) {
    const [tagName, inputType, role, isVisible] = await Promise.all([
      handle.evaluate((el) => el.tagName.toLowerCase()),
      handle.evaluate((el) => ((el as Element & { type?: string }).type) ?? null).catch(() => null),
      handle.getAttribute("role"),
      handle.isVisible(),
    ]);

    const selectors = await computeSelectors(handle, page);
    if (selectors.length === 0) {
      await handle.dispose();
      continue; // Si on ne peut pas générer de sélecteur unique, on l'ignore.
    }

    const text = await extractLabel(handle, tagName);

    results.push({
      type: classifyTag(tagName, inputType, role),
      selectors,
      tag: tagName,
      text,
      attributes: {
        id: await handle.getAttribute("id"),
        name: await handle.getAttribute("name"),
        placeholder: await handle.getAttribute("placeholder"),
        ariaLabel: await handle.getAttribute("aria-label"),
        role,
        type: inputType,
        href: tagName === "a" ? await handle.getAttribute("href") : null,
        value: await handle.evaluate((el) => (el as HTMLInputElement).value ?? null).catch(() => null),
        dataTest: await handle.getAttribute("data-test"),
        dataTestId: await handle.getAttribute("data-testid"),
        dataCy: await handle.getAttribute("data-cy"),
        className: await handle.getAttribute("class"),
        disabled: await handle.evaluate((el) => (el as HTMLInputElement).disabled ? "true" : null).catch(() => null),
        required: await handle.evaluate((el) => (el as HTMLInputElement).required ? "true" : null).catch(() => null),
      },
      isVisible,
    });

    await handle.dispose();
  }

  return results;
}

async function extractLabel(handle: Awaited<ReturnType<Page["$$"]>>[number], tagName: string): Promise<string | null> {
  if (tagName === "input" || tagName === "select" || tagName === "textarea") {
    return (
      (await handle.getAttribute("placeholder")) ??
      (await handle.getAttribute("aria-label")) ??
      (await handle.getAttribute("name"))
    );
  }
  const text = (await handle.textContent())?.trim();
  return text && text.length > 0 ? text.slice(0, 80) : null;
}
