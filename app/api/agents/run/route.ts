import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { AgentEngine } from "@/lib/agents/engine";
import { runSchema } from "@/lib/validations/agents";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`agents:run:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    if (!agentId) throw new AppError("agentId query parameter is required", 400);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = runSchema.parse(body);

    const run = await prisma.aiAgentRuns.create({
      data: {
        agentId,
        organizationId: member.organizationId,
        userId: user.id,
        status: "RUNNING",
        triggerType: "api",
        input: (parsed.input ?? {}) as any,
        startedAt: new Date(),
      },
    });

    const result = await AgentEngine.execute(agentId, (parsed.input ?? {}) as Record<string, unknown>, {
      agentId,
      organizationId: member.organizationId,
      userId: user.id,
      runId: run.id,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
