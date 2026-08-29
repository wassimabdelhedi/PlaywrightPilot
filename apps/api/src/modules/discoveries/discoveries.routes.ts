import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../lib/async-handler.js";
import * as discoveriesController from "./discoveries.controller.js";
import {
  projectIdParamSchema,
  discoveryIdParamSchema,
  startDiscoverySchema,
} from "./discoveries.schema.js";

export const discoveriesRouter = Router();

// Routes protégées par authentification
discoveriesRouter.use(authenticate);

// Démarrer une nouvelle découverte pour un projet
discoveriesRouter.post(
  "/project/:projectId",
  validate(projectIdParamSchema, "params"),
  validate(startDiscoverySchema, "body"),
  asyncHandler(discoveriesController.start)
);

// Lister toutes les découvertes d'un projet
discoveriesRouter.get(
  "/project/:projectId",
  validate(projectIdParamSchema, "params"),
  asyncHandler(discoveriesController.listByProject)
);

// Récupérer le statut d'une découverte
discoveriesRouter.get(
  "/:id",
  validate(discoveryIdParamSchema, "params"),
  asyncHandler(discoveriesController.getById)
);

// Lister les pages d'une découverte
discoveriesRouter.get(
  "/:id/pages",
  validate(discoveryIdParamSchema, "params"),
  asyncHandler(discoveriesController.listPages)
);

// Annuler une découverte en cours
discoveriesRouter.post(
  "/:id/cancel",
  validate(discoveryIdParamSchema, "params"),
  asyncHandler(discoveriesController.cancel)
);

// Supprimer une découverte
discoveriesRouter.delete(
  "/:id",
  validate(discoveryIdParamSchema, "params"),
  asyncHandler(discoveriesController.remove)
);
