import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { InviteManager, OrganizationManager } from "@/lib/organizations";

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

    if (orgId) {
      const role = await OrganizationManager.getUserRole(orgId, user.id);
      if (!role) throw new AppError("Not a member", 403);
      const invites = await InviteManager.getPending(orgId);
      return NextResponse.json({ data: invites });
    }

    const userData = await supabase.auth.getUser();
    const invites = await InviteManager.getForUser(userData.data.user?.email || "");
    return NextResponse.json({ data: invites });
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

    const body = await parseBody<{ orgId: string; email: string; role?: string }>(request);
    if (!body.orgId || !body.email) throw new AppError("orgId and email are required", 400);

    const result = await InviteManager.create(body.orgId, user.id, body.email.toLowerCase().trim(), body.role || "EDITOR");
    return NextResponse.json({ data: result }, { status: 201 });
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

    const body = await parseBody<{ action: string; token?: string; orgId?: string; inviteId?: string }>(request);

    switch (body.action) {
      case "accept": {
        if (!body.token) throw new AppError("token is required", 400);
        const result = await InviteManager.accept(body.token, user.id);
        return NextResponse.json({ data: result });
      }
      case "reject": {
        if (!body.token) throw new AppError("token is required", 400);
        await InviteManager.reject(body.token, user.id);
        return NextResponse.json({ data: { success: true } });
      }
      case "revoke": {
        if (!body.orgId || !body.inviteId) throw new AppError("orgId and inviteId are required", 400);
        await InviteManager.revoke(body.orgId, user.id, body.inviteId);
        return NextResponse.json({ data: { success: true } });
      }
      case "resend": {
        if (!body.orgId || !body.inviteId) throw new AppError("orgId and inviteId are required", 400);
        const result = await InviteManager.resend(body.orgId, user.id, body.inviteId);
        return NextResponse.json({ data: result });
      }
      default:
        throw new AppError("Invalid action", 400);
    }
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
