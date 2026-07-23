import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { RevenueAnalytics } from "@/lib/billing/revenue";
import { rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`billing:revenue:${user.id}`, {
      windowMs: 60000, maxRequests: 20,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const dashboard = await RevenueAnalytics.getDashboard();
    return NextResponse.json({ data: dashboard });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
