import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { ApiKeyManager } from "@/lib/security";

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

    const keys = await ApiKeyManager.list(orgId);
    return NextResponse.json({ data: keys });
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

    const body = await parseBody<{ orgId: string; name: string; permissions?: string[]; scopes?: string[]; allowedIps?: string[] }>(request);
    if (!body.orgId || !body.name) throw new AppError("orgId and name are required", 400);

    const key = await ApiKeyManager.create(body.orgId, user.id, body);
    return NextResponse.json({ data: key }, { status: 201 });
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

    const body = await parseBody<{ action: string; keyId: string } & Record<string, any>>(request);

    switch (body.action) {
      case "revoke":
        await ApiKeyManager.revoke(body.keyId);
        break;
      case "rotate": {
        const result = await ApiKeyManager.rotate(body.keyId);
        return NextResponse.json({ data: result });
      }
      case "update": {
        const { action: _, keyId: __, ...updateData } = body;
        await ApiKeyManager.update(body.keyId, updateData);
        break;
      }
      default:
        throw new AppError("Invalid action", 400);
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
