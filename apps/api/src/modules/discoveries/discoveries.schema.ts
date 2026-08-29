// apps/api/src/modules/discoveries/discoveries.schema.ts

import { z } from "zod";

export const projectIdParamSchema = z.object({
  projectId: z.string().cuid(),
});

export const discoveryIdParamSchema = z.object({
  id: z.string().cuid(),
});

// Corps de requête volontairement vide pour l'instant : les
// paramètres du crawl (maxDepth, denylist) proviennent du Project
// (Phase 2), pas d'une saisie répétée à chaque déclenchement. Une
// surcharge ponctuelle par requête pourra être ajoutée plus tard si
// le besoin apparaît (ex: "relancer avec une profondeur réduite").
export const startDiscoverySchema = z.object({});
