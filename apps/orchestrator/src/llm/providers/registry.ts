// apps/orchestrator/src/llm/providers/registry.ts
//
// Factory centralisee : retourne le bon LlmProvider selon son nom.
// Instanciation lazy + singleton par provider name.

import type { LlmProvider } from "./base.js";
import { OllamaProvider } from "./ollama.provider.js";
import { GeminiProvider } from "./gemini.provider.js";
import { ClaudeProvider } from "./claude.provider.js";
import { OpenAIProvider } from "./openai.provider.js";

export type ProviderName = "gemini" | "claude" | "ollama" | "openai";

const cache = new Map<ProviderName, LlmProvider>();

export function getProvider(name: ProviderName): LlmProvider {
  if (cache.has(name)) return cache.get(name)!;

  let provider: LlmProvider;

  switch (name) {
    case "gemini":
      provider = new GeminiProvider();
      break;
    case "claude":
      provider = new ClaudeProvider();
      break;
    case "openai":
      provider = new OpenAIProvider();
      break;
    case "ollama":
    default:
      provider = new OllamaProvider();
      break;
  }

  cache.set(name, provider);
  return provider;
}

/** Parse une valeur env et retourne un ProviderName valide (defaut: "ollama") */
export function resolveProviderName(envValue: string | undefined): ProviderName {
  const v = (envValue ?? "").toLowerCase().trim();
  if (v === "gemini") return "gemini";
  if (v === "claude") return "claude";
  if (v === "openai") return "openai";
  return "ollama";
}
