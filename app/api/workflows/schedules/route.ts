import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { WorkflowScheduler } from "@/lib/workflows/scheduler";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");
    if (!workflowId) throw new AppError("workflowId query parameter required", 400);

    const schedules = await WorkflowScheduler.getSchedules(workflowId);
    return NextResponse.json({ data: schedules });
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

    const limitResult = await rateLimit(`workflow:schedules:${user.id}`, { windowMs: 60000, maxRequests: 10 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const { workflowId, triggerType, config } = body as Record<string, any>;
    if (!workflowId || !triggerType || !config) throw new AppError("workflowId, triggerType, and config required", 400);

    const schedule = await WorkflowScheduler.schedule(workflowId, {
      organizationId: member.organizationId,
      userId: user.id,
      triggerType,
      config: config as Record<string, unknown>,
    });

    return NextResponse.json({ data: schedule }, { status: 201 });
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

    const { searchParams } = new URL(request.url);
    const triggerId = searchParams.get("triggerId");
    if (!triggerId) throw new AppError("triggerId query parameter required", 400);

    await WorkflowScheduler.unschedule(triggerId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
