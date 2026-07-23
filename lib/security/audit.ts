import { prisma } from "@/lib/prisma";

export interface AuditEntry {
  organizationId?: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
  ipAddress?: string;
  country?: string;
  userAgent?: string;
}

export class AuditManager {
  static async record(entry: AuditEntry): Promise<void> {
    await prisma.securityAuditLogs.create({
      data: {
        organizationId: entry.organizationId,
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: entry.oldValue ? JSON.parse(JSON.stringify(entry.oldValue)) : null,
        newValue: entry.newValue ? JSON.parse(JSON.stringify(entry.newValue)) : null,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : null,
        ipAddress: entry.ipAddress,
        country: entry.country,
        userAgent: entry.userAgent,
      },
    });
  }

  static async getByOrg(orgId: string, options: { limit?: number; offset?: number; action?: string; entityType?: string } = {}): Promise<any[]> {
    const where: any = { organizationId: orgId };
    if (options.action) where.action = options.action;
    if (options.entityType) where.entityType = options.entityType;

    return prisma.securityAuditLogs.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
    });
  }

  static async getByUser(userId: string, limit = 50): Promise<any[]> {
    return prisma.securityAuditLogs.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async getByEntity(entityType: string, entityId: string): Promise<any[]> {
    return prisma.securityAuditLogs.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  static async getRecent(limit = 20): Promise<any[]> {
    return prisma.securityAuditLogs.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async getActionCount(orgId: string, action: string, since: Date): Promise<number> {
    return prisma.securityAuditLogs.count({
      where: { organizationId: orgId, action, createdAt: { gte: since } },
    });
  }

  static async cleanupOld(olderThan: Date): Promise<number> {
    const result = await prisma.securityAuditLogs.deleteMany({ where: { createdAt: { lt: olderThan } } });
    return result.count;
  }
}
