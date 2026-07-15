// apps/web/src/middleware.ts
//
// S'exécute en edge runtime, avant même le rendu du Server Component.
// Ne fait qu'une vérification de PRÉSENCE du cookie de session — la
// validité cryptographique réelle de l'access token est vérifiée côté
// apps/api à chaque appel (Phase 4), pas ici. Dupliquer la logique de
// vérification JWT en edge ajouterait de la complexité sans gain de
// sécurité réel, puisque l'API reste la seule source de vérité.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  const hasSession = Boolean(request.cookies.get("refresh_token"));

  if (!isPublicPath && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicPath && hasSession) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
