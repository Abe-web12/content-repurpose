import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { V1Helper } from "@/lib/dev-platform/v1-helper";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const [code, events, rewards] = await Promise.all([
        prisma.referralCodes.findUnique({ where: { userId: ctx.userId } }),
        prisma.referralEvents.findMany({ where: { inviterId: ctx.userId } }),
        prisma.referralPayouts.findMany({ where: { userId: ctx.userId } }),
      ]);

      const totalReferrals = events.length;
      const converted = events.filter((e) => e.status === "CONVERTED" || e.status === "REWARDED").length;
      const totalCredits = rewards.reduce((sum, r) => sum + (r.creditAmount || 0), 0);
      const totalRevenue = rewards.reduce((sum, r) => sum + (r.cashAmount || 0), 0);

      return V1Helper.success({
        code: code?.code || null,
        total_referrals: totalReferrals,
        converted: converted,
        conversion_rate: totalReferrals > 0 ? ((converted / totalReferrals) * 100).toFixed(1) : "0",
        total_credits_earned: totalCredits,
        total_revenue_earned: totalRevenue,
      });
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
