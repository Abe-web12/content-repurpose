import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "30s", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "30s", target: 250 },
    { duration: "30s", target: 500 },
    { duration: "30s", target: 1000 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000", "p(99)<5000"],
    http_req_failed: ["rate<0.01"],
    slow_queries: ["count<10"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

const errorRate = new Rate("errors");
const slowQueries = new Counter("slow_queries");
const authDuration = new Trend("auth_duration");
const generateDuration = new Trend("generate_duration");
const searchDuration = new Trend("search_duration");
const apiDuration = new Trend("api_duration");

function randomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function () {
  group("Unauthenticated Routes", () => {
    const start = Date.now();

    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
      "health endpoint returns 200": (r) => r.status === 200,
    });
    apiDuration.add(Date.now() - start);

    const publicEndpoints = ["/pricing", "/blog", "/changelog", "/login", "/signup"];
    for (const endpoint of publicEndpoints) {
      const res = http.get(`${BASE_URL}${endpoint}`);
      check(res, {
        [`${endpoint} is accessible`]: (r) => r.status === 200 || r.status === 302,
      });
    }

    const protectedRes = http.get(`${BASE_URL}/api/generations`);
    check(protectedRes, {
      "protected route rejects unauthenticated": (r) => r.status === 401 || r.status === 302,
    });
  });

  group("Authentication", () => {
    const start = Date.now();

    const authRes = http.get(`${BASE_URL}/api/auth/me`, {
      headers: { "Content-Type": "application/json" },
    });
    check(authRes, {
      "unauthenticated user rejected": (r) => r.status === 401 || r.status === 302,
    });
    errorRate.add(authRes.status !== 200);

    const fakeTokenRes = http.get(`${BASE_URL}/api/generations`, {
      headers: {
        Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE1MDAwMDAwMDB9.abc",
        "Content-Type": "application/json",
      },
    });
    check(fakeTokenRes, {
      "fake JWT rejected": (r) => r.status === 401 || r.status === 302,
    });

    authDuration.add(Date.now() - start);
  });

  group("API Endpoints", () => {
    const start = Date.now();

    const searchStart = Date.now();
    const searchRes = http.get(`${BASE_URL}/api/search?q=content+marketing`, {
      headers: { "Content-Type": "application/json" },
    });
    check(searchRes, {
      "search returns results": (r) => r.status === 200,
    });
    searchDuration.add(Date.now() - searchStart);
    if (Date.now() - searchStart > 2000) slowQueries.add(1);

    const generatePayload = JSON.stringify({
      content: "This is a test article about content marketing strategies for 2025.",
      output_format: "linkedin_post",
    });

    const genStart = Date.now();
    const genRes = http.post(`${BASE_URL}/api/generate`, generatePayload, {
      headers: { "Content-Type": "application/json" },
    });
    if (genRes.status !== 429 && genRes.status !== 401) {
      check(genRes, { "generate request accepted": (r) => r.status === 201 || r.status === 200 });
    }
    generateDuration.add(Date.now() - genStart);
    if (Date.now() - genStart > 5000) slowQueries.add(1);

    const invalidPayloadRes = http.post(
      `${BASE_URL}/api/generate`,
      JSON.stringify({}),
      { headers: { "Content-Type": "application/json" } }
    );
    check(invalidPayloadRes, {
      "invalid payload rejected": (r) => [400, 401, 429, 422].includes(r.status),
    });

    const xssPayload = JSON.stringify({
      content: "<script>alert('xss')</script>",
      output_format: "linkedin_post",
    });
    const xssRes = http.post(`${BASE_URL}/api/generate`, xssPayload, {
      headers: { "Content-Type": "application/json" },
    });
    check(xssRes, {
      "XSS payload handled gracefully": (r) =>
        [200, 201, 400, 401, 429, 422].includes(r.status),
    });

    apiDuration.add(Date.now() - start);
  });

  group("Database Stress", () => {
    const queries = Array.from({ length: 5 }, () =>
      http.get(`${BASE_URL}/api/analytics`, {
        headers: { "Content-Type": "application/json" },
      })
    );
    for (const res of queries) {
      check(res, { "analytics query succeeds": (r) => r.status === 200 || r.status === 401 });
      if (res.timings.duration > 2000) slowQueries.add(1);
    }
  });

  group("Error Handling", () => {
    const errorScenarios = [
      { url: `${BASE_URL}/api/generations?invalid=true`, desc: "invalid params" },
      { url: `${BASE_URL}/api/voice?search=a`, desc: "voice search single char" },
      { url: `${BASE_URL}/api/search`, desc: "search without q param" },
    ];

    for (const scenario of errorScenarios) {
      const res = http.get(scenario.url, {
        headers: { "Content-Type": "application/json" },
      });
      check(res, {
        [`${scenario.desc} returns graceful error`]: (r) =>
          ![500, 502, 503].includes(r.status),
      });
      if (res.status >= 500) errorRate.add(1);
    }
  });

  sleep(1);
}
