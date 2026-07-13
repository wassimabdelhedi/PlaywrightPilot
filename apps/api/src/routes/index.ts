// Point d'entrée unique pour monter tous les modules sous /api/v1.
// Chaque phase future ajoute une ligne ici — jamais de route montée
// directement dans app.ts.

import { Router } from "express";
import { healthRouter } from "../modules/health/health.routes.js";
import { projectsRouter } from "../modules/projects/projects.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter); // GET /api/v1/health
apiRouter.use("/projects", projectsRouter); // Phase 3 — module de référence
apiRouter.use("/auth", authRouter); // Phase 4
// Phase 7  : apiRouter.use("/discoveries", discoveriesRouter);
// Phase 10 : apiRouter.use("/scenarios", scenariosRouter);
// Phase 11 : apiRouter.use("/tests", testCasesRouter);
// Phase 12 : apiRouter.use("/executions", executionsRouter);