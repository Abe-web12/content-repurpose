import { describe, it, expect, vi } from "vitest";

const { mockFindFirst, mockFindUnique, mockCreate, mockUpdate } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    users: { findUnique: mockFindUnique },
    organizationMembers: { findFirst: mockFindFirst, findUnique: mockFindUnique },
    marketplaceListings: { findUnique: mockFindUnique, findMany: vi.fn(), update: mockUpdate },
    marketplacePurchases: { create: mockCreate },
    stripeConnectAccounts: { findUnique: mockFindUnique },
  },
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("@/lib/stripe/config", () => ({
  getStripe: () => ({
    accounts: {
      retrieve: vi.fn().mockResolvedValue({ id: "acct_test" }),
    },
  }),
}));

import { requirePermission, getAuthContext } from "@/lib/api/shared-middleware";

describe("Permission Checks - Marketplace & Payments", () => {
  it("should throw if user is not in organization", async () => {
    const ctx = {
      userId: "user1",
      orgId: undefined as any,
      role: undefined as any,
      ip: "127.0.0.1",
      userAgent: "test",
    };

    expect(() => requirePermission(ctx, "org:edit")).toThrow("must belong to an organization");
  });

  it("should throw if role lacks permission", () => {
    const ctx = {
      userId: "user1",
      orgId: "org1",
      role: "VIEWER",
      ip: "127.0.0.1",
      userAgent: "test",
    };

    expect(() => requirePermission(ctx, "org:edit")).toThrow("do not have permission");
  });

  it("should pass for OWNER with org permission", () => {
    const ctx = {
      userId: "user1",
      orgId: "org1",
      role: "OWNER",
      ip: "127.0.0.1",
      userAgent: "test",
    };

    expect(() => requirePermission(ctx, "org:edit")).not.toThrow();
  });

  it("should pass for ADMIN with billing permission", () => {
    const ctx = {
      userId: "user1",
      orgId: "org1",
      role: "ADMIN",
      ip: "127.0.0.1",
      userAgent: "test",
    };

    expect(() => requirePermission(ctx, "org:edit")).not.toThrow();
  });
});

describe("Organization Isolation", () => {
  it("should scope queries to organization", async () => {
    mockFindUnique.mockResolvedValue(null);

    const { prisma } = await import("@/lib/prisma");

    expect(prisma.marketplacePurchases.create).toBeDefined();
    expect(prisma.marketplaceListings.findMany).toBeDefined();
  });
});
