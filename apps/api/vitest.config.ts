// apps/api/vitest.config.ts
// Charge les variables d'environnement depuis .env avant chaque test
// afin que @platform/config ne rejette pas le démarrage (JWT_SECRET requis).

import { defineConfig } from "vitest/config";
import { readFileSync } from "fs";
import { resolve } from "path";

// Lecture manuelle du .env (pas de dépendance dotenv)
function loadEnv(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, "utf-8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

const envVars = loadEnv(resolve(import.meta.dirname, ".env"));

export default defineConfig({
  test: {
    // Exécution séquentielle (pool unique) pour éviter les conflits
    // sur la même base de données entre tests parallèles.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    // Timeout généreux car certains tests font des appels réseau réels
    testTimeout: 15000,
    // Variables d'env directement injectées dans les tests
    env: {
      NODE_ENV: "test",
      ...envVars,
    },
  },
});
