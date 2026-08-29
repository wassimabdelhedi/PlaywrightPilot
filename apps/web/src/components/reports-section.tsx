import React from "react";
import { ReportCharts } from "./charts/report-charts";
import { StatusBadge } from "@/components/ui/badge";

interface Report {
  id: string;
  projectId: string;
  title: string;
  summary: string | null;
  content: any;
  createdAt: string;
}

interface ReportsSectionProps {
  reports: Report[];
  projectId: string;
}

export function ReportsSection({ reports, projectId }: ReportsSectionProps) {
  const latestReport = reports.length > 0 ? reports[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Tableau de Bord & Rapports IA
        </h2>
        
        <form
          action={async () => {
            "use server";
            const { apiFetch } = await import("@/lib/api-client");
            try {
              await apiFetch(`/api/v1/projects/${projectId}/reports/generate`, {
                method: "POST",
              });
            } catch (err) {
              console.error("Erreur génération rapport:", err);
            }
            const { revalidatePath } = await import("next/cache");
            revalidatePath(`/projects/${projectId}`);
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Générer un Rapport
          </button>
        </form>
      </div>

      {!latestReport ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">Aucun rapport généré pour ce projet.</p>
          <p className="mt-1 text-xs text-muted">Lancez la génération pour analyser vos dernières exécutions de test.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Section Narratif IA */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/10 p-6 shadow-sm relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline><polyline points="7.5 19.79 7.5 14.6 3 12"></polyline><polyline points="21 12 16.5 14.6 16.5 19.79"></polyline><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                </span>
                <h3 className="font-semibold text-indigo-300">Insights IA : {latestReport.title}</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(latestReport.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                  })}
                </span>
              </div>
              
              {!latestReport.summary ? (
                <div className="flex items-center justify-center h-24">
                  <span className="text-sm text-muted animate-pulse">Génération en cours...</span>
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none text-zinc-300">
                  {latestReport.summary.split('\n').map((para, idx) => (
                    para.trim() ? <p key={idx} className="mb-2">{para}</p> : null
                  ))}
                </div>
              )}
            </div>

            {/* Top Unstable Scenarios */}
            {latestReport.content?.topUnstableScenarios?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                  Tests les plus instables (Top 5)
                </h3>
                <div className="space-y-2">
                  {latestReport.content.topUnstableScenarios.map((scenario: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">{scenario.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-red-400">{scenario.failureCount} échecs</span>
                        <StatusBadge status="FAILED" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section Graphiques */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <ReportCharts stats={latestReport.content} />
          </div>
          
        </div>
      )}
    </div>
  );
}
