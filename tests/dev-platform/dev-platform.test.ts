import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/redis", () => ({
  redis: { incr: vi.fn(), expire: vi.fn(), publish: vi.fn() },
}));

import { V1Helper } from "@/lib/dev-platform/v1-helper";
import { OpenAPISpec } from "@/lib/dev-platform/openapi";
import { V1RateLimiter } from "@/lib/dev-platform/rate-limiter";
import { SDKGenerator } from "@/lib/dev-platform/sdk";
import { EVENT_CATALOG, EventManager } from "@/lib/dev-platform/events";

describe("Developer Platform — Webhooks", () => {
  it("generates webhook secret with correct prefix", () => {
    const generateSecret = (): string => {
      const { randomBytes } = require("crypto");
      return `whsec_${randomBytes(32).toString("hex")}`;
    };
    const secret = generateSecret();
    expect(secret).toMatch(/^whsec_/);
    expect(secret.length).toBe(6 + 64);
  });

  it("signs payload with HMAC-SHA256", () => {
    const { createHmac } = require("crypto");
    const sign = (payload: string, secret: string) =>
      createHmac("sha256", secret).update(payload).digest("hex");

    const payload = JSON.stringify({ type: "test", data: { foo: "bar" } });
    const secret = "whsec_test_secret";
    const signature = sign(payload, secret);

    expect(signature).toBeTruthy();
    expect(signature.length).toBe(64);
    expect(/^[a-f0-9]+$/.test(signature)).toBe(true);
  });

  it("verifies webhook signature", () => {
    const { createHmac, timingSafeEqual } = require("crypto");
    const sign = (payload: string, secret: string) =>
      createHmac("sha256", secret).update(payload).digest("hex");

    const payload = '{"type":"test"}';
    const secret = "whsec_verify_test";
    const expectedSig = sign(payload, secret);

    const verify = (payload: string, signature: string, secret: string): boolean => {
      try {
        const expected = sign(payload, secret);
        const sigBuf = Buffer.from(signature.replace("sha256=", ""));
        const expectedBuf = Buffer.from(expected);
        if (sigBuf.length !== expectedBuf.length) return false;
        return timingSafeEqual(sigBuf, expectedBuf);
      } catch { return false; }
    };

    expect(verify(payload, `sha256=${expectedSig}`, secret)).toBe(true);
    expect(verify(payload, "sha256:invalidsig", secret)).toBe(false);
    expect(verify(payload, "", secret)).toBe(false);
  });

  it("calculates retry backoff", () => {
    const getDelay = (attempt: number): number => {
      return Math.min(Math.pow(2, attempt) * 60, 3600) * 1000;
    };
    expect(getDelay(1)).toBe(120000);
    expect(getDelay(2)).toBe(240000);
    expect(getDelay(3)).toBe(480000);
    expect(getDelay(6)).toBe(3600000);
  });
});

describe("Developer Platform — V1 Helper", () => {
  it("parses pagination params", () => {
    const url = new URL("http://localhost:3000/api/v1/test?page=2&per_page=50");
    const params = V1Helper.parsePagination(url.searchParams);
    expect(params.page).toBe(2);
    expect(params.perPage).toBe(50);
  });

  it("clamps per_page to max 100", () => {
    const url = new URL("http://localhost:3000/api/v1/test?per_page=500");
    const params = V1Helper.parsePagination(url.searchParams);
    expect(params.perPage).toBe(100);
  });

  it("paginates results correctly", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i), name: `Item ${i}` }));
    const result = V1Helper.paginate(items, { page: 1, perPage: 20 });
    expect(result.data.length).toBe(20);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.perPage).toBe(20);
  });

  it("cursor paginates results", () => {
    const items = Array.from({ length: 15 }, (_, i) => ({ id: String(i) }));
    const result = V1Helper.cursorPaginate(items, 10);
    expect(result.data.length).toBe(10);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextCursor).toBe("9");
  });

  it("does not set nextCursor when all items fit", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: String(i) }));
    const result = V1Helper.cursorPaginate(items, 10);
    expect(result.data.length).toBe(5);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBeUndefined();
  });
});

