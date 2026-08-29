import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

interface DomElement {
  id: string;
  type: "BUTTON" | "INPUT" | "LINK" | "FORM" | "SELECT" | "NAVIGATION" | "TABLE" | "OTHER";
  label: string | null;
  selector: string;
}

interface Page {
  id: string;
  url: string;
  title: string | null;
  depth: number;
  elements: DomElement[];
}

interface Discovery {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: string;
  completedAt: string | null;
}

interface AgentMemory {
  id: string;
  content: {
    name: string;
    description: string;
    confidence: number;
    relatedPageUrls: string[];
  };
}

function formatDuration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}min ${Math.round((ms % 60000) / 1000)}s`;
}

export default async function DiscoveryResultsPage({
  params,
}: {
  params: { id: string; discoveryId: string };
}) {
  let discovery: Discovery;
  let pages: Page[] = [];
  let features: AgentMemory[] = [];

  try {
    discovery = await apiFetch<Discovery>(`/api/v1/discoveries/${params.discoveryId}`);
    pages = await apiFetch<Page[]>(`/api/v1/discoveries/${params.discoveryId}/pages`);
    // Les features IA sont stockées dans agent_memories — on les récupère via l'API projets
    try {
      features = await apiFetch<AgentMemory[]>(`/api/v1/projects/${params.id}/memories?category=FEATURE_MAP`);
    } catch {
      features = [];
    }
  } catch {
    return notFound();
  }

  const totalElements = pages.reduce((acc, p) => acc + p.elements.length, 0);
  const buttons = pages.flatMap((p) => p.elements.filter((e) => e.type === "BUTTON")).length;
  const inputs = pages.flatMap((p) => p.elements.filter((e) => e.type === "INPUT")).length;
  const links = pages.flatMap((p) => p.elements.filter((e) => e.type === "LINK")).length;

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">Résultats du crawl</h1>
            <StatusBadge status={discovery.status} />
          </div>
          <p className="mt-1 text-xs text-muted font-mono">{params.discoveryId}</p>
        </div>
        <div className="flex items-center gap-2">
          {(discovery.status === "PENDING" || discovery.status === "RUNNING") && (
            <form
              action={async () => {
                "use server";
                try {
                  await apiFetch(`/api/v1/discoveries/${params.discoveryId}/cancel`, { method: "POST" });
                } catch (err) {
                  console.error("ERREUR ANNULATION CRAWL:", err);
                }
                import("next/cache").then(m => {
                  m.revalidatePath(`/projects/${params.id}`);
                  m.revalidatePath(`/projects/${params.id}/discoveries/${params.discoveryId}`);
                });
              }}
            >
              <button
                type="submit"
                className={buttonVariants({ variant: "danger", size: "sm" })}
              >
                Arrêter le crawl
              </button>
            </form>
          )}
          <Link
            href={`/projects/${params.id}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            ← Retour au projet
          </Link>
        </div>
      </div>

      {/* Stats résumé */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Pages crawlées", value: pages.length, icon: "📄" },
          { label: "Éléments DOM", value: totalElements, icon: "🧱" },
          { label: "Boutons", value: buttons, icon: "🖱️" },
          { label: "Inputs", value: inputs, icon: "⌨️" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl">{icon}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* Features IA détectées */}
      {features.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
            🤖 Fonctionnalités détectées par l'IA
            <span className="ml-2 text-sm font-normal text-muted">({features.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((mem) => (
              <div key={mem.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{mem.content.name}</h3>
                  <span className="shrink-0 text-xs text-muted">
                    {Math.round(mem.content.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{mem.content.description}</p>
                <p className="mt-2 text-xs text-muted">
                  {mem.content.relatedPageUrls?.length ?? 0} page(s) liée(s)
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des pages crawlées */}
      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
          Pages crawlées
          <span className="ml-2 text-sm font-normal text-muted">({pages.length})</span>
        </h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted">Profondeur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted">URL / Titre</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted">Boutons</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted">Inputs</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted">Liens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pages.map((page) => {
                const pageButtons = page.elements.filter((e) => e.type === "BUTTON").length;
                const pageInputs = page.elements.filter((e) => e.type === "INPUT").length;
                const pageLinks = page.elements.filter((e) => e.type === "LINK").length;
                return (
                  <tr key={page.id} className="bg-background hover:bg-card/50 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {page.depth}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground truncate max-w-xs">{page.title ?? "(sans titre)"}</p>
                      <p className="text-xs text-muted truncate max-w-xs font-mono">{page.url}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-foreground">{pageButtons}</td>
                    <td className="px-4 py-3 text-center text-foreground">{pageInputs}</td>
                    <td className="px-4 py-3 text-center text-foreground">{pageLinks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
