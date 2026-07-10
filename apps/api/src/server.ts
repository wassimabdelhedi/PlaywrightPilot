// Seul fichier qui appelle réellement .listen(). Gère aussi l'arrêt
// propre ("graceful shutdown") — indispensable en production (Phase
// 22/23) pour que Docker/Kubernetes puisse redémarrer un conteneur
// sans couper une requête en cours ni laisser des connexions Postgres
// orphelines.

import { config } from "@platform/config";
import { logger } from "@platform/logger";
import { prisma } from "@platform/database";
import { createApp } from "./app";

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, "API démarrée");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "arrêt en cours...");

  server.close(async () => {
    await prisma.$disconnect();
    logger.info("arrêt propre terminé");
    process.exit(0);
  });

  // Filet de sécurité : si l'arrêt propre traîne plus de 10s
  // (connexion bloquée), on force la sortie plutôt que de laisser le
  // conteneur pendre indéfiniment.
  setTimeout(() => {
    logger.error("arrêt forcé après timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
