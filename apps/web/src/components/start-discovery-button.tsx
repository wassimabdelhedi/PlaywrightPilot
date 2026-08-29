"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface StartDiscoveryButtonProps {
  projectId: string;
  onStart: () => Promise<{ id: string }>;
}

export function StartDiscoveryButton({ projectId, onStart }: StartDiscoveryButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      try {
        await onStart();
        router.refresh();
      } catch (e) {
        alert("Erreur lors du lancement du crawl : " + (e instanceof Error ? e.message : String(e)));
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
    >
      {isPending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Lancement...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
          </svg>
          Lancer le crawl
        </>
      )}
    </button>
  );
}
