import "./graphs/feature-understanding/feature-understanding-worker.js";
import "./graphs/scenario-generation/scenario-generation-worker.js";
import "./graphs/test-generation/test-generation-worker.js";
import "./graphs/failure-analysis/failure-analysis-worker.js";
import "./workers/report-worker.js";

import { logger } from "@platform/logger";

logger.info("Orchestrator worker started (Feature, Scenario, Test, Failure & Report)");
