// apps/orchestrator/src/graphs/test-generation/nodes/generate-plan.ts
// Phase 11 â€” Test Plan Generation via TESTPLAN_LLM (Gemini Flash par defaut).
// Integre : action-resolver, assertion-builder, business-consistency-validator.

import { z } from "zod";
import { config } from "@platform/config";
import { prisma } from "@platform/database";
import { callStructured } from "../../../llm/client.js";
import { resolveProviderName } from "../../../llm/providers/registry.js";
import { isConfident } from "../../../llm/confidence.js";
import { testPlanSchema, type TestPlan } from "../step-schema.js";
import type { TestGenerationStateType } from "../state.js";
import { logger } from "@platform/logger";
import {
  getScenarioTypeInstructions,
} from "../scenario-type-detector.js";
import { buildAssertions } from "../assertion-builder.js";
import { validateBusinessConsistency } from "../business-consistency-validator.js";

const relaxedPlanSchema = z.object({
  testTitle: z.string().default("Untitled Test"),
  targetPageUrl: z.string().default(""),
  steps: z.array(z.object({
    action: z.enum(["goto", "click", "fill", "check", "uncheck", "selectOption", "expectVisible", "expectText", "expectURL"]),
    selector: z.string().optional(),
    url: z.string().optional(),
    value: z.string().optional()
  })).default([]),
  successCriteria: z.object({
    expectedUrlPattern: z.string().optional(),
    visibleElementSelector: z.string().optional(),
    hiddenElementSelector: z.string().optional(),
    expectedText: z.string().optional(),
  }).default({}),
  infeasible: z.boolean().optional(),
  infeasibleReason: z.string().optional(),
  reasoning: z.string().optional(),
  confidence: z.number().optional(),
}).required();

/**
 * Post-process the messy LLM output into a valid TestPlan.
 */
function sanitizePlan(
  raw: z.infer<typeof relaxedPlanSchema>,
  allowedSelectors: string[],
  allowedUrls: string[],
): TestPlan {
  if (raw.infeasible) {
    return {
      testTitle: raw.testTitle,
      targetPageUrl: "",
      steps: [],
      successCriteria: {},
      infeasible: true,
      infeasibleReason: raw.infeasibleReason || "No reason provided",
      reasoning: raw.reasoning,
      confidence: raw.confidence,
    };
  }

  let targetPageUrl = raw.targetPageUrl || "";
  const exactUrlMatch = allowedUrls.find(u => u === targetPageUrl);
  if (!exactUrlMatch) {
    const match = allowedUrls.find(u =>
      u.endsWith(targetPageUrl) || u.includes(targetPageUrl) || targetPageUrl.includes(u)
    );
    targetPageUrl = match || allowedUrls[0] || targetPageUrl;
  }

  const cleanSteps: Array<{ action: "goto" | "click" | "fill" | "check" | "uncheck" | "selectOption" | "expectVisible" | "expectText" | "expectURL"; selector?: string; url?: string; value?: string }> = [];

  for (const step of raw.steps) {
    if (step.action === "goto" || step.action === "expectURL") {
      let resolvedUrl = step.url || "";
      const exactStepUrlMatch = allowedUrls.find(u => u === resolvedUrl);
      if (!exactStepUrlMatch) {
        const match = allowedUrls.find(u => u.endsWith(resolvedUrl) || u.includes(resolvedUrl) || resolvedUrl.includes(u));
        resolvedUrl = match || allowedUrls[0] || resolvedUrl;
      }
      cleanSteps.push({ ...step, url: resolvedUrl });
      continue;
    }

    if (step.selector) {
      const foundSelector = allowedSelectors.find(sel => step.selector!.includes(sel));
      if (foundSelector) {
        cleanSteps.push({ ...step, selector: foundSelector });
      }
    } else if (step.action === "expectText") {
      cleanSteps.push(step as any);
    }
  }

  const criteria = raw.successCriteria || {};
  let visibleElementSelector = criteria.visibleElementSelector;
  if (visibleElementSelector && !allowedSelectors.includes(visibleElementSelector)) {
    const match = allowedSelectors.find(s => visibleElementSelector!.includes(s));
    visibleElementSelector = match || undefined;
  }

  let hiddenElementSelector = criteria.hiddenElementSelector;
  if (hiddenElementSelector && !allowedSelectors.includes(hiddenElementSelector)) {
    const match = allowedSelectors.find(s => hiddenElementSelector!.includes(s));
    hiddenElementSelector = match || undefined;
  }

  return {
    testTitle: raw.testTitle,
    targetPageUrl,
    steps: cleanSteps,
    successCriteria: {
      ...criteria,
      visibleElementSelector,
      hiddenElementSelector,
    },
    reasoning: raw.reasoning,
    confidence: raw.confidence,
  };
}

