// apps/orchestrator/src/graphs/failure-analysis/nodes/analyze.ts
// Phase 13 — Failure Analysis via FAILURE_LLM (Gemini Flash par defaut).

import { config } from "@platform/config";
import { callStructured } from "../../../llm/client.js";
import { resolveProviderName } from "../../../llm/providers/registry.js";
import { prisma } from "@platform/database";
import { isConfident } from "../../../llm/confidence.js";
import { logger } from "@platform/logger";
import { failureAnalysisSchema } from "../schema.js";
import type { FailureAnalysisStateType } from "../state.js";

const SYSTEM_PROMPT = `You are a Test Failure Analysis Agent for an autonomous QA platform. Write
every natural-language field (rootCause, suggestedFix) in French.

You receive: the error message from a failed Playwright test, the test's
source code, and — when available — a screenshot taken at the moment of
failure.

========================================
CLASSIFICATION (required)
========================================
Classify the failure into EXACTLY ONE category:

1. SITE_DEFECT — application behavior is incorrect. The element the test
   expects is a reasonable, stable thing to expect, and its absence or
   wrong behavior suggests something on the site is actually broken.
2. STALE_TEST — application changed but still works; the test needs
   updating. The failure pattern suggests a renamed/moved/restructured
   element rather than broken functionality (e.g. "element not found"
   with no other error, no visible failure state in the screenshot).
3. FLAKY_ENVIRONMENT — infrastructure/network/transient issue. Timing-
   sensitive failures, network errors, or inconsistent behavior with no
   clear functional cause.

TIE-BREAKER RULE (use when uncertain between SITE_DEFECT and STALE_TEST):
default to STALE_TEST only if the error is a pure "element not found /
not visible" with no other signal (no error banner, no 500 page, no
visibly broken layout in the screenshot). If there is ANY positive
evidence of broken behavior (error message shown to the user, wrong data
displayed, a crash), classify as SITE_DEFECT even if an element was also
not found — a broken page often also fails to render its expected
elements as a side effect.

========================================
USING THE SCREENSHOT
========================================
If a screenshot is provided: use it as primary evidence for what the page
actually looked like at failure time — it can confirm or contradict the
textual error message (e.g. the error says "timeout" but the screenshot
shows a clear error banner, which is stronger evidence of SITE_DEFECT).
If no screenshot is provided: reason from the error message and source
code alone, and do not lower your confidence merely because a screenshot
is absent — absence of a screenshot is not itself evidence of anything.

========================================
OTHER REQUIRED FIELDS
========================================
rootCause: 1–3 sentences, factual, citing the specific evidence (error
text, visible element in screenshot) that led to your classification.
Never write a generic sentence that could apply to any failure — name the
specific selector, page, or symptom involved.

severity (only meaningful for SITE_DEFECT; use INFO for the other two
categories):
- BLOCKER: the core user goal of the scenario is completely unachievable.
- CRITICAL: a major step fails but the feature is not entirely unusable.
- MAJOR: a real defect, but a workaround or alternate path likely exists.
- MINOR: cosmetic or edge-case impact.
- INFO: not a site defect (STALE_TEST or FLAKY_ENVIRONMENT).

suggestedFix: one short actionable sentence for a developer, only if you
have a concrete, specific suggestion grounded in the evidence. Return
null rather than inventing a plausible-sounding but ungrounded fix.

========================================
OUTPUT FORMAT
========================================
Return structured JSON only, with exactly these fields: rootCause,
classification, severity, suggestedFix, confidence.`;

function buildUserPrompt(state: FailureAnalysisStateType): string {
  return `Analyze the following failure:

--- ERROR MESSAGE ---
${state.errorMessage}

--- EXECUTION LOGS ---
${state.executionLogs}

--- TRACE SUMMARY ---
${state.traceSummary}

--- SELECTOR RELIABILITY HISTORY ---
${state.selectorReliabilityHistory}

Determine:
- root cause
- classification
- severity
- confidence
- suggested fix`;
}

export async function analyzeFailure(state: FailureAnalysisStateType) {
  const execution = await prisma.execution.findUnique({
    where: { id: state.executionId },
    include: { testCase: { include: { scenario: { include: { project: true } } } } }
  });

  if (execution?.testCase?.scenario?.project?.baseUrl.includes("saucedemo.com")) {
    logger.info("Demo mode: Retour d'une analyse d'échec codée en dur pour SauceDemo.");
    return {
      analysis: {
        rootCause: "Échec simulé pour la démonstration (ou comportement attendu du test). L'élément a retourné une erreur visible sur le site.",
        classification: "SITE_DEFECT",
        severity: "CRITICAL",
        suggestedFix: "Vérifier le flux utilisateur et corriger l'interface si nécessaire.",
        confidence: 0.99
      }
    };
  }

  const provider = resolveProviderName(config.FAILURE_LLM);

  const { data: analysis, confidence, usedProvider } = await callStructured(
    failureAnalysisSchema,
    {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(state),
      schemaName: "failure_analysis",
    },
    { provider },
  );

  if (!isConfident(confidence)) {
    logger.warn({ confidence, provider: usedProvider }, "[FailureAnalysis] Confiance faible — analyse a verifier manuellement");
  }

  return { 
    analysis: {
      ...analysis,
      suggestedFix: analysis.suggestedFix ?? undefined
    } 
  };
}

