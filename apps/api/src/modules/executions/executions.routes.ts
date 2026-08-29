// apps/api/src/modules/executions/executions.routes.ts
//
// Même compromis REST que scenarios.routes.ts : deux routeurs,
// l'un imbriqué sous /tests/:testId, l'autre à plat sous /executions.

import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import * as controller from "./executions.controller.js";
import { testIdParamSchema, executionIdParamSchema } from "./executions.schema.js";

// Montée sous /tests/:testId  (via apiRouter)
export const testExecutionsRouter = Router({ mergeParams: true });
testExecutionsRouter.use(authenticate);

testExecutionsRouter.post(
  "/execute",
  validate(testIdParamSchema, "params"),
  asyncHandler(controller.execute)
);

// Montée à plat sous /executions
export const executionsRouter = Router();
executionsRouter.use(authenticate);

executionsRouter.get(
  "/:id",
  validate(executionIdParamSchema, "params"),
  asyncHandler(controller.getById)
);

executionsRouter.get(
  "/:id/artifacts",
  validate(executionIdParamSchema, "params"),
  asyncHandler(controller.getArtifacts)
);

executionsRouter.get(
  "/:id/analysis",
  validate(executionIdParamSchema, "params"),
  asyncHandler(controller.getAnalysis)
);
