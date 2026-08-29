// apps/orchestrator/src/graphs/test-generation/nodes/self-check.ts

import { callStructured } from "../../../llm/client.js";
import { testPlanSchema } from "../step-schema.js";
import type { TestGenerationStateType } from "../state.js";
import { logger } from "@platform/logger";

const SYSTEM_PROMPT = `You are a QA Validation Agent.

Review the generated TestPlan.

Check:

1. Does every selector exist?
2. Does every URL exist?
3. Does every action match element type?
4. Are all mandatory fields completed before submit?
5. Is there at least one assertion?
6. Is the workflow executable?
7. Is there any duplicate step?
8. Is there any hallucinated element?

Correct every violation.

Return corrected JSON only.`;

export async function selfCheckPlan(state: TestGenerationStateType) {
  if (!state.plan) {
    throw new Error("Self-check impossible : aucun plan gÃ©nÃ©rÃ©.");
  }

  // On injecte le plan gÃ©nÃ©rÃ© prÃ©cÃ©dent dans le prompt pour que le LLM le corrige
  const userPrompt = `Voici le plan gÃ©nÃ©rÃ© Ã  valider et corriger :\n\n${JSON.stringify(state.plan, null, 2)}\n\n---\n\nÃ‰lÃ©ments disponibles pour vÃ©rification :\n${state.availableElements}`;

  const { data: correctedPlan } = await callStructured(testPlanSchema, {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    schemaName: "test_plan_corrected",
  });

  logger.info({ scenarioId: state.scenarioId }, "QA Validation Agent a validÃ©/corrigÃ© le plan.");

  return { plan: correctedPlan };
}

