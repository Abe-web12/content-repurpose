import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { AgentAnalytics } from "@/lib/agents/analytics";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`agents:analytics:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    if (!agentId) throw new AppError("agentId query parameter is required", 400);

    const days = Math.min(Math.max(Number(searchParams.get("days")) || 30, 1), 365);

    const [runStats, toolUsage, memoryStats, knowledgeStats] = await Promise.all([
      AgentAnalytics.getRunStats(agentId, days),
      AgentAnalytics.getToolUsage(agentId, days),
      AgentAnalytics.getMemoryStats(agentId),
      AgentAnalytics.getKnowledgeStats(agentId),
    ]);

    return NextResponse.json({
      data: {
        runs: runStats,
        tools: toolUsage,
        memory: memoryStats,
        knowledge: knowledgeStats,
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
