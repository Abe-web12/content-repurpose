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
      const result = await WorkflowHistory.getRuns(workflowId, {
        status: searchParams.get("status") ?? undefined,
        limit: Number(searchParams.get("limit")) || undefined,
        cursor: searchParams.get("cursor") ?? undefined,
      });
      return NextResponse.json(result);
    }

    const metrics = await WorkflowHistory.getOrganizationMetrics(member.organizationId);
    return NextResponse.json({ data: metrics });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
