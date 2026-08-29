// apps/orchestrator/src/graphs/test-generation/scenario-type-detector.ts
//
// Détecte le type d'un scénario (Positive/Negative/Edge/Validation) en analysant
// son titre et sa description. Cette information est injectée dans le prompt du LLM
// pour éviter qu'un scénario "Invalid Credentials" génère un test "Happy Path".

export type ScenarioType = "POSITIVE" | "NEGATIVE" | "EDGE_CASE" | "VALIDATION";

/**
 * Mots-clés qui indiquent un scénario négatif (échec attendu, erreur, rejet, etc.)
 */
const NEGATIVE_KEYWORDS = [
  "invalid",
  "incorrect",
  "wrong",
  "error",
  "failure",
  "fail",
  "denied",
  "rejected",
  "reject",
  "unauthorized",
  "forbidden",
  "not found",
  "missing",
  "empty",
  "blank",
  "expired",
  "locked",
  "blocked",
  "disabled",
  "exceeded",
  "too many",
  "invalid credentials",
  "bad request",
  "access denied",
  "permission denied",
];

const EDGE_CASE_KEYWORDS = [
  "edge",
  "boundary",
  "limit",
  "maximum",
  "minimum",
  "overflow",
  "special char",
  "sql injection",
  "xss",
  "concurrent",
  "timeout",
  "slow",
  "large",
  "empty state",
  "zero result",
];

const VALIDATION_KEYWORDS = [
  "validation",
  "required field",
  "format",
  "pattern",
  "regex",
  "constraint",
  "mandatory",
];

export function detectScenarioType(title: string, description: string): ScenarioType {
  const combined = `${title} ${description}`.toLowerCase();

  if (NEGATIVE_KEYWORDS.some((kw) => combined.includes(kw))) {
    return "NEGATIVE";
  }
  if (EDGE_CASE_KEYWORDS.some((kw) => combined.includes(kw))) {
    return "EDGE_CASE";
  }
  if (VALIDATION_KEYWORDS.some((kw) => combined.includes(kw))) {
    return "VALIDATION";
  }
  return "POSITIVE";
}

/**
 * Renvoie les instructions spécifiques au type de scénario à injecter
 * dans le System Prompt du LLM pour orienter correctement la génération.
 */
export function getScenarioTypeInstructions(type: ScenarioType): string {
  switch (type) {
    case "NEGATIVE":
      return `
========================================
NEGATIVE SCENARIO DETECTED - CRITICAL RULES
========================================

This scenario tests a FAILURE condition, NOT a success condition.

MANDATORY RULES:
- Use INVALID data values (wrong credentials, bad inputs, missing fields)
- The final state MUST be an error, NOT a success
- NEVER redirect to a success page (inventory, dashboard, home, etc.)
- The successCriteria MUST use visibleElementSelector pointing to an error element
  (e.g., [data-test="error"], .error-message, [role="alert"])
- NEVER set expectedUrlPattern to a success URL like "/inventory" or "/dashboard"
- DO NOT generate a happy path workflow

For invalid login credentials specifically:
- Fill username with an INVALID value (not a real account)
- Fill password with an INVALID value (not the correct password)
- Click the submit button
- Assert the error message is visible
- DO NOT assert a URL change to a success page

CRITICAL: A plan that redirects to /inventory for an "Invalid Credentials" scenario is WRONG.
CRITICAL: A plan that shows an error message for an "Invalid Credentials" scenario is CORRECT.
`;

    case "EDGE_CASE":
      return `
========================================
EDGE CASE SCENARIO DETECTED
========================================

This scenario tests a boundary or limit condition.

MANDATORY:
- Use boundary values (maximum length, minimum length, special characters)
- Assert the specific behavior at the boundary
- Be precise about which boundary is being tested
`;

    case "VALIDATION":
      return `
========================================
VALIDATION SCENARIO DETECTED
========================================

This scenario tests form validation rules.

MANDATORY:
- Leave required fields empty OR fill them with invalid formats
- Assert that the validation error message is displayed
- NEVER assert a success URL if fields are invalid
- visibleElementSelector should point to the validation error element
`;

    case "POSITIVE":
    default:
      return `
========================================
POSITIVE SCENARIO (Happy Path)
========================================

This scenario tests a successful workflow.

MANDATORY:
- Use valid data values
- Assert the success state (URL change, success message, etc.)
- Verify that the user reaches the expected final state
`;
  }
}

/**
 * Valide la cohérence entre le type de scénario et le plan généré.
 * Retourne une liste d'erreurs de cohérence (vide si le plan est cohérent).
 */
export function validateScenarioConsistency(
  type: ScenarioType,
  title: string,
  plan: { successCriteria: { expectedUrlPattern?: string; visibleElementSelector?: string } },
): string[] {
  const errors: string[] = [];

  if (type === "NEGATIVE") {
    const successUrlPatterns = ["/inventory", "/dashboard", "/home", "/profile", "/cart", "/checkout"];
    if (plan.successCriteria.expectedUrlPattern) {
      const pattern = plan.successCriteria.expectedUrlPattern.toLowerCase();
      if (successUrlPatterns.some((url) => pattern.includes(url))) {
        errors.push(
          `SCENARIO_CONSISTENCY_VIOLATION: Scenario "${title}" is NEGATIVE but the plan asserts ` +
          `success URL "${plan.successCriteria.expectedUrlPattern}". ` +
          `A NEGATIVE scenario MUST validate an ERROR state, not a success state. ` +
          `Use visibleElementSelector on an error element (e.g., [data-test="error"]).`
        );
      }
    }
  }

  return errors;
}
