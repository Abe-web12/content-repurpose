import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { ExecutionService } from "@/lib/services/execution-service";
import { ExecutionEngine } from "@/lib/execution/engine";
import { runWorkflowSchema } from "@/lib/validations/workflow";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { workflowId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const result = await ExecutionService.getRuns(workflowId, member.organizationId, {
      limit: Number(searchParams.get("limit")) || undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { workflowId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    let triggerData: Record<string, unknown> | undefined;
    try {
      const body = await parseBody<Record<string, unknown>>(request);
      const parsed = runWorkflowSchema.safeParse(body);
      if (parsed.success) {
        triggerData = parsed.data.triggerData;
      }
    } catch {
      // No body or invalid JSON - run with defaults
    }

    const result = await ExecutionEngine.run(workflowId, user.id, triggerData);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
