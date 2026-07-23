import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { ToolExecutor } from "@/lib/agents/tool-executor";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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

    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 100);

    const logs = await ToolExecutor.getExecutionLogs(agentId, limit);

    return NextResponse.json({ data: logs });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
