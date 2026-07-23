export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { queryHandler, mutationHandler } from "@/lib/api/shared-middleware";
import { StripeConnect } from "@/lib/stripe/connect";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/utils/rate-limit";

const GET = queryHandler({
  permission: "org:view",
  rateLimit: { windowMs: 60_000, maxRequests: 30 },
  name: "marketplace.connect.get",
  handler: async (request, ctx) => {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "status";

    const developerAccount = await prisma.stripeConnectAccounts.findUnique({
      where: { developerId: ctx.userId },
    });

    if (action === "status") {
      if (!developerAccount) {
        return NextResponse.json({ data: { connected: false } });
      }
      const status = await StripeConnect.getAccountStatus(ctx.userId);
      return NextResponse.json({ data: { connected: true, ...status } });
    }

    if (action === "balance") {
      if (!developerAccount) throw new AppError("No Stripe Connect account", 404);
      const balance = await StripeConnect.getBalance(ctx.userId);
      return NextResponse.json({ data: balance });
    }

    if (action === "earnings") {
      const earnings = await StripeConnect.getDeveloperEarnings(ctx.userId);
      return NextResponse.json({ data: earnings });
    }

    if (action === "payouts") {
      if (!developerAccount) throw new AppError("No Stripe Connect account", 404);
      const payouts = await StripeConnect.getPayoutHistory(ctx.userId);
      return NextResponse.json({ data: payouts });
    }

    if (action === "transfers") {
      if (!developerAccount) throw new AppError("No Stripe Connect account", 404);
      const transfers = await StripeConnect.getTransferHistory(ctx.userId);
      return NextResponse.json({ data: transfers });
    }

    if (action === "payout_schedule") {
      if (!developerAccount) throw new AppError("No Stripe Connect account", 404);
      const schedule = await StripeConnect.getPayoutSchedule(ctx.userId);
      return NextResponse.json({ data: schedule });
    }

    if (action === "listings") {
      const listings = await prisma.marketplaceListings.findMany({
        where: { developerId: ctx.userId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ data: listings });
    }

    if (!developerAccount) {
      return NextResponse.json({ data: { connected: false } });
    }
    const status = await StripeConnect.getAccountStatus(ctx.userId);
    return NextResponse.json({ data: { connected: true, ...status } });
  },
});

const POST = mutationHandler({
  permission: "org:edit",
  rateLimit: { windowMs: 60_000, maxRequests: 10 },
  name: "marketplace.connect.post",
  handler: async (request, ctx, body: any) => {
    const action = (body as { action?: string }).action || (new URL(request.url).searchParams.get("action") || "onboard");

    if (action === "create_account") {
      const { country, businessType, businessUrl, accountType } = body as any;
      const email = (await prisma.users.findUnique({ where: { id: ctx.userId }, select: { email: true } }))?.email;
      if (!email) throw new AppError("User email not found", 404);

      const result = accountType === "standard"
        ? await StripeConnect.createStandardAccount(ctx.userId, { email, country, businessType, businessUrl })
        : await StripeConnect.createConnectedAccount(ctx.userId, { email, country, businessType });

      return NextResponse.json({ data: result });
    }

    if (action === "onboard") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const { refreshUrl, returnUrl } = body as any;
      const url = await StripeConnect.getOnboardingLink(
        ctx.userId,
        refreshUrl || `${baseUrl}/marketplace/connect/refresh`,
        returnUrl || `${baseUrl}/marketplace/connect/return`
      );
      return NextResponse.json({ data: { url } });
    }

    if (action === "dashboard_link") {
      const url = await StripeConnect.getDashboardLink(ctx.userId);
      return NextResponse.json({ data: { url } });
    }

    if (action === "create_payout") {
      const { amount } = body as any;
      const payoutId = await StripeConnect.createPayout(ctx.userId, amount);
      return NextResponse.json({ data: { payoutId } });
    }

    if (action === "update_payout_schedule") {
      const { interval, weeklyAnchor, monthlyAnchor, delayDays } = body as any;
      await StripeConnect.updatePayoutSchedule(ctx.userId, { interval, weeklyAnchor, monthlyAnchor, delayDays });
      return NextResponse.json({ data: { updated: true } });
    }

    if (action === "recover_payout") {
      const { payoutId } = body as any;
      if (!payoutId) throw new AppError("payoutId is required", 400);
      const newPayoutId = await StripeConnect.recoverFailedPayout(ctx.userId, payoutId);
      return NextResponse.json({ data: { payoutId: newPayoutId } });
    }

    if (action === "refund") {
      const { purchaseId, reason } = body as any;
      if (!purchaseId) throw new AppError("purchaseId is required", 400);
      await StripeConnect.processRefund(ctx.userId, purchaseId, reason);
      return NextResponse.json({ data: { refunded: true } });
    }

    throw new AppError(`Unknown action: ${action}`, 400);
  },
});

export { GET, POST };
