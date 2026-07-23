import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";

interface PromptCreateInput {
  organizationId: string;
  userId: string;
  name: string;
  promptText: string;
  metadata?: Record<string, unknown>;
}

interface PromptVersionCreateInput {
  promptId: string;
  promptText: string;
  changeLog?: string;
  createdBy: string;
}

interface PromptMemoryInput {
  organizationId: string;
  userId: string;
  sessionId?: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  tokenCount?: number;
  ttlHours?: number;
}

interface MemoryContext {
  entries: Array<{
    role: string;
    content: string;
    createdAt: Date;
  }>;
  totalTokens: number;
}

export class AiPromptManager {
  static async createPrompt(input: PromptCreateInput) {
    const existing = await prisma.aiPrompts.findFirst({
      where: {
        organizationId: input.organizationId,
        name: input.name,
        isActive: true,
      },
    });

    if (existing) {
      const newVersion = existing.version + 1;

      const prompt = await prisma.aiPrompts.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          name: input.name,
          promptText: input.promptText,
          version: newVersion,
          parentId: existing.id,
          metadata: (input.metadata ?? {}) as any,
        },
      });

      await prisma.aiPromptVersions.create({
        data: {
          promptId: existing.id,
          version: newVersion,
          promptText: input.promptText,
          changeLog: `Version ${newVersion}`,
          createdBy: input.userId,
        },
      });

      return prompt;
    }

    const prompt = await prisma.aiPrompts.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        name: input.name,
        promptText: input.promptText,
        version: 1,
        metadata: (input.metadata ?? {}) as any,
      },
    });

    await prisma.aiPromptVersions.create({
      data: {
        promptId: prompt.id,
        version: 1,
        promptText: input.promptText,
        changeLog: "Initial version",
        createdBy: input.userId,
      },
    });

    return prompt;
  }

  static async getPrompt(
    organizationId: string,
    name: string,
    version?: number
  ) {
    if (version) {
      return prisma.aiPrompts.findUnique({
        where: {
          organizationId_name_version: { organizationId, name, version },
        },
      });
    }

    return prisma.aiPrompts.findFirst({
      where: {
        organizationId,
        name,
        isActive: true,
      },
      orderBy: { version: "desc" },
    });
  }

  static async listPrompts(
    organizationId: string,
    options?: { search?: string; limit?: number; offset?: number }
  ) {
    const where: Record<string, unknown> = {
      organizationId,
      isActive: true,
    };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { promptText: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const [prompts, total] = await Promise.all([
      prisma.aiPrompts.findMany({
        where: where as any,
        orderBy: [{ name: "asc" }, { version: "desc" }] as any,
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
        distinct: ["name"],
      }),
      prisma.aiPrompts.groupBy({
        by: ["name"],
        where: { organizationId, isActive: true } as any,
        _count: { name: true },
      }).then((groups) => groups.length),
    ]);

    return { prompts, total };
  }

  static async getVersions(promptId: string) {
    return prisma.aiPromptVersions.findMany({
      where: { promptId },
      orderBy: { version: "desc" },
    });
  }

  static async createVersion(input: PromptVersionCreateInput) {
    const parent = await prisma.aiPrompts.findUnique({
      where: { id: input.promptId },
    });
    if (!parent) throw new AppError("Prompt not found", 404);

    const newVersion = parent.version + 1;

    const [prompt, versionRecord] = await Promise.all([
      prisma.aiPrompts.create({
        data: {
          organizationId: parent.organizationId,
          userId: parent.userId,
          name: parent.name,
          promptText: input.promptText,
          version: newVersion,
          parentId: parent.id,
          metadata: parent.metadata as any,
        },
      }),
      prisma.aiPromptVersions.create({
        data: {
          promptId: input.promptId,
          version: newVersion,
          promptText: input.promptText,
          changeLog: input.changeLog ?? `Version ${newVersion}`,
          createdBy: input.createdBy,
        },
      }),
    ]);

    return { prompt, version: versionRecord };
  }

  static async revertToVersion(promptId: string, version: number): Promise<unknown> {
    const targetVersion = await prisma.aiPromptVersions.findUnique({
      where: { promptId_version: { promptId, version } },
    });
    if (!targetVersion) throw new AppError("Version not found", 404);

    const parent = await prisma.aiPrompts.findUnique({
      where: { id: promptId },
    });
    if (!parent) throw new AppError("Prompt not found", 404);

    const newVersion = parent.version + 1;

    return this.createVersion({
      promptId,
      promptText: targetVersion.promptText,
      changeLog: `Reverted to version ${version}`,
      createdBy: "system",
    });
  }

  static async deletePrompt(promptId: string): Promise<void> {
    await prisma.aiPrompts.update({
      where: { id: promptId },
      data: { isActive: false },
    });
  }

  static async addMemory(input: PromptMemoryInput): Promise<unknown> {
    const expiresAt = input.ttlHours
      ? new Date(Date.now() + input.ttlHours * 3600 * 1000)
      : null;

    return prisma.aiMemoryEntries.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        metadata: (input.metadata ?? {}) as any,
        tokenCount: input.tokenCount,
        expiresAt,
      },
    });
  }

  static async getMemoryContext(
    organizationId: string,
    userId: string,
    options?: {
      sessionId?: string;
      limit?: number;
      maxTokens?: number;
      since?: Date;
    }
  ): Promise<MemoryContext> {
    const where: Record<string, unknown> = {
      organizationId,
      userId,
    };

    if (options?.sessionId) {
      where.sessionId = options.sessionId;
    }

    if (options?.since) {
      where.createdAt = { gte: options.since };
    }

    where.expiresAt = {
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    const entries = await prisma.aiMemoryEntries.findMany({
      where: where as any,
      orderBy: { createdAt: "asc" },
      take: options?.limit ?? 50,
    });

    const totalTokens = entries.reduce(
      (sum, e) => sum + (e.tokenCount ?? 0),
      0
    );

    if (options?.maxTokens && totalTokens > options.maxTokens) {
      let tokenCount = 0;
      const trimmed: typeof entries = [];
      for (const entry of entries.toReversed()) {
        tokenCount += entry.tokenCount ?? 0;
        trimmed.unshift(entry);
        if (tokenCount >= options.maxTokens) break;
      }
      return {
        entries: trimmed.map((e) => ({
          role: e.role,
          content: e.content,
          createdAt: e.createdAt,
        })),
        totalTokens: tokenCount,
      };
    }

    return {
      entries: entries.map((e) => ({
        role: e.role,
        content: e.content,
        createdAt: e.createdAt,
      })),
      totalTokens,
    };
  }

  static async clearMemory(
    organizationId: string,
    userId: string,
    sessionId?: string
  ): Promise<number> {
    const where: Record<string, unknown> = {
      organizationId,
      userId,
    };

    if (sessionId) {
      where.sessionId = sessionId;
    }

    const result = await prisma.aiMemoryEntries.deleteMany({
      where: where as any,
    });

    return result.count;
  }

  static async getMemoryStats(
    organizationId: string,
    userId: string
  ): Promise<{
    totalEntries: number;
    totalTokens: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    sessionsCount: number;
  }> {
    const [aggregation, sessionsCount] = await Promise.all([
      prisma.aiMemoryEntries.aggregate({
        where: { organizationId, userId } as any,
        _count: { id: true },
        _sum: { tokenCount: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      prisma.aiMemoryEntries.groupBy({
        by: ["sessionId"],
        where: {
          organizationId,
          userId,
          sessionId: { not: null },
        } as any,
        _count: { sessionId: true },
      }).then((groups) => groups.length),
    ]);

    return {
      totalEntries: aggregation._count.id,
      totalTokens: aggregation._sum.tokenCount ?? 0,
      oldestEntry: aggregation._min.createdAt,
      newestEntry: aggregation._max.createdAt,
      sessionsCount,
    };
  }

  static async migrateOldMemory(
    organizationId: string,
    retentionDays: number = 90
  ): Promise<number> {
    const cutoff = new Date(
      Date.now() - retentionDays * 24 * 3600 * 1000
    );

    const result = await prisma.aiMemoryEntries.updateMany({
      where: {
        organizationId,
        createdAt: { lt: cutoff },
        expiresAt: null,
      } as any,
      data: { expiresAt: cutoff },
    });

    return result.count;
  }
}
