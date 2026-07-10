// DERNIER middleware monté dans app.ts. Point de passage UNIQUE de
// toute erreur de l'application, qu'elle vienne d'un throw explicite
// dans un service (AppError) ou d'une exception inattendue (bug,
// erreur Prisma, etc). Rien ne doit jamais laisser fuiter une stack
// trace brute ou un message d'erreur Prisma non formaté au client.

import type { NextFunction, Request, Response } from "express";
import {Prisma}from "@platform/database";
import { AppError } from "../lib/errors";
import { sendError } from "../lib/response";

export function errorHandler (
 err : unknown,
 req : Request,
 res : Response,
 next : NextFunction
): void {
 // 1. Erreurs métier connues — on fait confiance au code/statusCode déjà défini.
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      req.log.error({ err }, "erreur serveur");
    } else {
      req.log.warn({ err: err.message, code: err.code }, "erreur métier");
    }
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }
  // 2. Erreurs Prisma connues — on les traduit en erreurs HTTP propres
  // plutôt que de renvoyer le message technique de Prisma au client.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      sendError(res, 409, "CONFLICT", "Une ressource avec ces valeurs uniques existe déjà");
      return;
    }
    if (err.code === "P2025") {
      sendError(res, 404, "NOT_FOUND", "Ressource introuvable");
      return;
    }
  }
  // 3. Tout le reste : erreur inattendue — on logue la stack complète
  // en interne, mais on ne renvoie JAMAIS le détail au client en
  // production (fuite d'information sur l'infrastructure).
  req.log.error({ err }, "erreur non gérée");

  const message =
    process.env.NODE_ENV === "production"
      ? "Une erreur interne est survenue"
      : err instanceof Error
        ? err.message
        : "Erreur inconnue";

  sendError(res, 500, "INTERNAL_ERROR", message);
}