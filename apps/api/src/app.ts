// Construit l'application Express mais ne l'exécute pas (pas de
// .listen() ici). Séparer app.ts de server.ts est ce qui permet aux
// tests d'intégration (projects.test.ts) d'importer `app` et de le
// tester avec supertest SANS ouvrir de vrai port réseau.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "@platform/config";
import { requestContext } from "./middleware/request-context";
import { errorHandler } from "./middleware/error-handler";
import { apiRouter } from "./routes";
import { sendError } from "./lib/response";

export function createApp() {
  const app = express();

  // --- Sécurité de base (détaillée en Phase 4/23) ---
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Limite générique anti-abus. Des limites plus fines et par-endpoint
  // (ex: /auth/login) arrivent en Phase 4.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestContext);

  // --- Routes ---
  app.use("/api/v1", apiRouter);

  // 404 explicite plutôt que le HTML par défaut d'Express.
  app.use((req, res) => {
    sendError(res, 404, "ROUTE_NOT_FOUND", `Aucune route pour ${req.method} ${req.path}`);
  });

  // TOUJOURS en dernier — Express identifie un middleware d'erreur à
  // sa signature à 4 arguments.
  app.use(errorHandler);

  return app;
}
