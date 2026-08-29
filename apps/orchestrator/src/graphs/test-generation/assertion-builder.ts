// apps/orchestrator/src/graphs/test-generation/assertion-builder.ts
//
// Genere les assertions (successCriteria) adaptees au type de scenario.
// Avant : tous les scenarios avaient les memes assertions generiques.
// Apres : assertions specifiques selon POSITIVE / NEGATIVE / EDGE_CASE.

import type { ScenarioType } from "./scenario-type-detector.js";

export interface SuccessCriteria {
  expectedUrlPattern?: string;
  visibleElementSelector?: string;
  hiddenElementSelector?: string;
  expectedText?: string;
}

// Selecteurs d elements d erreur testes en ordre de preference
const ERROR_SELECTORS = [
  '[data-test="error"]',
  '[data-testid="error"]',
  '[data-testid="error-message"]',
  '.error-message',
  '[role="alert"]',
  '.error',
  '#error',
  '.alert-danger',
  '.notification-error',
  '[class*="error"]',
];

// Patterns d URL indiquant un succes metier
const SUCCESS_URL_PATTERNS: Record<string, string> = {
  login: "/inventory",
  register: "/dashboard",
  checkout: "/confirmation",
  cart: "/cart",
  dashboard: "/dashboard",
};

export interface AssertionContext {
  scenarioType: ScenarioType;
  scenarioTitle: string;
  /** Assertions proposees par le LLM (peuvent etre incompletes/incorrectes) */
  llmSuggested?: Partial<SuccessCriteria>;
  /** URLs disponibles pour valider les patterns */
  availableUrls?: string[];
}

/**
 * Construit les assertions finales selon le type de scenario.
 * Corrige et enrichit les propositions du LLM.
 */
export function buildAssertions(ctx: AssertionContext): SuccessCriteria {
  const titleLower = ctx.scenarioTitle.toLowerCase();

  switch (ctx.scenarioType) {
    case "POSITIVE":
      return buildPositiveAssertions(ctx, titleLower);

    case "NEGATIVE":
      return buildNegativeAssertions(ctx, titleLower);

    case "EDGE_CASE":
      return buildEdgeCaseAssertions(ctx, titleLower);

    default:
      return ctx.llmSuggested ?? {};
  }
}

function buildPositiveAssertions(ctx: AssertionContext, titleLower: string): SuccessCriteria {
  const result: SuccessCriteria = {};

  // URL attendue apres succes
  if (ctx.llmSuggested?.expectedUrlPattern) {
    result.expectedUrlPattern = ctx.llmSuggested.expectedUrlPattern;
  } else {
    // Inference depuis le titre
    for (const [keyword, pattern] of Object.entries(SUCCESS_URL_PATTERNS)) {
      if (titleLower.includes(keyword)) {
        result.expectedUrlPattern = pattern;
        break;
      }
    }
  }

  // Element visible de succes
  if (ctx.llmSuggested?.visibleElementSelector) {
    result.visibleElementSelector = ctx.llmSuggested.visibleElementSelector;
  }

  // Texte de succes metier
  if (ctx.llmSuggested?.expectedText && !isErrorText(ctx.llmSuggested.expectedText)) {
    result.expectedText = ctx.llmSuggested.expectedText;
  }

  return result;
}

function buildNegativeAssertions(ctx: AssertionContext, titleLower: string): SuccessCriteria {
  const result: SuccessCriteria = {};

  // CRITIQUE : scenario NEGATIVE ne doit JAMAIS asserter une URL de succes
  // Si le LLM a propose une URL de succes, on l ignore
  const proposed = ctx.llmSuggested?.expectedUrlPattern;
  if (proposed && !isSuccessUrl(proposed)) {
    result.expectedUrlPattern = proposed;
  }
  // Sinon on n ajoute pas d expectedUrlPattern (on reste sur la meme page)

  // On s assure qu un element d erreur est visible
  if (ctx.llmSuggested?.visibleElementSelector && isErrorSelector(ctx.llmSuggested.visibleElementSelector)) {
    result.visibleElementSelector = ctx.llmSuggested.visibleElementSelector;
  } else {
    // Fallback : premier selecteur d erreur connu
    result.visibleElementSelector = ERROR_SELECTORS[0];
  }

  // Message d erreur attendu
  if (ctx.llmSuggested?.expectedText && isErrorText(ctx.llmSuggested.expectedText)) {
    result.expectedText = ctx.llmSuggested.expectedText;
  }

  return result;
}

function buildEdgeCaseAssertions(ctx: AssertionContext, titleLower: string): SuccessCriteria {
  const result: SuccessCriteria = {};

  // EDGE_CASE : verifier qu il n y a pas de crash (page stable)
  // On n impose pas d URL specifique — l edge case peut rester sur la meme page

  // Element stable visible (formulaire ou page initiale)
  if (ctx.llmSuggested?.visibleElementSelector) {
    result.visibleElementSelector = ctx.llmSuggested.visibleElementSelector;
  }

  // Message d erreur ou de validation appropriate
  if (ctx.llmSuggested?.expectedText) {
    result.expectedText = ctx.llmSuggested.expectedText;
  }

  // Pour les cas "empty fields" : verifier qu un message de validation apparait
  if (titleLower.includes("empty") || titleLower.includes("missing")) {
    if (!result.visibleElementSelector) {
      result.visibleElementSelector = ERROR_SELECTORS[0];
    }
  }

  return result;
}

// --- Helpers ---

function isSuccessUrl(url: string): boolean {
  const successPatterns = ["/inventory", "/dashboard", "/home", "/profile", "/cart", "/checkout", "/account", "/confirmation"];
  return successPatterns.some((p) => url.includes(p));
}

function isErrorText(text: string): boolean {
  const errorKeywords = ["error", "invalid", "incorrect", "failed", "wrong", "not found", "unauthorized", "forbidden", "rejected"];
  const lower = text.toLowerCase();
  return errorKeywords.some((k) => lower.includes(k));
}

function isErrorSelector(selector: string): boolean {
  return ERROR_SELECTORS.some((s) => selector.includes(s.replace(/[\[\]'"]/g, "").split("=")[0]));
}
