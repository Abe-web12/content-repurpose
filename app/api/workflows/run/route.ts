import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { WorkflowEngine } from "@/lib/workflows/engine";
import { WorkflowQueue } from "@/lib/workflows/queue";
import { runWorkflowSchema } from "@/lib/validations/workflow";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`workflow:run:${user.id}`, { windowMs: 60000, maxRequests: 20 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");
    if (!workflowId) throw new AppError("workflowId query parameter required", 400);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = runWorkflowSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const background = searchParams.get("background") === "true";

    if (background) {
      const queued = await WorkflowQueue.enqueue({
        workflowId,
        organizationId: member.organizationId,
        userId: user.id,
        triggerType: "manual",
        triggerData: validation.data.triggerData,
      });
      return NextResponse.json({ data: { queued: true, ...queued } });
    }

    const result = await WorkflowEngine.execute(workflowId, {
      organizationId: member.organizationId,
      userId: user.id,
      triggerType: "manual",
      triggerData: validation.data.triggerData,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
