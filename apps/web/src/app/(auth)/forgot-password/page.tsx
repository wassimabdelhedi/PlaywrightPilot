import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

async function forgotPasswordAction(formData: FormData) {
  "use server";

  const email = formData.get("email");

  await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  // Always redirect to success to prevent email enumeration
  redirect("/forgot-password?success=true");
}

export default function ForgotPasswordPage({ searchParams }: { searchParams: { success?: string } }) {
  const isSuccess = searchParams.success === "true";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6">
          <CardTitle>Mot de passe oublié</CardTitle>
          <CardDescription>
            {isSuccess 
              ? "Consultez vos emails" 
              : "Entrez votre email pour réinitialiser votre mot de passe"}
          </CardDescription>
        </div>

        {isSuccess ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Si un compte est associé à cette adresse, vous recevrez un lien de réinitialisation d'ici quelques minutes.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Retour à la connexion</Link>
            </Button>
          </div>
        ) : (
          <form action={forgotPasswordAction} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm text-muted">
                Email professionnel
              </label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>

            <Button type="submit" className="w-full">
              Envoyer le lien
            </Button>

            <p className="mt-4 text-center text-sm text-muted">
              <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
                Annuler
              </Link>
            </p>
          </form>
        )}
      </Card>
    </main>
  );
}
