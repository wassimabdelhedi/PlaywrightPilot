import { UnauthorizedError } from "../lib/errors.js";
import { verifyAccessToken } from "../modules/auth/auth.service.js";
export function authenticate(req, _res, next) {
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
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=authenticate.js.map