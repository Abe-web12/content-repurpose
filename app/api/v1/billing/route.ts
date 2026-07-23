import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { V1Helper } from "@/lib/dev-platform/v1-helper";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const [subscription, balance, invoices] = await Promise.all([
        prisma.subscriptions.findFirst({ where: { userId: ctx.userId }, orderBy: { createdAt: "desc" } }),
        prisma.creditBalances.findUnique({ where: { userId: ctx.userId } }),
        prisma.invoices.findMany({ where: { userId: ctx.userId }, take: 10, orderBy: { createdAt: "desc" } }),
      ]);

      const totalPaid = invoices.reduce((sum, i) => sum + (i.status === "PAID" ? i.amount : 0), 0);

      return V1Helper.success({
        plan: subscription?.plan || "free",
        status: subscription?.status || "inactive",
        credits: {
          balance: balance?.balance || 0,
          available: (balance?.balance || 0) - (balance?.reserved || 0),
        },
        mrr: totalPaid / Math.max(invoices.length, 1),
        subscription,
      });
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
