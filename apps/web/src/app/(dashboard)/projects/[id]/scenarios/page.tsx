import React from "react";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/badge";

interface Scenario {
  id: string;
  projectId: string;
  title: string;
  businessGoal: string;
  status: "DRAFT" | "APPROVED" | "REJECTED";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  scenarioType: string | null;
  createdAt: string;
}

export default async function ScenariosPage({ params }: { params: { id: string } }) {
  let scenarios: Scenario[] = [];
  try {
    scenarios = await apiFetch<Scenario[]>(`/api/v1/projects/${params.id}/scenarios`);
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return notFound();
  }

  const draftScenarios = scenarios.filter(s => s.status === "DRAFT");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Scénarios en attente d'approbation</h2>
      </div>

      {draftScenarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-card/50">
          <p className="text-sm text-muted">Aucun scénario en attente.</p>
          <p className="mt-1 text-xs text-muted">Générez de nouveaux scénarios depuis Auto-Pilot ou attendez que l'IA termine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {draftScenarios.map(scenario => (
            <div key={scenario.id} className="rounded-xl border border-border bg-card shadow-sm flex flex-col h-full overflow-hidden">
              <div className="p-5 flex-grow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-foreground leading-tight">
                    <span className="text-muted-foreground mr-1">
                      {scenario.scenarioType === "NEGATIVE" ? "Error Path:" : "Nominal Path:"}
                    </span>
                    {scenario.title}
                  </h3>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-4">
                  {scenario.businessGoal}
                </p>

                <div className="flex flex-col gap-2 mt-auto">
                  <div className="flex items-center text-xs">
                    <span className="w-20 text-muted-foreground">Priorité :</span>
                    <StatusBadge status={scenario.priority as any} />
                  </div>
                  <div className="flex items-center text-xs">
                    <span className="w-20 text-muted-foreground">Type :</span>
                    <span className="font-mono text-muted">{scenario.scenarioType || "POSITIVE"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 border-t border-border bg-muted/20">
                <form
                  action={async () => {
                    "use server";
                    const { apiFetch } = await import("@/lib/api-client");
                    try {
                      await apiFetch(`/api/v1/scenarios/${scenario.id}/status`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "APPROVED" }),
                      });
                    } catch (err) {
                      console.error("Erreur approbation scénario:", err);
                    }
                    const { revalidatePath } = await import("next/cache");
                    revalidatePath(`/projects/${params.id}/scenarios`);
                  }}
                >
                  <button
                    type="submit"
                    className="w-full py-3 text-sm font-semibold text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                  >
                    Approuver
                  </button>
                </form>
                
                <form
                  action={async () => {
                    "use server";
                    const { apiFetch } = await import("@/lib/api-client");
                    try {
                      await apiFetch(`/api/v1/scenarios/${scenario.id}/status`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: "REJECTED" }),
                      });
                    } catch (err) {
                      console.error("Erreur rejet scénario:", err);
                    }
                    const { revalidatePath } = await import("next/cache");
                    revalidatePath(`/projects/${params.id}/scenarios`);
                  }}
                >
                  <button
                    type="submit"
                    className="w-full py-3 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors border-l border-border"
                  >
                    Rejeter
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
