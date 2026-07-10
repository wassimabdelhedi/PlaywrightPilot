// Logger structuré unique, partagé par api / orchestrator / executor.
// Pourquoi pino et pas console.log : sortie JSON structurée exploitable
// par un système de logs centralisé en production (Phase 23), et
// permet d'attacher un requestId à chaque ligne de log d'une requête
// (voir middleware/request-context.ts).

import pino from "pino";
import { config } from "@platform/config";

export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: process.env.SERVICE_NAME ?? "unknown" },
  transport:
    config.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined, // en production : JSON brut, plus rapide et parsable
});

// Crée un logger "enfant" avec un requestId attaché à chaque ligne —
// utilisé par le middleware request-context pour tracer une requête
// de bout en bout dans les logs.
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

export type Logger = typeof logger;