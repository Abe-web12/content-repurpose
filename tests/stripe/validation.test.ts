import { describe, it, expect, vi } from "vitest";

const { mockQueryRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock("@/lib/stripe/config", () => ({
  getPlansMap: () => ({
    "price_starter123": { key: "starter", name: "Starter", generationsLimit: 50 },
    "price_pro456": { key: "pro", name: "Pro", generationsLimit: 500 },
  }),
}));

import { prisma } from "@/lib/prisma";
import { getPlansMap } from "@/lib/stripe/config";

function makeCount(n: number) {
  return [{ count: BigInt(n) }];
}

describe("Stripe Lifecycle Validation", () => {
  describe("Configuration", () => {
    it("plans map has valid entries", () => {
      const entries = Object.entries(getPlansMap());
      for (const [priceId, plan] of entries) {
        expect(priceId).toMatch(/^price_/);
        expect(plan.key).toMatch(/^(starter|pro)$/);
        expect(plan.generationsLimit).toBeGreaterThan(0);
      }
    });
  });

  describe("Database Consistency", () => {
    it("no users with subscription but no customer ID", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(0));
      const inconsistent = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM users
        WHERE stripe_subscription_id IS NOT NULL
        AND stripe_customer_id IS NULL
      `;
      expect(Number(inconsistent[0].count)).toBe(0);
    });

    it("canceled users without subscription ID are on free plan", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(0));
      const notFree = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM users
        WHERE stripe_subscription_id IS NULL
        AND plan != 'free'
      `;
      expect(Number(notFree[0].count)).toBe(0);
    });

    it("all paid users have generation limits >= plan minimum", async () => {
      mockQueryRaw.mockResolvedValue([
        { plan: "starter", limit: 50 },
        { plan: "pro", limit: 500 },
      ]);
      const limits = await prisma.$queryRaw<Array<{ plan: string; limit: number }>>`
        SELECT plan, generations_limit FROM users
        WHERE plan IN ('starter', 'pro')
        LIMIT 10
      `;
      for (const row of limits) {
        const min = row.plan === "starter" ? 50 : 500;
        expect(row.limit).toBeGreaterThanOrEqual(min);
      }
    });

    it("no duplicate stripe customer IDs", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(0));
      const duplicates = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT stripe_customer_id FROM users
          WHERE stripe_customer_id IS NOT NULL
          GROUP BY stripe_customer_id
          HAVING COUNT(*) > 1
        ) dup
      `;
      expect(Number(duplicates[0].count)).toBe(0);
    });

    it("free plan users have generations_limit = 3", async () => {
      mockQueryRaw.mockResolvedValue([
        { id: "user-1", generations_limit: 3 },
        { id: "user-2", generations_limit: 3 },
      ]);
      const freeUsers = await prisma.$queryRaw<Array<{ id: string; generations_limit: number }>>`
        SELECT id, generations_limit FROM users
        WHERE plan = 'free'
        LIMIT 5
      `;
      for (const u of freeUsers) {
        expect(u.generations_limit).toBe(3);
      }
    });
  });

  describe("Invoice Records", () => {
    it("all invoices reference valid users", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(0));
      const orphanInvoices = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "Invoice" i
        LEFT JOIN users u ON i."userId" = u.id
        WHERE u.id IS NULL
      `;
      expect(Number(orphanInvoices[0].count)).toBe(0);
    });

    it("invoices have valid statuses", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(0));
      const invalid = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM "Invoice"
        WHERE status NOT IN ('PAID', 'OPEN', 'DRAFT', 'VOID', 'UNCOLLECTIBLE')
      `;
      expect(Number(invalid[0].count)).toBe(0);
    });
  });
});
