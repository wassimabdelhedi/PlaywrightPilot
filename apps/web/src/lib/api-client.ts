// apps/web/src/lib/api-client.ts
//
// Wrapper fetch utilisé par tous les Server Components et Server
// Actions pour appeler apps/api. Attache l'access token, et en cas de
// 401, tente UNE fois un rafraîchissement via la logique de rotation
// de la Phase 4 avant de rejouer la requête originale.

import { getAccessToken, getRefreshToken, setSessionCookies, clearSessionCookies } from "./session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

async function rawFetch(path: string, init: RequestInit, accessToken?: string) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    cache: "no-store", // données de test = toujours fraîches, jamais mises en cache
  });
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await rawFetch("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearSessionCookies();
    return null;
  }

  const body: ApiResponse<{ accessToken: string; refreshToken: string }> = await res.json();
  setSessionCookies(body.data.accessToken, body.data.refreshToken);
  return body.data.accessToken;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let accessToken = getAccessToken();
  let res = await rawFetch(path, init, accessToken);

  if (res.status === 401) {
    // L'access token de 15 minutes a probablement expiré en cours de
    // session — on tente une seule rotation avant d'abandonner, pour
    // éviter une boucle infinie si le refresh token est lui aussi mort.
    accessToken = (await tryRefresh()) ?? undefined;

    if (!accessToken) {
      throw new ApiError(401, "SESSION_EXPIRED", "Session expirée, veuillez vous reconnecter");
    }

    res = await rawFetch(path, init, accessToken);
  }

  const body: ApiResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    throw new ApiError(res.status, body.error?.code ?? "UNKNOWN", body.error?.message ?? "Erreur inconnue");
  }

  return body.data;
}
