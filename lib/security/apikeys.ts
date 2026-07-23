import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { randomBytes, createHash } from "crypto";

const KEY_PREFIX_LENGTH = 8;

export class ApiKeyManager {
  static async create(orgId: string, userId: string, data: { name: string; permissions?: string[]; scopes?: string[]; allowedIps?: string[]; expiresAt?: Date; environment?: string; dailyQuota?: number; monthlyQuota?: number }): Promise<{ id: string; key: string; prefix: string }> {
    const rawKey = `rpai_${randomBytes(24).toString("hex")}`;
    const prefix = rawKey.substring(0, KEY_PREFIX_LENGTH);
    const hash = createHash("sha256").update(rawKey).digest("hex");

    const key = await prisma.apiKeys.create({
      data: {
        organizationId: orgId,
        userId,
        name: data.name,
        keyPrefix: prefix,
        keyHash: hash,
        permissions: data.permissions || [],
        scopes: data.scopes || [],
        allowedIps: data.allowedIps || [],
        expiresAt: data.expiresAt,
        environment: data.environment || "live",
        dailyQuota: data.dailyQuota,
        monthlyQuota: data.monthlyQuota,
      },
    });

    return { id: key.id, key: rawKey, prefix };
  }

  static async validate(key: string): Promise<{ valid: boolean; apiKey?: any }> {
    const hash = createHash("sha256").update(key).digest("hex");
    const apiKey = await prisma.apiKeys.findFirst({
      where: { keyHash: hash, isActive: true },
    });

    if (!apiKey) return { valid: false };
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return { valid: false };

    await prisma.apiKeys.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
    return { valid: true, apiKey };
  }

  static async list(orgId: string): Promise<any[]> {
    return prisma.apiKeys.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, keyPrefix: true, permissions: true, scopes: true, lastUsedAt: true, expiresAt: true, isActive: true, createdAt: true },
    });
  }

  static async revoke(keyId: string): Promise<void> {
    await prisma.apiKeys.update({ where: { id: keyId }, data: { isActive: false } });
  }

  static async rotate(keyId: string): Promise<{ key: string; prefix: string }> {
    const existing = await prisma.apiKeys.findUnique({ where: { id: keyId } });
    if (!existing) throw new AppError("API key not found", 404);

    const rawKey = `rpai_${randomBytes(24).toString("hex")}`;
    const prefix = rawKey.substring(0, KEY_PREFIX_LENGTH);
    const hash = createHash("sha256").update(rawKey).digest("hex");

    await prisma.apiKeys.update({
      where: { id: keyId },
      data: { keyPrefix: prefix, keyHash: hash, lastUsedAt: null },
    });

    return { key: rawKey, prefix };
  }

  static async update(keyId: string, data: { name?: string; permissions?: string[]; scopes?: string[]; allowedIps?: string[]; expiresAt?: Date | null; environment?: string; dailyQuota?: number | null; monthlyQuota?: number | null }): Promise<void> {
    await prisma.apiKeys.update({ where: { id: keyId }, data });
  }

  static async listExtended(orgId: string): Promise<any[]> {
    return prisma.apiKeys.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, keyPrefix: true, permissions: true, scopes: true,
        lastUsedAt: true, expiresAt: true, isActive: true, createdAt: true, updatedAt: true,
        environment: true, dailyQuota: true, monthlyQuota: true, dailyUsed: true, monthlyUsed: true,
      },
    });
  }
}
