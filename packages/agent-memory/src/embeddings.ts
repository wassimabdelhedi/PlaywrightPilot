// packages/agent-memory/src/embeddings.ts

import { config } from "@platform/config";

export async function embedText(text: string): Promise<number[]> {
  const response = await fetch(`${config.OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.OLLAMA_EMBED_MODEL,
      prompt: text
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erreur Ollama lors de l'embedding: ${response.status} ${err}`);
  }

  const data = (await response.json()) as { embedding: number[] };
  const embedding = data.embedding;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Aucun embedding renvoyé par Ollama");
  }

  return embedding;
}

// Format attendu par pgvector dans une requête SQL brute : '[0.1,0.2,...]'
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
