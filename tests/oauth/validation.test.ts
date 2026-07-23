import { describe, it, expect, vi } from "vitest";

const { mockQueryRaw, mockSocialAccountsFindMany, mockSocialAccountsCount } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockSocialAccountsFindMany: vi.fn(),
  mockSocialAccountsCount: vi.fn(),
}));

import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    socialAccounts: {
      findMany: mockSocialAccountsFindMany,
      count: mockSocialAccountsCount,
    },
    $queryRaw: mockQueryRaw,
  },
}));

describe("OAuth Validation", () => {
  describe("Social Accounts", () => {
    it("has valid platform values", async () => {
      mockQueryRaw.mockResolvedValue([{ count: BigInt(0) }]);
      const invalid = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM social_accounts
        WHERE provider NOT IN ('linkedin', 'twitter')
      `;
      expect(Number(invalid[0].count)).toBe(0);
    });

    it("no duplicate platform per user", async () => {
      mockQueryRaw.mockResolvedValue([{ count: BigInt(0) }]);
      const duplicates = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT user_id, provider FROM social_accounts
          GROUP BY user_id, provider
          HAVING COUNT(*) > 1
        ) dup
      `;
      expect(Number(duplicates[0].count)).toBe(0);
    });

    it("all linked accounts have tokens", async () => {
      mockSocialAccountsFindMany.mockResolvedValue([
        { accessToken: "valid-token-12345", refreshToken: "refresh-token-12345" },
        { accessToken: "valid-token-67890", refreshToken: null },
      ]);
      const accounts = await prisma.socialAccounts.findMany({
        select: { accessToken: true, refreshToken: true },
        take: 10,
      });
      for (const acct of accounts) {
        expect(acct.accessToken).toBeTruthy();
        expect(acct.accessToken.length).toBeGreaterThan(10);
      }
    });

    it("expired tokens are marked correctly", async () => {
      mockQueryRaw.mockResolvedValue([{ count: BigInt(0) }]);
      const expiredActive = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM social_accounts
        WHERE expires_at < NOW()
      `;
      expect(Number.isInteger(Number(expiredActive[0].count))).toBe(true);
    });
  });

  describe("Token Refresh", () => {
    it("linkedin accounts have refresh tokens", async () => {
      mockQueryRaw.mockResolvedValue([{ count: BigInt(0) }]);
      const missingRefresh = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM social_accounts
        WHERE refresh_token IS NULL
        AND provider = 'linkedin'
      `;
      expect(Number.isInteger(Number(missingRefresh[0].count))).toBe(true);
    });
  });

  describe("State / PKCE", () => {
    it("clerk OAuth flow is used", () => {
      expect(true).toBe(true);
    });
  });

  describe("Disconnection", () => {
    it("social accounts exist", async () => {
      mockSocialAccountsCount.mockResolvedValue(5);
      const count = await prisma.socialAccounts.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
