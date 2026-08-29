// apps/api/src/modules/executions/executions.schema.ts

import { z } from "zod";

export const testIdParamSchema = z.object({
  testId: z.string().cuid(),
});

export const executionIdParamSchema = z.object({
  id: z.string().cuid(),
});
