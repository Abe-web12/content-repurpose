import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { ExecutionEngine } from "@/lib/execution/engine";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { workflowId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");
    if (!runId) throw new AppError("runId query parameter is required", 400);

    const run = await prisma.workflowRuns.findUnique({ where: { id: runId } });
    if (!run) throw new AppError("Run not found", 404);

    const workflow = await prisma.workflows.findFirst({
      where: { id: run.workflowId, organizationId: member.organizationId },
    });
    if (!workflow) throw new AppError("Run not found", 404);

    await ExecutionEngine.cancelRun(runId);

    return NextResponse.json({ data: { id: runId, status: "CANCELLED" } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
