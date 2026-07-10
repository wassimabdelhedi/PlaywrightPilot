// Express 4 ne capture PAS automatiquement les rejets de promesses
// dans les handlers async — une erreur non catchée y reste une
// "unhandled rejection" silencieuse au lieu d'atteindre le
// error-handler. Ce wrapper est obligatoire sur CHAQUE handler async
// de contrôleur.

import type { NextFunction, Request, RequestHandler, Response } from "express";

export function asyncHandler(fn: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
