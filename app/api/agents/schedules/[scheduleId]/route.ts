import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  try {
    const { scheduleId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const existing = await prisma.aiAgentSchedules.findUnique({ where: { id: scheduleId } });
    if (!existing) throw new AppError("Schedule not found", 404);

    const body = await parseBody<Record<string, unknown>>(request);

    const schedule = await prisma.aiAgentSchedules.update({
      where: { id: scheduleId },
      data: {
        ...(body.enabled !== undefined ? { enabled: body.enabled as boolean } : {}),
        ...(body.cron !== undefined ? { cron: body.cron as string } : {}),
        ...(body.input !== undefined ? { input: body.input as any } : {}),
      },
    });

    return NextResponse.json({ data: schedule });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  try {
    const { scheduleId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const existing = await prisma.aiAgentSchedules.findUnique({ where: { id: scheduleId } });
    if (!existing) throw new AppError("Schedule not found", 404);

    await prisma.aiAgentSchedules.delete({ where: { id: scheduleId } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
