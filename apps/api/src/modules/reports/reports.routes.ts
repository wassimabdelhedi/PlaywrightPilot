// apps/api/src/modules/reports/reports.routes.ts
import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { validate } from "../../middleware/validate.js";
import * as controller from "./reports.controller.js";
import { projectIdParamSchema } from "./reports.schema.js";

// Mounted at /api/v1/projects/:projectId/reports
export const projectReportsRouter = Router({ mergeParams: true });

projectReportsRouter.post(
  "/generate",
  validate(projectIdParamSchema, "params"),
  asyncHandler(controller.generate)
);

projectReportsRouter.get(
  "/",
  validate(projectIdParamSchema, "params"),
  asyncHandler(controller.list)
);
