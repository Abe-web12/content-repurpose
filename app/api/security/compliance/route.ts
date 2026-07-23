import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { ComplianceManager } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "consents";

    switch (type) {
      case "consents": {
        const consents = await ComplianceManager.getConsents(user.id);
        return NextResponse.json({ data: consents });
      }
      case "requests": {
        const requests = await ComplianceManager.getPrivacyRequests(user.id);
        return NextResponse.json({ data: requests });
      }
      case "export": {
        const data = await ComplianceManager.exportUserData(user.id);
        return NextResponse.json({ data });
      }
      default:
        throw new AppError("Invalid type", 400);
    }
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

    const body = await parseBody<{ action: string; consentType?: string; granted?: boolean; requestType?: string; details?: any }>(request);

    switch (body.action) {
      case "consent": {
        if (!body.consentType) throw new AppError("consentType is required", 400);
        await ComplianceManager.recordConsent(user.id, body.consentType, body.granted ?? true);
        return NextResponse.json({ data: { success: true } });
      }
      case "privacy_request": {
        if (!body.requestType) throw new AppError("requestType is required", 400);
        const req = await ComplianceManager.createPrivacyRequest(user.id, body.requestType, body.details);
        return NextResponse.json({ data: req }, { status: 201 });
      }
      default:
        throw new AppError("Invalid action", 400);
    }
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
