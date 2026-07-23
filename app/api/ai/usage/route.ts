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

    const limitResult = await rateLimit(`ai:usage:${user.id}`, {
      windowMs: 60000,
      maxRequests: 30,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30;
    const providerId = searchParams.get("providerId") || undefined;

    const usage = await AIAnalytics.getDailyUsage({
      organizationId: orgId,
      providerId,
      days,
    });

    return NextResponse.json({ data: usage });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
