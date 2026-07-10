// Logique métier pure. AUCUNE référence à Express ici (pas de req/res) —
// c'est ce qui permettra à l'orchestrateur LangGraph (Phase 8+)
// d'importer directement `createProject` ou `getProjectById` sans
// passer par une requête HTTP interne.
//
// Note Phase 3 : `organizationId` est reçu en paramètre explicite pour
// l'instant. À partir de la Phase 4, il proviendra du middleware
// d'authentification (req.user.organizationId) — la signature de ces
// fonctions ne changera pas, seul l'appelant (le contrôleur) changera.

import { prisma } from "@platform/database";
import { NotFoundError } from "../../lib/errors";
import type { CreateProjectInput, ListProjectsQuery, UpdateProjectInput } from "./projects.schema";

export async function createProject(organizationId: string, input: CreateProjectInput) {
  return prisma.project.create({
    data: { organizationId, ...input },
  });
}

export async function listProjects(organizationId: string, query: ListProjectsQuery) {
  const where = { organizationId, ...(query.status ? { status: query.status } : {}) };

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getProjectById(organizationId: string, id: string) {
  const project = await prisma.project.findFirst({ where: { id, organizationId } });

  // Recherche par id ET organizationId dans la même requête — jamais
  // deux requêtes séparées ("trouver puis vérifier l'org"), ce qui
  // créerait une fenêtre d'accès inter-tenant exploitable.
  if (!project) {
    throw new NotFoundError("Project", id);
  }

  return project;
}

export async function updateProject(organizationId: string, id: string, input: UpdateProjectInput) {
  await getProjectById(organizationId, id); // vérifie existence + appartenance

  return prisma.project.update({ where: { id }, data: input });
}

export async function deleteProject(organizationId: string, id: string) {
  await getProjectById(organizationId, id);

  await prisma.project.delete({ where: { id } });
}