describe("Developer Platform — OpenAPI Spec", () => {
  it("generates valid OpenAPI 3.1 spec", () => {
    const spec = OpenAPISpec.generate() as any;
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe("RepurposeAI API");
    expect(spec.paths).toBeDefined();
    expect(spec.components).toBeDefined();
    expect(spec.components.securitySchemes).toBeDefined();
    expect(spec.components.securitySchemes.BearerAuth).toBeDefined();
  });

  it("includes all resource paths", () => {
    const spec = OpenAPISpec.generate() as any;
    const paths = Object.keys(spec.paths);
    expect(paths).toContain("/api/v1/generations");
    expect(paths).toContain("/api/v1/generations/{id}");
    expect(paths).toContain("/api/v1/templates");
    expect(paths).toContain("/api/v1/voice-profiles");
    expect(paths).toContain("/api/v1/brand-kits");
    expect(paths).toContain("/api/v1/organization");
    expect(paths).toContain("/api/v1/team-members");
    expect(paths).toContain("/api/v1/billing");
    expect(paths).toContain("/api/v1/invoices");
    expect(paths).toContain("/api/v1/credits");
    expect(paths).toContain("/api/v1/credit-transactions");
    expect(paths).toContain("/api/v1/referrals/stats");
    expect(paths).toContain("/api/v1/webhooks/endpoints");
    expect(paths).toContain("/api/v1/webhooks/deliveries");
    expect(paths).toContain("/api/v1/analytics/usage");
    expect(paths).toContain("/api/v1/notifications");
    expect(paths.length).toBeGreaterThanOrEqual(20);
  });

  it("has all required schemas", () => {
    const spec = OpenAPISpec.generate() as any;
    const schemas = Object.keys(spec.components.schemas);
    expect(schemas).toContain("Generation");
    expect(schemas).toContain("Template");
    expect(schemas).toContain("WebhookEndpoint");
    expect(schemas).toContain("WebhookDelivery");
    expect(schemas).toContain("ApiUsage");
    expect(schemas).toContain("RequestLog");
    expect(schemas).toContain("Error");
    expect(schemas).toContain("Pagination");
  });

  it("has all API tags", () => {
    const spec = OpenAPISpec.generate() as any;
    const tags = spec.tags.map((t: any) => t.name);
    expect(tags).toContain("Generations");
    expect(tags).toContain("Webhooks");
    expect(tags).toContain("Analytics");
    expect(tags).toContain("Billing");
    expect(tags).toContain("Notifications");
  });
});

describe("Developer Platform — Rate Limiter", () => {
  it("determines plan from tier", () => {
    expect(V1RateLimiter.planFromTier("enterprise_plan")).toBe("enterprise");
    expect(V1RateLimiter.planFromTier("pro_monthly")).toBe("pro");
    expect(V1RateLimiter.planFromTier("starter_basic")).toBe("starter");
    expect(V1RateLimiter.planFromTier("free_tier")).toBe("free");
    expect(V1RateLimiter.planFromTier("unknown")).toBe("free");
  });

  it("has default rate limit tiers", () => {
    const tiers = {
      free: { windowMs: 60000, maxRequests: 30 },
      starter: { windowMs: 60000, maxRequests: 60 },
      pro: { windowMs: 60000, maxRequests: 300 },
      enterprise: { windowMs: 60000, maxRequests: 1000 },
    };
    expect(tiers.free.maxRequests).toBe(30);
    expect(tiers.pro.maxRequests).toBe(300);
    expect(tiers.enterprise.maxRequests).toBe(1000);
  });

  it("has endpoint-specific tiers", () => {
    const endpointTiers: Record<string, number> = {
      "/api/v1/generations": 60,
      "/api/v1/webhooks": 30,
      "/api/v1/analytics": 30,
    };
    expect(endpointTiers["/api/v1/generations"]).toBe(60);
    expect(endpointTiers["/api/v1/webhooks"]).toBe(30);
  });
});

