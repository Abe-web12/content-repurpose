import { describe, it, expect, vi } from "vitest";
import { MarketplaceManager } from "@/lib/integrations/marketplace";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceListings: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    marketplaceReviews: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

describe("MarketplaceManager", () => {
  describe("getListings", () => {
    it("should apply default pagination", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.marketplaceListings.findMany as any).mockResolvedValue([]);
      (prisma.marketplaceListings.count as any).mockResolvedValue(0);

      const result = await MarketplaceManager.getListings({});

      expect(result.page).toBe(1);
      expect(result.perPage).toBe(20);
      expect(result.hasMore).toBe(false);
    });

    it("should filter by category", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.marketplaceListings.findMany as any).mockResolvedValue([]);
      (prisma.marketplaceListings.count as any).mockResolvedValue(0);

      await MarketplaceManager.getListings({ category: "CRM" });

      const call = (prisma.marketplaceListings.findMany as any).mock.calls[0][0];
      expect(call.where).toBeDefined();
    });
  });

  describe("getFeatured", () => {
    it("should return featured listings", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.marketplaceListings.findMany as any).mockResolvedValue([
        { id: "1", name: "Test", featured: true },
      ]);

      const result = await MarketplaceManager.getFeatured();
      expect(result).toHaveLength(1);
    });
  });
});
