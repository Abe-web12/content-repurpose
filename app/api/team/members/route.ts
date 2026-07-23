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
    if (!role) throw new AppError("Not a member", 403);

    const members = await OrganizationManager.getMembers(orgId);
    return NextResponse.json({ data: members });
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

    const body = await parseBody<{ orgId: string; userId: string }>(request);
    if (!body.orgId || !body.userId) throw new AppError("orgId and userId are required", 400);

    await OrganizationManager.removeMember(body.orgId, user.id, body.userId);
    return NextResponse.json({ data: { success: true } });
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

    const body = await parseBody<{ orgId: string; userId: string; action: string; role?: string }>(request);
    if (!body.orgId || !body.userId || !body.action) throw new AppError("orgId, userId, and action are required", 400);

    switch (body.action) {
      case "change_role": {
        if (!body.role) throw new AppError("role is required", 400);
        await OrganizationManager.changeMemberRole(body.orgId, user.id, body.userId, body.role);
        return NextResponse.json({ data: { success: true } });
      }
      case "suspend": {
        await OrganizationManager.suspendMember(body.orgId, user.id, body.userId, true);
        return NextResponse.json({ data: { success: true } });
      }
      case "unsuspend": {
        await OrganizationManager.suspendMember(body.orgId, user.id, body.userId, false);
        return NextResponse.json({ data: { success: true } });
      }
      case "transfer_ownership": {
        await OrganizationManager.transferOwnership(body.orgId, user.id, body.userId);
        return NextResponse.json({ data: { success: true } });
      }
      default:
        throw new AppError("Invalid action", 400);
    }
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
