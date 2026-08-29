// apps/orchestrator/src/llm/client.ts
//
// Routeur LLM centralise.
// - Route chaque appel vers le bon provider selon les options
// - Applique un fallback automatique (chaine) si le provider primaire echoue
// - Retro-compatible : sans options, utilise le provider par defaut (OLLAMA)

import type { ZodSchema } from "zod";
import { logger } from "@platform/logger";
import { config } from "@platform/config";
import { getProvider, resolveProviderName, type ProviderName } from "./providers/registry.js";
import { isConfident, CONFIDENCE_THRESHOLD } from "./confidence.js";
import type { LlmResponse, StructuredCallOptions } from "./providers/base.js";

export type { StructuredCallOptions, LlmResponse } from "./providers/base.js";

export interface CallOptions {
  /** Provider a utiliser (override la config env) */
  provider?: ProviderName;
  /** Provider de secours specifique (override config.FALLBACK_LLM) */
  fallback?: string;
  maxRetries?: number;
}

export async function callStructured<T>(
  schema: ZodSchema<T>,
  options: StructuredCallOptions,
  callOpts: CallOptions = {},
): Promise<LlmResponse<T>> {
  const primaryName = callOpts.provider ?? resolveProviderName(config.DEFAULT_LLM);
  
  // Construit la liste ordonnee des fallbacks en ignorant le primary pour eviter les boucles
  const fallbackStr = callOpts.fallback ?? config.FALLBACK_LLM;
  const fallbackNames = fallbackStr.split(",")
    .map(name => resolveProviderName(name.trim()))
    .filter(name => name !== primaryName)
    // deduplication
    .filter((name, index, self) => self.indexOf(name) === index);

  const maxRetries = callOpts.maxRetries ?? 3;
  const primary = getProvider(primaryName);

  let bestResponse: LlmResponse<T> | null = null;
  let lastError: unknown;

  // --- Tentative avec le provider primaire ---
  try {
    const response = await primary.callStructured(schema, options, maxRetries);

    if (isConfident(response.confidence)) {
      return response;
    }
    
    logger.warn(
      { confidence: response.confidence, provider: primaryName, threshold: CONFIDENCE_THRESHOLD },
      `[LLM] Confiance faible (${response.confidence.toFixed(2)}) - basculement vers la chaine de fallback (ex: OpenAI)`,
    );
    bestResponse = response;
  } catch (primaryErr: unknown) {
    lastError = primaryErr;
    logger.warn(
      { primaryProvider: primaryName, err: (primaryErr as Error).message },
      "[LLM] Provider primaire en echec - activation de la chaine de fallback",
    );
  }

  // --- Fallback Chain (ex: OpenAI) ---
  if (fallbackNames.length === 0) {
    if (bestResponse) return bestResponse;
    throw new Error(`[LLM] Provider "${primaryName}" en echec et aucun autre fallback n'est disponible.`);
  }

  for (let i = 0; i < fallbackNames.length; i++) {
    const fallbackName = fallbackNames[i];
    const fallback = getProvider(fallbackName);
    logger.info({ fallbackProvider: fallbackName, rang: i + 1 }, "[LLM] Tentative avec provider de fallback");

    try {
      const response = await fallback.callStructured(schema, options, maxRetries);
      // Le fallback penalise la confidence de maniere cumulative (0.1 par cran)
      const adjustedConfidence = Math.max(0.1, response.confidence - (0.1 * (i + 1)));
      
      const finalResponse = { ...response, confidence: adjustedConfidence };
      
      if (isConfident(adjustedConfidence)) {
        return finalResponse;
      }
      
      logger.warn(
        { confidence: adjustedConfidence, provider: fallbackName },
        `[LLM] Fallback ${fallbackName} a egalement une confiance faible`,
      );

      if (!bestResponse || adjustedConfidence > bestResponse.confidence) {
        bestResponse = finalResponse;
      }
    } catch (err: unknown) {
      lastError = err;
      logger.warn(
        { fallbackProvider: fallbackName, err: (err as Error).message },
        `[LLM] Fallback ${fallbackName} en echec`,
      );
    }
  }

  // Si on arrive ici, soit on a que des reponses a faible confiance, soit que des echecs
  if (bestResponse) {
    logger.warn("[LLM] Aucun provider n'a atteint le seuil de confiance. Retour du meilleur resultat possible.");
    return bestResponse;
  }

  throw new Error(`[LLM] Echec critique: Primaire et tous les fallbacks (${fallbackNames.join(", ")}) ont echoue. Derniere erreur: ${(lastError as Error)?.message}`);
}