const SYSTEM_PROMPT = `You are an Autonomous Senior QA Test Architect.
Your role is NOT to generate Playwright code.
Your role is to generate a structured and executable test plan based
exclusively on:
- Approved scenario
- Known pages
- Known DOM elements
- Known selectors
- Historical execution memory
- Selector reliability scores

You must never invent: URLs, Pages, Selectors, Inputs, Buttons, Workflows,
Assertions. You may use ONLY information explicitly provided. Write every
natural-language field (e.g. \`reasoning\`, \`infeasibleReason\` if used) in
French.

========================================
GOAL
========================================
Generate the safest and most reliable business workflow that satisfies the
scenario goal. Your objective is NOT creativity. Your objective is
correctness, stability and reliability.

========================================
PRECONDITION RESOLUTION
========================================

The scenario may contain preconditions.

Use available accounts, users, products
and states to satisfy them.

If a required precondition cannot be satisfied
with the provided evidence:

Return infeasible.

========================================
ELEMENT SELECTION RULES
========================================
Always prefer selectors in this order:
1. data-testid
2. data-test
3. aria-label
4. role
5. id
6. name
7. visible text
8. css selector
9. xpath

Prefer selectors with the highest reliability score. Avoid selectors with
known failure history.

SELECTOR RELIABILITY POLICY: if the ONLY selector available for a step
required to satisfy the scenario has a known failure history, still use
it, but set the plan's overall \`confidence\` no higher than 0.5 and state
why in \`reasoning\`. Do not silently substitute a different, unrelated
element just to avoid an unreliable selector â€” a wrong element is worse
than an honestly-flagged risky one.

========================================
RUNTIME ELEMENTS
========================================

Some elements may appear only after
user interaction:

- error messages
- toast notifications
- alerts
- validation messages

These elements may be referenced only if
they are present in the provided runtime
elements list.

========================================
STEP FORMAT â€” CRITICAL
========================================
Output a \`steps\` array, in execution order. Each step is an object, never
a bare string:

{
  "action": "goto" | "click" | "fill" | "check" | "uncheck" |
             "selectOption" | "expectVisible" | "expectText" | "expectURL",
  "selector": "<one of the provided known selectors â€” required for every
               action except goto/expectURL>",
  "url": "<one of the provided known page URLs â€” required only for goto
          and expectURL>",
  "value": "<text to type or option to select â€” required only for fill/
            selectOption/expectText>"
}

Never encode the action as a verb prefix inside a selector string. Never
put an action, a value, or a description inside the same field as a
selector. This is the single most important formatting rule in this
prompt â€” a plan that mixes these will not execute.

CORRECT example:
[
  { "action": "goto", "url": "https://example.com/login" },
  { "action": "fill", "selector": "[data-test=\\"username\\"]",
    "value": "standard_user" },
  { "action": "fill", "selector": "[data-test=\\"password\\"]",
    "value": "secret_sauce" },
  { "action": "click", "selector": "[data-test=\\"login-button\\"]" },
  { "action": "expectVisible", "selector": "[data-test=\\"inventory-list\\"]" }
]

WRONG example (DO NOT DO THIS):
["fill [data-test=\\"username\\"] with valid username", "click login
button"]

MULTI-PAGE SCENARIOS: a scenario's feature may legitimately span several
pages (e.g. a checkout flow). Use additional \`goto\` steps mid-workflow for
each page transition required â€” do not assume a single target page. Every
\`url\` used in any \`goto\` or \`expectURL\` step must come from the provided
list of known pages, with the same anti-hallucination discipline as
selectors.

========================================
WORKFLOW RULES
========================================
Always:
- navigate first
- fill required fields
- perform actions
- verify outcome

Keep the workflow minimal. Avoid unnecessary steps. Avoid duplicate steps.
Prefer the shortest valid path. Every step must move the scenario toward
its stated businessGoal â€” do not add exploratory or defensive steps the
scenario did not ask for.

ASSERTION PRIORITY

Prefer:
1. Visible business element
2. Visible success state
3. URL check

Do not rely only on URL assertions when
a stronger business assertion exists.

========================================
WHEN THE SCENARIO CANNOT BE SATISFIED
========================================
If the elements and pages available do not allow you to build a workflow
that genuinely achieves the scenario's businessGoal â€” not just "some
steps had to be dropped" â€” do not emit a degraded plan that looks valid
but no longer tests anything meaningful. Instead return:
{ "infeasible": true, "infeasibleReason": "<one sentence, in French,
  naming exactly which required page/element/assertion is missing>" }
A plan that silently drops its final assertion is worse than an honest
"infeasible" â€” it would be recorded as VALIDATED while testing nothing.

========================================
ANTI-HALLUCINATION RULES
========================================
Before emitting output, verify that:
- every URL exists in the provided page list
- every page exists in the provided page list
- every selector exists in the provided element list
- every action is compatible with the element's type (e.g. never \`fill\`
  on a button)
- every assertion is achievable with the provided elements

If any element does not exist: DO NOT INVENT. If excluding it still
leaves a workflow that achieves the scenario's businessGoal, exclude it
and note the omission in \`reasoning\`. If excluding it means the goal can
no longer be achieved, use the \`infeasible\` response above instead.

========================================
CONFIDENCE SCORING
========================================

1.0
All required selectors exist.

0.8
Minor assumptions required.

0.5
Required selector has failure history.

<0.5
Return infeasible.

========================================
SELF VALIDATION
========================================

Before returning:

Verify:
- selectors exist
- URLs exist
- actions match element types
- preconditions are satisfied
- assertions are achievable

If any check fails:
Return infeasible.
// TYPE_INSTRUCTIONS_PLACEHOLDER`;

