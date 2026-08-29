// apps/api/src/modules/reports/reports.schema.ts
import { z } from "zod";

export const projectIdParamSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
});
