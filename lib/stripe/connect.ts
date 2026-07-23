import { getStripe } from "./config";

const stripe = getStripe();
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";

interface StripeAccountCreateParams {
  email: string;
  country?: string;
  businessType?: "individual" | "company";
  tosAcceptance?: {
    date: number;
    ip: string;
  };
}

interface PayoutSchedule {
  interval: "manual" | "daily" | "weekly" | "monthly";
  weeklyAnchor?: string;
  monthlyAnchor?: number;
  delayDays?: number;
}

export class StripeConnect {
  static async createConnectedAccount(
    developerId: string,
    params: StripeAccountCreateParams
  ) {
    const existing = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (existing?.stripeAccountId) {
      return existing;
    }

    const account = await stripe.accounts.create({
      type: "express",
      country: params.country ?? "US",
      email: params.email,
      business_type: params.businessType ?? "individual",
      capabilities: {
        transfers: { requested: true },
      },
      ...(params.tosAcceptance
        ? {
            tos_acceptance: {
              date: params.tosAcceptance.date,
              ip: params.tosAcceptance.ip,
            },
          }
        : {}),
    });

    const record = await prisma.stripeConnectAccounts.upsert({
      where: { developerId },
      create: {
        developerId,
        stripeAccountId: account.id,
        accountType: "express",
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        status: "PENDING",
      },
      update: {
        stripeAccountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      },
    });

    return record;
  }

  static async getOnboardingLink(developerId: string, refreshUrl: string, returnUrl: string): Promise<string> {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new Error("Developer does not have a Stripe Connect account");
    }

    const link = await stripe.accountLinks.create({
      account: account.stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return link.url;
  }

  static async getLoginLink(developerId: string): Promise<string> {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new Error("Developer does not have a Stripe Connect account");
    }

    const link = await stripe.accounts.createLoginLink(account.stripeAccountId);
    return link.url;
  }

  static async createProductPrice(
    developerId: string,
    listingId: string,
    amountCents: number,
    currency: string = "usd"
  ) {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new Error("Developer does not have a Stripe Connect account");
    }

    const product = await stripe.products.create({
      name: `Marketplace Listing: ${listingId}`,
      metadata: { listingId, developerId },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amountCents,
      currency,
      metadata: { listingId, developerId },
    });

    await prisma.marketplaceListings.update({
      where: { id: listingId },
      data: {
        priceCents: amountCents,
      },
    });

