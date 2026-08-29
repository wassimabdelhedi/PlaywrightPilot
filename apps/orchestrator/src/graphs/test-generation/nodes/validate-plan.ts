// apps/orchestrator/src/graphs/test-generation/nodes/validate-plan.ts

import { validatePlan } from "../step-validator.js";
import type { TestGenerationStateType } from "../state.js";

export function validatePlanNode(state: TestGenerationStateType) {
  if (!state.plan) {
    return { validationErrors: ["Aucun plan généré"] };
  }

  const result = validatePlan(state.plan, new Set(state.allowedSelectors), new Set(state.allowedUrls), state.scenarioType ?? "POSITIVE");

  return {
    validationErrors: result.errors,
    feedback: result.valid ? null : result.errors.join("\n"),
  };
}
