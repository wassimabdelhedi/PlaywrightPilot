import { ChatOpenAI } from "@langchain/openai";
import type { ZodSchema } from "zod";
import { config } from "@platform/config";
import { logger } from "@platform/logger";
import type { LlmProvider, LlmResponse, StructuredCallOptions } from "./base.js";
import { computeConfidence } from "../confidence.js";

export class OpenAIProvider implements LlmProvider {
  readonly name = "openai";

  private readonly llm: ChatOpenAI;
  private readonly fallbackLlms: Array<{ keyInfo: string; instance: ChatOpenAI }> = [];

  constructor(model?: string) {
    const mainModel = model ?? config.OPENAI_MODEL;
    const mainKey = config.OPENAI_API_KEY;
    const fallbackKeys = config.OPENAI_FALLBACK_API_KEYS.split(",").map(k => k.trim()).filter(Boolean);
    const allKeys = [mainKey, ...fallbackKeys];

    this.llm = new ChatOpenAI({
      apiKey: mainKey,
      model: mainModel,
      temperature: 0.1,
    });
    
    for (let kIndex = 1; kIndex < allKeys.length; kIndex++) {
      this.fallbackLlms.push({
        keyInfo: `key-${kIndex + 1}`,
        instance: new ChatOpenAI({
          apiKey: allKeys[kIndex],
          model: mainModel,
          temperature: 0.1,
        })
      });
    }
  }

  async callStructured<T>(
    schema: ZodSchema<T>,
    options: StructuredCallOptions,
    maxRetries = 3,
  ): Promise<LlmResponse<T>> {
    const modelsToTry = [
      { keyInfo: "key-1", instance: this.llm.withStructuredOutput(schema, { name: options.schemaName }) },
      ...this.fallbackLlms.map(fb => ({
        keyInfo: fb.keyInfo,
        instance: fb.instance.withStructuredOutput(schema, { name: options.schemaName })
      }))
    ];

    let lastError: unknown;
    const startedAt = Date.now();
    const totalAttempts = Math.max(modelsToTry.length, maxRetries);

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      const modelIndex = Math.min(attempt - 1, modelsToTry.length - 1);
      const activeModelInfo = modelsToTry[modelIndex];
      const isFallback = modelIndex > 0;

      try {
        const userMessageContent: any[] = [{ type: "text", text: options.userPrompt }];
        if (options.imagesBase64) {
          for (const imgBase64 of options.imagesBase64) {
            userMessageContent.push({
              type: "image_url",
              image_url: `data:image/png;base64,${imgBase64}`,
            });
          }
        }

        const result = await activeModelInfo.instance.invoke([
          { role: "system", content: options.systemPrompt },
          { role: "user", content: userMessageContent },
        ]);

        const providerName = isFallback ? `${this.name} (fallback: [${activeModelInfo.keyInfo}])` : this.name;
        const confidence = computeConfidence({ attempt, maxRetries: totalAttempts, elapsedMs: Date.now() - startedAt, provider: providerName });
        return { data: result as T, confidence, usedProvider: providerName };
      } catch (err: unknown) {
        lastError = err;
        const errMsg = (err as Error).message;
        logger.warn({ attempt, key: activeModelInfo.keyInfo, err: errMsg }, `[OpenAIProvider] Echec avec clé ${activeModelInfo.keyInfo}`);
        await new Promise((res) => setTimeout(res, 2000 * attempt));
      }
    }

    logger.error({ err: lastError }, "[OpenAIProvider] Echec apres toutes les tentatives et clés de secours");
    throw new Error(
      `[OpenAIProvider] Echec apres ${totalAttempts} tentatives : ${(lastError as Error)?.message ?? "raison inconnue"}`,
    );
  }
}