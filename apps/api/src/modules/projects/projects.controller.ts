// Traduit HTTP <-> service. Aucune règle métier ici — seulement de
// l'extraction de requête et du formatage de réponse.

import type { Request, Response } from "express";
import * as projectsService from "./projects.service.js";
import { sendSuccess } from "../../lib/response.js";
import { UnauthorizedError } from "../../lib/errors.js";

function getOrganizationId(req: Request) {
  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    throw new UnauthorizedError("Organisation non fournie");
  }
  return organizationId;
}

export async function create(req: Request, res: Response) {
  const organizationId = getOrganizationId(req);
  const project = await projectsService.createProject(organizationId, req.body);
  sendSuccess(res, project, 201);
}

export async function list(req: Request, res: Response) {
  const organizationId = getOrganizationId(req);
  const result = await projectsService.listProjects(organizationId, req.query as never);
  sendSuccess(res, result.items, 200, { total: result.total, page: result.page, pageSize: result.pageSize });
}

export async function getById(req: Request, res: Response) {
  const organizationId = getOrganizationId(req);
  const project = await projectsService.getProjectById(organizationId, req.params.id!);
  sendSuccess(res, project);
}

export async function update(req: Request, res: Response) {
  const organizationId = getOrganizationId(req);
  const project = await projectsService.updateProject(organizationId, req.params.id!, req.body);
  sendSuccess(res, project);
}

export async function remove(req: Request, res: Response) {
  const organizationId = getOrganizationId(req);
  await projectsService.deleteProject(organizationId, req.params.id!);
  res.status(204).send();
}