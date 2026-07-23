import { prisma } from "../prisma";
import { redis } from "@/lib/redis";

export type FlagScope = "GLOBAL" | "PLAN" | "USER" | "ORGANIZATION";

export interface FlagDefinition {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  scope: FlagScope;
  scopeId?: string;
  percentage?: number;
  metadata?: Record<string, unknown>;
}

const FLAGS_CACHE_PREFIX = "feature_flags:";
const FLAGS_CACHE_TTL = 60;

export class FeatureFlags {
  static async isEnabled(
    key: string,
    context?: { userId?: string; plan?: string; orgId?: string },
  ): Promise<boolean> {
    const cacheKey = `${FLAGS_CACHE_PREFIX}${key}`;
    const cached = context?.userId
      ? `${cacheKey}:user:${context.userId}`
      : cacheKey;

    const cachedResult = await redis.get(cached);
    if (cachedResult !== null) {
      return cachedResult === true;
    }

    const flag = await prisma.featureFlags.findUnique({ where: { key } });
    if (!flag) return false;

    if (!flag.enabled) return false;

    if (flag.scope === "GLOBAL") {
      await redis.set(cached, true, { ex: FLAGS_CACHE_TTL });
      return true;
    }

    if (flag.scope === "PLAN" && context?.plan) {
      const isPlanMatch = flag.scopeId === context.plan;
      if (!isPlanMatch) return false;
    }

    if (flag.scope === "USER" && context?.userId) {
      if (flag.scopeId && flag.scopeId !== context.userId) return false;
    }

    if (flag.scope === "ORGANIZATION" && context?.orgId) {
      if (flag.scopeId && flag.scopeId !== context.orgId) return false;
    }

    if (flag.percentage !== null && flag.percentage !== undefined && flag.percentage < 100 && context?.userId) {
      const userHash = this.hashUserId(context.userId);
      if (userHash > (flag.percentage ?? 100)) return false;
    }

    await redis.set(cached, true, { ex: FLAGS_CACHE_TTL });
    return true;
  }

  static async getFlag(key: string): Promise<FlagDefinition | null> {
    const flag = await prisma.featureFlags.findUnique({ where: { key } });
    if (!flag) return null;
    return {
      key: flag.key,
      name: flag.name,
      description: flag.description ?? undefined,
      enabled: flag.enabled,
      scope: flag.scope as FlagScope,
      scopeId: flag.scopeId ?? undefined,
      percentage: flag.percentage ?? undefined,
      metadata: flag.metadata as Record<string, unknown> | undefined,
    };
  }

  static async getAllFlags(): Promise<FlagDefinition[]> {
    const flags = await prisma.featureFlags.findMany({
      orderBy: { createdAt: "desc" },
    });
    return flags.map((f) => ({
      key: f.key,
      name: f.name,
      description: f.description ?? undefined,
      enabled: f.enabled,
      scope: f.scope as FlagScope,
      scopeId: f.scopeId ?? undefined,
      percentage: f.percentage ?? undefined,
      metadata: f.metadata as Record<string, unknown> | undefined,
    }));
  }

  static async setFlag(key: string, data: Omit<FlagDefinition, "key">): Promise<void> {
    const cacheKey = `${FLAGS_CACHE_PREFIX}${key}`;
    const payload = { ...data, key, metadata: data.metadata as any };
    await prisma.featureFlags.upsert({
      where: { key },
      create: payload,
      update: payload,
    });
    await redis.del(`${cacheKey}:*`);
  }

  static async enableFlag(key: string): Promise<void> {
    await prisma.featureFlags.update({
      where: { key },
      data: { enabled: true },
    });
    await this.clearCache(key);
  }

  static async disableFlag(key: string): Promise<void> {
    await prisma.featureFlags.update({
      where: { key },
      data: { enabled: false },
    });
    await this.clearCache(key);
  }

  static async deleteFlag(key: string): Promise<void> {
    await prisma.featureFlags.delete({ where: { key } });
    await this.clearCache(key);
  }

  private static async clearCache(key: string): Promise<void> {
    const pattern = `${FLAGS_CACHE_PREFIX}${key}:*`;
    let cursor = "0";
    do {
      const scanResult = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = scanResult[0] as string;
      if (scanResult[1].length > 0) {
        await redis.del(...scanResult[1]);
      }
    } while (cursor !== "0");
  }

  private static hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash % 100);
  }
}
