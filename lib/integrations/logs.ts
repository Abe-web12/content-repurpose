import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type LogLevel = "debug" | "info" | "warn" | "error";

interface GetLogsOptions {
  limit?: number;
  offset?: number;
  level?: LogLevel;
  startDate?: Date;
  endDate?: Date;
  source?: string;
}

interface ErrorSummary {
  debug: number;
  info: number;
  warn: number;
  error: number;
  total: number;
}

export class IntegrationLogger {
  static async log(
    installedId: string,
    organizationId: string,
    level: LogLevel,
    message: string,
    details?: Record<string, unknown>,
    source?: string
  ) {
    const log = await prisma.integrationLogs.create({
      data: {
        installedId,
        organizationId,
        level,
        message,
        details: (details ?? Prisma.JsonNull) as any,
        source: source ?? "system",
      },
    });

    return log;
  }

  static async getLogs(installedId: string, options?: GetLogsOptions) {
    const where: Prisma.IntegrationLogsWhereInput = { installedId };

    if (options?.level) {
      where.level = options.level;
    }
    if (options?.source) {
      where.source = options.source;
    }
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.integrationLogs.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.integrationLogs.count({ where }),
    ]);

    return { logs, total, limit: options?.limit ?? 50, offset: options?.offset ?? 0 };
  }

  static async getOrgLogs(organizationId: string, options?: GetLogsOptions) {
    const where: Prisma.IntegrationLogsWhereInput = { organizationId };

    if (options?.level) {
      where.level = options.level;
    }
    if (options?.source) {
      where.source = options.source;
    }
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.integrationLogs.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.integrationLogs.count({ where }),
    ]);

    return { logs, total, limit: options?.limit ?? 50, offset: options?.offset ?? 0 };
  }

  static async clearLogs(installedId: string, before?: Date): Promise<number> {
    const where: Prisma.IntegrationLogsWhereInput = { installedId };

    if (before) {
      where.createdAt = { lt: before };
    }

    const result = await prisma.integrationLogs.deleteMany({ where });
    return result.count;
  }

  static async getErrorSummary(installedId: string): Promise<ErrorSummary> {
    const [debug, info, warn, error, total] = await Promise.all([
      prisma.integrationLogs.count({ where: { installedId, level: "debug" } }),
      prisma.integrationLogs.count({ where: { installedId, level: "info" } }),
      prisma.integrationLogs.count({ where: { installedId, level: "warn" } }),
      prisma.integrationLogs.count({ where: { installedId, level: "error" } }),
      prisma.integrationLogs.count({ where: { installedId } }),
    ]);

    return { debug, info, warn, error, total };
  }
}