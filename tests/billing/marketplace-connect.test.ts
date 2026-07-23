import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockCreate, mockUpdate, mockUpsert, mockFindMany, mockFindFirst, mockUpdateMany } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpsert: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stripeConnectAccounts: {
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      create: mockCreate,
      upsert: mockUpsert,
      update: mockUpdate,
      updateMany: mockUpdateMany,
    },
    marketplaceListings: {
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
    },
    marketplacePurchases: {
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      create: mockCreate,
      update: mockUpdate,
    },
    organizationMembers: {
      findFirst: mockFindFirst,
    },
  },
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
  },
}));

const stripeMock = vi.hoisted(() => {
  const mockCreateAccount = vi.fn().mockResolvedValue({ id: "acct_test123", charges_enabled: false, payouts_enabled: false, details_submitted: false });
  const mockRetrieveAccount = vi.fn().mockResolvedValue({
    id: "acct_test123", charges_enabled: true, payouts_enabled: true, details_submitted: true,
    requirements: { currently_due: [], eventually_due: [], past_due: [], pending_verification: [], disabled_reason: null, current_deadline: null },
    settings: { payouts: { schedule: { interval: "manual", delay_days: 2 } } },
    tos_acceptance: { date: Math.floor(Date.now() / 1000) },
  });
  const mockCreateLoginLink = vi.fn().mockResolvedValue({ url: "https://dashboard.stripe.com/test" });
  const mockCreateAccountLink = vi.fn().mockResolvedValue({ url: "https://connect.stripe.com/test" });
  const mockCreateProduct = vi.fn().mockResolvedValue({ id: "prod_test" });
  const mockCreatePrice = vi.fn().mockResolvedValue({ id: "price_test" });
  const mockCreateCheckoutSession = vi.fn().mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.com/test" });
  const mockRetrieveCheckoutSession = vi.fn().mockResolvedValue({
    id: "cs_test", metadata: { listingId: "listing1", buyerOrganizationId: "org1" },
    payment_intent: "pi_test", amount_total: 10000,
  });
  const mockRetrieveBalance = vi.fn().mockResolvedValue({ available: [{ amount: 5000, currency: "usd" }], pending: [{ amount: 2000, currency: "usd" }] });
  const mockCreatePayout = vi.fn().mockResolvedValue({ id: "po_test" });
  const mockRetrievePayout = vi.fn().mockResolvedValue({ id: "po_test", amount: 5000, currency: "usd", status: "failed", failure_code: "insufficient_funds", failure_message: "Insufficient funds" });
  const mockListPayouts = vi.fn().mockResolvedValue({ data: [{ id: "po_test", amount: 5000, currency: "usd", status: "paid", arrival_date: Math.floor(Date.now() / 1000), failure_code: null, failure_message: null, method: "standard", type: "bank_account", created: Math.floor(Date.now() / 1000) }] });
  const mockListTransfers = vi.fn().mockResolvedValue({ data: [{ id: "tr_test", amount: 8500, currency: "usd", destination: "acct_dev", reversed: false, created: Math.floor(Date.now() / 1000), description: "Marketplace listing purchase" }] });
  const mockCreateRefund = vi.fn().mockResolvedValue({ id: "re_test" });

  return {
    mockCreateAccount, mockRetrieveAccount, mockCreateLoginLink, mockCreateAccountLink,
    mockCreateProduct, mockCreatePrice, mockCreateCheckoutSession, mockRetrieveCheckoutSession,
    mockRetrieveBalance, mockCreatePayout, mockRetrievePayout, mockListPayouts, mockListTransfers, mockCreateRefund,
    getStripeObject: () => ({
      accounts: { create: mockCreateAccount, retrieve: mockRetrieveAccount, createLoginLink: mockCreateLoginLink },
      accountLinks: { create: mockCreateAccountLink },
      products: { create: mockCreateProduct },
      prices: { create: mockCreatePrice },
      checkout: { sessions: { create: mockCreateCheckoutSession, retrieve: mockRetrieveCheckoutSession } },
      balance: { retrieve: mockRetrieveBalance },
      payouts: { create: mockCreatePayout, retrieve: mockRetrievePayout, list: mockListPayouts },
      transfers: { list: mockListTransfers },
      refunds: { create: mockCreateRefund },
    }),
  };
});

vi.mock("@/lib/stripe/config", () => ({
  getStripe: () => stripeMock.getStripeObject(),
}));

import { StripeConnect } from "@/lib/stripe/connect";

