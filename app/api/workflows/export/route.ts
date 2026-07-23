import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";

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
    if (!workflowId) throw new AppError("workflowId required", 400);

    const workflow = await prisma.workflows.findFirst({
      where: { id: workflowId, organizationId: member.organizationId, deletedAt: null },
    });
    if (!workflow) throw new AppError("Workflow not found", 404);

    const [nodes, edges, variables] = await Promise.all([
      prisma.workflowNodes.findMany({ where: { workflowId, deletedAt: null } }),
      prisma.workflowEdges.findMany({ where: { workflowId, deletedAt: null } }),
      prisma.workflowVariables.findMany({ where: { workflowId } }),
    ]);

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      workflow: {
        name: workflow.name,
        description: workflow.description,
        tags: workflow.tags,
      },
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        config: n.config,
        positionX: n.positionX,
        positionY: n.positionY,
        width: n.width,
        height: n.height,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        config: e.config,
      })),
      variables: variables.map((v) => ({
        name: v.name,
        value: v.isSecret ? "[REDACTED]" : v.value,
        isSecret: v.isSecret,
      })),
    };

    return NextResponse.json({ data: exportData });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
