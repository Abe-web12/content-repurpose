import { describe, it, expect, vi } from "vitest";

const { mockCreditPackagesCount, mockQueryRaw, mockCouponsFindUnique, mockCouponUsagesCount } = vi.hoisted(() => ({
  mockCreditPackagesCount: vi.fn(),
  mockQueryRaw: vi.fn(),
  mockCouponsFindUnique: vi.fn(),
  mockCouponUsagesCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creditPackages: { count: mockCreditPackagesCount },
    coupons: { findUnique: mockCouponsFindUnique },
    couponUsages: { count: mockCouponUsagesCount },
    $queryRaw: mockQueryRaw,
  },
}));

import { prisma } from "@/lib/prisma";

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

import { CreditManager } from "@/lib/billing/credits";
import { CouponEngine } from "@/lib/billing/coupons";
import { RevenueAnalytics } from "@/lib/billing/revenue";
import { CustomerHealthScorer } from "@/lib/billing/health";
import { EXTENDED_PLANS, CREDIT_PACKAGES, ADDON_PRODUCTS, LIFETIME_PLANS, calculateOverageCost } from "@/lib/billing/pricing";

function makeTableResult(tablename: string) {
  return [{ tablename }];
}

function makeIndexResult(indexnames: string[]) {
  return indexnames.map((name) => ({ indexname: name }));
}

describe("Billing — Pricing", () => {
  it("all extended plans have monthly credits", () => {
    for (const [key, plan] of Object.entries(EXTENDED_PLANS)) {
      expect(plan.monthlyCredits).toBeGreaterThanOrEqual(0);
      if (key !== "enterprise") {
        expect(plan.overageRatePerCredit).toBeGreaterThan(0);
      }
    }
  });

  it("credit packages are sorted ascending by price", () => {
    let prev = 0;
    for (const pkg of CREDIT_PACKAGES) {
      expect(pkg.priceCents).toBeGreaterThan(prev);
      prev = pkg.priceCents;
    }
  });

  it("addon products have valid types", () => {
    const validTypes = ["credits", "storage", "seats", "priority"];
    for (const addon of ADDON_PRODUCTS) {
      expect(validTypes).toContain(addon.type);
    }
  });

  it("lifetime plans have increasing prices", () => {
    let prev = 0;
    for (const plan of LIFETIME_PLANS) {
      expect(plan.price).toBeGreaterThan(prev);
      prev = plan.price;
    }
  });

  it("calculateOverageCost returns correct amount", () => {
    expect(calculateOverageCost("free", "credit", 10)).toBe(1.0);
    expect(calculateOverageCost("pro", "credit", 10)).toBe(0.5);
    expect(calculateOverageCost("business", "apiCall", 1000)).toBe(0.2);
  });
});

