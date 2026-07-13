// Toute variable d'environnement du projet transite par ce fichier.
// Interdiction implicite : plus aucun `process.env.X` ailleurs dans le
// monorepo. Si une variable requise manque ou a un mauvais type, le
// processus doit planter IMMÉDIATEMENT au démarrage avec un message clair
// — jamais échouer silencieusement au milieu d'une requête.
import { z } from "zod";
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // --- API ---
    PORT: z.coerce.number().int().positive().default(4000),
    API_BASE_URL: z.string().url().default("http://localhost:4000"),
    // --- Base de données ---
    DATABASE_URL: z.string().min(1, "DATABASE_URL est requise"),
    // --- Sécurité ---
    JWT_SECRET: z.string().min(32, "JWT_SECRET doit contenir au moins 32 caractères"),
    JWT_EXPIRES_IN: z.string().default("15m"),
    REFRESH_TOKEN_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(30),
    // --- Logging ---
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    // --- CORS ---
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
});
function loadConfig() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        // On formate les erreurs Zod en liste lisible avant de tuer le process.
        const issues = parsed.error.issues
            .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
            .join("\n");
        // eslint-disable-next-line no-console
        console.error(`Configuration invalide au démarrage :\n${issues}`);
        process.exit(1);
    }
    return parsed.data;
}
// Singleton — chargé une seule fois, importé partout dans le monorepo.
export const config = loadConfig();
//# sourceMappingURL=index.js.map