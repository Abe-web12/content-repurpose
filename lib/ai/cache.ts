import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { createHash } from "crypto";

const CACHE_TTL = 1800;
const REDIS_CACHE_PREFIX = "ai:cache:";

interface CacheKeyInput {
  prompt: string;
  voice?: string | null;
  brand?: string | null;
  platform: string;
  tone: string;
}

export function buildCacheHash(input: CacheKeyInput): string {
  const hash = createHash("sha256");
  hash.update(input.prompt);
  if (input.voice) hash.update(`:v:${input.voice}`);
  if (input.brand) hash.update(`:b:${input.brand}`);
  hash.update(`:p:${input.platform}`);
  hash.update(`:t:${input.tone}`);
  return hash.digest("hex");
}

function buildVoiceHash(voice?: string | null): string | null {
  if (!voice) return null;
  return createHash("sha256").update(voice).digest("hex").slice(0, 16);
}

function buildBrandHash(brand?: string | null): string | null {
  if (!brand) return null;
  return createHash("sha256").update(brand).digest("hex").slice(0, 16);
}

export class AiCache {
  static async get(input: CacheKeyInput): Promise<string | null> {
    const promptHash = buildCacheHash(input);
    const voiceHash = buildVoiceHash(input.voice);
    const brandHash = buildBrandHash(input.brand);

    const redisKey = `${REDIS_CACHE_PREFIX}${promptHash}`;
    const cached = await redis.get<string>(redisKey);
    if (cached) return cached;

    const db = await prisma.aiCache.findFirst({
      where: {
        promptHash,
        platform: input.platform,
        tone: input.tone,
        voiceHash: voiceHash ?? "",
        brandHash: brandHash ?? "",
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (db) {
      await redis.set(redisKey, db.output, { ex: CACHE_TTL });
      return db.output;
    }

    return null;
  }

  static async set(
    input: CacheKeyInput,
    output: string,
    meta?: { model?: string; tokensUsed?: number },
  ): Promise<void> {
    const promptHash = buildCacheHash(input);
    const voiceHash = buildVoiceHash(input.voice);
    const brandHash = buildBrandHash(input.brand);
    const expiresAt = new Date(Date.now() + CACHE_TTL * 1000);

    const redisKey = `${REDIS_CACHE_PREFIX}${promptHash}`;
    await redis.set(redisKey, output, { ex: CACHE_TTL });

    await prisma.aiCache.upsert({
      where: {
        promptHash_platform_tone_voiceHash_brandHash: {
          promptHash,
          platform: input.platform,
          tone: input.tone,
          voiceHash: voiceHash ?? "",
          brandHash: brandHash ?? "",
        },
      },
      update: {
        output,
        model: meta?.model ?? "",
        tokensUsed: meta?.tokensUsed ?? 0,
        expiresAt,
      },
      create: {
        promptHash,
        voiceHash: voiceHash ?? "",
        brandHash: brandHash ?? "",
        platform: input.platform,
        tone: input.tone,
        output,
        model: meta?.model ?? "",
        tokensUsed: meta?.tokensUsed ?? 0,
        expiresAt,
      },
    });
  }

  static async invalidate(platform?: string, tone?: string): Promise<void> {
    const where: Record<string, unknown> = {};
    if (platform) where.platform = platform;
    if (tone) where.tone = tone;

    await prisma.aiCache.deleteMany({ where: where as any });

    const keys = await redis.keys(`${REDIS_CACHE_PREFIX}*`);
    if (keys.length > 0) await redis.del(...keys);
  }

  static async clear(): Promise<void> {
    await prisma.aiCache.deleteMany();
    const keys = await redis.keys(`${REDIS_CACHE_PREFIX}*`);
    if (keys.length > 0) await redis.del(...keys);
  }

  static async getStats(): Promise<{
    totalEntries: number;
    activeEntries: number;
  }> {
    const [totalEntries, activeEntries] = await Promise.all([
      prisma.aiCache.count(),
      prisma.aiCache.count({ where: { expiresAt: { gte: new Date() } } }),
    ]);
    return { totalEntries, activeEntries };
  }

  static async cleanupExpired(): Promise<number> {
    const result = await prisma.aiCache.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
