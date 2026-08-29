// apps/orchestrator/src/llm/confidence.ts
//
// Calcule un score de confiance 0-1 pour chaque reponse LLM.
// Logique : succes au premier appel = 1.0, chaque retry reduit le score.
// Un temps de reponse tres long (> 30s) penalise aussi la confiance.

export interface ConfidenceInput {
  /** Numero de la tentative reussie (1 = premiere) */
  attempt: number;
  /** Nombre max de tentatives configure */
  maxRetries: number;
  /** Temps ecoule depuis le debut (ms) */
  elapsedMs: number;
  /** Provider utilise */
  provider: string;
}

/** Seuil en dessous duquel la reponse doit etre marquee pour review */
export const CONFIDENCE_THRESHOLD = 0.8;

export function computeConfidence(input: ConfidenceInput): number {
  const { attempt, maxRetries, elapsedMs } = input;

  // Base : 1.0 si premier appel, reduit de 0.15 par retry supplementaire
  let score = 1.0 - (attempt - 1) * 0.15;

  // Penalite temps : -0.05 par tranche de 10 secondes au-dela de 5s
  const slownessPenalty = Math.max(0, Math.floor((elapsedMs - 5000) / 10000)) * 0.05;
  score -= slownessPenalty;

  // Borne entre 0.1 et 1.0
  return Math.min(1.0, Math.max(0.1, score));
}

/** Retourne true si la confidence est suffisante pour accepter la reponse */
export function isConfident(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLD;
}
