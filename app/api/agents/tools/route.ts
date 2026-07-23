import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { AgentTools } from "@/lib/agents/tools";
import { toolSchema } from "@/lib/validations/agents";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`agents:tools:list:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    if (!agentId) throw new AppError("agentId query parameter is required", 400);

    const tools = await AgentTools.getAgentTools(agentId);

    return NextResponse.json({ data: tools });
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

    const limitResult = await rateLimit(`agents:tools:add:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    if (!agentId) throw new AppError("agentId query parameter is required", 400);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = toolSchema.parse(body);

    const tool = await AgentTools.addTool(agentId, { organizationId: member.organizationId, userId: user.id }, {
      type: parsed.type,
      name: parsed.name,
      description: parsed.description ?? undefined,
      config: parsed.config,
    });

    return NextResponse.json({ data: tool }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