describe("StripeConnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createConnectedAccount", () => {
    it("should return existing account if found", async () => {
      mockFindUnique.mockResolvedValue({
        developerId: "dev1",
        stripeAccountId: "acct_existing",
        accountType: "express",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "PENDING",
      });

      const result = await StripeConnect.createConnectedAccount("dev1", {
        email: "dev@test.com",
      });

      expect(result.stripeAccountId).toBe("acct_existing");
    });

    it("should create new account when none exists", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockUpsert.mockResolvedValue({
        developerId: "dev2",
        stripeAccountId: "acct_test123",
        accountType: "express",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "PENDING",
      });

      const result = await StripeConnect.createConnectedAccount("dev2", {
        email: "dev2@test.com",
        country: "US",
      });

      expect(result.stripeAccountId).toBe("acct_test123");
    });
  });

  describe("getOnboardingLink", () => {
    it("should throw if no account exists", async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(
        StripeConnect.getOnboardingLink("dev1", "refresh", "return")
      ).rejects.toThrow("does not have a Stripe Connect account");
    });

    it("should return onboarding URL", async () => {
      mockFindUnique.mockResolvedValue({
        stripeAccountId: "acct_test123",
      });

      const url = await StripeConnect.getOnboardingLink("dev1", "refresh", "return");
      expect(url).toBe("https://connect.stripe.com/test");
    });
  });

  describe("getLoginLink", () => {
    it("should return dashboard login link", async () => {
      mockFindUnique.mockResolvedValue({
        stripeAccountId: "acct_test123",
      });

      const url = await StripeConnect.getLoginLink("dev1");
      expect(url).toBe("https://dashboard.stripe.com/test");
    });
  });

  describe("getBalance", () => {
    it("should retrieve account balance", async () => {
      mockFindUnique.mockResolvedValue({
        stripeAccountId: "acct_test123",
      });

      const balance = await StripeConnect.getBalance("dev1");
      expect(balance.available).toHaveLength(1);
      expect(balance.available[0].amount).toBe(5000);
      expect(balance.pending[0].amount).toBe(2000);
    });
  });

  describe("handleCheckoutCompleted", () => {
    it("should update purchase status and increment install count", async () => {
      mockFindUnique.mockResolvedValue(null);

      await StripeConnect.handleCheckoutCompleted("cs_test");

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("getAccountStatus", () => {
    it("should return full account verification status", async () => {
      mockFindUnique.mockResolvedValue({
        stripeAccountId: "acct_test123",
        accountType: "express",
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        status: "ACTIVE",
      });

      const status = await StripeConnect.getAccountStatus("dev1");
      expect(status.chargesEnabled).toBe(true);
      expect(status.payoutsEnabled).toBe(true);
      expect(status.detailsSubmitted).toBe(true);
      expect(status.verification.currentlyDue).toEqual([]);
    });
  });

  describe("getDashboardLink", () => {
    it("should return Express dashboard link", async () => {
      mockFindUnique.mockResolvedValue({
        stripeAccountId: "acct_test123",
      });

      const url = await StripeConnect.getDashboardLink("dev1");
      expect(url).toBe("https://dashboard.stripe.com/test");
    });
  });

  describe("processRefund", () => {
    it("should throw if purchase not completed", async () => {
      mockFindUnique.mockResolvedValue({
        id: "purchase1",
        status: "PENDING",
        amountCents: 10000,
        feeCents: 1500,
      });

      await expect(
        StripeConnect.processRefund("dev1", "purchase1")
      ).rejects.toThrow("not completed");
    });

    it("should process refund for completed purchase", async () => {
      mockFindUnique.mockResolvedValue({
        id: "purchase1",
        status: "COMPLETED",
        stripePaymentIntentId: "pi_test",
        amountCents: 10000,
        feeCents: 1500,
      });

      const result = await StripeConnect.processRefund("dev1", "purchase1");
      expect(result).toBe("re_test");
    });
  });

  describe("getTransferHistory", () => {
    it("should return transfer list", async () => {
      mockFindUnique.mockResolvedValue({
        stripeAccountId: "acct_test123",
      });

      const transfers = await StripeConnect.getTransferHistory("dev1");
      expect(transfers).toHaveLength(1);
      expect(transfers[0].id).toBe("tr_test");
      expect(transfers[0].amount).toBe(8500);
    });
  });

  describe("getPayoutSchedule", () => {
    it("should return current payout schedule", async () => {
      mockFindUnique.mockResolvedValue({
        stripeAccountId: "acct_test123",
      });

      const schedule = await StripeConnect.getPayoutSchedule("dev1");
      expect(schedule.interval).toBe("manual");
      expect(schedule.delayDays).toBe(2);
    });
  });

  describe("recoverFailedPayout", () => {
    it("should throw if payout not failed", async () => {
      mockFindUnique.mockResolvedValue({
        stripeAccountId: "acct_test123",
      });
      stripeMock.mockRetrievePayout.mockResolvedValue({
        id: "po_test",
        status: "paid",
        amount: 5000,
        currency: "usd",
      });

      await expect(
        StripeConnect.recoverFailedPayout("dev1", "po_test")
      ).rejects.toThrow("not in failed status");
    });
  });

  describe("getPayoutHistory", () => {
    it("should return payout list", async () => {
      mockFindUnique.mockResolvedValue({
        stripeAccountId: "acct_test123",
      });

      const payouts = await StripeConnect.getPayoutHistory("dev1");
      expect(payouts).toHaveLength(1);
      expect(payouts[0].status).toBe("paid");
    });
  });

  describe("createStandardAccount", () => {
    it("should create a standard connect account", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockUpsert.mockResolvedValue({
        developerId: "dev3",
        stripeAccountId: "acct_test123",
        accountType: "standard",
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: "PENDING",
      });

      const result = await StripeConnect.createStandardAccount("dev3", {
        email: "dev3@test.com",
        businessUrl: "https://example.com",
      });

      expect(result.stripeAccountId).toBe("acct_test123");
      expect(result.accountType).toBe("standard");
    });
  });
});
