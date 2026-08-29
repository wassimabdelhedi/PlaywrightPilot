// apps/executor/src/worker.ts

import "@platform/config"; // Valide la configuration au démarrage
import { logger } from "@platform/logger";

// On importe les workers pour les instancier et les mettre à l'écoute des jobs
import "./discovery/discovery-worker.js";
import "./execution/execution-worker.js";

logger.info("Tous les workers de l'executor sont démarrés et en attente de jobs.");
