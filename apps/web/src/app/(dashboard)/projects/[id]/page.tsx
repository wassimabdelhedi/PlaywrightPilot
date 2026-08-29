import React from "react";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { ReportCharts } from "@/components/charts/report-charts";
import { StartDiscoveryButton } from "@/components/start-discovery-button";
import { GenerateScenariosButton } from "@/components/generate-scenarios-button";
import { AutoPilotButton } from "@/components/auto-pilot-button";
import { AutoPilotModal } from "@/components/auto-pilot-modal";
import { StatusBadge } from "@/components/ui/badge";
import { AutoRefresh } from "@/components/auto-refresh";

interface Project {
  id: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  maxCrawlDepth: number;
}

interface Report {
  id: string;
  projectId: string;
  title: string;
  summary: string | null;
  content: any;
  createdAt: string;
}

export default async function ProjectDashboardPage({ params }: { params: { id: string } }) {
  let project: Project;
  try {
    project = await apiFetch<Project>(`/api/v1/projects/${params.id}`);
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return notFound();
  }

  let reports: Report[] = [];
  try {
    reports = await apiFetch<Report[]>(`/api/v1/projects/${params.id}/reports`);
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    reports = [];
  }

  const latestReport = reports.length > 0 ? reports[0] : null;
  const stats = latestReport?.content;

  let discoveries: any[] = [];
  try { discoveries = await apiFetch<any[]>(`/api/v1/discoveries/project/${params.id}`); } catch (err) {}

  let scenarios: any[] = [];
  try { scenarios = await apiFetch<any[]>(`/api/v1/projects/${params.id}/scenarios`); } catch (err) {}

  const hasDiscoveries = discoveries.length > 0;
  const scenariosCount = scenarios.length;
  const isAutoPilotRunning = scenarios.some(s => s.status === "APPROVED");

  async function handleStartDiscovery() {
    "use server";
    const res = await apiFetch<{ id: string }>(`/api/v1/discoveries/project/${params.id}`, { method: "POST" });
    revalidatePath(`/projects/${params.id}`);
    return res;
  }

  async function handleGenerateScenarios() {
    "use server";
    await apiFetch(`/api/v1/projects/${params.id}/scenarios/generate`, { method: "POST" });
    revalidatePath(`/projects/${params.id}`);
  }

  async function handleStartAutoPilot() {
    "use server";
    await apiFetch(`/api/v1/projects/${params.id}/autopilot`, { method: "POST" });
    revalidatePath(`/projects/${params.id}`);
  }

  async function handleStopAutoPilot() {
    "use server";
    await apiFetch(`/api/v1/projects/${params.id}/autopilot/stop`, { method: "POST" });
    revalidatePath(`/projects/${params.id}`);
  }

  async function handleGenerateReport() {
    "use server";
    try {
      await apiFetch(`/api/v1/projects/${params.id}/reports/generate`, { method: "POST" });
    } catch (err) {
      console.error("Erreur génération rapport:", err);
    }
    revalidatePath(`/projects/${params.id}`);
    redirect(`/projects/${params.id}`);
  }

  return (
    <div className="space-y-6 relative">
      <AutoRefresh isActive={isAutoPilotRunning} intervalMs={2000} />
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Vue d'ensemble</h2>
        <form action={handleGenerateReport}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Actualiser le rapport
          </button>
        </form>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border">
        <StartDiscoveryButton projectId={project.id} onStart={handleStartDiscovery} />
        <form action={handleGenerateScenarios}>
          <GenerateScenariosButton disabled={!hasDiscoveries} scenarioCount={scenariosCount} />
        </form>
        <div className="ml-auto">
          <form action={handleStartAutoPilot}>
            <AutoPilotButton disabled={!hasDiscoveries} />
          </form>
          <AutoPilotModal 
            isRunning={isAutoPilotRunning}
            scenarios={scenarios}
            onStop={handleStopAutoPilot}
          />
        </div>
      </div>

      {!latestReport ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-card/50">
          <p className="text-sm text-muted">Aucune donnée d'exécution trouvée pour ce projet.</p>
          <p className="mt-1 text-xs text-muted">Lancez des scénarios pour générer des statistiques.</p>
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Success</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-500">{Math.round(stats?.successRate || 0)}%</span>
                <span className="text-sm font-medium text-emerald-500/60">({stats?.passedCount || 0})</span>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Failed</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-red-500">{stats?.totalExecutions ? Math.round((stats.failedCount / stats.totalExecutions) * 100) : 0}%</span>
                <span className="text-sm font-medium text-red-500/60">({stats?.failedCount || 0})</span>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Defects</p>
              <p className="mt-1 text-2xl font-bold text-amber-500">{stats?.failureClassifications?.SITE_DEFECT || 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flaky</p>
              <p className="mt-1 text-2xl font-bold text-orange-400">{stats?.failureClassifications?.FLAKY_ENVIRONMENT || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <ReportCharts stats={stats} />
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-card p-5 h-full">
                <h3 className="font-semibold text-foreground text-sm mb-4">Répartition des échecs</h3>
                {stats?.failedCount === 0 ? (
                  <p className="text-sm text-muted">Aucun échec.</p>
                ) : (
                  <div className="space-y-4">
                    {[
                      { label: "SITE_DEFECT", count: stats?.failureClassifications?.SITE_DEFECT || 0, color: "bg-amber-500" },
                      { label: "STALE_TEST", count: stats?.failureClassifications?.STALE_TEST || 0, color: "bg-blue-500" },
                      { label: "FLAKY_ENV", count: stats?.failureClassifications?.FLAKY_ENVIRONMENT || 0, color: "bg-orange-400" },
                      { label: "UNKNOWN", count: stats?.failureClassifications?.UNCLASSIFIED || 0, color: "bg-zinc-500" }
                    ].map(item => {
                      const percentage = stats?.failedCount > 0 ? Math.round((item.count / stats.failedCount) * 100) : 0;
                      if (item.count === 0) return null;
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">{item.label}</span>
                            <span className="text-muted-foreground">{percentage}% ({item.count})</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className={`${item.color} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </span>
              <h3 className="font-semibold text-indigo-300">Résumé</h3>
            </div>
            {!latestReport.summary ? (
              <div className="animate-pulse flex h-10 items-center">
                <span className="text-sm text-indigo-300/50">Génération en cours...</span>
              </div>
            ) : (
              <div className="prose prose-invert prose-sm max-w-none text-indigo-100/80 leading-relaxed italic border-l-2 border-indigo-500/50 pl-4">
                {latestReport.summary.split('\n').map((para, idx) => (
                  para.trim() ? <p key={idx} className="mb-2">{para}</p> : null
                ))}
              </div>
            )}
          </div>

        </>
      )}

      {/* Discoveries Section */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm mt-6">
        <h3 className="font-semibold text-foreground mb-4">Historique des Crawls (Découvertes)</h3>
        
        {discoveries.length === 0 ? (
          <p className="text-sm text-muted">Aucun crawl n'a encore été lancé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Date</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 rounded-r-lg">Pages Trouvées</th>
                </tr>
              </thead>
              <tbody>
                {discoveries.map((disc: any) => (
                  <tr key={disc.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      {new Date(disc.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={disc.status} />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {disc._count?.pages || 0} pages
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
