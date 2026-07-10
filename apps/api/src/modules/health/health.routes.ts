// Endpoint indispensable dès la Phase 20 (Docker healthcheck) et la
// Phase 21 (CI/CD — vérifier que le conteneur est vivant avant de
// router du trafic dessus).

import { Router } from "express";
import { prisma } from "@platform/database";
import { sendSuccess } from "../../lib/response";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  // On vérifie aussi la connexion Postgres — un "health" qui ne
  // vérifie que le process Node et pas sa dépendance critique donne
  // une fausse impression de disponibilité.
  await prisma.$queryRaw`SELECT 1`;

  sendSuccess(res, {
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});