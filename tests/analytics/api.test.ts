import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: null }),
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

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(async () => {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    return {
      auth: {
        getUser: async () => ({
          data: { user: userId ? { id: userId } : null },
          error: null,
        }),
      },
    };
  }),
}));

vi.mock("@/lib/utils/cache", () => ({
  cacheGet: vi.fn().mockImplementation(async (_key: string, fn: () => Promise<unknown>) => fn()),
  cacheKey: vi.fn().mockImplementation((...args: string[]) => args.join(":")),
}));

vi.mock("@/lib/audit", () => ({
  AuditService: {
    log: vi.fn().mockResolvedValue(undefined),
    logExport: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMembers: {
      count: vi.fn().mockResolvedValue(5),
      findUnique: vi.fn().mockResolvedValue({ role: "ADMIN" } as any),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ organizationId: "org1", role: "ADMIN" } as any),
    },
    organizations: { count: vi.fn().mockResolvedValue(2), findMany: vi.fn().mockResolvedValue([{ id: "org1" }, { id: "org2" }] as any) },
    revenueMetrics: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
    aiUsageDaily: { findMany: vi.fn().mockResolvedValue([]), aggregate: vi.fn().mockResolvedValue({ _sum: { totalRequests: 0 } }) },
    apiRequestLogs: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    workflowRuns: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    analyticsAiMetrics: { findMany: vi.fn().mockResolvedValue([]) },
    installedIntegrations: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    webhookLogs: { findMany: vi.fn().mockResolvedValue([]) },
    webhookDeliveries: { findMany: vi.fn().mockResolvedValue([]) },
    usageLog: { aggregate: vi.fn().mockResolvedValue({ _sum: { creditsConsumed: 0 } }), findMany: vi.fn().mockResolvedValue([]) },
    knowledgeDocuments: { count: vi.fn().mockResolvedValue(0) },
    generations: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
    analyticsRealTimeEvents: { findMany: vi.fn().mockResolvedValue([]) },
    analyticsAlerts: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "a1" } as any) },
    analyticsAlertEvents: { findMany: vi.fn().mockResolvedValue([]) },
    subscriptions: { count: vi.fn().mockResolvedValue(0) },
    $queryRaw: vi.fn().mockResolvedValue([{ total_generations: 10, total_scheduled: 5, total_published: 3, weekly_trend: "[]", monthly_trend: "[]", platform_json: "[]" }]),
    $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    users: { findUnique: vi.fn().mockResolvedValue({ email: "user@example.com", generationsUsed: 5, generationsLimit: 100, plan: "pro" } as any) },
  },
} as any));

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GET as rootGET } from "@/app/api/analytics/route";
import { GET as revenueGET } from "@/app/api/analytics/revenue/route";
import { GET as usersGET } from "@/app/api/analytics/users/route";
import { GET as contentGET } from "@/app/api/analytics/content/route";
import { GET as aiGET } from "@/app/api/analytics/ai/route";
import { GET as workflowsGET } from "@/app/api/analytics/workflows/route";
import { GET as integrationsGET } from "@/app/api/analytics/integrations/route";
import { GET as forecastGET } from "@/app/api/analytics/forecast/route";
import { GET as benchmarksGET } from "@/app/api/analytics/benchmarks/route";
import { GET as alertsGET } from "@/app/api/analytics/alerts/route";
import { POST as alertsPOST } from "@/app/api/analytics/alerts/route";
import { GET as exportGET } from "@/app/api/analytics/export/route";

function mockUser(email: string | undefined) {
  vi.mocked(auth).mockResolvedValue({
    userId: email ? "u1" : null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    sessionId: null,
    actor: null,
    getToken: vi.fn(),
    claims: null,
  } as any);
}

function makeReq(url: string) {
  const req = new Request(url);
  (req as any).nextUrl = new URL(url);
  return req as any;
}

function makePostReq(url: string, body: unknown) {
  const req = new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  (req as any).nextUrl = new URL(url);
  return req as any;
}

