// apps/orchestrator/src/graphs/test-generation/step-validator.ts

import type { TestPlan } from "./step-schema.js";
import type { ScenarioType } from "./scenario-type-detector.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePlan(
  plan: TestPlan,
  allowedSelectors: Set<string>,
  allowedUrls: Set<string>,
  scenarioType: ScenarioType = "POSITIVE",
): ValidationResult {
  const errors: string[] = [];

  // 1. Valider l'URL cible
  if (!plan.targetPageUrl || !allowedUrls.has(plan.targetPageUrl)) {
    errors.push(`URL cible invalide ou non autorisÃ©e : ${plan.targetPageUrl}`);
  }

  // 2. Valider chaque sÃ©lecteur dans le workflow
  for (const [index, step] of plan.steps.entries()) {
    if (step.selector && !allowedSelectors.has(step.selector)) {
      errors.push(
        `Workflow step $index : le selecteur "${step.selector}" n'existe pas dans le catalogue. N'inventez jamais de selecteurs.`
      );
    }
  }

  // 3. Detecter les doublons
  const seen = new Set<string>();
  for (const step of plan.steps) {
    if (step.selector) {
      if (seen.has(step.selector)) {
        errors.push(`Workflow contient un doublon : "${step.selector}".`);
      }
      seen.add(step.selector);
    }
  }

  // 4. Valider les critÃ¨res de succÃ¨s
  //
  // RÃˆGLE : Chaque plan DOIT avoir au moins UN critÃ¨re de succÃ¨s.
  //
  // EXCEPTION pour les scÃ©narios NÃ‰GATIFS / VALIDATION :
  //   - Le codegen gÃ©nÃ¨re automatiquement un fallback d'assertion d'erreur
  //     (dÃ©tection multi-sÃ©lecteurs de l'Ã©lÃ©ment d'erreur) si aucun
  //     visibleElementSelector n'est fourni.
  //   - Un plan NÃ‰GATIF sans successCriteria est donc toujours exÃ©cutable.
  //   - On Ã©met un avertissement non-bloquant au lieu d'une erreur pour
  //     inciter le LLM Ã  faire mieux au prochain essai, sans bloquer la pipeline.
  //
  const sc = plan.successCriteria;
  const hasAnyCriteria = sc.expectedUrlPattern || sc.visibleElementSelector || sc.hiddenElementSelector || sc.expectedText;

  if (!hasAnyCriteria) {
    if (scenarioType === "NEGATIVE" || scenarioType === "VALIDATION") {
      // Non-bloquant : le codegen ajoutera le fallback d'assertion d'erreur automatiquement
      // On n'ajoute pas d'erreur ici pour ne pas bloquer la gÃ©nÃ©ration
    } else {
      // Bloquant pour les scÃ©narios positifs : ils doivent toujours affirmer un Ã©tat de succÃ¨s
      errors.push("Le plan de test doit fournir au moins un critÃ¨re de succÃ¨s (successCriteria).");
    }
  }

  // 5. Valider que les sÃ©lecteurs citÃ©s dans les critÃ¨res existent
  if (sc.visibleElementSelector && !allowedSelectors.has(sc.visibleElementSelector)) {
    // Pour les scÃ©narios NÃ‰GATIFS, les sÃ©lecteurs d'erreur (ex: [data-test="error"]) peuvent
    // ne pas Ãªtre dans le catalogue si la page d'erreur n'a pas Ã©tÃ© crawlÃ©e.
    // On les autorise car ils sont valides mÃªme si absents du catalogue de crawl.
    if (scenarioType !== "NEGATIVE" && scenarioType !== "VALIDATION") {
      errors.push(`CritÃ¨re de succÃ¨s invalide : l'Ã©lÃ©ment "${sc.visibleElementSelector}" est inconnu.`);
    }
  }

  if (sc.hiddenElementSelector && !allowedSelectors.has(sc.hiddenElementSelector)) {
    errors.push(`CritÃ¨re de succÃ¨s invalide : l'Ã©lÃ©ment "${sc.hiddenElementSelector}" est inconnu.`);
  }

  return { valid: errors.length === 0, errors };
}


