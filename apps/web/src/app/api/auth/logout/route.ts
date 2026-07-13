// apps/web/src/app/api/auth/logout/route.ts

import { NextResponse } from "next/server";
import { getRefreshToken, clearSessionCookies } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

export async function POST() {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    // Best-effort : on révoque côté API, mais on nettoie les cookies
    // même si cet appel échoue (session locale invalide dans tous les cas).
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);
  }

  clearSessionCookies();
  return NextResponse.json({ success: true, data: null });
}
