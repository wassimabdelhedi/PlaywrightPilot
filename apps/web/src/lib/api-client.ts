// apps/web/src/lib/api-client.ts
//
// Wrapper fetch utilisé par tous les Server Components et Server
// Actions pour appeler apps/api. Attache l'access token, et en cas de
// 401, tente UNE fois un rafraîchissement via la logique de rotation
// de la Phase 4 avant de rejouer la requête originale.

import { getAccessToken, setSessionCookies, clearSessionCookies } from "./session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";
const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_URL;

function getWebAppUrl() {
  if (WEB_BASE_URL) return WEB_BASE_URL;

  const host = headers().get("x-forwarded-host") ?? headers().get("host");
  const proto = headers().get("x-forwarded-proto") ?? "http";

  if (!host) {
    throw new Error("Unable to determine web app host for session refresh");
  }

  return `${proto}://${host}`;
}

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
  const webUrl = getWebAppUrl();
  const requestHeaders = headers();
  const cookieHeader = requestHeaders.get("cookie");

  const res = await fetch(`${webUrl}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    return null;
  }

  const body: ApiResponse<{ accessToken: string }> = await res.json();
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
      clearSessionCookies();
      redirect("/api/auth/logout");
    }

    res = await rawFetch(path, init, accessToken);
  }

  const body: ApiResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    if (res.status === 401) {
      clearSessionCookies();
      redirect("/api/auth/logout");
    }
    throw new ApiError(res.status, body.error?.code ?? "UNKNOWN", body.error?.message ?? "Erreur inconnue");
  }

  return body.data;
}
