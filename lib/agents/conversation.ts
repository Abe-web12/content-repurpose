import { prisma } from "@/lib/prisma";

export class AgentConversation {
  static async createConversation(agentId: string, runId: string | null, context: { organizationId: string; userId: string }) {
    return prisma.aiAgentConversations.create({
      data: {
        agentId,
        runId,
        organizationId: context.organizationId,
        userId: context.userId,
        title: `Conversation ${new Date().toISOString()}`,
      },
    });
  }

  static async getConversation(conversationId: string) {
    return prisma.aiAgentConversations.findUnique({
      where: { id: conversationId },
    });
  }

  static async addMessage(conversationId: string, role: string, content: string, metadata?: Record<string, unknown>) {
    return prisma.aiAgentMessages.create({
      data: {
        conversationId,
        role: role as any,
        content,
        tokens: content.length,
        metadata: (metadata ?? {}) as any,
      },
    });
  }

  static async getHistory(conversationId: string, limit = 100) {
    return prisma.aiAgentMessages.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  static async getConversations(agentId: string, options?: { limit?: number; cursor?: string }) {
    const limit = Math.min(options?.limit ?? 20, 100);
    const conversations = await prisma.aiAgentConversations.findMany({
      where: { agentId },
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { updatedAt: "desc" },
    });

    const hasMore = conversations.length > limit;
    const data = hasMore ? conversations.slice(0, limit) : conversations;
    return { data, nextCursor: hasMore ? data[data.length - 1].id : null, hasMore };
  }

  static async deleteConversation(conversationId: string) {
    await prisma.aiAgentMessages.deleteMany({ where: { conversationId } });
    return prisma.aiAgentConversations.delete({ where: { id: conversationId } });
  }
}
