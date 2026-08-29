// apps/executor/src/execution/process-runner.ts
//
// Isolation par PROCESSUS SYSTÈME, pas seulement par contexte
// navigateur — un test généré qui boucle ou consomme des ressources
// excessives est tué au niveau de l'OS (SIGKILL), garantie plus forte
// que tout mécanisme applicatif interne au processus Node.

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { config } from "@platform/config";
import { logger } from "@platform/logger";
import type { Workspace } from "./workspace.js";

import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is apps/executor/src/execution
const EXECUTOR_NODE_MODULES = resolve(__dirname, "../../node_modules");

export type ProcessOutcome = "passed" | "failed" | "timeout";

export interface ProcessResult {
  outcome: ProcessOutcome;
  errorMessage?: string;
  stdout: string;
}

export async function runTestProcess(workspace: Workspace, executionId: string): Promise<ProcessResult> {
  return new Promise((resolve_) => {
    // Utiliser le binaire Playwright installé dans le monorepo
    // plutôt que npx (qui téléchargerait une version différente sans @playwright/test)
    const binExt = process.platform === "win32" ? ".cmd" : "";
    const playwrightBin = resolve(EXECUTOR_NODE_MODULES, `.bin/playwright${binExt}`);
    // NODE_PATH permet au workspace temporaire de résoudre @playwright/test
    const nodeModulesPath = EXECUTOR_NODE_MODULES;

    const child = spawn(playwrightBin, ["test", "--config", workspace.configFilePath], {
      cwd: workspace.dir,
      env: { ...process.env, NODE_PATH: nodeModulesPath },
      shell: true,
    });

    let stdout = "";
    let stderr = "";
    let killedByTimeout = false;

    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    const timer = setTimeout(() => {
      killedByTimeout = true;
      // SIGKILL, pas SIGTERM : un processus qui ignore SIGTERM (boucle
      // infinie sans gestionnaire de signal) doit être arrêté sans
      // possibilité de refus.
      child.kill("SIGKILL");
    }, config.TEST_PROCESS_TIMEOUT_MS);

    child.on("close", async (exitCode) => {
      clearTimeout(timer);

      if (killedByTimeout) {
        logger.warn({ executionId }, "processus de test tué après dépassement du timeout dur");
      resolve_({ outcome: "timeout", errorMessage: `Timeout après ${config.TEST_PROCESS_TIMEOUT_MS}ms`, stdout });
        return;
      }

      if (exitCode === 0) {
        resolve_({ outcome: "passed", stdout });
        return;
      }

      const errorMessage = await extractErrorFromReport(workspace.jsonReportPath, stderr, stdout);
      resolve_({ outcome: "failed", errorMessage, stdout });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      logger.error({ executionId, err }, "impossible de démarrer le processus Playwright");
      resolve_({ outcome: "failed", errorMessage: err.message, stdout });
    });
  });
}

async function extractErrorFromReport(jsonReportPath: string, fallbackStderr: string, fallbackStdout: string): Promise<string> {
  try {
    const raw = await readFile(jsonReportPath, "utf-8");
    const report = JSON.parse(raw);
    const failingSpec = report.suites?.[0]?.specs?.find((s: { ok: boolean }) => !s.ok);
    const message = failingSpec?.tests?.[0]?.results?.[0]?.error?.message;
    return message || fallbackStderr.slice(0, 2000) || `Échec sans message d'erreur exploitable. STDOUT: ${fallbackStdout.slice(0, 1000)}`;
  } catch {
    return `[Fallback] STDERR: ${fallbackStderr.slice(0, 1000)} | STDOUT: ${fallbackStdout.slice(0, 1000)}` || "Échec du test, rapport JSON illisible";
  }
}
