// Seule couche qui connaît les URLs. Chaque route branche : validation
// -> asyncHandler(contrôleur). C'est le gabarit que suivront tous les
// modules futurs (discoveries, scenarios, executions...).

import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { validate } from "../../middleware/validate";
import * as controller from "./projects.controller";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamSchema,
  updateProjectSchema,
} from "./projects.schema";

export const projectsRouter = Router();

projectsRouter.post("/", validate(createProjectSchema, "body"), asyncHandler(controller.create));

projectsRouter.get("/", validate(listProjectsQuerySchema, "query"), asyncHandler(controller.list));

projectsRouter.get(
  "/:id",
  validate(projectIdParamSchema, "params"),
  asyncHandler(controller.getById)
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
