import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";

interface CreateProjectFormData {
  name: string;
  baseUrl: string;
  maxCrawlDepth?: string;
}

async function createProjectAction(formData: FormData) {
  "use server";

  const name = formData.get("name");
  const baseUrl = formData.get("baseUrl");
  const maxCrawlDepth = formData.get("maxCrawlDepth");

  if (typeof name !== "string" || typeof baseUrl !== "string") {
    redirect("/projects/new?error=Données de projet invalides");
  }

  try {
    await apiFetch<{ id: string }>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({
        name,
        baseUrl,
        ...(typeof maxCrawlDepth === "string" && maxCrawlDepth.length > 0
          ? { maxCrawlDepth: Number(maxCrawlDepth) }
          : {}),
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la création du projet";
    redirect(`/projects/new?error=${encodeURIComponent(message)}`);
  }

  redirect("/projects");
}

export default function NewProjectPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-lg">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <CardTitle>Nouveau projet</CardTitle>
            <CardDescription>Ajoutez une URL pour démarrer une exploration.</CardDescription>
          </div>
        </div>

        {searchParams.error && (
          <p className="mb-4 rounded border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {searchParams.error}
          </p>
        )}

        <form action={createProjectAction} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm text-muted">
              Nom du projet
            </label>
            <Input id="name" name="name" type="text" required />
          </div>

          <div className="space-y-1">
            <label htmlFor="baseUrl" className="text-sm text-muted">
              URL de base
            </label>
            <Input id="baseUrl" name="baseUrl" type="url" required />
          </div>

          <div className="space-y-1">
            <label htmlFor="maxCrawlDepth" className="text-sm text-muted">
              Profondeur d'exploration
            </label>
            <Input id="maxCrawlDepth" name="maxCrawlDepth" type="number" min="1" max="10" placeholder="3" />
          </div>

          <Button type="submit" className="w-full">
            Créer le projet
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          <a href="/projects" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Retour à la liste des projets
          </a>
        </p>
      </Card>
    </main>
  );
}