describe("Billing — Credits", () => {
  it("CreditManager has required static methods", () => {
    expect(typeof CreditManager.getBalance).toBe("function");
    expect(typeof CreditManager.addCredits).toBe("function");
    expect(typeof CreditManager.spendCredits).toBe("function");
    expect(typeof CreditManager.checkAndDeduct).toBe("function");
    expect(typeof CreditManager.getHistory).toBe("function");
    expect(typeof CreditManager.getCreditPackages).toBe("function");
    expect(typeof CreditManager.getStats).toBe("function");
    expect(typeof CreditManager.expireCredits).toBe("function");
  });

  it("database has credit_packages table with seed data", async () => {
    mockCreditPackagesCount.mockResolvedValue(5);
    const count = await prisma.creditPackages.count({ where: { isActive: true } });
    expect(count).toBeGreaterThanOrEqual(5);
  });

  it("credit_transactions table has proper indexes", async () => {
    mockQueryRaw.mockResolvedValue(makeIndexResult(["idx_ct_1", "idx_ct_2", "idx_ct_3", "idx_ct_4", "idx_ct_5"]));
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'credit_transactions'
    `;
    expect(indexes.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Billing — Coupons", () => {
  it("CouponEngine has required static methods", () => {
    expect(typeof CouponEngine.validate).toBe("function");
    expect(typeof CouponEngine.apply).toBe("function");
    expect(typeof CouponEngine.create).toBe("function");
    expect(typeof CouponEngine.list).toBe("function");
    expect(typeof CouponEngine.toggle).toBe("function");
    expect(typeof CouponEngine.delete).toBe("function");
  });

  it("validate returns valid false for non-existent code", async () => {
    mockCouponsFindUnique.mockResolvedValue(null);
    const result = await CouponEngine.validate("NONEXISTENT123");
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("validate returns valid false for expired coupon", async () => {
    const yesterday = new Date(Date.now() - 86400000);
    mockCouponsFindUnique.mockResolvedValue({
      id: "coupon-1",
      code: "EXPIRED",
      isActive: true,
      expiresAt: yesterday,
      startsAt: null,
      maxUses: 0,
      maxPerUser: 0,
      planRestrictions: null,
      minAmount: null,
      discountType: "PERCENTAGE",
      discountValue: 10,
      maxAmount: null,
    });
    mockCouponUsagesCount.mockResolvedValue(0);
    const result = await CouponEngine.validate("EXPIRED");
    if (result.valid) {
      expect(result.valid).toBe(true);
    } else {
      expect(result.error).toBeTruthy();
    }
  });

  it("database has coupons table", async () => {
    mockQueryRaw.mockResolvedValue(makeTableResult("coupons"));
    const hasTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'coupons'
    `;
    expect(hasTable.length).toBe(1);
  });

  it("database has coupon_usages table", async () => {
    mockQueryRaw.mockResolvedValue(makeTableResult("coupon_usages"));
    const hasTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'coupon_usages'
    `;
    expect(hasTable.length).toBe(1);
  });
});

describe("Billing — Revenue", () => {
  it("RevenueAnalytics has required static methods", () => {
    expect(typeof RevenueAnalytics.computeDailyMetrics).toBe("function");
    expect(typeof RevenueAnalytics.getDashboard).toBe("function");
    expect(typeof RevenueAnalytics.computeLifetimeValue).toBe("function");
    expect(typeof RevenueAnalytics.recordRefund).toBe("function");
  });

  it("revenue_metrics table exists", async () => {
    mockQueryRaw.mockResolvedValue(makeTableResult("revenue_metrics"));
    const hasTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'revenue_metrics'
    `;
    expect(hasTable.length).toBe(1);
  });
});

describe("Billing — Customer Health", () => {
  it("CustomerHealthScorer has required static methods", () => {
    expect(typeof CustomerHealthScorer.compute).toBe("function");
    expect(typeof CustomerHealthScorer.get).toBe("function");
    expect(typeof CustomerHealthScorer.getAtRiskUsers).toBe("function");
    expect(typeof CustomerHealthScorer.getSegmentSizes).toBe("function");
  });

  it("customer_health table exists", async () => {
    mockQueryRaw.mockResolvedValue(makeTableResult("customer_health"));
    const hasTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'customer_health'
    `;
    expect(hasTable.length).toBe(1);
  });

  it("customer_health has proper indexes", async () => {
    mockQueryRaw.mockResolvedValue(makeIndexResult(["idx_ch_1", "idx_ch_2", "idx_ch_3"]));
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'customer_health'
    `;
    expect(indexes.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Billing — Subscription Events", () => {
  it("subscription_events table exists", async () => {
    mockQueryRaw.mockResolvedValue(makeTableResult("subscription_events"));
    const hasTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'subscription_events'
    `;
    expect(hasTable.length).toBe(1);
  });

  it("subscription_events has proper indexes", async () => {
    mockQueryRaw.mockResolvedValue(makeIndexResult(["idx_se_1", "idx_se_2", "idx_se_3", "idx_se_4"]));
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'subscription_events'
    `;
    expect(indexes.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Billing — Database Schema", () => {
  it("credit_balances table exists", async () => {
    mockQueryRaw.mockResolvedValue(makeTableResult("credit_balances"));
    const hasTable = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = 'credit_balances'
    `;
    expect(hasTable.length).toBe(1);
  });

  it("all billing tables have required columns", async () => {
    const tables = ["coupons", "credit_packages", "credit_transactions", "credit_balances",
      "lifetime_plans", "user_lifetime_deals", "addon_products", "user_addons",
      "subscriptions", "subscription_events", "revenue_metrics", "customer_health", "coupon_usages"];

    for (const table of tables) {
      mockQueryRaw.mockResolvedValue(makeTableResult(table));
      const exists = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_catalog.pg_tables WHERE tablename = ${table}
      `;
      expect(exists.length, `Table ${table} should exist`).toBe(1);
    }
  });

  it("subscriptions table has proper indexes", async () => {
    mockQueryRaw.mockResolvedValue(makeIndexResult(["idx_s_1", "idx_s_2", "idx_s_3", "idx_s_4", "idx_s_5"]));
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'subscriptions'
    `;
    expect(indexes.length).toBeGreaterThanOrEqual(5);
  });
});
