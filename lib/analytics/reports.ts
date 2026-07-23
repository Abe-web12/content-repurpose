import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { cacheInvalidate, cacheKey } from "@/lib/utils/cache";
import { Redis } from "@upstash/redis";
import { subDays, format, addDays } from "date-fns";
import { AnalyticsEngine } from "./engine";

interface ReportConfig {
  type: string;
  metrics?: string[];
  segments?: string[];
  filters?: Record<string, unknown>;
  dateRange?: { start: string; end: string };
}

interface ExportData {
  title: string;
  generatedAt: string;
  organizationId: string;
  config: ReportConfig;
  data: Record<string, unknown>;
}

export class ReportEngine {
  static async generateReport(reportId: string): Promise<ExportData> {
    const report = await prisma.analyticsReports.findUnique({ where: { id: reportId } });
    if (!report) throw new AppError("Report not found", 404);

    const config = (report.config as unknown as ReportConfig) || {};
    const data = await ReportEngine.collectData(report.organizationId, config);

    await prisma.analyticsReports.update({
      where: { id: reportId },
      data: { lastGeneratedAt: new Date() },
    });

    return {
      title: report.title,
      generatedAt: new Date().toISOString(),
      organizationId: report.organizationId,
      config,
      data,
    };
  }

  static async generateCSV(organizationId: string, config: ReportConfig): Promise<string> {
    const data = await ReportEngine.collectData(organizationId, config);
    const rows = ReportEngine.flattenData(data);
    if (rows.length === 0) return "";

    const headers = Object.keys(rows[0]);
    const csvLines = [headers.join(",")];
    for (const row of rows) {
      csvLines.push(headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(","));
    }

    return csvLines.join("\n");
  }

  static async generateJSON(organizationId: string, config: ReportConfig): Promise<string> {
    const data = await ReportEngine.collectData(organizationId, config);
    return JSON.stringify(data, null, 2);
  }

  static async scheduleReport(report: any, schedule: { frequency: string; recipients: string[]; format: string }): Promise<void> {
    const nextRun = ReportEngine.computeNextRun(schedule.frequency);

    await prisma.analyticsReports.update({
      where: { id: report.id },
      data: {
        schedule: { frequency: schedule.frequency, recipients: schedule.recipients, format: schedule.format, nextRunAt: nextRun.toISOString() } as any,
        format: schedule.format,
      },
    });
  }

  static async processScheduledReports(): Promise<number> {
    const now = new Date();
    const reports = await prisma.analyticsReports.findMany({
      where: {
        lastGeneratedAt: {
          lt: now,
        },
      },
    });

    let processed = 0;
    for (const report of reports) {
      const schedule = report.schedule as any;
      if (!schedule || !schedule.nextRunAt) continue;

      const nextRun = new Date(schedule.nextRunAt);
      if (nextRun > now) continue;

      try {
        const data = await ReportEngine.generateReport(report.id);
        processed++;

        const newNextRun = ReportEngine.computeNextRun(schedule.frequency);
        await prisma.analyticsReports.update({
          where: { id: report.id },
          data: {
            schedule: { ...schedule, nextRunAt: newNextRun.toISOString(), lastSentAt: now.toISOString() } as any,
          },
        });
      } catch {
        continue;
      }
    }

    return processed;
  }

  private static async collectData(organizationId: string, config: ReportConfig): Promise<Record<string, unknown>> {
    const days = config.dateRange ? Math.round((new Date(config.dateRange.end).getTime() - new Date(config.dateRange.start).getTime()) / 86400000) : 30;

    switch (config.type) {
      case "executive":
        return {
          metrics: await AnalyticsEngine.getExecutiveMetrics(organizationId),
          segments: await AnalyticsEngine.getCustomerSegments(organizationId),
        };
      case "revenue":
        return {
          revenue: await AnalyticsEngine.getRevenueData(organizationId, days),
          metrics: await AnalyticsEngine.getExecutiveMetrics(organizationId),
        };
      case "customers":
        return {
          customers: await AnalyticsEngine.getCustomerData(organizationId, days),
          segments: await AnalyticsEngine.getCustomerSegments(organizationId),
          funnel: await AnalyticsEngine.getConversionFunnel(organizationId),
          retention: await AnalyticsEngine.getRetentionRate(organizationId, 30),
        };
      case "ai":
        return {
          ai: await AnalyticsEngine.getAIData(organizationId, days),
          providers: await AnalyticsEngine.getProviderAnalytics(organizationId, days),
        };
      case "workflows":
        return {
          workflows: await AnalyticsEngine.getWorkflowData(organizationId, days),
        };
      case "performance":
        return {
          performance: await AnalyticsEngine.getPerformanceMetrics(organizationId),
        };
      default:
        return {};
    }
  }

  private static flattenData(data: Record<string, unknown>): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            rows.push({ category: key, ...item as Record<string, unknown> });
          } else {
            rows.push({ category: key, value: item });
          }
        }
      } else if (typeof value === "object" && value !== null) {
        rows.push({ category: key, ...value as Record<string, unknown> });
      } else {
        rows.push({ category: key, value });
      }
    }
    return rows;
  }

  private static computeNextRun(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case "daily": return addDays(now, 1);
      case "weekly": return addDays(now, 7);
      case "monthly": return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      case "quarterly": return new Date(now.getFullYear(), now.getMonth() + 3, 1);
      case "yearly": return new Date(now.getFullYear() + 1, 0, 1);
      default: return addDays(now, 7);
    }
  }
}
