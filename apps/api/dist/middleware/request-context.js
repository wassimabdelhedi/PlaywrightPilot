// Attache un requestId unique à chaque requête entrante et un logger
// enfant préconfiguré avec ce requestId. Ceci est ce qui permet, en
// production, de retrouver TOUTES les lignes de log liées à une
// requête précise en filtrant par requestId — indispensable pour
// débugger une exécution de test qui a échoué au milieu d'un pipeline
// asynchrone (Phase 12+).
import { randomUUID } from "node:crypto";
import { createRequestLogger } from "@platform/logger";
export function requestContext(req, res, next) {
    const incomingId = req.headers["x-request-id"];
    req.requestId = typeof incomingId === "string" ? incomingId : randomUUID();
    req.log = createRequestLogger(req.requestId);
    res.setHeader("x-request-id", req.requestId);
    const startedAt = Date.now();
    res.on("finish", () => {
        req.log.info({ method: req.method, path: req.path, statusCode: res.statusCode, durationMs: Date.now() - startedAt }, "requête traitée");
    });
    next();
}
//# sourceMappingURL=request-context.js.map