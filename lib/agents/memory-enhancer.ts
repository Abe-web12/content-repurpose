import { prisma } from "@/lib/prisma";
import { AgentMemory } from "./memory";
import { generateEmbedding } from "@/lib/ai/provider";
import { cosineSimilarity } from "@/lib/studio/knowledge-engine";

interface MemorySummary {
  id: string;
  content: string;
  type: string;
  createdAt: Date;
}

const MAX_SHORT_TERM = 20;
const MAX_LONG_TERM = 100;
const SUMMARIZATION_THRESHOLD = 15;

export class MemoryEnhancer {
  static async autoSummarize(agentId: string): Promise<string | null> {
    const memories = await prisma.aiAgentMemories.findMany({
      where: { agentId, type: "SHORT_TERM" },
      orderBy: { createdAt: "desc" },
      take: SUMMARIZATION_THRESHOLD,
    });

    if (memories.length < SUMMARIZATION_THRESHOLD) return null;

    const combined = memories.map((m) => `[${m.createdAt.toISOString()}] ${m.content}`).join("\n");
    const summary = `Memory Summary (${memories.length} entries): ${combined.slice(0, 500)}`;

    const embeddingJson = await MemoryEnhancer.generateEmbeddingSafe(summary);

    await prisma.aiAgentMemories.create({
      data: {
        agentId,
        organizationId: memories[0].organizationId,
        userId: memories[0].userId,
        type: "SUMMARY",
        key: `summary_${Date.now()}`,
        content: summary,
        summary,
        embedding: embeddingJson,
        score: 1.0,
      },
    });

    return summary;
  }

  static async enforceMemoryLimits(agentId: string): Promise<void> {
    const shortTerm = await prisma.aiAgentMemories.findMany({
      where: { agentId, type: "SHORT_TERM" },
      orderBy: { createdAt: "asc" },
    });

    if (shortTerm.length > MAX_SHORT_TERM) {
      const toDelete = shortTerm.slice(0, shortTerm.length - MAX_SHORT_TERM);
      await prisma.aiAgentMemories.deleteMany({
        where: { id: { in: toDelete.map((m) => m.id) } },
      });
    }

    const longTerm = await prisma.aiAgentMemories.findMany({
      where: { agentId, type: "LONG_TERM" },
      orderBy: { score: "asc" },
    });

    if (longTerm.length > MAX_LONG_TERM) {
      const toDelete = longTerm.slice(0, longTerm.length - MAX_LONG_TERM);
      await prisma.aiAgentMemories.deleteMany({
        where: { id: { in: toDelete.map((m) => m.id) } },
      });
    }
  }

  static async expireMemories(): Promise<number> {
    const result = await prisma.aiAgentMemories.deleteMany({
      where: {
        expiresAt: { not: null, lt: new Date() },
      },
    });
    return result.count;
  }

  static async semanticSearch(agentId: string, query: string, limit = 10): Promise<any[]> {
    try {
      const queryEmbedding = await generateEmbedding(query);

      const memories = await prisma.aiAgentMemories.findMany({
        where: {
          agentId,
          embedding: { not: null },
        },
        take: 200,
      });

      if (memories.length === 0) {
        return MemoryEnhancer.fallbackSearch(agentId, query, limit);
      }

      const scored = memories
        .map((m) => {
          try {
            const vector = JSON.parse(m.embedding!);
            return { ...m, _score: cosineSimilarity(queryEmbedding, vector) };
          } catch {
            return { ...m, _score: 0 };
          }
        })
        .filter((m) => m._score > 0.5)
        .sort((a, b) => b._score - a._score)
        .slice(0, limit);

      if (scored.length === 0) {
        return MemoryEnhancer.fallbackSearch(agentId, query, limit);
      }

      return scored;
    } catch {
      return MemoryEnhancer.fallbackSearch(agentId, query, limit);
    }
  }

  private static async fallbackSearch(agentId: string, query: string, limit: number): Promise<any[]> {
    return prisma.aiAgentMemories.findMany({
      where: {
        agentId,
        OR: [
          { content: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { score: "desc" },
      take: limit,
    });
  }

  static async getWorkingContext(agentId: string): Promise<string> {
    const recent = await prisma.aiAgentMemories.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return recent
      .map((m) => `[${m.type}] ${m.content}`)
      .reverse()
      .join("\n");
  }

  private static async generateEmbeddingSafe(text: string): Promise<string | null> {
    try {
      const embedding = await generateEmbedding(text);
      return JSON.stringify(embedding);
    } catch {
      return null;
    }
  }

  static async mergeMemories(agentId: string): Promise<void> {
    const sessionMemories = await prisma.aiAgentMemories.findMany({
      where: { agentId, type: "SHORT_TERM" },
      orderBy: { createdAt: "asc" },
    });

    if (sessionMemories.length < 2) return;

    const merged = sessionMemories
      .map((m) => m.content)
      .join(" ");

    if (merged.length > 2000) {
      const embeddingJson = await MemoryEnhancer.generateEmbeddingSafe(merged.slice(0, 2000));

      await prisma.aiAgentMemories.create({
        data: {
          agentId,
          organizationId: sessionMemories[0].organizationId,
          userId: sessionMemories[0].userId,
          type: "LONG_TERM",
          key: `merged_${Date.now()}`,
          content: merged.slice(0, 2000),
          embedding: embeddingJson,
          score: 0.8,
        },
      });
    }
  }
}
