import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { WorkflowHistory } from "@/lib/workflows/history";

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

    if (workflowId) {
      const metrics = await WorkflowHistory.getWorkflowMetrics(workflowId);
      return NextResponse.json({ data: metrics });
    }

    const orgMetrics = await WorkflowHistory.getOrganizationMetrics(member.organizationId);

    const orgWorkflows = await prisma.workflows.findMany({
      where: { organizationId: member.organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
    const workflowIds = orgWorkflows.map((w) => w.id);
    const workflowNameMap = new Map(orgWorkflows.map((w) => [w.id, w.name]));

    const recentRuns = await prisma.workflowRuns.findMany({
      where: { workflowId: { in: workflowIds } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentRunsWithNames = recentRuns.map((run) => ({
      ...run,
      workflowName: workflowNameMap.get(run.workflowId as string) ?? "Unknown",
    }));

    return NextResponse.json({
      data: {
        ...orgMetrics,
        recentRuns: recentRunsWithNames,
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
