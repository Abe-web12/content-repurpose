import { prisma } from "@/lib/prisma";
import { cosineSimilarity, parseEmbeddingVector } from "./knowledge-engine";

export interface RAGContext {
  chunks: RAGChunk[];
  context: string;
}

export interface RAGChunk {
  id: string;
  content: string;
  score: number;
  documentTitle: string;
  source: string | null;
  metadata: Record<string, unknown> | null;
}

export interface Citation {
  chunkId: string;
  content: string;
  score: number;
  documentTitle: string;
  source: string | null;
}

export interface RetrieverOptions {
  topK?: number;
  minScore?: number;
  knowledgeBaseIds: string[];
}

export async function retrieveChunks(
  queryEmbedding: number[],
  options: RetrieverOptions
): Promise<RAGChunk[]> {
  const { topK = 5, minScore = 0.7, knowledgeBaseIds } = options;

  const documents = await prisma.knowledgeDocuments.findMany({
    where: {
      knowledgeBaseId: { in: knowledgeBaseIds },
      status: "READY",
    },
    include: {
      chunks: {
        include: { embeddings: true },
      },
    },
  });

  const scored: RAGChunk[] = [];

  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      for (const emb of chunk.embeddings) {
        const vector = parseEmbeddingVector(emb.vector);
        const score = cosineSimilarity(queryEmbedding, vector);
        if (score >= minScore) {
          scored.push({
            id: chunk.id,
            content: chunk.content,
            score,
            documentTitle: doc.title,
            source: doc.source,
            metadata: chunk.metadata as Record<string, unknown> | null,
          });
        }
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function buildContext(chunks: RAGChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] Source: ${c.documentTitle}${c.source ? ` (${c.source})` : ""}\n${c.content}`)
    .join("\n\n");
}

export function buildRAGPrompt(query: string, context: string, systemPrompt?: string | null): { system: string; user: string } {
  const system = systemPrompt
    ? `${systemPrompt}\n\nUse the following context to answer the user's question. Always cite your sources using [1], [2], etc.`
    : "You are a helpful assistant. Use the provided context to answer the user's question. Always cite your sources using [1], [2], etc.";

  const user = `Context:\n${context}\n\nQuestion: ${query}`;
  return { system, user };
}

export function extractCitations(response: string, chunks: RAGChunk[]): Citation[] {
  const citations: Citation[] = [];
  const refRegex = /\[(\d+)\]/g;
  let match;
  const seen = new Set<number>();
  while ((match = refRegex.exec(response)) !== null) {
    const idx = parseInt(match[1]) - 1;
    if (idx >= 0 && idx < chunks.length && !seen.has(idx)) {
      seen.add(idx);
      const chunk = chunks[idx];
      citations.push({
        chunkId: chunk.id,
        content: chunk.content,
        score: chunk.score,
        documentTitle: chunk.documentTitle,
        source: chunk.source,
      });
    }
  }
  return citations;
}

export function hybridSearch(
  keywordResults: RAGChunk[],
  semanticResults: RAGChunk[],
  alpha = 0.5
): RAGChunk[] {
  const seen = new Map<string, RAGChunk>();
  for (const r of keywordResults) {
    seen.set(r.id, { ...r, score: r.score * alpha });
  }
  for (const r of semanticResults) {
    const existing = seen.get(r.id);
    if (existing) {
      existing.score += r.score * (1 - alpha);
    } else {
      seen.set(r.id, { ...r, score: r.score * (1 - alpha) });
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.score - a.score);
}
