// apps/executor/src/types.ts

import type { Page } from "playwright";

export interface RunnerTask<T> {
  (page: Page): Promise<T>;
}

export interface RunnerResult<T> {
  status: "success" | "failed" | "timeout";
  result?: T;
  errorMessage?: string;
  durationMs: number;
  artifacts: {
    screenshotPath?: string;
    videoPath?: string;
    tracePath?: string;
    logPath?: string;
  };
}
