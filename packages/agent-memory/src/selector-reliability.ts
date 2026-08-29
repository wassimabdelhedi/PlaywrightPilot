// packages/agent-memory/src/selector-reliability.ts
//
// Première illustration concrète de la généricité de memory-service.ts :
// aucune nouvelle infrastructure n'a été nécessaire pour cette
// catégorie, seulement cette couche fine de logique métier. La Phase
// 12 appellera `recordSelectorOutcome` après chaque exécution de
// test ; la Phase 18 lira ces données via `getSelectorReliability`
// pour décider si un sélecteur mérite d'être remplacé.
//
// dedupeText = `${pageUrl}::${selector}` — déterministe et unique par
// paire (page, sélecteur), ce qui garantit que upsertMemory retrouve
// TOUJOURS la même entrée pour le même sélecteur plutôt que de
// dépendre d'une similarité sémantique approximative ici.

import { upsertMemory, queryMemory } from "./memory-service.js";

interface SelectorOutcomeContent {
  selector: string;
  pageUrl: string;
  successCount: number;
  failureCount: number;
  lastOutcomeAt: string;
}

export async function recordSelectorOutcome(
  projectId: string,
  selector: string,
  pageUrl: string,
  success: boolean
): Promise<void> {
  const dedupeText = `${pageUrl}::${selector}`;

  const existingMatches = await queryMemory(projectId, "SELECTOR_RELIABILITY", dedupeText, 1);
  const existing = existingMatches[0]?.content as unknown as SelectorOutcomeContent | undefined;

  const content: SelectorOutcomeContent = {
    selector,
    pageUrl,
    successCount: (existing?.successCount ?? 0) + (success ? 1 : 0),
    failureCount: (existing?.failureCount ?? 0) + (success ? 0 : 1),
    lastOutcomeAt: new Date().toISOString(),
  };

  await upsertMemory({ projectId, category: "SELECTOR_RELIABILITY", content: content as unknown as Record<string, unknown>, dedupeText });
}

// Un sélecteur est considéré non fiable si son taux d'échec dépasse
// 30% sur au moins 3 exécutions — sous ce volume, une seule panne
// réseau isolée suffirait à le classer à tort comme non fiable.
export function isUnreliable(content: SelectorOutcomeContent): boolean {
  const total = content.successCount + content.failureCount;
  if (total < 3) return false;
  return content.failureCount / total > 0.3;
}
