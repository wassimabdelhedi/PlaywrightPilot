// Schémas Zod = source de vérité unique pour la forme des données
// acceptées par ce module. Ils servent à la fois de validation
// runtime (middleware/validate.ts) ET de typage compile-time via
// z.infer — impossible que la validation et le type divergent.

import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  baseUrl: z.string().url(),
  maxCrawlDepth: z.number().int().min(1).max(10).default(3),
  denylistPaths: z.array(z.string()).default([]),
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
