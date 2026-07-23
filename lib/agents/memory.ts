import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/ai/provider";

export class AgentMemory {
  static async store(
    agentId: string,
    runId: string | null,
    context: { organizationId: string; userId: string },
    data: {
      key: string;
      content: string;
      type?: string;
      summary?: string;
      metadata?: Record<string, unknown>;
      score?: number;
      ttlMs?: number;
    }
  ) {
    const expiresAt = data.ttlMs ? new Date(Date.now() + data.ttlMs) : null;
    const embedding = await AgentMemory.generateEmbeddingSafe(data.content);

    return prisma.aiAgentMemories.upsert({
      where: { agentId_key: { agentId, key: data.key } },
      update: {
        content: data.content,
        summary: data.summary,
        score: data.score ?? 0,
        metadata: (data.metadata ?? {}) as any,
        expiresAt,
        ...(embedding ? { embedding } : {}),
      },
      create: {
        agentId,
        runId,
        organizationId: context.organizationId,
        userId: context.userId,
        type: (data.type as any) ?? "SHORT_TERM",
        key: data.key,
        content: data.content,
        summary: data.summary,
        tokens: data.content.length,
        score: data.score ?? 0,
        metadata: (data.metadata ?? {}) as any,
        embedding: embedding ?? undefined,
        expiresAt,
      },
    });
  }

  static async search(agentId: string, query: string, limit = 10) {
    return prisma.aiAgentMemories.findMany({
      where: {
        agentId,
        OR: [
          { content: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
        ],
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
        ],
      },
      orderBy: { score: "desc" },
      take: limit,
    });
  }

  static async getMemories(agentId: string, options?: { type?: string; limit?: number; cursor?: string }) {
    const where: Record<string, unknown> = { agentId };
    if (options?.type) where.type = options.type;

    const limit = Math.min(options?.limit ?? 50, 200);
    const memories = await prisma.aiAgentMemories.findMany({
      where,
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    });

    const hasMore = memories.length > limit;
    const data = hasMore ? memories.slice(0, limit) : memories;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  static async deleteMemory(memoryId: string) {
    return prisma.aiAgentMemories.delete({ where: { id: memoryId } });
  }

  static async prune(agentId: string, maxMemories = 1000) {
    const count = await prisma.aiAgentMemories.count({ where: { agentId } });
    if (count <= maxMemories) return 0;

    const toDelete = await prisma.aiAgentMemories.findMany({
      where: { agentId },
      orderBy: [{ score: "asc" }, { createdAt: "asc" }],
      take: count - maxMemories,
      select: { id: true },
    });

    await prisma.aiAgentMemories.deleteMany({
      where: { id: { in: toDelete.map((m) => m.id) } },
    });

    return toDelete.length;
  }

  private static async generateEmbeddingSafe(text: string): Promise<string | null> {
    try {
      const embedding = await generateEmbedding(text);
      return JSON.stringify(embedding);
    } catch {
      return null;
    }
  }

  static async summarize(agentId: string, type: string) {
    const memories = await prisma.aiAgentMemories.findMany({
      where: { agentId, type: type as any },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (memories.length === 0) return null;

    const combined = memories.map((m) => m.content).join("\n");

    return prisma.aiAgentMemories.upsert({
      where: { agentId_key: { agentId, key: `summary:${type}` } },
      update: { content: combined.slice(0, 10000), summary: combined.slice(0, 500) },
      create: {
        agentId,
        organizationId: memories[0].organizationId,
        userId: memories[0].userId,
        type: "SUMMARY",
        key: `summary:${type}`,
        content: combined.slice(0, 10000),
        summary: combined.slice(0, 500),
        tokens: combined.length,
        score: 1,
      },
    });
  }
}
