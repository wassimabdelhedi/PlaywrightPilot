// apps/web/src/components/status-pulse.tsx
//
// L'élément signature du produit (voir Phase 5 §2) : un point qui
// pulse comme un curseur de terminal, utilisé partout où l'agent
// travaille sans intervention humaine (exploration, génération,
// exécution). Réutilisé tel quel dans les dashboards des phases
// futures — ne pas le redéfinir ailleurs.

import { cn } from "@/lib/cn";

const TONE_CLASSES = {
  active: "bg-primary",
  success: "bg-success",
  danger: "bg-danger",
  idle: "bg-muted",
} as const;

interface StatusPulseProps {
  label: string;
  tone?: keyof typeof TONE_CLASSES;
  animated?: boolean;
}

export function StatusPulse({ label, tone = "active", animated = true }: StatusPulseProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-muted">
      <span className="relative flex h-2 w-2">
        {animated && (
          <span
            className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", TONE_CLASSES[tone])}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", TONE_CLASSES[tone])} />
      </span>
      {label}
    </div>
  );
}
