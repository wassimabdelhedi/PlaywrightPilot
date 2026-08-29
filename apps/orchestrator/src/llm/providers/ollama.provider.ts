// apps/orchestrator/src/llm/providers/ollama.provider.ts
//
// Fournisseur Ollama — extrait de l'ancien client.ts.
// Utilise @langchain/ollama + withStructuredOutput.

import { ChatOllama } from "@langchain/ollama";
import type { ZodSchema } from "zod";
import { config } from "@platform/config";
import { logger } from "@platform/logger";
import type { LlmProvider, LlmResponse, StructuredCallOptions } from "./base.js";
import { computeConfidence } from "../confidence.js";

export class OllamaProvider implements LlmProvider {
  readonly name = "ollama";

  private readonly llm: ChatOllama;

  constructor(model?: string) {
    this.llm = new ChatOllama({
      baseUrl: config.OLLAMA_BASE_URL,
      model: model ?? config.OLLAMA_MODEL,
      temperature: 0.1,
    });
  }

  async callStructured<T>(
    schema: ZodSchema<T>,
    options: StructuredCallOptions,
    maxRetries = 3,
  ): Promise<LlmResponse<T>> {
    const modelWithStructure = this.llm.withStructuredOutput(schema, {
      name: options.schemaName,
    });

    let lastError: unknown;
    const startedAt = Date.now();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await modelWithStructure.invoke([
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt },
        ]);

        const confidence = computeConfidence({ attempt, maxRetries, elapsedMs: Date.now() - startedAt, provider: this.name });
        return { data: result as T, confidence, usedProvider: this.name };
      } catch (err: unknown) {
        lastError = err;
        logger.warn({ attempt, err: (err as Error).message }, `[OllamaProvider] Echec tentative ${attempt}/${maxRetries}`);
        await new Promise((res) => setTimeout(res, 2000 * attempt));
      }
    }

    logger.error({ err: lastError }, "[OllamaProvider] Echec apres toutes les tentatives");
    throw new Error(
      `[OllamaProvider] Echec apres ${maxRetries} tentatives : ${(lastError as Error)?.message ?? "raison inconnue"}`,
    );
  }
}
