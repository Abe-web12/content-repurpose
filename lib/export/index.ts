import { prisma } from "../prisma";
import { AuditService } from "../audit";

export type ExportFormat = "csv" | "json" | "xlsx";
export type ExportEntity = "generations" | "scheduled_posts" | "workflow_runs" | "analytics" | "audit_logs";

export interface ExportOptions {
  format: ExportFormat;
  entity: ExportEntity;
  userId?: string;
  startDate?: string;
  endDate?: string;
  filters?: Record<string, unknown>;
}

export interface ExportResult {
  data: string;
  filename: string;
  format: ExportFormat;
  entity: ExportEntity;
  rowCount: number;
  generatedAt: string;
}

export class ExportService {
  static async export(options: ExportOptions): Promise<ExportResult> {
    const { format, entity, userId, startDate, endDate, filters } = options;

    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    let rows: Record<string, unknown>[] = [];

    switch (entity) {
      case "generations": {
        const data = await prisma.generations.findMany({
          where: {
            ...(userId ? { userId } : {}),
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 10000,
        });
        rows = data.map((g) => ({
          Id: g.id,
          UserId: g.userId,
          Model: g.modelUsed ?? "",
          Platform: g.platform ?? "",
          TokenCount: g.tokensUsed ?? 0,
          Content: (g.content ?? "").slice(0, 200),
          CreatedAt: g.createdAt.toISOString(),
        }));
        break;
      }

      case "scheduled_posts": {
        const data = await prisma.scheduledPosts.findMany({
          where: {
            ...(userId ? { userId } : {}),
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 10000,
        });
        rows = data.map((p) => ({
          Id: p.id,
          UserId: p.userId,
          Platform: p.platform,
          Content: (p.content ?? "").slice(0, 200),
          Status: p.status,
          ScheduledAt: p.scheduledAt?.toISOString() ?? "",
          PublishedAt: p.publishedAt?.toISOString() ?? "",
          CreatedAt: p.createdAt.toISOString(),
        }));
        break;
      }

      case "workflow_runs": {
        const data = await prisma.workflowRuns.findMany({
          where: {
            ...(userId ? { createdById: userId } : {}),
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 10000,
        });
        rows = data.map((r) => ({
          Id: r.id,
          UserId: r.createdById,
          WorkflowId: r.workflowId,
          Status: r.status,
          StartedAt: r.startedAt?.toISOString() ?? "",
          CompletedAt: r.completedAt?.toISOString() ?? "",
          CreatedAt: r.createdAt.toISOString(),
        }));
        break;
      }

      case "audit_logs": {
        const auditWhere: Record<string, unknown> = {
          ...(userId ? { userId } : {}),
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        };
        if (filters?.event) auditWhere.event = filters.event;
        const data = await prisma.auditLogs.findMany({
          where: auditWhere,
          orderBy: { createdAt: "desc" },
          take: 10000,
        });
        rows = data.map((a) => ({
          Id: a.id,
          Event: a.event,
          UserId: a.userId ?? "",
          Action: a.action,
          Ip: a.ip ?? "",
          CreatedAt: a.createdAt.toISOString(),
        }));
        break;
      }

      default:
        throw new Error(`Unsupported export entity: ${entity}`);
    }

    let data: string;
    let filename: string;

    switch (format) {
      case "csv":
        data = this.toCsv(rows);
        filename = `${entity}_${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      case "json":
        data = JSON.stringify(rows, null, 2);
        filename = `${entity}_${new Date().toISOString().slice(0, 10)}.json`;
        break;
      case "xlsx":
        data = this.toCsv(rows);
        filename = `${entity}_${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    if (userId) {
      await AuditService.logExport(userId, entity, { format, rowCount: rows.length });
    }

    return {
      data,
      filename,
      format,
      entity,
      rowCount: rows.length,
      generatedAt: new Date().toISOString(),
    };
  }

  static async exportAnalyticsSummary(
    options: { userId?: string; startDate?: string; endDate?: string },
  ): Promise<ExportResult> {
    const { AnalyticsEngine } = await import("../analytics");

    const summary = {
      dailyStats: [] as { date: string; generations: number; tokens: number; cost: number; publishes: number }[],
    };

    const rows = summary.dailyStats.map((d) => ({
      Date: d.date,
      Generations: d.generations,
      Tokens: d.tokens,
      Cost: d.cost,
      Publishes: d.publishes,
    }));

    const data = this.toCsv(rows);
    const filename = `analytics_summary_${new Date().toISOString().slice(0, 10)}.csv`;

    return {
      data,
      filename,
      format: "csv",
      entity: "analytics",
      rowCount: rows.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private static toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return "";

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.map((h) => this.escapeCsvField(h)).join(","),
      ...rows.map((row) => headers.map((h) => this.escapeCsvField(String(row[h] ?? ""))).join(",")),
    ];

    return csvLines.join("\r\n");
  }

  private static escapeCsvField(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
