// Contrôle d'accès basé sur les rôles. S'utilise APRÈS `authenticate`
// sur une route (req.user doit déjà exister). Exemple :
//   router.delete("/:id", authenticate, authorize("OWNER", "ADMIN"), ...)

import type { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../lib/errors";

export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError(`Rôle requis : ${allowedRoles.join(" ou ")}`));
      return;
    }
    next();
  };
}