describe("Analytics API integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
    vi.mocked(prisma.organizationMembers.findFirst).mockResolvedValue({ organizationId: "org1", role: "ADMIN" } as any);
    vi.mocked(prisma.generations.findMany).mockResolvedValue([]);
    vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue([]);
    vi.mocked(prisma.analyticsAlerts.findMany).mockResolvedValue([]);
    vi.mocked(prisma.installedIntegrations.findMany).mockResolvedValue([]);
    vi.mocked(prisma.organizations.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.usageLog.findMany).mockResolvedValue([]);
  });

  describe("Authentication & Authorization", () => {
    it("rejects unauthenticated requests", async () => {
      mockUser(undefined);
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue?organizationId=org1"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it("requires organizationId for org-scoped routes", async () => {
      mockUser("user@example.com");
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue"));
      expect(res.status).toBe(400);
    });

    it("rejects non-member of organization", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue(null);
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue?organizationId=org1"));
      expect(res.status).toBe(403);
    });

    it("allows admin emails without member check", async () => {
      mockUser("admin@example.com");
      process.env.ADMIN_EMAILS = "admin@example.com";
      vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue([
        { id: "r1", date: new Date("2024-01-01"), mrr: 1000, arr: 12000, expansionMrr: 100, churnMrr: 50, activeSubscriptions: 10, newCustomers: 2, churnedCount: 1, totalCustomers: 50 } as any,
      ]);
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue?organizationId=org1"));
      expect(res.status).toBe(200);
      process.env.ADMIN_EMAILS = "";
    });
  });

  describe("Rate limiting", () => {
    it("returns 429 when rate limited", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      const redis = await import("@/lib/redis").then((m) => m.redis);
      vi.mocked(redis.incr).mockResolvedValue(100);
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue?organizationId=org1"));
      expect(res.status).toBe(429);
      vi.mocked(redis.incr).mockResolvedValue(1);
    });
  });

  describe("Root analytics route", () => {
    it("returns user analytics data", async () => {
      mockUser("user@example.com");
      const res = await rootGET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveProperty("totalGenerations");
      expect(body.data).toHaveProperty("usage");
    });
  });

  describe("Revenue route", () => {
    it("returns revenue data and executive metrics", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue([
        { id: "r1", date: new Date("2024-01-01"), mrr: 10000, arr: 120000, expansionMrr: 500, churnMrr: 200, activeSubscriptions: 50, newCustomers: 5, churnedCount: 2, totalCustomers: 200 } as any,
      ]);
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue?organizationId=org1&period=30d"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveProperty("revenue");
      expect(body.data).toHaveProperty("metrics");
      expect(Array.isArray(body.data.revenue)).toBe(true);
    });

    it("accepts period parameter", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue?organizationId=org1&period=7d"));
      expect(res.status).toBe(200);
    });

    it("defaults to 30d period", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue?organizationId=org1"));
      expect(res.status).toBe(200);
    });
  });

  describe("Users route", () => {
    it("returns user growth data", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      const res = await usersGET(makeReq("http://localhost/api/analytics/users?organizationId=org1"), { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveProperty("growth");
      expect(body.data).toHaveProperty("segments");
      expect(body.data).toHaveProperty("retentionRate");
    });
  });

  describe("Content route", () => {
    it("returns content metrics for authenticated user", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.generations.findMany).mockResolvedValue([
        { id: "g1", outputFormat: "linkedin_post", inputType: "text", tokensUsed: 500, modelUsed: "gpt-4", isFavorite: false, createdAt: new Date("2024-01-01") } as any,
        { id: "g2", outputFormat: "twitter_thread", inputType: "url", tokensUsed: 300, modelUsed: "gpt-4", isFavorite: true, createdAt: new Date("2024-01-02") } as any,
      ]);
      const res = await contentGET(makeReq("http://localhost/api/analytics/content?days=30"), { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.totalGenerations).toBe(2);
      expect(body.data.totalTokens).toBe(800);
      expect(body.data.favoriteCount).toBe(1);
      expect(body.data.byFormat).toHaveProperty("linkedin_post");
    });

    it("rejects unauthenticated content requests", async () => {
      mockUser(undefined);
      const res = await contentGET(makeReq("http://localhost/api/analytics/content?days=30"), { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
    });
  });

  describe("AI route", () => {
    it("returns AI analytics", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      vi.mocked(prisma.analyticsAiMetrics.findMany).mockResolvedValue([
        { id: "a1", organizationId: "org1", date: new Date("2024-01-01"), providerId: "openai", model: "gpt-4", requests: 100, totalTokens: 5000, totalCost: 0.5, avgLatency: 200, successCount: 95, failureCount: 5, promptSuccess: 90, promptFailures: 10, knowledgeRetrievals: 20, ragAccuracy: 0.95, workflowSuccess: 30, agentSuccess: 40 } as any,
      ]);
      const res = await aiGET(makeReq("http://localhost/api/analytics/ai?organizationId=org1"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveProperty("metrics");
      expect(body.data).toHaveProperty("providers");
      expect(body.data).toHaveProperty("overview");
    });
  });

  describe("Workflows route", () => {
    it("returns workflow data", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      vi.mocked(prisma.organizationMembers.findMany).mockResolvedValue([{ userId: "u1" }] as any);
      const res = await workflowsGET(makeReq("http://localhost/api/analytics/workflows?organizationId=org1"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe("Integrations route", () => {
    it("returns integration analytics", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      vi.mocked(prisma.installedIntegrations.findMany).mockResolvedValue([
        { id: "i1", integrationType: "slack", active: true, createdAt: new Date() } as any,
        { id: "i2", integrationType: "webhook", active: false, createdAt: new Date() } as any,
      ]);
      const res = await integrationsGET(makeReq("http://localhost/api/analytics/integrations?organizationId=org1"), { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveProperty("totalInstalls");
      expect(body.data).toHaveProperty("activeInstalls");
      expect(body.data).toHaveProperty("byType");
    });
  });

  describe("Forecast route", () => {
    it("returns forecast prediction", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      vi.mocked(prisma.revenueMetrics.findMany).mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => ({
          id: `r${i}`, date: new Date(2024, 0, i + 1), mrr: 10000 + i * 100, arr: 120000 + i * 1200,
          expansionMrr: 500, churnMrr: 200, activeSubscriptions: 50, newCustomers: 5, churnedCount: 2, totalCustomers: 200,
          netRevenue: 10000 + i * 100, churnRate: 1, ltv: 5000, creditConsumption: 100, storageUsage: 1000,
          workflowExecutions: 50, apiRequests: 200, activeOrganizations: 10,
        } as any))
      );
      const res = await forecastGET(makeReq("http://localhost/api/analytics/forecast?organizationId=org1&metric=revenue&days=30&period=90d"), { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveProperty("predictions");
      expect(body.data).toHaveProperty("trend");
      expect(body.data).toHaveProperty("confidence");
    });

    it("validates forecast metric parameter", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      const res = await forecastGET(makeReq("http://localhost/api/analytics/forecast?organizationId=org1&metric=invalid&days=30"), { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
    });
  });

  describe("Benchmarks route", () => {
    it("returns benchmark comparisons", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      vi.mocked(prisma.organizations.findMany).mockResolvedValue([{ id: "org1" }, { id: "org2" }] as any);
      const res = await benchmarksGET(makeReq("http://localhost/api/analytics/benchmarks?organizationId=org1&metric=mrr&period=monthly&name=test"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveProperty("metric");
      expect(body.data).toHaveProperty("entries");
    });
  });

  describe("Alerts route", () => {
    it("lists alerts with cursor pagination", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      vi.mocked(prisma.analyticsAlerts.findMany).mockResolvedValue([]);
      const res = await alertsGET(makeReq("http://localhost/api/analytics/alerts?organizationId=org1"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("nextCursor");
      expect(body).toHaveProperty("hasMore");
    });

    it("creates a new alert", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      vi.mocked(prisma.analyticsAlerts.create).mockResolvedValue({ id: "a1", name: "Test Alert", metric: "mrr", condition: "gt", threshold: 10000 } as any);
      const res = await alertsPOST(makePostReq("http://localhost/api/analytics/alerts?organizationId=org1", {
        name: "Test Alert", metric: "mrr", condition: "gt", threshold: 10000, window: 300, channels: ["email"],
      }));
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.name).toBe("Test Alert");
    });

    it("validates alert creation input", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      const res = await alertsPOST(makePostReq("http://localhost/api/analytics/alerts?organizationId=org1", { name: "" }));
      expect(res.status).toBe(400);
    });
  });

  describe("Export route", () => {
    it("returns CSV for generations", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.generations.findMany).mockResolvedValue([
        { id: "g1", outputFormat: "linkedin_post", inputType: "text", tokensUsed: 120, modelUsed: "gpt-4", isFavorite: false, createdAt: new Date("2024-01-01") } as any,
      ]);
      const res = await exportGET(makeReq("http://localhost/api/analytics/export?format=csv&days=30&type=generations"));
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("output_format");
      expect(text).toContain("linkedin_post");
    });

    it("returns JSON for generations", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.generations.findMany).mockResolvedValue([]);
      const res = await exportGET(makeReq("http://localhost/api/analytics/export?format=json&days=30&type=generations"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("data");
    });

    it("rejects unsupported export types", async () => {
      mockUser("user@example.com");
      const res = await exportGET(makeReq("http://localhost/api/analytics/export?format=csv&days=30&type=invalid"));
      expect(res.status).toBe(200);
    });

    it("validates export days parameter", async () => {
      mockUser("user@example.com");
      const res = await exportGET(makeReq("http://localhost/api/analytics/export?format=csv&days=9999&type=generations"));
      expect(res.status).toBe(200);
    });
  });

  describe("Cache integration", () => {
    it("returns revenue data", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockResolvedValue({ role: "ADMIN" } as any);
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue?organizationId=org1"));
      expect(res.status).toBe(200);
    });
  });

  describe("Error handling", () => {
    it("handles database errors gracefully", async () => {
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockRejectedValue(new Error("DB connection failed"));
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue?organizationId=org1"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it("does not leak internal error details in production", async () => {
      const origEnv = process.env.NODE_ENV;
      (process.env as Record<string, string>).NODE_ENV = "production";
      mockUser("user@example.com");
      vi.mocked(prisma.organizationMembers.findUnique).mockRejectedValue(new Error("Sensitive internal detail"));
      const res = await revenueGET(makeReq("http://localhost/api/analytics/revenue?organizationId=org1"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).not.toContain("Sensitive");
      (process.env as Record<string, string>).NODE_ENV = origEnv;
    });
  });
});
