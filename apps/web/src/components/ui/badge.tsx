// apps/web/src/components/ui/badge.tsx

interface BadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string, className: string }> = {
  PENDING:   { label: "En attente",  className: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  RUNNING:   { label: "En cours",    className: "bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse" },
  COMPLETED: { label: "Terminé",     className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  FAILED:    { label: "Échoué",      className: "bg-red-500/15 text-red-400 border border-red-500/30" },
  CANCELLED: { label: "Annulé",      className: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30" },
  
  // Scénarios Priorities
  CRITICAL:  { label: "Critique",    className: "bg-red-500/20 text-red-400 border border-red-500/40 font-bold" },
  HIGH:      { label: "Haute",       className: "bg-orange-500/15 text-orange-400 border border-orange-500/30" },
  MEDIUM:    { label: "Moyenne",     className: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30" },
  LOW:       { label: "Basse",       className: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30" },
  
  // Scénarios Statuses
  DRAFT:     { label: "Brouillon",   className: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30" },
  APPROVED:  { label: "Approuvé",    className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  REJECTED:  { label: "Rejeté",      className: "bg-red-500/15 text-red-400 border border-red-500/30" },

  // Execution Statuses
  QUEUED:    { label: "En file",     className: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  PASSED:    { label: "Réussi ✓",    className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  TIMEOUT:   { label: "Timeout",     className: "bg-orange-500/15 text-orange-400 border border-orange-500/30" },

  // TestCase Statuses
  GENERATED:          { label: "Généré",     className: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30" },
  VALIDATED:          { label: "Validé",     className: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  VALIDATION_FAILED:  { label: "Invalide",   className: "bg-red-500/15 text-red-400 border border-red-500/30" },
  ACTIVE:             { label: "Actif ✓",    className: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
};

export function StatusBadge({ status }: BadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, className: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30" };
  const { label, className } = config;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {status === "RUNNING" && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
      )}
      {label}
    </span>
  );
}
