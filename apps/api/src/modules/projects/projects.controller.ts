// Traduit HTTP <-> service. Aucune règle métier ici — seulement de
// l'extraction de requête et du formatage de réponse.

import type { Request, Response } from "express";
import * as projectsService from "./projects.service";
import { sendSuccess } from "../../lib/response";

// TODO Phase 4 : remplacer par req.user.organizationId une fois
// l'authentification en place. Placeholder volontaire pour garder ce
// module testable dès maintenant, sans dépendance sur l'auth.
const TEMP_ORG_ID = "org_placeholder";

export async function create(req: Request, res: Response) {
  const project = await projectsService.createProject(TEMP_ORG_ID, req.body);
  sendSuccess(res, project, 201);
}

export async function list(req: Request, res: Response) {
  const result = await projectsService.listProjects(TEMP_ORG_ID, req.query as never);
  sendSuccess(res, result.items, 200, { total: result.total, page: result.page, pageSize: result.pageSize });
}

export async function getById(req: Request, res: Response) {
  const project = await projectsService.getProjectById(TEMP_ORG_ID, req.params.id);
  sendSuccess(res, project);
}

export async function update(req: Request, res: Response) {
  const project = await projectsService.updateProject(TEMP_ORG_ID, req.params.id, req.body);
  sendSuccess(res, project);
}

export async function remove(req: Request, res: Response) {
  await projectsService.deleteProject(TEMP_ORG_ID, req.params.id);
  res.status(204).send();
}