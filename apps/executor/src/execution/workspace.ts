// apps/executor/src/execution/workspace.ts
//
// Chaque exécution obtient son PROPRE répertoire temporaire — jamais
// un répertoire partagé, ce qui provoquerait des collisions de
// fichiers de résultats entre exécutions concurrentes (Phase 12 §2).

import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "@platform/config";

export interface Workspace {
  dir: string;
  specFilePath: string;
  configFilePath: string;
  resultsDir: string;
  jsonReportPath: string;
}

// Normalise les backslashes Windows en forward slashes pour les templates JS
function toForwardSlash(p: string): string {
  return p.replace(/\\/g, "/");
}

const PLAYWRIGHT_CONFIG_TEMPLATE = (resultsDir: string, jsonReportPath: string, headless: boolean) => `
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: ${config.EXECUTION_TIMEOUT_MS},
  retries: 0, // la politique de retry métier est gérée par notre orchestrateur, pas par Playwright
  outputDir: '${toForwardSlash(resultsDir)}',
  reporter: [['json', { outputFile: '${toForwardSlash(jsonReportPath)}' }]],
  use: {
    headless: ${headless},
    trace: 'on',
    video: 'on',
    screenshot: 'on',
  },
});
`;

export async function createWorkspace(executionId: string, sourceCode: string): Promise<Workspace> {
  const dir = await mkdtemp(join(tmpdir(), `exec-${executionId}-`));
  const resultsDir = join(dir, "test-results");
  await mkdir(resultsDir, { recursive: true });

  const specFilePath = join(dir, "generated.spec.ts");
  const configFilePath = join(dir, "playwright.config.ts");
  const jsonReportPath = join(dir, "report.json");

  await writeFile(specFilePath, sourceCode, "utf-8");
  await writeFile(configFilePath, PLAYWRIGHT_CONFIG_TEMPLATE(resultsDir, jsonReportPath, config.PLAYWRIGHT_HEADLESS), "utf-8");

  return { dir, specFilePath, configFilePath, resultsDir, jsonReportPath };
}
