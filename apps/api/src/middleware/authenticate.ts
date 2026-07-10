// Vérifie l'access token JWT présenté dans l'en-tête Authorization.
// Aucune requête base de données ici — c'est tout l'intérêt du JWT
// stateless : la vérification est purement cryptographique, donc
// rapide et ne crée pas de dépendance Postgres sur le chemin chaud de
// CHAQUE requête protégée.
import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../lib/errors";
import { verifyAccessToken } from "../modules/auth/auth.service";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Token d'accès manquant"));
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, organizationId: payload.organizationId, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}
