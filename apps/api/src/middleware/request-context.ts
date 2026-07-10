// Attache un requestId unique à chaque requête entrante et un logger
// enfant préconfiguré avec ce requestId. Ceci est ce qui permet, en
// production, de retrouver TOUTES les lignes de log liées à une
// requête précise en filtrant par requestId — indispensable pour
// débugger une exécution de test qui a échoué au milieu d'un pipeline
// asynchrone (Phase 12+).

import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { createRequestLogger, type Logger } from "@platform/logger";

// Extension du type Express Request — TypeScript connaît désormais
// req.requestId et req.log partout dans le code.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      log: Logger;
    }
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers["x-request-id"];
  req.requestId = typeof incomingId === "string" ? incomingId : randomUUID();
  req.log = createRequestLogger(req.requestId);

  res.setHeader("x-request-id", req.requestId);

  const startedAt = Date.now();
  res.on("finish", () => {
    req.log.info(
      { method: req.method, path: req.path, statusCode: res.statusCode, durationMs: Date.now() - startedAt },
      "requête traitée"
    );
  });

  next();
}
