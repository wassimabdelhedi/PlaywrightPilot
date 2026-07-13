"use client";

// apps/web/src/providers/query-provider.tsx
//
// TanStack Query gère UNIQUEMENT l'état des mutations/interactions
// côté client (créer un projet depuis un dialogue, déclencher une
// exécution). La récupération initiale des données reste faite côté
// serveur dans les Server Components — ce provider ne remplace pas
// ça, il le complète pour l'interactivité.

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
