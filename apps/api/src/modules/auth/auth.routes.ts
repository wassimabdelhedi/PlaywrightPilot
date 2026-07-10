// apps/api/src/modules/auth/auth.routes.ts

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../lib/async-handler";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/authenticate";
import * as controller from "./auth.controller";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schema";

export const authRouter = Router();

// Limite stricte et dédiée sur /login : le rate-limit générique de
// app.ts (300 req / 15 min) est bien trop permissif pour empêcher un
// brute-force de mot de passe ciblé sur un seul compte.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "TOO_MANY_ATTEMPTS", message: "Trop de tentatives, réessayez plus tard" } },
});

authRouter.post("/register", validate(registerSchema), asyncHandler(controller.register));
authRouter.post("/login", loginLimiter, validate(loginSchema), asyncHandler(controller.login));
authRouter.post("/refresh", validate(refreshSchema), asyncHandler(controller.refresh));
authRouter.post("/logout", validate(refreshSchema), asyncHandler(controller.logout));
authRouter.get("/me", authenticate, asyncHandler(controller.me));
