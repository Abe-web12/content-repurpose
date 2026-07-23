import { describe, it, expect, vi } from "vitest";
import { IntegrationCache } from "@/lib/integrations/cache";

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
  },
}));

describe("IntegrationCache", () => {
  describe("getOrSet", () => {
    it("should return cached value if available", async () => {
      const { redis } = await import("@/lib/redis");
      (redis.get as any).mockResolvedValue(JSON.stringify({ cached: true }));

      const result = await IntegrationCache.getOrSet("test-key", async () => ({ fresh: true }));
      expect(result).toEqual({ cached: true });
    });

    it("should fetch and cache if not available", async () => {
      const { redis } = await import("@/lib/redis");
      (redis.get as any).mockResolvedValue(null);
      (redis.setex as any).mockResolvedValue("OK");

      const result = await IntegrationCache.getOrSet("test-key-2", async () => ({ fresh: true }));
      expect(result).toEqual({ fresh: true });
    });
  });
});
