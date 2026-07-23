import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { AIAnalytics } from "@/lib/ai/provider-analytics";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const membership = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });

    const orgId = membership?.organizationId;
    if (!orgId) throw new AppError("No organization found", 404);

    const limitResult = await rateLimit(`ai:analytics:${user.id}`, {
      windowMs: 60000,
      maxRequests: 20,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "monthly";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const providerId = searchParams.get("providerId") || undefined;

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - (period === "monthly" ? 11 : 2), 1);
    const end = endDate ? new Date(endDate) : now;

    const [requests, providerUsage, modelUsage, orgUsage] = await Promise.all([
      AIAnalytics.getRequestAnalytics({ organizationId: orgId, providerId, startDate: start, endDate: end }),
      AIAnalytics.getProviderUsage({ startDate: start, endDate: end }),
      AIAnalytics.getModelUsage({ startDate: start, endDate: end }),
      AIAnalytics.getOrganizationUsage({ startDate: start, endDate: end }),
    ]);

    return NextResponse.json({
      data: {
        requests,
        providerUsage,
        modelUsage,
        organization: orgUsage,
        period,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
