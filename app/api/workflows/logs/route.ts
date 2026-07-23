import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { WorkflowLogs } from "@/lib/workflows/logs";

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
    const runId = searchParams.get("runId");

    if (!workflowId && !runId) throw new AppError("workflowId or runId required", 400);

    if (runId) {
      const logs = await WorkflowLogs.getRunLogs(runId, {
        level: searchParams.get("level") ?? undefined,
        limit: Number(searchParams.get("limit")) || undefined,
      });
      return NextResponse.json({ data: logs });
    }

    const result = await WorkflowLogs.getLogs(workflowId!, {
      runId: searchParams.get("runId") ?? undefined,
      level: searchParams.get("level") ?? undefined,
      limit: Number(searchParams.get("limit")) || undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
