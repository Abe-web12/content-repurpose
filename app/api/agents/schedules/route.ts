import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { scheduleSchema } from "@/lib/validations/agents";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    if (!agentId) throw new AppError("agentId query parameter is required", 400);

    const schedules = await prisma.aiAgentSchedules.findMany({
      where: { agentId, organizationId: member.organizationId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: schedules });
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

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    if (!agentId) throw new AppError("agentId query parameter is required", 400);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = scheduleSchema.parse(body);

    const schedule = await prisma.aiAgentSchedules.create({
      data: {
        agentId,
        organizationId: member.organizationId,
        userId: user.id,
        cron: parsed.cron,
        input: (parsed.input ?? {}) as any,
      },
    });

    return NextResponse.json({ data: schedule }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
