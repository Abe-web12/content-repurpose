import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    revenueMetrics: { findMany: vi.fn() },
    organizationMembers: { findMany: vi.fn().mockResolvedValue([]) },
    aiUsageDaily: { findMany: vi.fn().mockResolvedValue([]), aggregate: vi.fn().mockResolvedValue({ _sum: { totalRequests: 0 } }) },
    workflowRuns: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    apiRequestLogs: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    keys: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(0),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

import { PredictionEngine } from "@/lib/analytics/predictions";
import { prisma } from "@/lib/prisma";

describe("PredictionEngine", () => {
  it("returns prediction result with valid data", async () => {
    vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => ({
        id: `r${i}`,
        date: new Date(2024, 0, i + 1),
        mrr: 10000 + i * 100,
        arr: 120000 + i * 1200,
        expansionMrr: 500,
        churnMrr: 200,
        activeSubscriptions: 50,
        newCustomers: 5,
        churnedCount: 2,
        totalCustomers: 200,
        netRevenue: 10000 + i * 100,
        churnRate: 1,
        ltv: 5000,
        creditConsumption: 100,
        storageUsage: 1000,
        workflowExecutions: 50,
        apiRequests: 200,
        activeOrganizations: 10,
      } as any))
    );

    const result = await PredictionEngine.forecast({
      organizationId: "org1",
      metric: "revenue",
      days: 30,
      period: 90,
    });

    expect(result).toHaveProperty("metric", "revenue");
    expect(result).toHaveProperty("predictions");
    expect(result.predictions.length).toBeGreaterThanOrEqual(60);
    expect(result).toHaveProperty("trend");
    expect(["up", "down", "stable"]).toContain(result.trend);
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("metadata");
    expect(result.metadata).toHaveProperty("rSquared");
  });

  it("handles empty historical data", async () => {
    vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue([]);

    const result = await PredictionEngine.forecast({
      organizationId: "org1",
      metric: "revenue",
      days: 7,
      period: 30,
    });

    expect(result.predictions.length).toBeGreaterThan(0);
    expect(result.metadata.historicalAvg).toBe(0);
  });

  it("handles single data point", async () => {
    vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue([
      { id: "r1", date: new Date("2024-01-01"), mrr: 10000 } as any,
    ]);

    const result = await PredictionEngine.forecast({
      organizationId: "org1",
      metric: "mrr",
      days: 7,
      period: 30,
    });

    expect(result.predictions.length).toBeGreaterThan(0);
  });

  it("returns correct trend direction for growth", async () => {
    vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => ({
        id: `r${i}`,
        date: new Date(2024, 0, i + 1),
        mrr: 5000 + i * 200,
        arr: 60000 + i * 2400,
      } as any))
    );

    const result = await PredictionEngine.forecast({
      organizationId: "org1",
      metric: "mrr",
      days: 30,
      period: 90,
    });

    expect(result.trend).toBe("up");
  });

  it("forecast bounds are non-negative", async () => {
    vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        id: `r${i}`,
        date: new Date(2024, 0, i + 1),
        mrr: 1000,
        arr: 12000,
      } as any))
    );

    const result = await PredictionEngine.forecast({
      organizationId: "org1",
      metric: "mrr",
      days: 7,
      period: 30,
    });

    for (const p of result.predictions) {
      expect(p.lowerBound).toBeGreaterThanOrEqual(0);
      expect(p.upperBound).toBeGreaterThanOrEqual(0);
      expect(p.predicted).toBeGreaterThanOrEqual(0);
    }
  });

  it("confidence is between 0 and 100", async () => {
    vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue(
      Array.from({ length: 60 }, (_, i) => ({
        id: `r${i}`,
        date: new Date(2024, 0, i + 1),
        mrr: 10000 + Math.sin(i * 0.5) * 1000,
        arr: 120000 + Math.sin(i * 0.5) * 12000,
      } as any))
    );

    const result = await PredictionEngine.forecast({
      organizationId: "org1",
      metric: "mrr",
      days: 30,
      period: 90,
    });

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("predictions cover the forecast period", async () => {
    vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue(
      Array.from({ length: 90 }, (_, i) => ({
        id: `r${i}`,
        date: new Date(2024, 0, i + 1),
        mrr: 10000,
        arr: 120000,
      } as any))
    );

    const forecastDays = 30;
    const result = await PredictionEngine.forecast({
      organizationId: "org1",
      metric: "mrr",
      days: forecastDays,
      period: 90,
    });

    const forecastPoints = result.predictions.filter((p) => p.actual === undefined);
    expect(forecastPoints.length).toBe(forecastDays);
  });
});
