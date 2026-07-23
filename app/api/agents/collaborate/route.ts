import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { AgentOrchestrator } from "@/lib/agents/orchestrator";
import type { CollaboratorConfig } from "@/lib/agents/orchestrator";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 10 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<{
      mainAgentId: string;
      task: string;
      context: string;
      collaborators: CollaboratorConfig[];
    }>(request);

    if (!body.mainAgentId) throw new AppError("mainAgentId is required", 400);
    if (!body.task) throw new AppError("task is required", 400);
    if (!body.collaborators?.length) throw new AppError("At least one collaborator is required", 400);

    const plan = await AgentOrchestrator.createCollaboration(
      body.mainAgentId,
      body.task,
      body.context ?? "",
      body.collaborators,
    );

    const result = await AgentOrchestrator.executeCollaboration(plan);

    return NextResponse.json({ data: result });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
