import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { OrganizationManager } from "@/lib/organizations";

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
    if (!orgId) throw new AppError("orgId is required", 400);

    const role = await OrganizationManager.getUserRole(orgId, user.id);
    if (!role) throw new AppError("Not a member of this organization", 403);

    const [org, members] = await Promise.all([
      OrganizationManager.getById(orgId),
      OrganizationManager.getMembers(orgId),
    ]);

    return NextResponse.json({ data: { org, members, role } });
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

    const body = await parseBody<{ orgId: string; name?: string; logo?: string; timezone?: string; brandColor?: string; domain?: string; maxSeats?: number }>(request);
    if (!body.orgId) throw new AppError("orgId is required", 400);

    const org = await OrganizationManager.update(body.orgId, user.id, body);
    return NextResponse.json({ data: org });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
