// apps/api/src/modules/reports/reports.controller.ts
import type { Request, Response } from "express";
import { sendSuccess } from "../../lib/response.js";
import * as reportsService from "./reports.service.js";

export async function generate(req: Request, res: Response) {
  await reportsService.triggerGeneration(req.user.organizationId as string, req.params.projectId as string);
  sendSuccess(res, { message: "Génération du rapport planifiée" }, 202);
}

export async function list(req: Request, res: Response) {
  const reports = await reportsService.listReports(
    req.user.organizationId as string,
    req.params.projectId as string
  );
  sendSuccess(res, reports);
}
