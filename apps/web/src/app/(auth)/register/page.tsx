import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { setSessionCookies } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

async function registerAction(formData: FormData) {
  "use server";

  const organizationName = formData.get("organizationName");
  const fullName = formData.get("fullName");
  const email = formData.get("email");
  const password = formData.get("password");

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationName, fullName, email, password }),
  });

  const body = await res.json();

  if (!res.ok) {
    redirect(
      `/register?error=${encodeURIComponent(body.error?.message ?? "Échec de l'inscription")}`
    );
  }

  setSessionCookies(body.data.accessToken, body.data.refreshToken);
  redirect("/projects");
}

export default function RegisterPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6">
          <CardTitle>Inscription</CardTitle>
          <CardDescription>Créez votre compte et votre organisation</CardDescription>
        </div>

        {searchParams.error && (
          <p className="mb-4 rounded border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {searchParams.error}
          </p>
        )}

        <form action={registerAction} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="organizationName" className="text-sm text-muted">
              Nom de l'organisation
            </label>
            <Input id="organizationName" name="organizationName" type="text" required />
          </div>

          <div className="space-y-1">
            <label htmlFor="fullName" className="text-sm text-muted">
              Nom complet
            </label>
            <Input id="fullName" name="fullName" type="text" required />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm text-muted">
              Email professionnel
            </label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm text-muted">
              Mot de passe
            </label>
            <Input id="password" name="password" type="password" required autoComplete="new-password" />
          </div>

          <Button type="submit" className="w-full">
            Créer un compte
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
            Déjà un compte ? Connectez-vous
          </Link>
        </p>
      </Card>
    </main>
  );
}
