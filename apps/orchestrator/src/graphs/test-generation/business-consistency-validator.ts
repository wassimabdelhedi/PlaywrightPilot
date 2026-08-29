// apps/orchestrator/src/graphs/test-generation/business-consistency-validator.ts
//
// Valide la coherence metier entre le type de scenario et le plan genere.
// Extrait et enrichit la logique partielle de validate-plan.ts / generate-plan.ts.
//
// Regles :
//   NEGATIVE + URL succes        -> REJET
//   NEGATIVE + texte succes      -> REJET
//   EDGE_CASE + dashboard visible -> REJET
//   POSITIVE + texte erreur      -> REJET

import type { ScenarioType } from "./scenario-type-detector.js";
import type { TestPlan } from "./step-schema.js";

const SUCCESS_URL_PATTERNS = ["/inventory", "/dashboard", "/home", "/profile", "/cart", "/checkout", "/account", "/confirmation"];
const SUCCESS_TEXTS = ["success", "welcome", "logged in", "order confirmed", "added to cart", "registered", "merci", "bienvenue"];
const ERROR_TEXTS = ["error", "invalid", "incorrect", "failed", "wrong", "not found", "unauthorized", "forbidden"];

export interface ConsistencyViolation {
  rule: string;
  description: string;
  /** Message de feedback injecte dans le prochain prompt LLM pour correction */
  feedback: string;
}

/**
 * Valide la coherence metier scenario <-> plan genere.
 * Retourne une liste de violations (vide = plan coherent).
 */
export function validateBusinessConsistency(
  scenarioType: ScenarioType,
  scenarioTitle: string,
  plan: TestPlan,
): ConsistencyViolation[] {
  const violations: ConsistencyViolation[] = [];
  const titleLower = scenarioTitle.toLowerCase();

  // --- Regles NEGATIVE ---
  if (scenarioType === "NEGATIVE") {
    // REGLE N1 : Un scenario negatif ne doit PAS rediriger vers une URL de succes
    const urlPattern = plan.successCriteria.expectedUrlPattern ?? "";
    if (urlPattern && SUCCESS_URL_PATTERNS.some((p) => urlPattern.includes(p))) {
      violations.push({
        rule: "N1_NEGATIVE_SUCCESS_URL",
        description: `Scenario NEGATIVE "${scenarioTitle}" genere une assertion URL de succes : "${urlPattern}"`,
        feedback: `CORRECTION REQUISE: Ce scenario est de type NEGATIVE (echec attendu). L URL attendue "${urlPattern}" correspond a un flux de SUCCES. Un scenario d echec de connexion ne doit PAS attendre /inventory ou /dashboard. Supprimez expectedUrlPattern ou remplacez-la par l URL de la page de connexion.`,
      });
    }

    // REGLE N2 : Un scenario negatif ne doit PAS attendre un texte de succes
    const expectedText = (plan.successCriteria.expectedText ?? "").toLowerCase();
    if (expectedText && SUCCESS_TEXTS.some((t) => expectedText.includes(t))) {
      violations.push({
        rule: "N2_NEGATIVE_SUCCESS_TEXT",
        description: `Scenario NEGATIVE "${scenarioTitle}" attend un texte de succes : "${plan.successCriteria.expectedText}"`,
        feedback: `CORRECTION REQUISE: Ce scenario NEGATIVE attend "${plan.successCriteria.expectedText}" qui est un message de succes. Remplacez par un message d erreur attendu (ex: "Epic sadface", "Username and password do not match", "Invalid credentials").`,
      });
    }

    // REGLE N3 : Un scenario negatif DOIT avoir une assertion d erreur visible
    const hasErrorAssertion =
      plan.successCriteria.visibleElementSelector?.includes("error") ||
      plan.successCriteria.expectedText !== undefined;
    if (!hasErrorAssertion && !violations.length) {
      violations.push({
        rule: "N3_NEGATIVE_MISSING_ERROR_ASSERTION",
        description: `Scenario NEGATIVE "${scenarioTitle}" n a aucune assertion d erreur`,
        feedback: `CORRECTION REQUISE: Ce scenario NEGATIVE doit verifier qu un message d erreur est visible. Ajoutez visibleElementSelector: '[data-test="error"]' ou expectedText avec le message d erreur attendu.`,
      });
    }
  }

  // --- Regles POSITIVE ---
  if (scenarioType === "POSITIVE") {
    // REGLE P1 : Un scenario positif ne doit PAS attendre un texte d erreur
    const expectedText = (plan.successCriteria.expectedText ?? "").toLowerCase();
    if (expectedText && ERROR_TEXTS.some((t) => expectedText.includes(t))) {
      violations.push({
        rule: "P1_POSITIVE_ERROR_TEXT",
        description: `Scenario POSITIVE "${scenarioTitle}" attend un texte d erreur : "${plan.successCriteria.expectedText}"`,
        feedback: `CORRECTION REQUISE: Ce scenario POSITIVE ne doit pas attendre "${plan.successCriteria.expectedText}" (message d erreur). Remplacez par un texte de succes ou une URL de destination.`,
      });
    }
  }

  // --- Regles EDGE_CASE ---
  if (scenarioType === "EDGE_CASE") {
    // REGLE E1 : Un edge case ne doit pas attendre une page de dashboard si le titre implique un echec
    const urlPattern = plan.successCriteria.expectedUrlPattern ?? "";
    const impliesFailure = titleLower.includes("empty") || titleLower.includes("invalid") ||
      titleLower.includes("special") || titleLower.includes("overflow") || titleLower.includes("missing");
    if (impliesFailure && urlPattern && SUCCESS_URL_PATTERNS.some((p) => urlPattern.includes(p))) {
      violations.push({
        rule: "E1_EDGE_CASE_SUCCESS_REDIRECT",
        description: `Scenario EDGE_CASE "${scenarioTitle}" (test d echec) attend une redirection vers "${urlPattern}"`,
        feedback: `CORRECTION REQUISE: Ce scenario EDGE_CASE teste une condition limite (${titleLower.includes("empty") ? "champs vides" : "entree speciale"}). Il ne doit pas attendre une redirection vers "${urlPattern}". Supprimez expectedUrlPattern ou utilisez un visibleElementSelector pour un element stable sur la page courante.`,
      });
    }
  }

  return violations;
}
