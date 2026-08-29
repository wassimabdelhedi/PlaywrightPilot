import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/badge";

interface Execution {
  id: string;
  testCaseId: string;
  status: "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | "FLAKY" | "TIMEOUT" | "CANCELLED";
  createdAt: string;
  testCase?: {
    scenario?: {
      title: string;
    };
  };
  failureAnalysis?: {
    classification: string;
  };
}

export default async function ExecutionsPage({ params }: { params: { id: string } }) {
  let executions: Execution[] = [];
  try {
    executions = await apiFetch<Execution[]>(`/api/v1/projects/${params.id}/executions`);
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">Historique des Exécutions</h2>
      </div>

      {executions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center bg-card/50">
          <p className="text-sm text-muted">Aucune exécution trouvée pour ce projet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Scénario</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Classification</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {executions.map(exec => (
                <tr key={exec.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate" title={exec.testCase?.scenario?.title || "Scénario inconnu"}>
                    {exec.testCase?.scenario?.title || "Scénario inconnu"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={exec.status as any} />
                  </td>
                  <td className="px-4 py-3 text-xs text-foreground">
                    {exec.status === "FAILED" ? (
                      exec.failureAnalysis?.classification ? (
                        <span className="font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                          {exec.failureAnalysis.classification}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Non classifié</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(exec.createdAt).toLocaleString("fr-FR", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/projects/${params.id}/executions/${exec.id}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Détails →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
