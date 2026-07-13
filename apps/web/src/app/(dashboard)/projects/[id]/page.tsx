import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

interface Project {
  id: string;
  name: string;
  baseUrl: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
}

export default async function ProjectDetailsPage({ params }: { params: { id: string } }) {
  let project: Project;

  try {
    project = await apiFetch<Project>(`/api/v1/projects/${params.id}`);
  } catch (error) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{project.name}</h1>
          <p className="text-sm text-muted">ID: {project.id}</p>
        </div>
        <Link href="/projects" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Retour aux projets
        </Link>
      </div>

      <Card>
        <CardTitle>Description du projet</CardTitle>
        <CardDescription>
          <div className="space-y-3">
            <div>
              <strong>URL de base :</strong>
              <div className="font-mono text-sm text-foreground">{project.baseUrl}</div>
            </div>
            <div>
              <strong>Statut :</strong>
              <div className="text-sm text-foreground">{project.status}</div>
            </div>
          </div>
        </CardDescription>
      </Card>
    </div>
  );
}
