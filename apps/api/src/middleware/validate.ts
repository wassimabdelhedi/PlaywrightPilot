// Middleware générique réutilisé par CHAQUE route qui accepte des
// données (body, query ou params). Aucun contrôleur ne doit jamais
// valider manuellement req.body — c'est le rôle de ce middleware,
// placé sur la route, avant que le contrôleur ne soit appelé.

import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ValidationError } from "../lib/errors";

type RequestPart = "body" | "query" | "params";

export function validate(schema: ZodSchema, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      // On transmet au gestionnaire d'erreurs centralisé plutôt que de
      // répondre ici — garde toute la logique de formatage HTTP au
      // même endroit.
      next(new ValidationError(result.error.flatten()));
      return;
    }

    // On remplace les données brutes par les données parsées/typées
    // (Zod applique aussi les valeurs par défaut et les coercitions).
    req[part] = result.data;
    next();
  };
}
