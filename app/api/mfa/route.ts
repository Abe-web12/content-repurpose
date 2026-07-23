import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { MFAManager } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const methods = await MFAManager.getMethods(user.id);
    return NextResponse.json({ data: methods });
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

    const body = await parseBody<{ action: string; token?: string }>(request);

    switch (body.action) {
      case "setup": {
        const setup = await MFAManager.setupTOTP(user.id);
        return NextResponse.json({ data: setup });
      }
      case "confirm": {
        if (!body.token) throw new AppError("token is required", 400);
        const confirmed = await MFAManager.confirmTOTP(user.id, body.token);
        return NextResponse.json({ data: { confirmed } });
      }
      case "email_otp": {
        const otp = await MFAManager.generateEmailOTP(user.id);
        return NextResponse.json({ data: { otp } });
      }
      default:
        throw new AppError("Invalid action", 400);
    }
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