    return { productId: product.id, priceId: price.id };
  }

  static async purchaseListing(
    buyerOrganizationId: string,
    listingId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    const listing = await prisma.marketplaceListings.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new Error("Listing not found");
    if (!listing.priceCents || listing.priceCents <= 0) {
      throw new Error("Listing does not have a price configured");
    }

    const developerAccount = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId: listing.developerId ?? "" },
    });
    if (!developerAccount?.stripeAccountId) {
      throw new Error("Developer has not configured payments");
    }

    const buyerMember = await prisma.organizationMembers.findFirst({
      where: { organizationId: buyerOrganizationId },
      include: { user: true },
    });
    const stripeCustomerId = buyerMember?.user?.stripeCustomerId;
    if (!stripeCustomerId) {
      throw new Error("Buyer organization does not have a Stripe customer ID");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: listing.name,
              description: listing.shortDescription ?? listing.description,
            },
            unit_amount: listing.priceCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: Math.round(listing.priceCents * 0.15),
        transfer_data: {
          destination: developerAccount.stripeAccountId,
        },
      },
      customer: stripeCustomerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        listingId,
        buyerOrganizationId,
        developerId: listing.developerId ?? "",
      },
    });

    await prisma.marketplacePurchases.create({
      data: {
        listingId,
        organizationId: buyerOrganizationId,
        stripeSessionId: session.id,
        amountCents: listing.priceCents,
        feeCents: Math.round(listing.priceCents * 0.15),
        status: "PENDING",
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  static async handleCheckoutCompleted(sessionId: string): Promise<void> {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const listingId = session.metadata?.listingId;
    const buyerOrganizationId = session.metadata?.buyerOrganizationId;

    if (!listingId || !buyerOrganizationId) return;

    await prisma.marketplacePurchases.update({
      where: { stripeSessionId: sessionId },
      data: {
        status: "COMPLETED",
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : "",
      },
    });

    await prisma.marketplaceListings.update({
      where: { id: listingId },
      data: { installCount: { increment: 1 } },
    });

    const listing = await prisma.marketplaceListings.findUnique({
      where: { id: listingId },
    });
    if (listing?.developerId) {
      await prisma.stripeConnectAccounts.update({
        where: { developerId: listing.developerId },
        data: { totalEarnedCents: { increment: (session.amount_total ?? 0) - Math.round((session.amount_total ?? 0) * 0.15) } },
      });
    }
  }

  static async getBalance(developerId: string) {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new Error("Developer does not have a Stripe Connect account");
    }

    const balance = await stripe.balance.retrieve(
      {},
      { stripeAccount: account.stripeAccountId }
    );

    return {
      available: balance.available.map((b) => ({ amount: b.amount, currency: b.currency })),
      pending: balance.pending.map((b) => ({ amount: b.amount, currency: b.currency })),
    };
  }

  static async createPayout(developerId: string, amountCents?: number): Promise<string> {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new Error("Developer does not have a Stripe Connect account");
    }

    const payoutAmount = amountCents ?? 0;
    const payout = await stripe.payouts.create(
      {
        amount: payoutAmount,
        currency: "usd",
      },
      { stripeAccount: account.stripeAccountId }
    );

    return payout.id;
  }

  static async updatePayoutSchedule(
    developerId: string,
    schedule: PayoutSchedule
  ) {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });

    await stripe.accounts.update(account!.stripeAccountId, {
      settings: {
        payouts: {
          schedule: schedule as any,
        },
      },
    });
  }

  static async handleAccountUpdated(stripeAccountId: string): Promise<void> {
    const account = await stripe.accounts.retrieve(stripeAccountId);

    await prisma.stripeConnectAccounts.updateMany({
      where: { stripeAccountId },
      data: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        status: account.details_submitted ? "ACTIVE" : "PENDING",
        updatedAt: new Date(),
      },
    });
  }

  static async getDeveloperEarnings(developerId: string) {
    const developerListings = await prisma.marketplaceListings.findMany({
      where: { developerId },
      select: { id: true },
    });

    const listingIds = developerListings.map((l) => l.id);

    if (listingIds.length === 0) {
      return {
        totalGrossCents: 0,
        totalFeesCents: 0,
        totalNetCents: 0,
        totalPurchases: 0,
        recentPurchases: [],
      };
    }

    const purchases = await prisma.marketplacePurchases.findMany({
      where: {
        listingId: { in: listingIds },
        status: "COMPLETED",
      },
      orderBy: { createdAt: "desc" },
    });

    const totalGross = purchases.reduce((sum, p) => sum + p.amountCents, 0);
    const totalFees = purchases.reduce((sum, p) => sum + p.feeCents, 0);
    const totalNet = totalGross - totalFees;

    return {
      totalGrossCents: totalGross,
      totalFeesCents: totalFees,
      totalNetCents: totalNet,
      totalPurchases: purchases.length,
      recentPurchases: purchases.slice(0, 20),
    };
  }

  static async listConnectedAccounts() {
    const accounts = await prisma.stripeConnectAccounts.findMany({
      orderBy: { createdAt: "desc" },
    });
    return accounts;
  }

  static async createStandardAccount(
    developerId: string,
    params: StripeAccountCreateParams & { businessUrl?: string }
  ) {
    const existing = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (existing?.stripeAccountId) {
      return existing;
    }

    const account = await stripe.accounts.create({
      type: "standard",
      country: params.country ?? "US",
      email: params.email,
      business_type: params.businessType ?? "individual",
      business_profile: { url: params.businessUrl },
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      ...(params.tosAcceptance
        ? {
            tos_acceptance: {
              date: params.tosAcceptance.date,
              ip: params.tosAcceptance.ip,
            },
          }
        : {}),
    });

    const record = await prisma.stripeConnectAccounts.upsert({
      where: { developerId },
      create: {
        developerId,
        stripeAccountId: account.id,
        accountType: "standard",
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        status: "PENDING",
      },
      update: {
        stripeAccountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      },
    });

    return record;
  }

  static async getAccountStatus(developerId: string) {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new AppError("Developer does not have a Stripe Connect account", 404);
    }

    const sa = await stripe.accounts.retrieve(account.stripeAccountId);

    return {
      id: account.stripeAccountId,
      type: account.accountType,
      chargesEnabled: sa.charges_enabled,
      payoutsEnabled: sa.payouts_enabled,
      detailsSubmitted: sa.details_submitted,
      status: account.status,
      verification: {
        currentlyDue: sa.requirements?.currently_due ?? [],
        eventuallyDue: sa.requirements?.eventually_due ?? [],
        pastDue: sa.requirements?.past_due ?? [],
        pendingVerification: sa.requirements?.pending_verification ?? [],
        disabledReason: sa.requirements?.disabled_reason,
        deadline: sa.requirements?.current_deadline ? new Date(sa.requirements.current_deadline * 1000) : null,
      },
      payouts: {
        enabled: sa.payouts_enabled,
        interval: sa.settings?.payouts?.schedule?.interval ?? null,
        delayDays: sa.settings?.payouts?.schedule?.delay_days ?? null,
      },
      tosAcceptance: {
        accepted: sa.tos_acceptance?.date ? true : false,
        date: sa.tos_acceptance?.date ? new Date(sa.tos_acceptance.date * 1000) : null,
      },
    };
  }

  static async getDashboardLink(developerId: string): Promise<string> {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new AppError("Developer does not have a Stripe Connect account", 404);
    }

    const link = await stripe.accounts.createLoginLink(account.stripeAccountId);
    return link.url;
  }

  static async processRefund(
    developerId: string,
    purchaseId: string,
    reason?: string
  ): Promise<string> {
    const purchase = await prisma.marketplacePurchases.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) throw new AppError("Purchase not found", 404);
    if (purchase.status !== "COMPLETED") throw new AppError("Purchase is not completed", 400);
    if (!purchase.stripePaymentIntentId) throw new AppError("No payment intent to refund", 400);

    const refund = await stripe.refunds.create({
      payment_intent: purchase.stripePaymentIntentId,
      reason: reason === "requested_by_customer" ? "requested_by_customer" : "duplicate",
    });

    await prisma.marketplacePurchases.update({
      where: { id: purchaseId },
      data: { status: "REFUNDED" },
    });

    await prisma.stripeConnectAccounts.update({
      where: { developerId },
      data: { totalEarnedCents: { decrement: purchase.amountCents - purchase.feeCents } },
    });

    return refund.id;
  }

  static async getTransferHistory(developerId: string, limit = 50) {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new AppError("Developer does not have a Stripe Connect account", 404);
    }

    const transfers = await stripe.transfers.list(
      { limit, expand: ["data.destination_payment"] },
      { stripeAccount: account.stripeAccountId }
    );

    return transfers.data.map((t) => ({
      id: t.id,
      amount: t.amount,
      currency: t.currency,
      destination: t.destination,
      reversed: t.reversed,
      createdAt: new Date(t.created * 1000),
      description: t.description,
    }));
  }

  static async getPayoutSchedule(developerId: string) {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new AppError("Developer does not have a Stripe Connect account", 404);
    }

    const sa = await stripe.accounts.retrieve(account.stripeAccountId);

    return {
      interval: sa.settings?.payouts?.schedule?.interval ?? "manual",
      delayDays: sa.settings?.payouts?.schedule?.delay_days ?? 2,
      monthlyAnchor: sa.settings?.payouts?.schedule?.monthly_anchor ?? null,
      weeklyAnchor: sa.settings?.payouts?.schedule?.weekly_anchor ?? null,
    };
  }

  static async recoverFailedPayout(developerId: string, payoutId: string): Promise<string> {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new AppError("Developer does not have a Stripe Connect account", 404);
    }

    const payout = await stripe.payouts.retrieve(
      payoutId,
      {},
      { stripeAccount: account.stripeAccountId }
    );

    if (payout.status !== "failed") {
      throw new AppError("Payout is not in failed status", 400);
    }

    const newPayout = await stripe.payouts.create(
      {
        amount: payout.amount,
        currency: payout.currency,
        destination: payout.destination as string,
        metadata: { recoveredFrom: payoutId, originalPayout: payoutId },
      },
      { stripeAccount: account.stripeAccountId }
    );

    return newPayout.id;
  }

  static async getPayoutHistory(developerId: string, limit = 50) {
    const account = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId },
    });
    if (!account?.stripeAccountId) {
      throw new AppError("Developer does not have a Stripe Connect account", 404);
    }

    const payouts = await stripe.payouts.list(
      { limit },
      { stripeAccount: account.stripeAccountId }
    );

    return payouts.data.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      arrivalDate: p.arrival_date ? new Date(p.arrival_date * 1000) : null,
      failureCode: p.failure_code,
      failureMessage: p.failure_message,
      method: p.method,
      type: p.type,
      createdAt: new Date(p.created * 1000),
    }));
  }
}
