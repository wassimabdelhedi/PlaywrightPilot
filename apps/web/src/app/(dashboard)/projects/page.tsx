// GABARIT DE RÉFÉRENCE pour tous les écrans de liste futurs
// (discoveries, executions, reports...). Server Component : la
// donnée est récupérée côté serveur via apiFetch, qui gère lui-même
// l'attachement du token et sa rotation (Phase 5 §5).

import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

interface Project {
  id: string;
  name: string;
  baseUrl: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
}

export default async function ProjectsPage() {
  const projects = await apiFetch<Project[]>("/api/v1/projects");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">Projets</h1>
        <Link href="/projects/new" className={buttonVariants({ variant: "primary", size: "md" })}>
          Nouveau projet
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardTitle>Aucun projet pour l'instant</CardTitle>
          <CardDescription>Ajoutez l'URL d'un site pour lancer sa première exploration.</CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <Link href={`/projects/${project.id}`} className="block h-full">
                <Card className="h-full transition-colors hover:border-primary">
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription className="font-mono">{project.baseUrl}</CardDescription>
                </Card>
              </Link>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <form
                  action={async () => {
                    "use server";
                    try {
                      const { apiFetch } = await import("@/lib/api-client");
                      await apiFetch(`/api/v1/projects/${project.id}`, { method: "DELETE" });
                    } catch (err) {
                      console.error("ERREUR SUPPRESSION PROJET:", err);
                    }
                    const { revalidatePath } = await import("next/cache");
                    revalidatePath("/projects");
                  }}
                >
                  <DeleteConfirmButton
                    type="submit"
                    className="p-2 text-muted hover:text-red-500 rounded hover:bg-red-500/10 transition-colors"
                    title="Supprimer le projet"
                    confirmMessage="Voulez-vous vraiment supprimer ce projet et toutes ses données associées (crawls, scénarios, tests) ?"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </DeleteConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
