import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/badge";
import { ArtifactViewer } from "@/components/artifact-viewer";

interface Execution {
  id: string;
  testCaseId: string;
  status: "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | "FLAKY" | "TIMEOUT" | "CANCELLED";
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface FailureAnalysis {
  id: string;
  classification: string;
  confidence: number;
  rootCause: string;
  suggestedFix: string | null;
  severity: string;
}

interface Artifact {
  id: string;
  type: "VIDEO" | "TRACE" | "SCREENSHOT" | "LOG";
  storageUrl: string;
}

export default async function ExecutionDetailsPage({ params }: { params: { id: string, execId: string } }) {
  let execution: Execution;
  let analysis: FailureAnalysis | null = null;
  let artifacts: Artifact[] = [];

  try {
    const [execRes, analysisRes, artifactsRes] = await Promise.all([
      apiFetch<Execution>(`/api/v1/executions/${params.execId}`),
      apiFetch<FailureAnalysis | null>(`/api/v1/executions/${params.execId}/analysis`),
      apiFetch<Artifact[]>(`/api/v1/executions/${params.execId}/artifacts`)
    ]);
    execution = execRes;
    analysis = analysisRes;
    artifacts = artifactsRes;
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${params.id}/executions`} className="text-muted-foreground hover:text-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Exécution <span className="text-muted-foreground font-mono ml-1">#{execution.id.slice(-6)}</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">Informations Principales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Statut</p>
                <StatusBadge status={execution.status as any} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date d'exécution</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(execution.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Durée</p>
                <p className="text-sm font-medium text-foreground">
                  {execution.durationMs ? `${(execution.durationMs / 1000).toFixed(1)}s` : "-"}
                </p>
              </div>
            </div>

            {execution.errorMessage && (
              <div className="mt-6 border-t border-border pt-6">
                <p className="text-xs text-muted-foreground mb-2">Message d'erreur brut</p>
                <pre className="text-xs text-red-400 bg-red-950/20 p-3 rounded overflow-x-auto whitespace-pre-wrap font-mono border border-red-900/30">
                  {execution.errorMessage}
                </pre>
              </div>
            )}
          </div>

          {analysis && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/10 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline><polyline points="7.5 19.79 7.5 14.6 3 12"></polyline><polyline points="21 12 16.5 14.6 16.5 19.79"></polyline><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </span>
                <h3 className="font-semibold text-indigo-300">Analyse IA (Failure Analysis)</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                  <p className="text-xs text-indigo-300/60 mb-1">Classification</p>
                  <p className="text-sm font-semibold text-indigo-200">{analysis.classification}</p>
                </div>
                <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                  <p className="text-xs text-indigo-300/60 mb-1">Confiance IA</p>
                  <p className="text-sm font-semibold text-indigo-200">{Math.round(analysis.confidence * 100)}%</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-indigo-300/60 mb-1 uppercase tracking-wide">Cause Racine</p>
                  <p className="text-sm text-indigo-100/90 leading-relaxed">{analysis.rootCause}</p>
                </div>

                {analysis.suggestedFix && (
                  <div>
                    <p className="text-xs text-indigo-300/60 mb-1 uppercase tracking-wide">Correctif Suggéré</p>
                    <div className="bg-emerald-950/20 border border-emerald-900/30 rounded p-3">
                      <p className="text-sm text-emerald-300 leading-relaxed">{analysis.suggestedFix}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">Artefacts</h3>
            
            {artifacts.length === 0 ? (
              <p className="text-sm text-muted">Aucun artefact disponible pour cette exécution.</p>
            ) : (
              <ArtifactViewer artifacts={artifacts} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
