// apps/executor/src/runner/playwright-runner.ts
//
// Point d'entrée unique utilisé par le moteur de découverte (Phase 7)
// et l'exécution de tests générés (Phase 12). Garantit trois choses
// quel que soit le résultat de `task` : un timeout dur est respecté,
// les artefacts sont TOUJOURS capturés (y compris en cas d'échec — un
// screenshot au moment du crash est souvent plus utile que le succès),
// et le contexte est TOUJOURS fermé.

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "@platform/config";
import { logger } from "@platform/logger";
import { assertSafeUrl } from "../browser/url-guard.js";
import { createIsolatedContext, releaseContext } from "../browser/browser-manager.js";
import { saveArtifact } from "../artifacts/artifact-storage.js";
import type { RunnerTask, RunnerResult } from "../types.js";

class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(`Timeout après ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function runPlaywrightTask<T>(
  executionId: string,
  targetUrl: string,
  task: RunnerTask<T>
): Promise<RunnerResult<T>> {
  const startedAt = Date.now();

  // La garde SSRF s'exécute AVANT toute création de contexte navigateur
  // — inutile de payer le coût d'un contexte si l'URL est de toute
  // façon rejetée.
  await assertSafeUrl(targetUrl);

  const videoDir = await mkdtemp(join(tmpdir(), "pw-video-"));
  const consoleLogs: string[] = [];
  const artifacts: RunnerResult<T>["artifacts"] = {};

  const context = await createIsolatedContext({ recordVideoDir: videoDir });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  const page = await context.newPage();
  page.on("console", (msg: import("playwright").ConsoleMessage) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err: Error) => consoleLogs.push(`[pageerror] ${err.message}`));

  let status: RunnerResult<T>["status"] = "success";
  let result: T | undefined;
  let errorMessage: string | undefined;

  try {
    result = await withTimeout(task(page), config.EXECUTION_TIMEOUT_MS);
  } catch (err) {
    status = err instanceof TimeoutError ? "timeout" : "failed";
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn({ executionId, status, errorMessage }, "échec de l'exécution Playwright");

    // Un screenshot au moment de l'échec est capturé même si la page
    // est dans un état incohérent — best-effort, ne doit jamais faire
    // échouer le nettoyage qui suit.
    try {
      const screenshotBuffer = await page.screenshot({ fullPage: true });
      artifacts.screenshotPath = await saveArtifact(executionId, "screenshot", "failure.png", screenshotBuffer);
    } catch {
      logger.warn({ executionId }, "impossible de capturer le screenshot d'échec");
    }
  } finally {
    // --- Capture systématique, succès ou échec ---
    try {
      const traceBuffer = await captureTraceBuffer(context, videoDir);
      if (traceBuffer) {
        artifacts.tracePath = await saveArtifact(executionId, "trace", "trace.zip", traceBuffer);
      }
    } catch {
      logger.warn({ executionId }, "impossible de capturer la trace");
    }

    if (consoleLogs.length > 0) {
      artifacts.logPath = await saveArtifact(executionId, "log", "console.log", Buffer.from(consoleLogs.join("\n")));
    }

    // La vidéo n'est finalisée sur disque qu'APRÈS la fermeture du
    // contexte — c'est pourquoi releaseContext() doit précéder sa lecture.
    const video = page.video();
    await releaseContext(context); // ferme aussi la page

    if (video) {
      try {
        const videoBuffer = await readFile(await video.path());
        artifacts.videoPath = await saveArtifact(executionId, "video", "recording.webm", videoBuffer);
      } catch {
        logger.warn({ executionId }, "impossible de capturer la vidéo");
      }
    }

    await rm(videoDir, { recursive: true, force: true });
  }

  return {
    status,
    result,
    errorMessage,
    durationMs: Date.now() - startedAt,
    artifacts,
  };
}

async function captureTraceBuffer(
  context: Awaited<ReturnType<typeof createIsolatedContext>>,
  videoDir: string
): Promise<Buffer | null> {
  const tracePath = join(videoDir, "trace.zip");
  await context.tracing.stop({ path: tracePath });
  return readFile(tracePath).catch(() => null);
}
