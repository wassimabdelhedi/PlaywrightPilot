// Forme UNIQUE de toute réponse JSON renvoyée par l'API. Le frontend
// (Phase 5) et tout consommateur externe n'ont qu'un seul contrat à
// gérer, succès ou erreur.
export function sendSuccess(res, data, statusCode = 200, meta) {
    const body = { success: true, data, ...(meta ? { meta } : {}) };
    res.status(statusCode).json(body);
}
export function sendError(res, statusCode, code, message, details) {
    const body = { success: false, error: { code, message, ...(details ? { details } : {}) } };
    res.status(statusCode).json(body);
}
//# sourceMappingURL=response.js.map