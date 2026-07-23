import { redis } from "@/lib/redis";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 10,
};

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;

  try {
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;
    const windowKey = `${key}:${windowStart}`;

    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
    }

    const resetAt = windowStart + config.windowMs;

    return {
      success: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetAt,
    };
  } catch (err) {
    console.error("[RateLimit] Redis error — rate limiting disabled:", err);
    return { success: true, remaining: config.maxRequests, resetAt: now + config.windowMs };
  }
}

export function rateLimitByIp(
  ip: string,
  config?: RateLimitConfig
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  return rateLimit(`ip:${ip}`, config);
}

export function rateLimitByUser(
  userId: string,
  config?: RateLimitConfig
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  return rateLimit(`user:${userId}`, config);
}
