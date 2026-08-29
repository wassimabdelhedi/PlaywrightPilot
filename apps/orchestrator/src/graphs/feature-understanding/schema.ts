// apps/orchestrator/src/graphs/feature-understanding/schema.ts
//
// Ce schéma sert DEUX rôles : il est converti en JSON Schema pour
// contraindre la sortie d'OpenAI (structured outputs), ET il revalide
// la réponse côté application. Un LLM qui respecte le JSON Schema
// fourni produit rarement une sortie invalide, mais "rarement" n'est
// pas "jamais" — la revalidation Zod est ce qui protège le reste du
// pipeline d'un champ manquant ou d'un type inattendu.

import { z } from "zod";

export const featureCandidateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(400),
  // Le LLM doit citer les URLs qui l'ont mené à cette conclusion —
  // sans ça, impossible de relier une fonctionnalité détectée aux
  // pages/éléments réels en base (voir persist-features.ts).
  relatedPageUrls: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
});

export const batchAnalysisSchema = z.object({
  features: z.array(featureCandidateSchema),
});

export type FeatureCandidate = z.infer<typeof featureCandidateSchema>;
export type BatchAnalysis = z.infer<typeof batchAnalysisSchema>;
