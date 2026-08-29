// apps/api/src/modules/discoveries/discoveries.controller.ts

import type { Request, Response } from "express";
import { sendSuccess } from "../../lib/response.js";
import * as discoveriesService from "./discoveries.service.js";

export async function start(req: Request, res: Response) {
  const discovery = await discoveriesService.startDiscovery(req.user.organizationId, req.params.projectId!);
  // 202 Accepted : le crawl n'a pas encore eu lieu, seulement été
  // planifié — sémantiquement différent d'un 201 Created classique.
  sendSuccess(res, discovery, 202);
}

export async function getById(req: Request, res: Response) {
  const discovery = await discoveriesService.getDiscoveryById(req.user.organizationId, req.params.id!);
  sendSuccess(res, discovery);
}

export async function listPages(req: Request, res: Response) {
  const pages = await discoveriesService.listDiscoveryPages(req.user.organizationId, req.params.id!);
  sendSuccess(res, pages);
}

export async function listByProject(req: Request, res: Response) {
  const discoveries = await discoveriesService.listDiscoveriesForProject(
    req.user.organizationId,
    req.params.projectId!
  );
  sendSuccess(res, discoveries);
}

export async function cancel(req: Request, res: Response) {
  const discovery = await discoveriesService.cancelDiscovery(req.user.organizationId, req.params.id!);
  sendSuccess(res, discovery);
}

export async function remove(req: Request, res: Response) {
  await discoveriesService.deleteDiscovery(req.user.organizationId, req.params.id!);
  // 204 No Content : the resource was successfully deleted
  res.status(204).send();
}

