// apps/api/src/modules/auth/auth.controller.ts
import { sendSuccess } from "../../lib/response.js";
import * as authService from "./auth.service.js";
function requestMeta(req) {
    return { userAgent: req.headers["user-agent"], ipAddress: req.ip };
}
// On ne renvoie jamais passwordHash au client — extraction explicite
// des champs publics plutôt qu'un `...user` qui laisserait fuiter le
// hash si le modèle Prisma gagne un champ sensible plus tard.
function toPublicUser(user) {
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role, organizationId: user.organizationId };
}
export async function register(req, res) {
    const { user, accessToken, refreshToken } = await authService.register(req.body, requestMeta(req));
    sendSuccess(res, { user: toPublicUser(user), accessToken, refreshToken }, 201);
}
export async function login(req, res) {
    const { user, accessToken, refreshToken } = await authService.login(req.body, requestMeta(req));
    sendSuccess(res, { user: toPublicUser(user), accessToken, refreshToken });
}
export async function refresh(req, res) {
    const { user, accessToken, refreshToken } = await authService.refresh(req.body.refreshToken, requestMeta(req));
    sendSuccess(res, { user: toPublicUser(user), accessToken, refreshToken });
}
export async function logout(req, res) {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
}
export async function me(req, res) {
    sendSuccess(res, req.user);
}
//# sourceMappingURL=auth.controller.js.map