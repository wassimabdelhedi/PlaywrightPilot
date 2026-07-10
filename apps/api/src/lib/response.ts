// Forme UNIQUE de toute réponse JSON renvoyée par l'API. Le frontend
// (Phase 5) et tout consommateur externe n'ont qu'un seul contrat à
// gérer, succès ou erreur.

import type { Response } from "express";

interface SuccessBody<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
): void {
  const body: SuccessBody<T> = { success: true, data, ...(meta ? { meta } : {}) };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  const body: ErrorBody = { success: false, error: { code, message, ...(details ? { details } : {}) } };
  res.status(statusCode).json(body);
}
