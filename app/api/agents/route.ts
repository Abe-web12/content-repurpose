import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { AgentRegistry } from "@/lib/agents/registry";
import { createAgentSchema } from "@/lib/validations/agents";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`agents:list:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const agents = await AgentRegistry.listAgents(member.organizationId, {
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      visibility: searchParams.get("visibility") ?? undefined,
      limit: Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100),
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return NextResponse.json({ data: agents.data, nextCursor: agents.nextCursor, hasMore: agents.hasMore });
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

    const limitResult = await rateLimit(`agents:create:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = createAgentSchema.parse(body);

    const agent = await AgentRegistry.createAgent({
      organizationId: member.organizationId,
      userId: user.id,
      name: parsed.name,
      description: parsed.description ?? undefined,
      systemPrompt: parsed.systemPrompt ?? undefined,
      model: parsed.model,
      provider: parsed.provider,
    });

    return NextResponse.json({ data: agent }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
