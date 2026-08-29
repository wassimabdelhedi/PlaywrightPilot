const fs = require('fs');
const path = 'c:/Finlogick/PlaywrightPilot/apps/orchestrator/src/graphs/test-generation/nodes/generate-plan.ts';
let code = fs.readFileSync(path, 'utf8');

const correctCode = unction buildSystemPrompt(state: TestGenerationStateType): string {
  const typeInstructions = getScenarioTypeInstructions(state.scenarioType ?? "POSITIVE");
  return SYSTEM_PROMPT.replace("// TYPE_INSTRUCTIONS_PLACEHOLDER", typeInstructions);
}

function buildUserPrompt(state: TestGenerationStateType): string {
  const selectorList = state.allowedSelectors
    .filter((s: string) => s.length > 0)
    .map((s: string) => \  "\"\)
    .join("\\n");

  const base = \SCENARIO

Title:
\

Description:
\

Business Goal:
\

====================================
AVAILABLE PAGES (use one of these as targetPageUrl)
====================================

\

====================================
ALLOWED SELECTORS (you MUST pick from this list ONLY)
====================================

\

====================================
AVAILABLE ELEMENTS (full details)
====================================

\

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
Return JSON only.\;

  if (state.feedback) {
    return \\\\n\\nQA Validation Feedback:\\n\\\n\\nCorrect every violation. Return corrected JSON only.\;
  }

  return base;
}
;

const start = code.indexOf('function buildSystemPrompt');
const end = code.indexOf('export async function generatePlan');

code = code.substring(0, start) + correctCode + code.substring(end);
fs.writeFileSync(path, code);
