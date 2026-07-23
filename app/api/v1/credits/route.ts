import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { V1Helper } from "@/lib/dev-platform/v1-helper";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const balance = await prisma.creditBalances.findUnique({ where: { userId: ctx.userId } });
      if (!balance) throw new AppError("No credit balance found", 404);

      return V1Helper.success({
        balance: balance.balance,
        reserved: balance.reserved,
        available: balance.balance - balance.reserved,
        total_purchased: 0,
        total_spent: 0,
      });
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
