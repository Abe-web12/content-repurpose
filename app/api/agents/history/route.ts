import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { AgentHistory } from "@/lib/agents/history";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`agents:history:list:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    if (!agentId) throw new AppError("agentId query parameter is required", 400);

    const history = await AgentHistory.getRunHistory(agentId, {
      limit: Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100),
      cursor: searchParams.get("cursor") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    return NextResponse.json({ data: history.data, nextCursor: history.nextCursor, hasMore: history.hasMore });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
