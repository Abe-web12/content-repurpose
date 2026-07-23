import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { ReferralEngine } from "@/lib/referrals";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const payouts = await ReferralEngine.getRewards(user.id);
    return NextResponse.json({ data: payouts });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
