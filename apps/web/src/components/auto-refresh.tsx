"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ isActive, intervalMs = 2000 }: { isActive: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isActive, intervalMs, router]);

  // Ce composant ne rend rien visuellement
  return null;
}
