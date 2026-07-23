import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { randomBytes } from "crypto";

export class SessionManager {
  static async create(userId: string, data: { ipAddress?: string; userAgent?: string; browser?: string; os?: string; device?: string; country?: string; city?: string }): Promise<{ id: string; token: string }> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 3600000);

    const session = await prisma.userSessions.create({
      data: { userId, token, ...data, expiresAt },
    });

    return { id: session.id, token };
  }

  static async getActive(userId: string): Promise<any[]> {
    return prisma.userSessions.findMany({
      where: { userId, isBlocked: false, expiresAt: { gte: new Date() } },
      orderBy: { lastActivityAt: "desc" },
    });
  }

  static async getById(sessionId: string, userId: string): Promise<any> {
    return prisma.userSessions.findFirst({ where: { id: sessionId, userId } });
  }

  static async touch(sessionId: string): Promise<void> {
    await prisma.userSessions.update({ where: { id: sessionId }, data: { lastActivityAt: new Date() } });
  }

  static async logout(sessionId: string): Promise<void> {
    await prisma.userSessions.update({ where: { id: sessionId }, data: { expiresAt: new Date() } });
  }

  static async logoutAll(userId: string, excludeSessionId?: string): Promise<void> {
    const where: any = { userId, expiresAt: { gte: new Date() } };
    if (excludeSessionId) where.id = { not: excludeSessionId };

    await prisma.userSessions.updateMany({
      where,
      data: { expiresAt: new Date() },
    });
  }

  static async trustDevice(sessionId: string): Promise<void> {
    await prisma.userSessions.update({ where: { id: sessionId }, data: { isTrusted: true } });
  }

  static async blockDevice(sessionId: string): Promise<void> {
    await prisma.userSessions.update({ where: { id: sessionId }, data: { isBlocked: true } });
  }

  static async getDeviceStats(userId: string): Promise<{ total: number; active: number; blocked: number; trusted: number }> {
    const sessions = await prisma.userSessions.findMany({ where: { userId } });
    return {
      total: sessions.length,
      active: sessions.filter((s) => s.expiresAt >= new Date() && !s.isBlocked).length,
      blocked: sessions.filter((s) => s.isBlocked).length,
      trusted: sessions.filter((s) => s.isTrusted).length,
    };
  }

  static async cleanupExpired(): Promise<number> {
    const result = await prisma.userSessions.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return result.count;
  }
}
