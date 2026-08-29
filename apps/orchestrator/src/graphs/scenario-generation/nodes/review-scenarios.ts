// apps/orchestrator/src/graphs/scenario-generation/nodes/review-scenarios.ts
//
// Second LLM pass after generation: each scenario is sent back to the model
// with a coherence-review prompt. If the title implies NEGATIVE but the
// description says "valid data", the model rewrites the description to match
// the title's intent. This eliminates the most common generation bug:
// title and description describing two different business intents.

import { z } from "zod";
import { logger } from "@platform/logger";
import { callStructured } from "../../../llm/client.js";
import { resolveProviderName } from "../../../llm/providers/registry.js";
import { config } from "@platform/config";
import type { ScenarioDraft, ScenarioGenerationStateType } from "../state.js";

// Keywords that signal a NEGATIVE scenario title
const NEGATIVE_TITLE_KEYWORDS = [
  "invalid", "incorrect", "wrong", "error", "failure", "fail",
  "rejected", "reject", "denied", "deny", "unauthorized", "forbidden",
  "not found", "missing", "expired", "locked", "blocked",
];

// Keywords that should NOT appear in a NEGATIVE scenario description
const POSITIVE_DESCRIPTION_SIGNALS = [
  "valid email", "valid credentials", "valid password", "valid input",
  "successfully submit", "should be able to submit", "should be able to login",
];

const reviewedScenarioSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(600),
  businessGoal: z.string().min(10).max(300),
  wasModified: z.boolean(),
  modificationReason: z.string().optional(),
});

const REVIEW_SYSTEM_PROMPT = `You are a QA scenario coherence reviewer.

Your job is to check if the scenario title and description describe the SAME business intent.

COHERENCE RULES:
1. If the title contains: invalid, incorrect, wrong, error, failure, rejected, denied, unauthorized
   -> The description MUST describe a FAILURE condition (error visible, form rejected, login denied, etc.)
   -> The description MUST NOT say "valid" data or describe a success flow

2. If the title contains: successful, success, nominal, happy path
   -> The description MUST describe a SUCCESS flow with VALID data
   -> The description MUST NOT describe failures

3. If the title contains: empty, boundary, edge, limit, long, special character
   -> The description MUST describe a BOUNDARY condition
   -> The description MUST state what the system should do at this boundary

If the scenario is ALREADY coherent: return it unchanged with wasModified=false.

If the scenario is INCOHERENT: rewrite ONLY the description and businessGoal to match the title's intent.
Set wasModified=true and explain why in modificationReason.

NEVER change the title.
NEVER invent new features not related to the original description.
Return JSON only.`;

function buildReviewPrompt(draft: ScenarioDraft): string {
  return `Review this test scenario for coherence between title and description:

TITLE: "${draft.candidate.title}"
DESCRIPTION: "${draft.candidate.description}"
BUSINESS GOAL: "${draft.candidate.businessGoal}"
FEATURE CONTEXT: "${draft.feature.name} â€” ${draft.feature.description}"

Is the description coherent with the title? If not, rewrite description and businessGoal only.`;
}

/**
 * Fast local check: does this draft have an obvious incoherence that
 * doesn't require a full LLM call to detect?
 * Returns true if the draft is clearly incoherent.
 */
function isObviouslyIncoherent(draft: ScenarioDraft): boolean {
  const titleLower = draft.candidate.title.toLowerCase();
  const descLower = draft.candidate.description.toLowerCase();

  const hasNegativeTitle = NEGATIVE_TITLE_KEYWORDS.some((kw) => titleLower.includes(kw));
  if (!hasNegativeTitle) return false;

  return POSITIVE_DESCRIPTION_SIGNALS.some((signal) => descLower.includes(signal));
}

async function reviewScenario(draft: ScenarioDraft): Promise<ScenarioDraft> {
  // Skip the LLM call if the scenario looks coherent (fast-path)
  if (!isObviouslyIncoherent(draft)) {
    return draft;
  }

  logger.warn(
    { title: draft.candidate.title, description: draft.candidate.description.slice(0, 80) },
    "ScÃ©nario incohÃ©rent dÃ©tectÃ© â€” envoi en rÃ©vision LLM"
  );

  try {
    const { data: reviewed } = await callStructured(reviewedScenarioSchema, {
      systemPrompt: REVIEW_SYSTEM_PROMPT,
      userPrompt: buildReviewPrompt(draft),
      schemaName: "reviewed_scenario",
    });

    if (reviewed.wasModified) {
      logger.info(
        {
          title: draft.candidate.title,
          oldDescription: draft.candidate.description.slice(0, 60),
          newDescription: reviewed.description.slice(0, 60),
          reason: reviewed.modificationReason,
        },
        "Description de scÃ©nario corrigÃ©e par le rÃ©viseur"
      );
    }

    return {
      feature: draft.feature,
      candidate: {
        ...draft.candidate,
        description: reviewed.description,
        businessGoal: reviewed.businessGoal,
      },
    };
  } catch (err) {
    // If the review LLM call fails, keep the original draft â€” never block the pipeline
    logger.warn({ title: draft.candidate.title, err }, "RÃ©vision LLM Ã©chouÃ©e, scÃ©nario original conservÃ©");
    return draft;
  }
}

export async function reviewScenarios(state: ScenarioGenerationStateType) {
  const reviewed: ScenarioDraft[] = [];

  for (const draft of state.drafts) {
    const result = await reviewScenario(draft);
    reviewed.push(result);
  }

  logger.info({ total: state.drafts.length, reviewed: reviewed.length }, "RÃ©vision de cohÃ©rence des scÃ©narios terminÃ©e");

  return { drafts: reviewed };
}

