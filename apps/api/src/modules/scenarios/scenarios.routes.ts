// apps/api/src/modules/scenarios/scenarios.routes.ts
//
// Même compromis REST que discoveries.routes.ts (Phase 7) : deux
// routeurs, l'un imbriqué sous /projects/:projectId, l'autre à plat.

import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { validate } from "../../middleware/validate.js";
import * as controller from "./scenarios.controller.js";
import {
  listScenariosQuerySchema,
  projectIdParamSchema,
  scenarioIdParamSchema,
  updateScenarioStatusSchema,
} from "./scenarios.schema.js";
import { authenticate } from "../../middleware/authenticate.js";

export const projectScenariosRouter = Router({ mergeParams: true });
projectScenariosRouter.use(authenticate);

projectScenariosRouter.post("/generate", validate(projectIdParamSchema, "params"), asyncHandler(controller.generate));

projectScenariosRouter.get(
  "/",
  validate(projectIdParamSchema, "params"),
  validate(listScenariosQuerySchema, "query"),
  asyncHandler(controller.list)
);

export const scenariosRouter = Router();
scenariosRouter.use(authenticate);

scenariosRouter.patch(
  "/:id/status",
  validate(scenarioIdParamSchema, "params"),
  validate(updateScenarioStatusSchema, "body"),
  asyncHandler(controller.updateStatus)
);

scenariosRouter.delete(
  "/:id",
  validate(scenarioIdParamSchema, "params"),
  asyncHandler(controller.remove)
);
