// apps/api/src/modules/scenarios/scenarios.schema.ts

import { z } from "zod";

export const projectIdParamSchema = z.object({
  projectId: z.string().cuid(),
});

export const scenarioIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const listScenariosQuerySchema = z.object({
  status: z.enum(["DRAFT", "APPROVED", "REJECTED", "DEPRECATED"]).optional(),
});

// Seules deux transitions sont exposées à l'API : approuver ou
// rejeter. "DEPRECATED" est réservé à une logique interne future
// (ex: une fonctionnalité disparue du site), pas à une action manuelle.
export const updateScenarioStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export type UpdateScenarioStatusInput = z.infer<typeof updateScenarioStatusSchema>;
