import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

async function resetPasswordAction(formData: FormData) {
  "use server";

  const token = formData.get("token");
  const newPassword = formData.get("password");

  const res = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  const body = await res.json();

  if (!res.ok) {
    redirect(`/reset-password?token=${token}&error=${encodeURIComponent(body.error?.message ?? "Erreur")}`);
  }

  redirect("/login?reset=success");
}

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string; error?: string } }) {
  const token = searchParams.token;

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <div className="mb-6">
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>Le lien de réinitialisation est manquant.</CardDescription>
          </div>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Demander un nouveau lien</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6">
          <CardTitle>Nouveau mot de passe</CardTitle>
          <CardDescription>
            Entrez votre nouveau mot de passe (min. 10 caractères, 1 majuscule, 1 chiffre)
          </CardDescription>
        </div>

        {searchParams.error && (
          <p className="mb-4 rounded border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {searchParams.error}
          </p>
        )}

        <form action={resetPasswordAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm text-muted">
              Nouveau mot de passe
            </label>
            <Input id="password" name="password" type="password" required autoComplete="new-password" />
          </div>

          <Button type="submit" className="w-full">
            Réinitialiser
          </Button>
        </form>
      </Card>
    </main>
  );
}
