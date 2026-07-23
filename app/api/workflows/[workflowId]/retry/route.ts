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

    const workflow = await prisma.workflows.findFirst({
      where: { id: workflowId, organizationId: member.organizationId },
    });
    if (!workflow) throw new AppError("Workflow not found", 404);

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    let result;
    if (runId) {
      result = await ExecutionEngine.retryRun(runId, user.id);
    } else {
      const latestRun = await prisma.workflowRuns.findFirst({
        where: { workflowId, status: { in: ["FAILED", "TIMED_OUT"] } },
        orderBy: { createdAt: "desc" },
      });
      if (!latestRun) throw new AppError("No failed runs found to retry", 404);
      result = await ExecutionEngine.retryRun(latestRun.id, user.id);
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