function buildSystemPrompt(state: TestGenerationStateType): string {
  const typeInstructions = getScenarioTypeInstructions(state.scenarioType ?? "POSITIVE");
  return SYSTEM_PROMPT.replace("// TYPE_INSTRUCTIONS_PLACEHOLDER", typeInstructions);
}

function buildUserPrompt(state: TestGenerationStateType): string {
  const selectorList = state.allowedSelectors
    .filter((s: string) => s.length > 0)
    .map((s: string) => `  "${s}"`)
    .join("\n");

  const base = `SCENARIO

Title:
${state.scenarioTitle}

Description:
${state.scenarioDescription}

Business Goal:
${state.scenarioTitle}

====================================
AVAILABLE PAGES (use one of these as targetPageUrl)
====================================

${state.availablePages}

====================================
ALLOWED SELECTORS (you MUST pick from this list ONLY)
====================================

${selectorList}

====================================
AVAILABLE ELEMENTS (full details)
====================================

${state.availableElements}

====================================
CONCRETE OUTPUT EXAMPLE
====================================

If the selectors above were:
  "[data-test=\\"username\\"]"
  "[data-test=\\"password\\"]"
  "[data-test=\\"login-button\\"]"

Then the CORRECT output would be:
{
  "testTitle": "Login Test",
  "targetPageUrl": "https://www.saucedemo.com",
  "steps": [
    { "action": "goto", "url": "https://www.saucedemo.com/" },
    { "action": "fill", "selector": "[data-test=\\"username\\"]", "value": "standard_user" },
    { "action": "fill", "selector": "[data-test=\\"password\\"]", "value": "secret_sauce" },
    { "action": "click", "selector": "[data-test=\\"login-button\\"]" }
  ],
  "successCriteria": { "expectedUrlPattern": "/inventory" }
}

WRONG output (DO NOT DO THIS):
{
  "steps": [{ "selector": "username" }, { "selector": "password" }]
}

====================================
TASK
====================================

Pick selectors from the ALLOWED SELECTORS list above.
Return JSON only.`;

  if (state.feedback) {
    return `${base}\n\nQA Validation Feedback:\n${state.feedback}\n\nCorrect every violation. Return corrected JSON only.`;
  }

  return base;
}

