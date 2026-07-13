// apps/web/src/lib/session.ts
//
// SERVER-ONLY. Ce fichier ne doit jamais être importé par un Client
// Component (next/headers échouerait de toute façon à la compilation
// si c'était le cas — filet de sécurité involontaire mais bienvenu).
//
// Les tokens ne sont posés en cookies QUE par les Route Handlers BFF
// (app/api/auth/*/route.ts). Tout le reste de l'application se
// contente de les LIRE via ces fonctions.

import { cookies } from "next/headers";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function setSessionCookies(accessToken: string, refreshToken: string) {
  const store = cookies();
  // Durées alignées sur celles émises par l'API (Phase 4) : 15 min
  // pour l'access token, 7 jours pour le refresh token.
  store.set(ACCESS_TOKEN_COOKIE, accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 });
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 });
}

export function clearSessionCookies() {
  const store = cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export function getAccessToken(): string | undefined {
  return cookies().get(ACCESS_TOKEN_COOKIE)?.value;
}

export function getRefreshToken(): string | undefined {
  return cookies().get(REFRESH_TOKEN_COOKIE)?.value;
}

export function hasSession(): boolean {
  return Boolean(getRefreshToken());
}
