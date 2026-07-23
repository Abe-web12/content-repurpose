import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { ToolExecutor } from "@/lib/agents/tool-executor";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const rl = await rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<{
      agentId: string;
      toolType: string;
      toolName: string;
      input: Record<string, unknown>;
    }>(request);

    if (!body.agentId) throw new AppError("agentId is required", 400);
    if (!body.toolType) throw new AppError("toolType is required", 400);
    if (!body.toolName) throw new AppError("toolName is required", 400);

    const result = await ToolExecutor.executeAndLog(
      body.agentId,
      body.toolType as any,
      body.toolName,
      body.input ?? {},
    );

    return NextResponse.json({ data: result });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
