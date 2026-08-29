import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { ProjectNavigation } from "@/components/project-navigation";

interface Project {
  id: string;
  name: string;
  baseUrl: string;
}

export default async function ProjectLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode; 
  params: { id: string } 
}) {
  let project: Project;
  
  try {
    project = await apiFetch<Project>(`/api/v1/projects/${params.id}`);
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return notFound();
  }

  return (
    <div className="space-y-4">
      {/* En-tête Global du Projet */}
      <div className="flex flex-col gap-2">
        <Link href="/projects" className="text-xs text-muted hover:text-primary transition-colors mb-2 inline-block">
          ← Retour à tous les projets
        </Link>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Projet</p>
            <h1 className="font-display text-2xl font-bold text-foreground">{project.name}</h1>
            <p className="mt-1 font-mono text-sm text-muted">{project.baseUrl}</p>
          </div>
        </div>
      </div>

      <ProjectNavigation projectId={project.id} />

      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
