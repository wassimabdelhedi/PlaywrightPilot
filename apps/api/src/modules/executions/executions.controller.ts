// apps/api/src/modules/executions/executions.controller.ts

import type { Request, Response } from "express";
import { sendSuccess } from "../../lib/response.js";
import * as executionsService from "./executions.service.js";

export async function execute(req: Request, res: Response) {
  const execution = await executionsService.triggerExecution(
    req.user.organizationId as string,
    req.params.testId as string,
    req.user.id as string
  );
  sendSuccess(res, execution, 202);
}

export async function getById(req: Request, res: Response) {
  const execution = await executionsService.getExecution(
    req.user.organizationId as string,
    req.params.id as string
  );
  sendSuccess(res, execution);
}

export async function getArtifacts(req: Request, res: Response) {
  const artifacts = await executionsService.getExecutionArtifacts(
    req.user.organizationId as string,
    req.params.id as string
  );
  sendSuccess(res, artifacts);
}

export async function getAnalysis(req: Request, res: Response) {
  const analysis = await executionsService.getExecutionAnalysis(
    req.user.organizationId as string,
    req.params.id as string
  );
  if (!analysis) {
    // Return a 404 or a null success depending on API convention. 
    // Here we'll return null data but HTTP 200, or let the client handle. 
    // Wait, the API spec usually handles not found if the analysis doesn't exist yet (still processing).
    sendSuccess(res, null);
    return;
  }
  sendSuccess(res, analysis);
}

