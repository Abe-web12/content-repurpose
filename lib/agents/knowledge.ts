import { prisma } from "@/lib/prisma";

export class AgentKnowledge {
  static async createKnowledgeBase(agentId: string, context: { organizationId: string; userId: string }, data: { name: string; description?: string; chunkSize?: number; chunkOverlap?: number }) {
    return prisma.aiAgentKnowledgeBases.create({
      data: {
        agentId,
        organizationId: context.organizationId,
        userId: context.userId,
        name: data.name,
        description: data.description,
        chunkSize: data.chunkSize ?? 500,
        chunkOverlap: data.chunkOverlap ?? 50,
      },
    });
  }

  static async addDocument(knowledgeBaseId: string, context: { organizationId: string; userId: string }, data: { title: string; source: string; sourceType: string; content: string }) {
    const chunks = this.chunkContent(data.content, 500, 50);

    return prisma.aiAgentKnowledgeDocuments.create({
      data: {
        knowledgeBaseId,
        organizationId: context.organizationId,
        userId: context.userId,
        title: data.title,
        source: data.source,
        sourceType: data.sourceType,
        content: data.content,
        chunks: chunks as any,
        tokens: data.content.length,
      },
    });
  }

  static async search(agentId: string, query: string, context: { organizationId: string }, limit = 5) {
    const knowledgeBases = await prisma.aiAgentKnowledgeBases.findMany({
      where: { agentId, organizationId: context.organizationId },
      select: { id: true },
    });

    if (knowledgeBases.length === 0) return [];

    const kbIds = knowledgeBases.map((kb) => kb.id);

    return prisma.aiAgentKnowledgeDocuments.findMany({
      where: {
        knowledgeBaseId: { in: kbIds },
        content: { contains: query, mode: "insensitive" },
      },
      take: limit,
    });
  }

  static async getKnowledgeBases(agentId: string) {
    const kbs = await prisma.aiAgentKnowledgeBases.findMany({ where: { agentId } });
    if (kbs.length === 0) return [];
    const kbIds = kbs.map(kb => kb.id);
    const docs = await prisma.aiAgentKnowledgeDocuments.findMany({
      where: { knowledgeBaseId: { in: kbIds } },
    });
    const docMap = new Map<string, typeof docs>();
    for (const doc of docs) {
      const list = docMap.get(doc.knowledgeBaseId);
      if (list) list.push(doc);
      else docMap.set(doc.knowledgeBaseId, [doc]);
    }
    return kbs.map(kb => ({ ...kb, documents: docMap.get(kb.id) ?? [] }));
  }

  static async getDocuments(knowledgeBaseId: string, options?: { limit?: number; cursor?: string }) {
    const limit = Math.min(options?.limit ?? 50, 200);
    const docs = await prisma.aiAgentKnowledgeDocuments.findMany({
      where: { knowledgeBaseId },
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = docs.length > limit;
    const data = hasMore ? docs.slice(0, limit) : docs;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  static async deleteDocument(docId: string) {
    return prisma.aiAgentKnowledgeDocuments.delete({ where: { id: docId } });
  }

  static async deleteKnowledgeBase(kbId: string) {
    await prisma.aiAgentKnowledgeDocuments.deleteMany({ where: { knowledgeBaseId: kbId } });
    return prisma.aiAgentKnowledgeBases.delete({ where: { id: kbId } });
  }

  static chunkContent(content: string, chunkSize: number, overlap: number): string[] {
    if (content.length <= chunkSize) return [content];

    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      chunks.push(content.slice(start, end));
      start += chunkSize - overlap;
    }

    return chunks;
  }
}
