import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { ZodSchema } from "zod";
import { config } from "@platform/config";
import { logger } from "@platform/logger";
import type { LlmProvider, LlmResponse, StructuredCallOptions } from "./base.js";
import { computeConfidence } from "../confidence.js";

export class GeminiProvider implements LlmProvider {
  readonly name = "gemini";

  private readonly llm: ChatGoogleGenerativeAI;
  private readonly fallbackLlms: Array<{ name: string; keyInfo: string; instance: ChatGoogleGenerativeAI }> = [];

  constructor(model?: string) {
    const mainModel = model ?? config.GEMINI_MODEL;
    const fallbackModels = config.GEMINI_FALLBACK_MODELS.split(",").map(m => m.trim()).filter(Boolean);
    const allModels = [mainModel, ...fallbackModels];
    
    const mainKey = config.GEMINI_API_KEY;
    const fallbackKeys = config.GEMINI_FALLBACK_API_KEYS.split(",").map(k => k.trim()).filter(Boolean);
    const allKeys = [mainKey, ...fallbackKeys];

    this.llm = new ChatGoogleGenerativeAI({
      apiKey: mainKey,
      model: mainModel,
      temperature: 0.1,
    });
    
    let isFirst = true;
    for (let mIndex = 0; mIndex < allModels.length; mIndex++) {
      for (let kIndex = 0; kIndex < allKeys.length; kIndex++) {
        if (isFirst) {
          isFirst = false;
          continue; 
        }
        
        this.fallbackLlms.push({
          name: allModels[mIndex],
          keyInfo: `key-${kIndex + 1}`,
          instance: new ChatGoogleGenerativeAI({
            apiKey: allKeys[kIndex],
            model: allModels[mIndex],
            temperature: 0.1,
          })
        });
      }
    }
  }

  async callStructured<T>(
    schema: ZodSchema<T>,
    options: StructuredCallOptions,
    maxRetries = 3, 
  ): Promise<LlmResponse<T>> {
    const modelsToTry = [
      { name: config.GEMINI_MODEL, keyInfo: "key-1", instance: this.llm.withStructuredOutput(schema, { name: options.schemaName }) },
      ...this.fallbackLlms.map(fb => ({
        name: fb.name,
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

        const providerName = isFallback ? `${this.name} (fallback: ${activeModelInfo.name} [${activeModelInfo.keyInfo}])` : this.name;
        let confidence = computeConfidence({ attempt, maxRetries: totalAttempts, elapsedMs: Date.now() - startedAt, provider: providerName });
        
        if (isFallback) {
          confidence = Math.max(0.1, confidence - (0.05 * modelIndex));
        }

        return { data: result as T, confidence, usedProvider: providerName };
      } catch (err: unknown) {
        lastError = err;
        const errMsg = (err as Error).message;
        
        logger.warn({ attempt, model: activeModelInfo.name, key: activeModelInfo.keyInfo, err: errMsg }, `[GeminiProvider] Echec avec le modele ${activeModelInfo.name} et clé ${activeModelInfo.keyInfo}`);
        
        if (!errMsg.includes("404") && !errMsg.includes("not found")) {
           await new Promise((res) => setTimeout(res, 1500 * attempt));
        }
      }
    }

    logger.error({ err: lastError }, "[GeminiProvider] Echec apres toutes les tentatives, clés et modeles de secours");
    throw new Error(
      `[GeminiProvider] Echec apres ${totalAttempts} tentatives : ${(lastError as Error)?.message ?? "raison inconnue"}`,
    );
  }
}