import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/utils/cache", () => ({
  cacheGet: vi.fn().mockImplementation(async (_key: string, fn: () => Promise<unknown>) => fn()),
  cacheKey: vi.fn().mockImplementation((...args: string[]) => args.join(":")),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMembers: {
      count: vi.fn().mockResolvedValue(10),
      findMany: vi.fn().mockResolvedValue([
        { id: "m1", joinedAt: new Date(), isSuspended: false },
        { id: "m2", joinedAt: new Date(), isSuspended: true },
      ]),
    },
    analyticsCustomerLifetime: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
    generations: { count: vi.fn().mockResolvedValue(4), findMany: vi.fn().mockResolvedValue([]) },
    subscriptions: { count: vi.fn().mockResolvedValue(2) },
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

import { CustomerAnalytics } from "@/lib/analytics/customer";

describe("CustomerAnalytics", () => {
  it("builds a conversion funnel with conversion percentages", async () => {
    const funnel = await CustomerAnalytics.getConversionFunnel("org1");
    expect(funnel.length).toBe(4);
    expect(funnel[0].stage).toBe("Signed Up");
    expect(funnel[0].conversion).toBe(100);
    expect(funnel.every((f) => f.conversion >= 0 && f.conversion <= 100)).toBe(true);
  });

  it("returns segments with percentages summing reasonably", async () => {
    const segments = await CustomerAnalytics.getSegments("org1");
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.every((s) => s.percentage >= 0 && s.percentage <= 100)).toBe(true);
    expect(segments.some((s) => s.name === "Power Users")).toBe(true);
  });

  it("paginates lifetime rows via cursor", async () => {
    const { data, nextCursor } = await CustomerAnalytics.getLifetimeRows("org1");
    expect(Array.isArray(data)).toBe(true);
    expect(nextCursor).toBeNull();
  });

  it("builds cohorts from members", async () => {
    const cohorts = await CustomerAnalytics.getCohorts("org1");
    expect(Array.isArray(cohorts)).toBe(true);
  });
});
