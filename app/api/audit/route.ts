import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { AuditManager } from "@/lib/security";

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
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");
    const action = searchParams.get("action") ?? undefined;
    const entityType = searchParams.get("entityType") ?? undefined;

    if (orgId) {
      const logs = await AuditManager.getByOrg(orgId, { limit, offset, action, entityType });
      return NextResponse.json({ data: logs });
    }

    const logs = await AuditManager.getByUser(user.id, limit);
    return NextResponse.json({ data: logs });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
