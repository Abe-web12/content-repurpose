import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

interface TierConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_TIERS: Record<string, TierConfig> = {
  free: { windowMs: 60 * 1000, maxRequests: 30 },
  starter: { windowMs: 60 * 1000, maxRequests: 60 },
  pro: { windowMs: 60 * 1000, maxRequests: 300 },
  enterprise: { windowMs: 60 * 1000, maxRequests: 1000 },
};

const ENDPOINT_TIERS: Record<string, TierConfig> = {
  "/api/v1/generations": { windowMs: 60 * 1000, maxRequests: 60 },
  "/api/v1/templates": { windowMs: 60 * 1000, maxRequests: 120 },
  "/api/v1/billing": { windowMs: 60 * 1000, maxRequests: 60 },
  "/api/v1/credits": { windowMs: 60 * 1000, maxRequests: 60 },
  "/api/v1/webhooks": { windowMs: 60 * 1000, maxRequests: 30 },
  "/api/v1/analytics": { windowMs: 60 * 1000, maxRequests: 30 },
};

export class V1RateLimiter {
  static async check(
    identifier: string,
    options: {
      windowMs?: number;
      maxRequests?: number;
      orgPlan?: string;
      apiKeyId?: string;
      path?: string;
      orgId?: string;
    } = {}
  ): Promise<RateLimitResult> {
    const now = Date.now();

    const endpointTier = options.path ? ENDPOINT_TIERS[options.path] : undefined;
    const planTier = options.orgPlan ? DEFAULT_TIERS[options.orgPlan] : undefined;

    const windowMs = endpointTier?.windowMs || planTier?.windowMs || options.windowMs || 60000;
    const maxRequests = endpointTier?.maxRequests || planTier?.maxRequests || options.maxRequests || 60;

    if (options.apiKeyId && options.orgId) {
      const key = await prisma.apiKeys.findUnique({ where: { id: options.apiKeyId } });
      if (key) {
        if (key.dailyQuota && key.dailyUsed >= key.dailyQuota) {
          return { allowed: false, remaining: 0, resetAt: now + 86400000, retryAfter: 86400000 };
        }
        if (key.monthlyQuota && key.monthlyUsed >= key.monthlyQuota) {
          const monthEnd = new Date();
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0);
          monthEnd.setHours(23, 59, 59, 999);
          return {
            allowed: false,
            remaining: 0,
            resetAt: monthEnd.getTime(),
            retryAfter: monthEnd.getTime() - now,
          };
        }
      }
    }

    const windowKey = Math.floor(now / windowMs) * windowMs;
    const key = `v1_rate:${identifier}:${windowKey}`;

    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      const allowed = count <= maxRequests;
      const remaining = Math.max(0, maxRequests - count);
      const resetAt = windowKey + windowMs;
      const retryAfter = allowed ? 0 : resetAt - now;

      return { allowed, remaining, resetAt, retryAfter };
    } catch {
      return { allowed: true, remaining: maxRequests, resetAt: now + windowMs, retryAfter: 0 };
    }
  }

  static async incrementQuota(apiKeyId: string) {
    try {
      await prisma.apiKeys.update({
        where: { id: apiKeyId },
        data: {
          dailyUsed: { increment: 1 },
          monthlyUsed: { increment: 1 },
        },
      });
    } catch {}
  }

  static async resetDailyQuotas() {
    await prisma.apiKeys.updateMany({ data: { dailyUsed: 0 } });
  }

  static planFromTier(tier: string): string {
    if (tier.includes("enterprise")) return "enterprise";
    if (tier.includes("pro")) return "pro";
    if (tier.includes("starter") || tier.includes("basic")) return "starter";
    return "free";
  }
}
