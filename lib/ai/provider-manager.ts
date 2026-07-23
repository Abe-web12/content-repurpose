import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { redis } from "@/lib/redis";

const CACHE_TTL = 300;

export class AIManager {
  static async getProviders(options?: { isEnabled?: boolean; type?: string }) {
    const where: Prisma.AiProvidersWhereInput = {};
    if (options?.isEnabled !== undefined) where.isEnabled = options.isEnabled;
    if (options?.type) where.type = options.type as any;

    return prisma.aiProviders.findMany({
      where,
      orderBy: { priority: "asc" },
    });
  }

  static async getProvider(id: string) {
    const provider = await prisma.aiProviders.findUnique({ where: { id } });
    if (!provider) throw new Error(`Provider ${id} not found`);
    return provider;
  }

  static async getProviderByName(name: string) {
    return prisma.aiProviders.findUnique({ where: { name } });
  }

  static async upsertProvider(data: {
    name: string;
    displayName: string;
    type: string;
    baseUrl?: string;
    apiKey?: string;
    defaultModel: string;
    models: string[];
    capabilities: string[];
    priority?: number;
    isEnabled?: boolean;
    config?: Record<string, unknown>;
  }) {
    return prisma.aiProviders.upsert({
      where: { name: data.name },
      create: {
        name: data.name,
        displayName: data.displayName,
        type: data.type as any,
        baseUrl: data.baseUrl,
        apiKey: data.apiKey,
        defaultModel: data.defaultModel,
        models: data.models,
        capabilities: data.capabilities as any[],
        priority: data.priority ?? 999,
        isEnabled: data.isEnabled ?? true,
        config: data.config as any,
      },
      update: {
        displayName: data.displayName,
        type: data.type as any,
        baseUrl: data.baseUrl,
        apiKey: data.apiKey,
        defaultModel: data.defaultModel,
        models: data.models,
        capabilities: data.capabilities as any[],
        priority: data.priority,
        isEnabled: data.isEnabled,
        config: data.config as any,
      },
    });
  }

  static async getModels(providerId?: string) {
    const where: Prisma.AiModelsWhereInput = { isEnabled: true };
    if (providerId) where.providerId = providerId;

    return prisma.aiModels.findMany({ where, orderBy: { name: "asc" } });
  }

  static async getModelCost(providerId: string, model: string) {
    return prisma.aiProviderCosts.findFirst({
      where: {
        providerId,
        model,
        effectiveTo: null,
      },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  static async recordRequest(data: {
    organizationId: string;
    userId: string;
    providerId: string;
    model: string;
    type: string;
    promptTokens: number;
    completionTokens: number;
    cachedTokens?: number;
    estimatedCost: number;
    latency: number;
    status: string;
    error?: string;
  }) {
    return prisma.aiRequests.create({ data: data as any });
  }

  static async getUsage(options: {
    organizationId?: string;
    providerId?: string;
    userId?: string;
    startDate: Date;
    endDate: Date;
  }) {
    const where: Prisma.AiUsageWhereInput = {
      date: { gte: options.startDate, lte: options.endDate },
    };
    if (options.organizationId) where.organizationId = options.organizationId;
    if (options.providerId) where.providerId = options.providerId;
    if (options.userId) where.userId = options.userId;

    return prisma.aiUsage.findMany({ where, orderBy: { date: "desc" } });
  }

  static async upsertModel(data: {
    name: string;
    displayName: string;
    providerId: string;
    capabilities?: string[];
    costPerInput?: number;
    costPerOutput?: number;
    costPerCached?: number;
    contextWindow?: number;
    maxTokens?: number;
    isEnabled?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.aiModels.upsert({
      where: { providerId_name: { providerId: data.providerId, name: data.name } },
      create: {
        name: data.name,
        displayName: data.displayName,
        providerId: data.providerId,
        capabilities: data.capabilities as any || [],
        costPerInput: data.costPerInput ?? 0,
        costPerOutput: data.costPerOutput ?? 0,
        costPerCached: data.costPerCached ?? 0,
        contextWindow: data.contextWindow ?? 4096,
        maxTokens: data.maxTokens ?? 4096,
        isEnabled: data.isEnabled ?? true,
        metadata: data.metadata as any,
      },
      update: {
        displayName: data.displayName,
        capabilities: data.capabilities as any,
        costPerInput: data.costPerInput,
        costPerOutput: data.costPerOutput,
        costPerCached: data.costPerCached,
        contextWindow: data.contextWindow,
        maxTokens: data.maxTokens,
        isEnabled: data.isEnabled,
        metadata: data.metadata as any,
      },
    });
  }

  static async trackEvent(providerId: string, eventType: string, message: string, metadata?: Record<string, unknown>) {
    return prisma.aiProviderEvents.create({ data: { providerId, eventType, message, metadata: metadata as any } });
  }
}

export const providerCacheKey = (key: string) => `ai:provider:${key}`;
