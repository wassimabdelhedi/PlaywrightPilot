// Seule couche qui connaît les URLs. Chaque route branche : validation
// -> asyncHandler(contrôleur). C'est le gabarit que suivront tous les
// modules futurs (discoveries, scenarios, executions...).

import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import * as controller from "./projects.controller.js";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  updateProjectSchema,
} from "./projects.schema.js";
import { projectScenariosRouter } from "../scenarios/scenarios.routes.js";
import { projectReportsRouter } from "../reports/reports.routes.js";

export const projectsRouter = Router();
projectsRouter.use(authenticate);

projectsRouter.use("/:projectId/scenarios", projectScenariosRouter);
projectsRouter.use("/:projectId/reports", projectReportsRouter);

projectsRouter.post("/", validate(createProjectSchema, "body"), asyncHandler(controller.create));

projectsRouter.get("/", validate(listProjectsQuerySchema, "query"), asyncHandler(controller.list));

projectsRouter.get(
  "/:id",
  validate(projectIdParamSchema, "params"),
  asyncHandler(controller.getById)
);

projectsRouter.get(
  "/:id/executions",
  validate(projectIdParamSchema, "params"),
  asyncHandler(controller.listExecutions)
);

projectsRouter.post(
  "/:id/autopilot",
  validate(projectIdParamSchema, "params"),
  asyncHandler(controller.triggerAutopilot)
);

projectsRouter.post(
  "/:id/autopilot/stop",
  validate(projectIdParamSchema, "params"),
  asyncHandler(controller.stopAutopilot)
);

projectsRouter.patch(
  "/:id",
  validate(projectIdParamSchema, "params"),
  validate(updateProjectSchema, "body"),
  asyncHandler(controller.update)
);

projectsRouter.delete(
  "/:id",
  validate(projectIdParamSchema, "params"),
  asyncHandler(controller.remove)
);
