// apps/api/src/modules/auth/auth.schema.ts

import { z } from "zod";

// Politique de mot de passe : longueur + au moins 1 majuscule, 1
// chiffre. On n'impose pas de caractère spécial obligatoire (l'OWASP
// recommande désormais la longueur plutôt que la complexité forcée,
// qui pousse les utilisateurs vers des patterns prévisibles).
const passwordSchema = z
  .string()
  .min(10, "Le mot de passe doit contenir au moins 10 caractères")
  .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre");

export const registerSchema = z.object({
  organizationName: z.string().min(2).max(120),
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
