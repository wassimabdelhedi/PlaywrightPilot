// Proxy entre le formulaire de connexion et l'API Express. Le
// navigateur POST ici, jamais directement vers apps/api — c'est ce
// qui permet à cette route de transformer la réponse JSON en cookies
// httpOnly avant qu'aucun octet de token n'atteigne le client.

import { NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  const credentials = await request.json();

  const apiRes = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const body = await apiRes.json();

  if (!apiRes.ok) {
    return NextResponse.json(body, { status: apiRes.status });
  }

  setSessionCookies(body.data.accessToken, body.data.refreshToken);

  // On ne renvoie que l'utilisateur au client — jamais les tokens,
  // qui sont déjà posés en cookies httpOnly à cet instant.
  return NextResponse.json({ success: true, data: { user: body.data.user } });
}
