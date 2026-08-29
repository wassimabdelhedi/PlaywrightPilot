// apps/api/src/modules/scenarios/scenarios.controller.ts

import type { Request, Response } from "express";
import { sendSuccess } from "../../lib/response.js";
import * as scenariosService from "./scenarios.service.js";

export async function generate(req: Request, res: Response) {
  await scenariosService.triggerGeneration(req.user.organizationId as string, req.params.projectId as string);
  sendSuccess(res, { message: "Génération de scénarios planifiée" }, 202);
}

export async function list(req: Request, res: Response) {
  const scenarios = await scenariosService.listScenarios(
    req.user.organizationId as string,
    req.params.projectId as string,
    (req.query as { status?: string }).status
  );
  sendSuccess(res, scenarios);
}

export async function updateStatus(req: Request, res: Response) {
  const scenario = await scenariosService.updateScenarioStatus(req.user.organizationId as string, req.params.id as string, req.body);
  sendSuccess(res, scenario);
}

export async function remove(req: Request, res: Response) {
  await scenariosService.deleteScenario(req.user.organizationId as string, req.params.id as string);
  res.status(204).send();
}
