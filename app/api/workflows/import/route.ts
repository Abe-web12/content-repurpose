import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

const importSchema = z.object({
  version: z.string(),
  workflow: z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  }),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    config: z.any().optional(),
    positionX: z.number(),
    positionY: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
  })),
  edges: z.array(z.object({
    id: z.string(),
    sourceNodeId: z.string(),
    targetNodeId: z.string(),
    sourceHandle: z.string().nullable().optional(),
    targetHandle: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    config: z.any().optional(),
  })),
  variables: z.array(z.object({
    name: z.string(),
    value: z.string(),
    isSecret: z.boolean().optional(),
  })).optional(),
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`workflow:import:${user.id}`, { windowMs: 60000, maxRequests: 10 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = importSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const data = validation.data;
    const workflow = await prisma.workflows.create({
      data: {
        name: data.workflow.name,
        description: data.workflow.description,
        tags: data.workflow.tags ?? [],
        organizationId: member.organizationId,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    for (const node of data.nodes) {
      await prisma.workflowNodes.create({
        data: {
          id: node.id,
          workflowId: workflow.id,
          type: node.type as any,
          label: node.label,
          config: (node.config ?? {}) as any,
          positionX: node.positionX,
          positionY: node.positionY,
          width: node.width ?? 200,
          height: node.height ?? 100,
        },
      });
    }

    for (const edge of data.edges) {
      await prisma.workflowEdges.create({
        data: {
          id: edge.id,
          workflowId: workflow.id,
          sourceNodeId: edge.sourceNodeId,
          targetNodeId: edge.targetNodeId,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          label: edge.label,
          config: (edge.config ?? {}) as any,
        },
      });
    }

    if (data.variables) {
      for (const v of data.variables) {
        await prisma.workflowVariables.create({
          data: {
            workflowId: workflow.id,
            name: v.name,
            value: v.isSecret ? "[IMPORTED_SECRET]" : v.value,
            isSecret: v.isSecret ?? false,
          },
        });
      }
    }

    return NextResponse.json({ data: { id: workflow.id, name: workflow.name } }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
