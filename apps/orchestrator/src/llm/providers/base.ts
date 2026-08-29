// apps/orchestrator/src/llm/providers/base.ts
//
// Contrat commun pour tous les fournisseurs LLM.
// Chaque provider implementerait cette interface — le code metier
// n'a aucune connaissance des SDKs sous-jacents.

import type { ZodSchema } from "zod";

export interface StructuredCallOptions {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  imagesBase64?: string[]; // Images in base64 encoding
}

export interface LlmResponse<T> {
  data: T;
  /** Score 0-1 : 1 = succes au premier appel, diminue avec les retries */
  confidence: number;
  /** Nom du provider qui a finalement repondu (utile pour les logs de fallback) */
  usedProvider: string;
}

export interface LlmProvider {
  readonly name: string;
  callStructured<T>(
    schema: ZodSchema<T>,
    options: StructuredCallOptions,
    maxRetries?: number,
  ): Promise<LlmResponse<T>>;
}
