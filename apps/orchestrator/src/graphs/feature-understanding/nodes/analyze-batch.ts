// apps/orchestrator/src/graphs/feature-understanding/nodes/analyze-batch.ts
//
// Phase 8 — Feature Understanding via FEATURE_LLM (Gemini Flash par defaut).
// Traite les lots sequentiellement.

import { config } from "@platform/config";
import { logger } from "@platform/logger";
import { callStructured } from "../../../llm/client.js";
import { resolveProviderName } from "../../../llm/providers/registry.js";
import { batchAnalysisSchema, type FeatureCandidate } from "../schema.js";
import type { FeatureUnderstandingStateType, PageSummary } from "../state.js";

const SYSTEM_PROMPT = `You are a senior QA analyst specializing in exploratory business-feature
discovery from web UI inventories. Write every natural-language output
field (name, description) in French — the target audience is French-
speaking QA reviewers. Field names and enum values stay in English as
defined by the schema.

INPUT: a batch of web pages, each with its URL and a compact summary of its
interactive elements (buttons, forms, inputs, navigation menus). This batch
may be a PARTIAL view of the site — other pages may be analyzed separately
and merged with your output later. Do not treat this batch as the whole
site, and do not hesitate to name a feature that only partially appears
here.

TASK: identify the BUSINESS FEATURES these pages collectively implement
(e.g. "Authentification", "Recherche de produits", "Paiement") — never a
page-by-page description, never a UI element restated as if it were a
feature.

GRANULARITY (read carefully — this affects how your output merges with
other batches):
- Group at the level a product manager would use in a roadmap, not at the
  level of a single UI action.
- Treat as SEPARATE features anything a user would describe as a different
  goal, even if they share a page (e.g. "Connexion" and "Réinitialisation
  du mot de passe" are two features, not one, even if both live on
  /login).
- Treat as ONE feature anything that is a single end-to-end user goal even
  if it spans several pages (e.g. a 3-step checkout is one feature).
- Name features in French, Title Case, 2–4 words, business-facing
  vocabulary (prefer "Demande de contact" over "Gestionnaire de
  soumission de formulaire").

RULES:
- A feature may span multiple pages.
- Never invent a URL that does not appear in the input — every
  relatedPageUrls entry must be copied verbatim from the input.
- Ignore purely decorative or generic navigation elements (footer, legal
  notices) UNLESS they constitute the feature itself.
- If the evidence in this batch is too thin to identify any real feature
  (e.g. a page with no meaningful interactive elements), return nothing
  for it rather than forcing a low-value feature into existence.

Before answering, silently reason step by step about which elements belong
to the same user goal. Only the final structured result should be
returned.

---
EXAMPLE (for your calibration only, do not copy verbatim):

Input pages:
- /login — "2 inputs (email, password), 1 button 'Se connecter', 1 link
  'Mot de passe oublié'"
- /forgot-password — "1 input (email), 1 button 'Envoyer le lien'"
- /products — "12 links (product cards), 1 input 'Rechercher'"

Good output:
- { name: "Connexion", relatedPageUrls: ["/login"], confidence: 0.95 }
- { name: "Réinitialisation du mot de passe",
    relatedPageUrls: ["/login", "/forgot-password"], confidence: 0.9 }
- { name: "Recherche de produits", relatedPageUrls: ["/products"],
    confidence: 0.8 }

Bad output (do NOT do this):
- { name: "Authentification et récupération", relatedPageUrls: [...] }
  — merges two distinct user goals into one vague feature.`;

function buildUserPrompt(batch: PageSummary[]): string {
  const pagesText = batch
    .map((page) => `- URL: ${page.url}\n  Titre: ${page.title ?? "(sans titre)"}\n  ${page.elementSummary}`)
    .join("\n\n");

  return `Voici ${batch.length} pages decouvertes sur le meme site :\n\n${pagesText}\n\nIdentifie les fonctionnalites metier candidates.`;
}

async function analyzeSingleBatch(batch: PageSummary[]): Promise<FeatureCandidate[]> {
  const provider = resolveProviderName(config.FEATURE_LLM);
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.FEATURE_ANALYSIS_MAX_RETRIES; attempt++) {
    try {
      const { data: result } = await callStructured(
        batchAnalysisSchema,
        {
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: buildUserPrompt(batch),
          schemaName: "batch_feature_analysis",
        },
        { provider },
      );

      // Garde-fou : rejeter toute URL citee par le modele qui ne faisait pas partie du lot
      const validUrls = new Set(batch.map((p) => p.url));
      return result.features
        .map((feature: FeatureCandidate) => ({
          ...feature,
          relatedPageUrls: feature.relatedPageUrls.filter((url: string) => validUrls.has(url)),
        }))
        .filter((feature: FeatureCandidate) => feature.relatedPageUrls.length > 0);
    } catch (err) {
      lastError = err;
      logger.warn({ attempt, err }, "Echec d analyse de lot, nouvelle tentative si possible");
    }
  }

  logger.error({ err: lastError }, "Abandon de l analyse de ce lot apres epuisement des tentatives");
  return [];
}

export async function analyzeBatches(state: FeatureUnderstandingStateType) {
  const allCandidates: FeatureCandidate[] = [];

  for (const batch of state.batches) {
    const candidates = await analyzeSingleBatch(batch);
    allCandidates.push(...candidates);
  }

  return { rawCandidates: allCandidates };
}

