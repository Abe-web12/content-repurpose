import { NextRequest } from "next/server";
import { V1Helper } from "@/lib/dev-platform/v1-helper";
import { ApiLogger } from "@/lib/dev-platform/api-logger";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireOrg(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get("days") || "30");

      const stats = await ApiLogger.getAggregatedStats(ctx.organizationId, { days });
      return V1Helper.success(stats);
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
