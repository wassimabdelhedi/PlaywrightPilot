// Formulaire de connexion. La soumission passe par une Server Action
// qui appelle directement la logique de session (pas besoin de
// traverser HTTP en interne) puis redirige — aucun token ne transite
// jamais par du code exécuté dans le navigateur.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { setSessionCookies } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:4000";

async function loginAction(formData: FormData) {
  "use server";

  const email = formData.get("email");
  const password = formData.get("password");

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json();

  if (!res.ok) {
    // Phase 5 reste volontairement simple ici : la gestion d'erreur
    // affichée (via useFormState côté client) est raffinée en Phase 15
    // en même temps que le reste des retours utilisateur du dashboard.
    redirect(`/login?error=${encodeURIComponent(body.error?.message ?? "Échec de connexion")}`);
  }

  setSessionCookies(body.data.accessToken, body.data.refreshToken);
  redirect("/projects");
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string; redirectTo?: string; reset?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6">
          <CardTitle>Connexion</CardTitle>
          <CardDescription>Accédez à votre plateforme de tests</CardDescription>
        </div>

        {searchParams.error && (
          <p className="mb-4 rounded border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {searchParams.error}
          </p>
        )}

        {searchParams.reset === "success" && (
          <p className="mb-4 rounded border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
            Votre mot de passe a été réinitialisé avec succès.
          </p>
        )}

        <form action={loginAction} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm text-muted">
              Email professionnel
            </label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm text-muted">
                Mot de passe
              </label>
              <Link href="/forgot-password" className="text-xs text-primary underline-offset-2 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>

          <Button type="submit" className="w-full">
            Se connecter
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/register" className="font-medium text-primary underline-offset-2 hover:underline">
            Créer un compte
          </Link>
        </p>
      </Card>
    </main>
  );
}
