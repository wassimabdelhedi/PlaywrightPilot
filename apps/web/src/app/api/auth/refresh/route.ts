import { NextResponse } from "next/server";
import { getRefreshToken, setSessionCookies, clearSessionCookies } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

export async function POST() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSessionCookies();
    return NextResponse.json(
      { success: false, error: { code: "SESSION_EXPIRED", message: "Session expirée, veuillez vous reconnecter" } },
      { status: 401 }
    );
  }

  const apiRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  const body = await apiRes.json();
  if (!apiRes.ok) {
    clearSessionCookies();
    return NextResponse.json(body, { status: apiRes.status });
  }

  setSessionCookies(body.data.accessToken, body.data.refreshToken);
  return NextResponse.json({ success: true, data: { accessToken: body.data.accessToken } });
}
