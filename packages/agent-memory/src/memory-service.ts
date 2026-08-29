// packages/agent-memory/src/memory-service.ts
//
// API générique utilisée par TOUTE catégorie de mémoire — FEATURE_MAP
// aujourd'hui, SELECTOR_RELIABILITY et FAILURE_PATTERN dans les
// phases futures. Aucune logique spécifique à une catégorie ne vit
// ici ; elle reste dans le code appelant (persist-features.ts,
// recordSelectorOutcome ci-dessous).
//
// Prisma ne sait pas nativement lire/écrire une colonne `Unsupported
// ("vector")` — ces opérations passent obligatoirement par
// $queryRawUnsafe / $executeRawUnsafe. C'est un des rares endroits du
// système où le SQL brut est justifié plutôt qu'un contournement.

import { prisma } from "@platform/database";
import { config } from "@platform/config";
import { embedText, toVectorLiteral } from "./embeddings.js";

export type MemoryCategory =
  | "SELECTOR_RELIABILITY"
  | "PAGE_KNOWLEDGE"
  | "FEATURE_MAP"
  | "FAILURE_PATTERN"
  | "EXPLORATION_STATE";

interface UpsertMemoryInput {
  projectId: string;
  category: MemoryCategory;
  content: Record<string, unknown>;
  // Texte utilisé pour calculer l'embedding ET rechercher un doublon
  // sémantique existant — souvent une concaténation nom+description,
  // pas le JSON complet du contenu.
  dedupeText: string;
}

interface MemoryMatch {
  id: string;
  content: Record<string, unknown>;
  distance: number;
}

// Recherche la mémoire existante la plus proche sémantiquement, dans
// le même projet et la même catégorie. La distance cosinus pgvector
// (`<=>`) va de 0 (identique) à 2 (opposé) ; on la convertit en
// similarité (1 - distance/2) pour un seuil de configuration plus
// intuitif (proche de 1 = quasi identique).
async function findSimilar(
  projectId: string,
  category: MemoryCategory,
  embedding: number[]
): Promise<MemoryMatch | null> {
  const vectorLiteral = toVectorLiteral(embedding);

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; content: unknown; distance: number }>>(
    `SELECT id, content, embedding <=> $1::vector AS distance
     FROM agent_memories
     WHERE "projectId" = $2 AND category = $3::"MemoryCategory"
     ORDER BY distance ASC
     LIMIT 1`,
    vectorLiteral,
    projectId,
    category
  );

  const closest = rows[0];
  if (!closest) return null;

  const similarity = 1 - closest.distance / 2;
  if (similarity < config.MEMORY_DEDUPE_SIMILARITY_THRESHOLD) return null;

  return { id: closest.id, content: closest.content as Record<string, unknown>, distance: closest.distance };
}

export async function upsertMemory(input: UpsertMemoryInput): Promise<{ id: string; wasUpdated: boolean }> {
  const embedding = await embedText(input.dedupeText);
  const vectorLiteral = toVectorLiteral(embedding);

  const existing = await findSimilar(input.projectId, input.category, embedding);

  if (existing) {
    await prisma.$executeRawUnsafe(
      `UPDATE agent_memories SET content = $1::jsonb, embedding = $2::vector, "updatedAt" = now() WHERE id = $3`,
      JSON.stringify(input.content),
      vectorLiteral,
      existing.id
    );
    return { id: existing.id, wasUpdated: true };
  }

  const created = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO agent_memories (id, "projectId", category, content, embedding, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2::"MemoryCategory", $3::jsonb, $4::vector, now(), now())
     RETURNING id`,
    input.projectId,
    input.category,
    JSON.stringify(input.content),
    vectorLiteral
  );

  return { id: created[0]!.id, wasUpdated: false };
}

export async function queryMemory(
  projectId: string,
  category: MemoryCategory,
  queryText: string,
  topK = 5
): Promise<MemoryMatch[]> {
  const embedding = await embedText(queryText);
  const vectorLiteral = toVectorLiteral(embedding);

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; content: unknown; distance: number }>>(
    `SELECT id, content, embedding <=> $1::vector AS distance
     FROM agent_memories
     WHERE "projectId" = $2 AND category = $3::"MemoryCategory"
     ORDER BY distance ASC
     LIMIT $4`,
    vectorLiteral,
    projectId,
    category,
    topK
  );

  return rows.map((row: { id: string; content: unknown; distance: number }) => ({ id: row.id, content: row.content as Record<string, unknown>, distance: row.distance }));
}

// Court-circuite un travail coûteux (ex: le graphe de la Phase 8) si
// une mémoire suffisamment récente existe déjà pour ce projet.
export async function hasFreshMemory(
  projectId: string,
  category: MemoryCategory,
  maxAgeMs: number = config.MEMORY_FRESHNESS_MS
): Promise<boolean> {
  const cutoff = new Date(Date.now() - maxAgeMs);

  const count = await prisma.agentMemory.count({
    where: { projectId, category, updatedAt: { gte: cutoff } },
  });

  return count > 0;
}

// Retourne TOUTES les mémoires d'une catégorie pour un projet donné.
// Utilisé par load-features (Phase 10) pour charger la liste complète
// des fonctionnalités sans requête vectorielle.
export async function listMemoriesByCategory(
  projectId: string,
  category: MemoryCategory
): Promise<Array<{ id: string; content: Record<string, unknown> }>> {
  const rows = await prisma.agentMemory.findMany({
    where: { projectId, category },
    select: { id: true, content: true },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    content: row.content as Record<string, unknown>,
  }));
}
