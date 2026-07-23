import { prisma } from "../prisma";

export type AuditEventType =
  | "AUTH_LOGIN" | "AUTH_LOGOUT" | "AUTH_FAILED"
  | "BILLING_CHANGED" | "BILLING_CANCELLED"
  | "GENERATION_CREATED"
  | "PUBLISHING_SCHEDULED" | "PUBLISHING_PUBLISHED"
  | "TEMPLATE_CREATED" | "TEMPLATE_UPDATED" | "TEMPLATE_DELETED"
  | "BRANDKIT_CREATED" | "BRANDKIT_UPDATED"
  | "ADMIN_ACTION"
  | "OAUTH_CONNECTED" | "OAUTH_DISCONNECTED"
  | "WEBHOOK_SENT" | "WEBHOOK_RECEIVED"
  | "WORKFLOW_RUN" | "WORKFLOW_CREATED" | "WORKFLOW_PUBLISHED"
  | "EXPORT_DOWNLOADED"
  | "SETTINGS_CHANGED";

export interface AuditEntry {
  event: AuditEventType;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  static async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLogs.create({
        data: {
          event: entry.event,
          userId: entry.userId ?? null,
          email: entry.email ?? null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          action: entry.action,
          metadata: (entry.metadata ?? undefined) as any,
        },
      });
    } catch (error) {
      console.error(`Audit log failed for event ${entry.event}:`, error);
    }
  }

  static async query(options: {
    userId?: string;
    event?: AuditEventType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    entries: Array<{
      id: string;
      event: string;
      userId: string | null;
      email: string | null;
      ip: string | null;
      userAgent: string | null;
      action: string;
      metadata: unknown;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const where: Record<string, unknown> = {};
    if (options.userId) where.userId = options.userId;
    if (options.event) where.event = options.event;
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) (where.createdAt as Record<string, Date>).gte = options.startDate;
      if (options.endDate) (where.createdAt as Record<string, Date>).lte = options.endDate;
    }

    const [entries, total] = await Promise.all([
      prisma.auditLogs.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options.limit ?? 50,
        skip: options.offset ?? 0,
      }),
      prisma.auditLogs.count({ where }),
    ]);

    return {
      entries: entries.map((e) => ({
        ...e,
        metadata: e.metadata as unknown,
      })),
      total,
    };
  }

  static async logAuth(userId: string, email: string, event: "AUTH_LOGIN" | "AUTH_LOGOUT" | "AUTH_FAILED", ip?: string, userAgent?: string): Promise<void> {
    await this.log({
      event,
      userId,
      email,
      ip,
      userAgent,
      action: event === "AUTH_LOGIN" ? "User logged in"
        : event === "AUTH_LOGOUT" ? "User logged out"
        : "Authentication failed",
      metadata: { timestamp: new Date().toISOString() },
    });
  }

  static async logGeneration(userId: string, generationId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      event: "GENERATION_CREATED",
      userId,
      action: "Content generation created",
      metadata: { generationId, ...metadata },
    });
  }

  static async logPublishing(userId: string, platform: string, status: "scheduled" | "published", metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      event: status === "published" ? "PUBLISHING_PUBLISHED" : "PUBLISHING_SCHEDULED",
      userId,
      action: `Content ${status} to ${platform}`,
      metadata: { platform, ...metadata },
    });
  }

  static async logAdmin(userId: string, action: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      event: "ADMIN_ACTION",
      userId,
      action,
      metadata,
    });
  }

  static async logExport(userId: string, exportType: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      event: "EXPORT_DOWNLOADED",
      userId,
      action: `Exported ${exportType}`,
      metadata: { exportType, ...metadata },
    });
  }
}
