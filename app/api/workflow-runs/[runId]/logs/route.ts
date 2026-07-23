import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const run = await prisma.workflowRuns.findUnique({ where: { id: runId } });
    if (!run) throw new AppError("Run not found", 404);

    const workflow = await prisma.workflows.findFirst({
      where: { id: run.workflowId, organizationId: member.organizationId },
    });
    if (!workflow) throw new AppError("Run not found", 404);

    const { searchParams } = new URL(request.url);

    const where: Record<string, unknown> = { runId };
    const level = searchParams.get("level");
    if (level) where.level = level;

    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
    const cursor = searchParams.get("cursor");

    const logs = await prisma.workflowExecutionLogs.findMany({
      where: where as any,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = logs.length > limit;
    const data = hasMore ? logs.slice(0, limit) : logs;

    return NextResponse.json({
      data,
      nextCursor: hasMore ? data[data.length - 1].id : null,
      hasMore,
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
