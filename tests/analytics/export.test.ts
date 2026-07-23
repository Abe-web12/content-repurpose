import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsReports: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
    revenueMetrics: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
    organizations: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    organizationMembers: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    aiUsageDaily: { findMany: vi.fn().mockResolvedValue([]), aggregate: vi.fn().mockResolvedValue({ _sum: { totalRequests: 0 } }) },
    apiRequestLogs: { count: vi.fn().mockResolvedValue(0), aggregate: vi.fn().mockResolvedValue({ _avg: { latencyMs: 0 }, _count: 0 }), findMany: vi.fn().mockResolvedValue([]) },
    workflowRuns: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    subscriptions: { count: vi.fn().mockResolvedValue(0) },
    generations: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    usageLog: { aggregate: vi.fn().mockResolvedValue({ _sum: { creditsConsumed: 0 } }), findMany: vi.fn().mockResolvedValue([]) },
    knowledgeDocuments: { count: vi.fn().mockResolvedValue(0) },
    installedIntegrations: { count: vi.fn().mockResolvedValue(0) },
    aiAgentRuns: { count: vi.fn().mockResolvedValue(0) },
  },
}));

import { ReportEngine } from "@/lib/analytics/reports";
import { ExportEngine } from "@/lib/analytics/export";

describe("ReportEngine exports", () => {
  it("generates valid CSV with header row", async () => {
    const csv = await ReportEngine.generateCSV("org1", { type: "customers" });
    expect(typeof csv).toBe("string");
    expect(csv.length).toBeGreaterThan(0);
  });

  it("escapes commas and quotes in CSV", async () => {
    const csv = await ReportEngine.generateCSV("org1", { type: "revenue" });
    expect(csv.split("\n").length).toBeGreaterThanOrEqual(1);
  });

  it("generates parseable JSON", async () => {
    const json = await ReportEngine.generateJSON("org1", { type: "executive" });
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

describe("ExportEngine", () => {
  it("exports CSV", async () => {
    const out = await ExportEngine.exportData({ organizationId: "org1", type: "revenue", format: "csv" });
    expect(out.contentType).toBe("text/csv");
    expect(out.filename).toMatch(/analytics-revenue-.*\.csv/);
  });
  it("exports JSON", async () => {
    const out = await ExportEngine.exportData({ organizationId: "org1", type: "ai", format: "json" });
    expect(out.contentType).toBe("application/json");
  });
  it("exports Excel as base64 tsv", async () => {
    const out = await ExportEngine.exportData({ organizationId: "org1", type: "performance", format: "excel" });
    expect(out.contentType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(() => Buffer.from(out.data, "base64")).not.toThrow();
  });
  it("exports PDF as data url", async () => {
    const out = await ExportEngine.exportData({ organizationId: "org1", type: "customers", format: "pdf" });
    expect(out.contentType).toBe("application/pdf");
    expect(out.data.startsWith("data:application/pdf;base64,")).toBe(true);
  });
  it("rejects unsupported format", async () => {
    await expect(
      ExportEngine.exportData({ organizationId: "org1", type: "revenue", format: "docx" as any })
    ).rejects.toThrow();
  });
});
