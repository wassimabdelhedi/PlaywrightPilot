// apps/executor/src/execution/selector-outcomes.ts
//
// Granularité APPROXIMATIVE et documentée comme telle (voir §2 de
// cette phase) : le résultat global de l'exécution est appliqué à
// TOUS les sélecteurs utilisés dans le test, faute d'attribution
// précise par étape à ce stade. La Phase 18 pourra affiner via un
// parsing de la trace Playwright si cette granularité se révèle
// insuffisante en pratique.

import { recordSelectorOutcome } from "@platform/agent-memory";
import { logger } from "@platform/logger";

const SELECTOR_LITERAL_PATTERN = /\.locator\(\s*'([^']+)'\s*\)/g;

export function extractSelectorsFromSource(sourceCode: string): string[] {
  const matches = [...sourceCode.matchAll(SELECTOR_LITERAL_PATTERN)];
  return [...new Set(matches.map((m) => m[1]))];
}

function extractFirstUrl(sourceCode: string): string {
  const match = sourceCode.match(/page\.goto\(\s*'([^']+)'\s*\)/);
  return match?.[1] ?? "unknown";
}

export async function recordOutcomesForExecution(
  projectId: string,
  sourceCode: string,
  success: boolean
): Promise<void> {
  const selectors = extractSelectorsFromSource(sourceCode);
  const pageUrl = extractFirstUrl(sourceCode);

  await Promise.all(
    selectors.map((selector) =>
      recordSelectorOutcome(projectId, selector, pageUrl, success).catch((err) =>
        logger.warn({ selector, err }, "échec de l'enregistrement de fiabilité du sélecteur")
      )
    )
  );
}
