// apps/orchestrator/src/graphs/feature-understanding/nodes/merge-features.ts
//
// C'est l'Ã©tape "reduce" du pattern map-reduce. Ã€ ce stade, le volume
// de donnÃ©es est dÃ©jÃ  trÃ¨s rÃ©duit (une liste de fonctionnalitÃ©s
// candidates, pas les pages brutes) â€” un second appel LLM ici reste
// bon marchÃ©, et bien plus fiable qu'une correspondance de chaÃ®nes de
// caractÃ¨res pour repÃ©rer que "Connexion" et "Authentification
// utilisateur" dÃ©signent la mÃªme fonctionnalitÃ©.

import { z } from "zod";
import { callStructured } from "../../../llm/client.js";
import { featureCandidateSchema, type FeatureCandidate } from "../schema.js";
import type { FeatureUnderstandingStateType } from "../state.js";

const mergeResultSchema = z.object({ features: z.array(featureCandidateSchema) });

const SYSTEM_PROMPT = `Tu reÃ§ois une liste de fonctionnalitÃ©s candidates, potentiellement en double ou se recoupant, dÃ©tectÃ©es sÃ©parÃ©ment sur diffÃ©rents lots de pages du mÃªme site. Fusionne les entrÃ©es qui dÃ©crivent la mÃªme fonctionnalitÃ© mÃ©tier :
- Combine leurs URLs associÃ©es (union, sans doublon).
- Choisis le nom le plus clair et professionnel entre les variantes.
- La confiance finale d'une fonctionnalitÃ© fusionnÃ©e est le maximum des confiances des entrÃ©es fusionnÃ©es.
- Ne fusionne PAS des fonctionnalitÃ©s rÃ©ellement diffÃ©rentes juste parce qu'elles partagent une page.`;

export async function mergeFeatures(state: FeatureUnderstandingStateType) {
  if (state.rawCandidates.length === 0) {
    return { mergedFeatures: [] };
  }

  // Peu d'intÃ©rÃªt Ã  payer un appel LLM de fusion s'il n'y a qu'un
  // seul lot â€” rien Ã  fusionner par dÃ©finition.
  if (state.batches.length <= 1) {
    return { mergedFeatures: state.rawCandidates };
  }

  const userPrompt = JSON.stringify(state.rawCandidates, null, 2);

  const { data: result } = await callStructured(mergeResultSchema, {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `FonctionnalitÃ©s candidates Ã  fusionner :\n${userPrompt}`,
    schemaName: "merged_features",
  });

  return { mergedFeatures: result.features as FeatureCandidate[] };
}

