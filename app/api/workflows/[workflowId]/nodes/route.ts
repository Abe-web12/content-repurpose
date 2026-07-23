import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { saveWorkflowNodesSchema } from "@/lib/validations/workflow";
import { WorkflowService } from "@/lib/services/workflow-service";
import { ExecutionService } from "@/lib/services/execution-service";

export const runtime = "nodejs";

export async function PUT(
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

    await WorkflowService.getById(workflowId, member.organizationId);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = saveWorkflowNodesSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const graphNodes = validation.data.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      config: (n.config ?? {}) as Record<string, unknown>,
    }));
    const errors = ExecutionService.validateGraph(graphNodes, validation.data.edges);
    if (errors.length > 0) {
      throw new AppError(errors.join("; "), 400);
    }

    await WorkflowService.saveNodes(workflowId, validation.data);

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
