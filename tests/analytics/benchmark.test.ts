import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizations: { findMany: vi.fn() },
    organizationMembers: { count: vi.fn().mockResolvedValue(10) },
    revenueMetrics: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    apiRequestLogs: { count: vi.fn().mockResolvedValue(0) },
    aiUsageDaily: { aggregate: vi.fn().mockResolvedValue({ _sum: { totalRequests: 0 } }) },
    workflowRuns: { count: vi.fn().mockResolvedValue(0) },
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

import { BenchmarkEngine } from "@/lib/analytics/benchmarks";
import { prisma } from "@/lib/prisma";

describe("BenchmarkEngine", () => {
  it("compares organization against peers", async () => {
    vi.mocked(prisma.organizations.findMany).mockResolvedValue([
      { id: "org1" }, { id: "org2" }, { id: "org3" },
    ] as any);
    vi.mocked(prisma.organizationMembers.count).mockResolvedValueOnce(50).mockResolvedValueOnce(30).mockResolvedValueOnce(20);

    const result = await BenchmarkEngine.compare("org1", { metric: "customers", period: "monthly" });

    expect(result.metric).toBe("customers");
    expect(result).toHaveProperty("organization");
    expect(result).toHaveProperty("entries");
    expect(result).toHaveProperty("average");
    expect(result).toHaveProperty("median");
    expect(result).toHaveProperty("topPerformer");
  });

  it("calculates correct percentile", async () => {
    vi.mocked(prisma.organizations.findMany).mockResolvedValue([
      { id: "org1" }, { id: "org2" }, { id: "org3" }, { id: "org4" }, { id: "org5" },
    ] as any);
    vi.mocked(prisma.organizationMembers.count)
      .mockResolvedValueOnce(100) // org1 (top)
      .mockResolvedValueOnce(80)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(10);

    const result = await BenchmarkEngine.compare("org1", { metric: "customers", period: "monthly" });

    expect(result.organization.percentile).toBeGreaterThanOrEqual(80);
    expect(result.organization.value).toBe(100);
  });

  it("handles single organization", async () => {
    vi.mocked(prisma.organizations.findMany).mockResolvedValue([{ id: "org1" }] as any);
    vi.mocked(prisma.organizationMembers.count).mockResolvedValue(25);

    const result = await BenchmarkEngine.compare("org1", { metric: "customers", period: "monthly" });

    expect(result.organization.percentile).toBe(0);
    expect(result.entries.length).toBe(1);
  });

  it("returns zero values for unknown metric", async () => {
    vi.mocked(prisma.organizations.findMany).mockResolvedValue([{ id: "org1" }, { id: "org2" }] as any);

    const result = await BenchmarkEngine.compare("org1", { metric: "unknown", period: "monthly" });

    expect(result.average).toBe(0);
    expect(result.median).toBe(0);
  });

  it("parses period strings correctly", async () => {
    vi.mocked(prisma.organizations.findMany).mockResolvedValue([{ id: "org1" }, { id: "org2" }] as any);
    vi.mocked(prisma.organizationMembers.count).mockResolvedValue(10);

    const daily = await BenchmarkEngine.compare("org1", { metric: "customers", period: "daily" });
    expect(daily.metric).toBe("customers");

    const weekly = await BenchmarkEngine.compare("org1", { metric: "customers", period: "weekly" });
    expect(weekly.metric).toBe("customers");

    const quarterly = await BenchmarkEngine.compare("org1", { metric: "customers", period: "quarterly" });
    expect(quarterly.metric).toBe("customers");
  });
});
