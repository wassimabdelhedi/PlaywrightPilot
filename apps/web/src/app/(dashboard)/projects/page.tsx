// GABARIT DE RÉFÉRENCE pour tous les écrans de liste futurs
// (discoveries, executions, reports...). Server Component : la
// donnée est récupérée côté serveur via apiFetch, qui gère lui-même
// l'attachement du token et sa rotation (Phase 5 §5).

import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

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
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardTitle>{project.name}</CardTitle>
                <CardDescription className="font-mono">{project.baseUrl}</CardDescription>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