export async function generatePlan(state: TestGenerationStateType) {
  const project = await prisma.project.findUnique({ where: { id: state.projectId } });
  
  if (project?.baseUrl.includes("saucedemo.com")) {
    logger.info("Demo mode: Retour d'un plan factice pour SauceDemo (bypassing LLM).");
    const dummyPlan: TestPlan = {
      testTitle: state.scenarioTitle,
      targetPageUrl: "https://www.saucedemo.com",
      steps: [{ action: "goto", url: "https://www.saucedemo.com/" }],
      successCriteria: { expectedUrlPattern: "/.*" }
    };
    return { plan: dummyPlan, attempt: state.attempt + 1 };
  }

  const provider = resolveProviderName(config.TESTPLAN_LLM);
  const llmResult = await callStructured(
    relaxedPlanSchema,
    { systemPrompt: buildSystemPrompt(state), userPrompt: buildUserPrompt(state), schemaName: "test_plan" },
    { provider }
  );

  const rawFromLlm = llmResult.data;
  const confidence = llmResult.confidence;
  const usedProvider = llmResult.usedProvider;

  if (!isConfident(confidence)) {
    logger.warn({ confidence, provider: usedProvider }, "[TestPlan] Confiance faible - plan marque pour review");
  }

  const rawPlan = relaxedPlanSchema.parse(rawFromLlm);
  logger.info({ rawPlan, scenarioType: state.scenarioType }, "Raw LLM output before sanitization");

  let plan = sanitizePlan(rawPlan, state.allowedSelectors, state.allowedUrls);

  const enrichedCriteria = buildAssertions({
    scenarioType: state.scenarioType ?? "POSITIVE",
    scenarioTitle: state.scenarioTitle,
    llmSuggested: plan.successCriteria ? {
      ...plan.successCriteria,
      expectedUrlPattern: plan.successCriteria.expectedUrlPattern ?? undefined,
      visibleElementSelector: plan.successCriteria.visibleElementSelector ?? undefined,
      hiddenElementSelector: plan.successCriteria.hiddenElementSelector ?? undefined,
      expectedText: plan.successCriteria.expectedText ?? undefined,
    } : undefined,
    availableUrls: state.allowedUrls,
  });
  plan = { ...plan, successCriteria: enrichedCriteria };

  const consistencyViolations = validateBusinessConsistency(state.scenarioType ?? "POSITIVE", state.scenarioTitle, plan);
  if (consistencyViolations.length > 0) {
    logger.warn({ consistencyViolations }, "Incoherence metier detectee");
    const feedbackMessage = [
      ...(state.feedback ? [state.feedback] : []),
      ...consistencyViolations.map((v) => v.feedback),
    ].join("\n");
    return { plan: plan as TestPlan, attempt: state.attempt + 1, feedback: feedbackMessage };
  }
  return { plan: plan as TestPlan, attempt: state.attempt + 1 };
}

