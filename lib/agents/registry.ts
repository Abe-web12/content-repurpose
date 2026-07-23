import { prisma } from "@/lib/prisma";

export class AgentRegistry {
  static async getAgent(agentId: string, organizationId: string) {
    return prisma.aiAgents.findFirst({
      where: { id: agentId, organizationId, deletedAt: null },
    });
  }

  static async getAgentWithConfig(agentId: string, organizationId: string) {
    const agent = await prisma.aiAgents.findFirst({
      where: { id: agentId, organizationId, deletedAt: null },
    }) as any;
    if (!agent) return null;

    const [versions, tools, knowledgeBases] = await Promise.all([
      prisma.aiAgentVersions.findMany({
        where: { agentId },
        orderBy: { version: "desc" },
        take: 1,
      }),
      prisma.aiAgentTools.findMany({
        where: { agentId, enabled: true },
      }),
      prisma.aiAgentKnowledgeBases.findMany({ where: { agentId } }),
    ]);

    const kbIds = knowledgeBases.map(kb => kb.id);
    const allDocs = kbIds.length > 0 ? await prisma.aiAgentKnowledgeDocuments.findMany({
      where: { knowledgeBaseId: { in: kbIds } },
    }) : [];
    const docMap = new Map<string, typeof allDocs>();
    for (const doc of allDocs) {
      const list = docMap.get(doc.knowledgeBaseId);
      if (list) list.push(doc);
      else docMap.set(doc.knowledgeBaseId, [doc]);
    }
    const knowledge = knowledgeBases.map(kb => ({ ...kb, documents: docMap.get(kb.id) ?? [] }));

    return { ...agent, versions, tools, knowledge };
  }

  static async listAgents(organizationId: string, options?: { status?: string; visibility?: string; search?: string; limit?: number; cursor?: string }) {
    const where: Record<string, unknown> = { organizationId, deletedAt: null };
    if (options?.status) where.status = options.status;
    if (options?.visibility) where.visibility = options.visibility;
    if (options?.search) where.name = { contains: options.search, mode: "insensitive" };

    const limit = Math.min(options?.limit ?? 20, 100);
    const agents = await prisma.aiAgents.findMany({
      where,
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { updatedAt: "desc" },
    });

    const hasMore = agents.length > limit;
    const data = hasMore ? agents.slice(0, limit) : agents;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  static async createAgent(data: {
    organizationId: string;
    userId: string;
    name: string;
    description?: string;
    systemPrompt?: string;
    model?: string;
    provider?: string;
  }) {
    return prisma.aiAgents.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        model: data.model ?? "gpt-4",
        provider: data.provider ?? "openai",
        status: "DRAFT" as any,
      },
    });
  }

  static async updateAgent(agentId: string, organizationId: string, data: Record<string, unknown>) {
    return prisma.aiAgents.updateMany({
      where: { id: agentId, organizationId },
      data,
    });
  }

  static async deleteAgent(agentId: string, organizationId: string) {
    return prisma.aiAgents.updateMany({
      where: { id: agentId, organizationId },
      data: { deletedAt: new Date() },
    });
  }
}
