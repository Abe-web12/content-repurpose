import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { ReferralEngine } from "@/lib/referrals";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const { searchParams } = new URL(request.url);
    const eventLimit = parseInt(searchParams.get("limit") ?? "50");
    const eventOffset = parseInt(searchParams.get("offset") ?? "0");

    const [stats, events] = await Promise.all([
      ReferralEngine.getStats(user.id),
      ReferralEngine.getEvents(user.id, eventLimit, eventOffset),
    ]);

    return NextResponse.json({ data: { stats, events } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 10 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<{ code?: string }>(request);

    if (body.code) {
      const result = await ReferralEngine.applyReferral(body.code, user.id);
      return NextResponse.json({ data: result }, { status: 201 });
    }

    const referralCode = await ReferralEngine.generateCode(user.id);
    return NextResponse.json({ data: { code: referralCode } }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 10 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<{ action: string; payoutId?: string }>(request);

    if (body.action === "process_payout" && body.payoutId) {
      await ReferralEngine.processPayout(body.payoutId);
      return NextResponse.json({ data: { success: true } });
    }

    throw new AppError("Invalid action", 400);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 10 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    throw new AppError("Referral codes cannot be deleted", 400);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
