import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { V1Helper } from "@/lib/dev-platform/v1-helper";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const leaderboard = await prisma.referralLeaderboard.findMany({
        orderBy: { rank: "asc" },
        take: 50,
      });

      return V1Helper.success(leaderboard);
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
