// Toute erreur métier lancée depuis un service DOIT être une instance
// de AppError (ou d'une sous-classe). Le gestionnaire d'erreurs
// centralisé (middleware/error-handler.ts) sait alors précisément quel
// code HTTP et quel code d'erreur renvoyer, sans avoir à inspecter des
// messages de string au hasard.

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, "NOT_FOUND", `${resource} introuvable (id: ${id})`);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(422, "VALIDATION_ERROR", "Les données envoyées sont invalides", details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentification requise") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé") {
    super(403, "FORBIDDEN", message);
  }
}
