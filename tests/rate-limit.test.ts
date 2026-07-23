import { describe, it, expect, vi, beforeEach } from "vitest";

const redisMock = {
  incr: vi.fn(),
  expire: vi.fn(),
};

vi.mock("@/lib/redis", () => ({
  redis: redisMock,
}));

describe("Rate Limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow requests under the limit", async () => {
    redisMock.incr.mockResolvedValue(1);
    redisMock.expire.mockResolvedValue(1);

    const { rateLimit } = await import("@/lib/utils/rate-limit");
    const result = await rateLimit("test-key", { windowMs: 60000, maxRequests: 5 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("should block requests over the limit", async () => {
    redisMock.incr.mockResolvedValue(6);
    redisMock.expire.mockResolvedValue(1);

    const { rateLimit } = await import("@/lib/utils/rate-limit");
    const result = await rateLimit("test-key", { windowMs: 60000, maxRequests: 5 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
