import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { ThreatDetector } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const type = searchParams.get("type") ?? "score";

    switch (type) {
      case "score": {
        const score = await ThreatDetector.getSecurityScore(orgId || "");
        return NextResponse.json({ data: score });
      }
      case "stats": {
        const stats = await ThreatDetector.getStats();
        return NextResponse.json({ data: stats });
      }
      case "threats": {
        const threats = await ThreatDetector.getThreats(orgId || "");
        return NextResponse.json({ data: threats });
      }
      default:
        throw new AppError("Invalid type", 400);
    }
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
