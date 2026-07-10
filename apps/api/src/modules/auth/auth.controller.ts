// apps/api/src/modules/auth/auth.controller.ts

import type { Request, Response } from "express";
import { sendSuccess } from "../../lib/response";
import * as authService from "./auth.service";

function requestMeta(req: Request) {
  return { userAgent: req.headers["user-agent"], ipAddress: req.ip };
}

// On ne renvoie jamais passwordHash au client — extraction explicite
// des champs publics plutôt qu'un `...user` qui laisserait fuiter le
// hash si le modèle Prisma gagne un champ sensible plus tard.
function toPublicUser(user: { id: string; email: string; fullName: string; role: string; organizationId: string }) {
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role, organizationId: user.organizationId };
}

export async function register(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.register(req.body, requestMeta(req));
  sendSuccess(res, { user: toPublicUser(user), accessToken, refreshToken }, 201);
}

export async function login(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.login(req.body, requestMeta(req));
  sendSuccess(res, { user: toPublicUser(user), accessToken, refreshToken });
}

export async function refresh(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.refresh(req.body.refreshToken, requestMeta(req));
  sendSuccess(res, { user: toPublicUser(user), accessToken, refreshToken });
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  sendSuccess(res, req.user);
}
