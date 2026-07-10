// apps/api/src/modules/auth/auth.service.ts
//
// Logique métier pure de l'authentification. Comme pour projects.service,
// aucune dépendance à Express — testable isolément et réutilisable par
// d'autres services internes si besoin (ex: création d'un compte de
// service pour l'orchestrateur en Phase 8).

import { randomBytes, createHash } from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { prisma } from "@platform/database";
import { config } from "@platform/config";
import { ConflictError, UnauthorizedError } from "../../lib/errors";
import type { LoginInput, RegisterInput } from "./auth.schema";

// --- Hashing de mot de passe ---
//
// Paramètres Argon2id recommandés par l'OWASP pour un service web
// (coût mémoire 19 MiB minimum en pratique on prend plus large ici
// car le hashing n'a lieu qu'au login/register, pas sur le chemin
// chaud de l'application).
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// --- Access token (JWT stateless, courte durée) ---

interface AccessTokenPayload {
  sub: string; // userId
  organizationId: string;
  role: string;
}

function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, config.JWT_SECRET) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError("Access token invalide ou expiré");
  }
}

// --- Refresh token (opaque, stocké hashé en base, rotatif) ---
//
// Le token brut n'est JAMAIS stocké — seul son hash SHA-256 l'est.
// Même en cas de fuite de la base de données, les refresh tokens des
// utilisateurs ne sont pas directement réutilisables.

function generateOpaqueToken(): string {
  return randomBytes(48).toString("hex");
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

async function issueTokenPair(user: { id: string; organizationId: string; role: string }, meta: RequestMeta) {
  const accessToken = generateAccessToken({
    sub: user.id,
    organizationId: user.organizationId,
    role: user.role,
  });

  const rawRefreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawRefreshToken),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    },
  });

  return { accessToken, refreshToken: rawRefreshToken };
}

// --- Inscription ---
//
// Crée l'organisation ET le premier utilisateur (rôle OWNER) dans une
// seule transaction — soit les deux existent, soit aucun des deux
// n'est créé en cas d'erreur à mi-chemin.

export async function register(input: RegisterInput, meta: RequestMeta) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ConflictError("Un compte existe déjà avec cet email");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.organizationName,
        slug: input.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      },
    });

    return tx.user.create({
      data: {
        organizationId: organization.id,
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: "OWNER",
      },
    });
  });

  const tokens = await issueTokenPair(user, meta);
  return { user, ...tokens };
}

// --- Connexion ---

export async function login(input: LoginInput, meta: RequestMeta) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Message volontairement identique que l'email n'existe pas OU que
  // le mot de passe soit incorrect — ne jamais révéler quel champ est
  // en cause, ça facilite l'énumération de comptes valides.
  if (!user || !user.isActive) {
    throw new UnauthorizedError("Email ou mot de passe incorrect");
  }

  const validPassword = await verifyPassword(user.passwordHash, input.password);
  if (!validPassword) {
    throw new UnauthorizedError("Email ou mot de passe incorrect");
  }

  const tokens = await issueTokenPair(user, meta);
  return { user, ...tokens };
}

// --- Rafraîchissement avec rotation + détection de réutilisation ---

export async function refresh(rawToken: string, meta: RequestMeta) {
  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw new UnauthorizedError("Refresh token inconnu");
  }

  if (stored.revokedAt) {
    // Un token déjà révoqué qui revient : signe fort de vol/replay.
    // On révoque IMMÉDIATEMENT toutes les sessions actives de
    // l'utilisateur, pas seulement celle-ci.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError("Session compromise détectée — reconnexion requise");
  }

  if (stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token expiré");
  }

  if (!stored.user.isActive) {
    throw new UnauthorizedError("Compte désactivé");
  }

  // Rotation : on révoque l'ancien token et on émet le nouveau dans
  // la même opération logique.
  const tokens = await issueTokenPair(stored.user, meta);

  const newTokenHash = hashToken(tokens.refreshToken);
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date(), replacedByTokenId: newTokenHash },
  });

  return { user: stored.user, ...tokens };
}

// --- Déconnexion ---

export async function logout(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
