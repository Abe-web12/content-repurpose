import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { SessionManager } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const [sessions, stats] = await Promise.all([
      SessionManager.getActive(user.id),
      SessionManager.getDeviceStats(user.id),
    ]);

    return NextResponse.json({ data: { sessions, stats } });
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

    const body = await parseBody<{ action: string; sessionId?: string }>(request);

    switch (body.action) {
      case "logout":
        if (!body.sessionId) throw new AppError("sessionId is required", 400);
        await SessionManager.logout(body.sessionId);
        break;
      case "logout_all":
        await SessionManager.logoutAll(user.id, body.sessionId);
        break;
      case "trust":
        if (!body.sessionId) throw new AppError("sessionId is required", 400);
        await SessionManager.trustDevice(body.sessionId);
        break;
      case "block":
        if (!body.sessionId) throw new AppError("sessionId is required", 400);
        await SessionManager.blockDevice(body.sessionId);
        break;
      default:
        throw new AppError("Invalid action", 400);
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