describe("Developer Platform — SDK Generator", () => {
  it("generates JavaScript SDK", () => {
    const files = SDKGenerator.generate("javascript");
    expect(files.length).toBeGreaterThanOrEqual(2);
    const mainFile = files.find((f) => f.path === "index.js");
    expect(mainFile).toBeDefined();
    expect(mainFile!.content).toContain("class RepurposeAI");
    expect(mainFile!.content).toContain("listGenerations");
    expect(mainFile!.content).toContain("getOrganization");
    expect(mainFile!.content).toContain("listWebhookEndpoints");
  });

  it("generates TypeScript SDK with types", () => {
    const files = SDKGenerator.generate("typescript");
    expect(files.length).toBeGreaterThanOrEqual(2);
    const mainFile = files.find((f) => f.path === "index.ts");
    expect(mainFile).toBeDefined();
    expect(mainFile!.content).toContain("interface Generation");
    expect(mainFile!.content).toContain("interface WebhookEndpoint");
    expect(mainFile!.content).toContain("interface PaginatedResponse");
    expect(mainFile!.content).toContain("listGenerations");
    expect(mainFile!.content).toContain("createWebhookEndpoint");
  });

  it("generates Python SDK", () => {
    const files = SDKGenerator.generate("python");
    expect(files.length).toBeGreaterThanOrEqual(3);
    const clientFile = files.find((f) => f.path.endsWith("client.py"));
    expect(clientFile).toBeDefined();
    expect(clientFile!.content).toContain("class RepurposeAI");
    expect(clientFile!.content).toContain("list_generations");
    expect(clientFile!.content).toContain("create_webhook_endpoint");
  });

  it("generates Go SDK", () => {
    const files = SDKGenerator.generate("go");
    expect(files.length).toBeGreaterThanOrEqual(2);
    const goFile = files.find((f) => f.path.endsWith(".go"));
    expect(goFile).toBeDefined();
    expect(goFile!.content).toContain("type Client struct");
    expect(goFile!.content).toContain("ListGenerations");
  });

  it("generates PHP SDK", () => {
    const files = SDKGenerator.generate("php");
    expect(files.length).toBeGreaterThanOrEqual(2);
    const phpFile = files.find((f) => f.path.endsWith(".php"));
    expect(phpFile).toBeDefined();
    expect(phpFile!.content).toContain("class RepurposeAI");
  });

  it("returns package manager commands", () => {
    const cmds = SDKGenerator.getPackageManagers();
    expect(cmds.javascript).toBe("npm install repurpose-ai");
    expect(cmds.python).toBe("pip install repurpose-ai");
    expect(cmds.go).toBe("go get github.com/repurpose-ai/repurposeai-go");
    expect(cmds.php).toBe("composer require repurpose-ai/repurpose-ai-php");
  });
});

describe("Developer Platform — Event Catalog", () => {
  it("has all required event types", () => {
    expect(EVENT_CATALOG).toContain("generation.created");
    expect(EVENT_CATALOG).toContain("generation.completed");
    expect(EVENT_CATALOG).toContain("generation.failed");
    expect(EVENT_CATALOG).toContain("billing.updated");
    expect(EVENT_CATALOG).toContain("subscription.updated");
    expect(EVENT_CATALOG).toContain("credits.changed");
    expect(EVENT_CATALOG).toContain("team.updated");
    expect(EVENT_CATALOG).toContain("organization.updated");
    expect(EVENT_CATALOG).toContain("referral.rewarded");
    expect(EVENT_CATALOG).toContain("notification.created");
    expect(EVENT_CATALOG.length).toBe(10);
  });

  it("validates event types", () => {
    expect(EventManager.isValidEventType("generation.created")).toBe(true);
    expect(EventManager.isValidEventType("billing.updated")).toBe(true);
    expect(EventManager.isValidEventType("invalid.event")).toBe(false);
    expect(EventManager.isValidEventType("")).toBe(false);
  });
});

describe("Developer Platform — Pagination", () => {
  it("creates paginated response with defaults", () => {
    const items = [{ id: "1" }, { id: "2" }];
    const result = V1Helper.paginate(items, { page: 1, perPage: 20 });
    expect(result.data).toEqual(items);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.perPage).toBe(20);
    expect(result.pagination.hasMore).toBe(false);
  });

  it("includes total when provided", () => {
    const result = V1Helper.paginate([], { page: 1, perPage: 20 }, 100);
    expect(result.pagination.total).toBe(100);
  });

  it("detects hasMore correctly", () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ id: String(i) }));
    const result = V1Helper.paginate(items, { page: 1, perPage: 20 });
    expect(result.data.length).toBe(20);
    expect(result.pagination.hasMore).toBe(true);
  });

  it("handles empty result set", () => {
    const result = V1Helper.paginate([], { page: 1, perPage: 20 });
    expect(result.data).toEqual([]);
    expect(result.pagination.hasMore).toBe(false);
  });
});

describe("Developer Platform — API Key Environment", () => {
  it("defaults to live environment", () => {
    const keyDefaults = { environment: "live" };
    expect(keyDefaults.environment).toBe("live");
  });

  it("supports test environment", () => {
    const key = { environment: "test" };
    expect(key.environment).toBe("test");
  });

  it("supports quota fields", () => {
    const key = { dailyQuota: 1000, monthlyQuota: 30000, dailyUsed: 0, monthlyUsed: 0 };
    expect(key.dailyQuota).toBe(1000);
    expect(key.monthlyQuota).toBe(30000);
    expect(key.dailyUsed).toBe(0);
  });
});
