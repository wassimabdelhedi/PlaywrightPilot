// apps/executor/src/browser/browser-manager.ts
//
// Un seul processus Chromium par worker, gardé ouvert entre les runs.
// Chaque exécution obtient un BrowserContext frais (cookies, storage,
// cache indépendants) — jamais le contexte par défaut du navigateur,
// qui serait partagé et donc source de fuite de données entre runs.

import { chromium, type Browser, type BrowserContext } from "playwright";
import { config } from "@platform/config";
import { logger } from "@platform/logger";

let sharedBrowser: Browser | null = null;
let activeContexts = 0;

export async function getBrowser(): Promise<Browser> {
  if (sharedBrowser?.isConnected()) {
    return sharedBrowser;
  }

  logger.info({ headless: config.PLAYWRIGHT_HEADLESS }, "lancement du navigateur Chromium");

  sharedBrowser = await chromium.launch({
    headless: config.PLAYWRIGHT_HEADLESS,
    // --disable-dev-shm-usage évite les crashs par manque de mémoire
    // partagée dans un conteneur Docker aux ressources restreintes
    // (le /dev/shm par défaut de Docker est souvent trop petit pour
    // Chromium — voir Phase 20 pour la configuration du conteneur).
    args: ["--disable-dev-shm-usage"],
  });

  sharedBrowser.on("disconnected", () => {
    logger.warn("navigateur Chromium déconnecté de façon inattendue");
    sharedBrowser = null;
  });

  return sharedBrowser;
}

interface IsolatedContextOptions {
  recordVideoDir?: string;
  viewport?: { width: number; height: number };
}

export async function createIsolatedContext(options: IsolatedContextOptions = {}): Promise<BrowserContext> {
  if (activeContexts >= config.MAX_CONCURRENT_CONTEXTS) {
    throw new Error(
      `Limite de contextes concurrents atteinte (${config.MAX_CONCURRENT_CONTEXTS}) — le worker doit patienter avant d'accepter un nouveau run`
    );
  }

  const browser = await getBrowser();

  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1280, height: 800 },
    recordVideo: options.recordVideoDir ? { dir: options.recordVideoDir } : undefined,
    // Aucune permission accordée par défaut (géolocalisation, caméra,
    // notifications...) — un site exploré ne doit jamais pouvoir
    // déclencher de prompt de permission capté silencieusement.
    permissions: [],
    ignoreHTTPSErrors: false,
  });

  activeContexts += 1;
  return context;
}

export async function releaseContext(context: BrowserContext): Promise<void> {
  await context.close();
  activeContexts = Math.max(0, activeContexts - 1);
}

export async function shutdownBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}
