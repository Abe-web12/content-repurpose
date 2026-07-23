import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { BackgroundExecutor, BackgroundJob } from "@/lib/agents/background";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId") ?? undefined;

    let jobs = await BackgroundExecutor.listJobs(agentId);

    if (jobs.length === 0) {
      const runs = await prisma.aiAgentRuns.findMany({
        where: { ...(agentId ? { agentId } : {}), organizationId: member.organizationId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      jobs = runs.map((r) => ({
        id: r.id,
        agentId: r.agentId,
        input: (r.input ?? {}) as Record<string, unknown>,
        status: (r.status === "RUNNING" ? "running" : r.status === "COMPLETED" ? "completed" : "failed") as BackgroundJob["status"],
        progress: r.status === "COMPLETED" ? 100 : r.status === "RUNNING" ? 50 : 0,
        progressMessage: r.status === "COMPLETED" ? "Completed" : r.status === "RUNNING" ? "Running" : "Failed",
        result: r.output?.toString(),
        error: r.error ?? undefined,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    }

    return NextResponse.json({ data: jobs });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 10 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    if (!agentId) throw new AppError("agentId query parameter is required", 400);

    const body = await parseBody<Record<string, unknown>>(request);

    const job = await BackgroundExecutor.enqueue(agentId, (body.input ?? {}) as Record<string, unknown>);

    return NextResponse.json({ data: job }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
