// apps/executor/src/execution/artifact-collector.ts
//
// Le CLI Playwright écrit ses artefacts dans une arborescence qu'il
// contrôle sous outputDir (structure : un sous-dossier par test avec
// trace.zip, vidéo, screenshots). On la parcourt puis on persiste
// chaque fichier trouvé via saveArtifact (même fonction que la Phase
// 6/7 — un seul point de vérité pour "comment un artefact est stocké").

import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { saveArtifact, type ArtifactKind } from "../artifacts/artifact-storage.js";

const EXTENSION_TO_KIND: Record<string, ArtifactKind> = {
  ".zip": "trace",
  ".webm": "video",
  ".png": "screenshot",
};

export interface CollectedArtifact {
  kind: ArtifactKind;
  storageUrl: string;
  sizeBytes: number;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export async function collectArtifacts(resultsDir: string, executionId: string): Promise<CollectedArtifact[]> {
  let filePaths: string[];
  try {
    filePaths = await walk(resultsDir);
  } catch {
    return []; // aucun artefact produit (ex: le processus a planté avant même de démarrer un test)
  }

  const collected: CollectedArtifact[] = [];

  for (const filePath of filePaths) {
    const kind = EXTENSION_TO_KIND[extname(filePath)];
    if (!kind) continue; // fichiers annexes du CLI (ex: .json de config) ignorés

    const buffer = await readFile(filePath);
    const filename = `${kind}-${collected.length}${extname(filePath)}`;
    const storageUrl = await saveArtifact(executionId, kind, filename, buffer);
    const { size } = await stat(filePath);

    collected.push({ kind, storageUrl, sizeBytes: size });
  }

  return collected;
}
