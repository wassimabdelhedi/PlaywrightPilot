// Toute variable d'environnement du projet transite par ce fichier.
// Interdiction implicite : plus aucun `process.env.X` ailleurs dans le
// monorepo. Si une variable requise manque ou a un mauvais type, le
// processus doit planter IMMÃ‰DIATEMENT au dÃ©marrage avec un message clair
// â€” jamais Ã©chouer silencieusement au milieu d'une requÃªte.

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // --- API ---
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  // --- Base de donnÃ©es ---
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requise"),
  // --- SÃ©curitÃ© ---
  JWT_SECRET: z.string().min(32, "JWT_SECRET doit contenir au moins 32 caractÃ¨res"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),
  // --- Logging ---
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  // --- CORS ---
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // --- Executor ---
  PLAYWRIGHT_HEADLESS: z.coerce.boolean().default(true),
  MAX_CONCURRENT_CONTEXTS: z.coerce.number().int().positive().default(5),
  EXECUTION_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  TEST_PROCESS_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  ARTIFACT_STORAGE_DIR: z.string().default("./artifacts"),
  // --- Queue (BullMQ / Redis) ---
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  // --- Discovery crawl ---
  MAX_DISCOVERY_PAGES: z.coerce.number().int().positive().default(100),
  DISCOVERY_PAGE_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  // --- Orchestrator (Phase 8/9) ---
  OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("qwen3:32b"),
  OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),
  FEATURE_ANALYSIS_BATCH_SIZE: z.coerce.number().int().positive().default(10),
  FEATURE_ANALYSIS_MAX_RETRIES: z.coerce.number().int().min(0).default(2),
  // --- Multi-LLM Routing ---
  // Valeurs valides: "gemini" | "claude" | "ollama" | "openai"|// Valeurs valides: "gemini" | "claude" | "ollama" | "openai"|// Valeurs valides: "gemini" | "claude" | "ollama" | "openai"
  FEATURE_LLM: z.string().default("gemini"),   // Phase 8  - Feature Understanding
  SCENARIO_LLM: z.string().default("gemini"),  // Phase 10 - Scenario Generation
  TESTPLAN_LLM: z.string().default("gemini"),  // Phase 11 - Test Plan Generation
  FAILURE_LLM: z.string().default("gemini"),   // Phase 13 - Failure Analysis
  DEFAULT_LLM: z.string().default("gemini"),   // Defaut pour tout appel sans provider specifie
  FALLBACK_LLM: z.string().default("openai"),  // Fallback automatique si le provider primaire echoue
  // --- Gemini ---
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_FALLBACK_API_KEYS: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_FALLBACK_MODELS: z.string().default("gemini-3.5-flash-lite,gemini-3.1-pro-preview,gemini-2.5-pro,gemini-3.0-flash,gemini-3.1-pro,gemini-3.5-flash,gemini-3.6-flash,gemini-3.7-flash"),
  // --- Anthropic Claude ---
  ANTHROPIC_API_KEY: z.string().default(""),
  ANTHROPIC_FALLBACK_API_KEYS: z.string().default(""),
  CLAUDE_MODEL: z.string().default("claude-3-5-haiku-20241022"),
  // --- Agent Memory (Phase 9) ---
  OPENAI_API_KEY: z.string().default("dummy-key"),
  OPENAI_FALLBACK_API_KEYS: z.string().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"), // Mettez une clÃ© valide en prod
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  MEMORY_DEDUPE_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.95),
  MEMORY_FRESHNESS_MS: z.coerce.number().int().positive().default(30 * 24 * 60 * 60 * 1000), // 30 jours
});

export type AppConfig = z.infer<typeof envSchema>;

function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // On formate les erreurs Zod en liste lisible avant de tuer le process.
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    // eslint-disable-next-line no-console
    console.error(`Configuration invalide au dÃ©marrage :\n${issues}`);
    process.exit(1);
  }

  return parsed.data;
}

// Singleton â€” chargÃ© une seule fois, importÃ© partout dans le monorepo.
export const config = loadConfig();




