// apps/orchestrator/src/graphs/feature-understanding/nodes/load-pages.ts

import { prisma } from "@platform/database";
import type { FeatureUnderstandingStateType, PageSummary } from "../state.js";

export async function loadPages(state: FeatureUnderstandingStateType) {
  const pages = await prisma.page.findMany({
    where: { discoveryId: state.discoveryId },
    include: { elements: true },
    orderBy: { depth: "asc" },
  });

  if (pages.length === 0) {
    throw new Error(`Aucune page trouvée pour la découverte ${state.discoveryId} — a-t-elle bien été exécutée ?`);
  }

  return {
    pageSummaries: pages.map((page) => ({
      pageId: page.id,
      url: page.url,
      title: page.title,
      elementSummary: summarizeElements(page.elements.map(el => ({
        type: el.type,
        label: el.text || (el.attributes as Record<string, string>)?.['aria-label'] || null
      }))),
    })),
  };
}

// Compresse la liste d'éléments d'une page en une phrase compacte
// plutôt que d'envoyer chaque élément en détail au LLM — c'est le
// premier levier de contrôle du volume de tokens envoyés (voir §2 de
// cette phase sur le pattern map-reduce).
function summarizeElements(elements: Array<{ type: string; label: string | null }>): string {
  const counts = new Map<string, number>();
  const labels: string[] = [];

  for (const el of elements) {
    counts.set(el.type, (counts.get(el.type) ?? 0) + 1);
    if (el.label && labels.length < 10) labels.push(el.label);
  }

  const countSummary = Array.from(counts.entries())
    .map(([type, count]) => `${count} ${type.toLowerCase()}`)
    .join(", ");

  return `Éléments : ${countSummary || "aucun"}. Libellés notables : ${labels.join(", ") || "aucun"}.`;
}
