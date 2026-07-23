import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { ExecutionMetrics } from "@/lib/execution/metrics";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
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

    const steps = await prisma.workflowRunSteps.findMany({
      where: { runId },
      orderBy: { createdAt: "asc" },
    });

    const nodeMetrics = await Promise.all(
      [...new Set(steps.map((s) => s.nodeType).filter(Boolean))].map((type) =>
        ExecutionMetrics.getNodeMetrics(type!),
      ),
    );

    const runMetrics = {
      runId,
      workflowId: run.workflowId,
      status: run.status,
      duration: run.duration,
      retryCount: run.retryCount,
      triggerType: run.triggerType,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      stepCount: steps.length,
      completedSteps: steps.filter((s) => s.status === "COMPLETED").length,
      failedSteps: steps.filter((s) => s.status === "FAILED").length,
      skippedSteps: steps.filter((s) => s.status === "SKIPPED").length,
      nodeMetrics,
    };

    return NextResponse.json({ data: runMetrics });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
