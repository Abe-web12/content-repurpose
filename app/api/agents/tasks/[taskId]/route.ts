import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const task = await prisma.aiAgentTasks.findUnique({ where: { id: taskId } });
    if (!task) throw new AppError("Task not found", 404);

    return NextResponse.json({ data: task });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`agents:tasks:update:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);

    const task = await prisma.aiAgentTasks.update({
      where: { id: taskId },
      data: body as any,
    });

    return NextResponse.json({ data: task });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
