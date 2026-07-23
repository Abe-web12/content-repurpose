import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { createWorkflowSchema } from "@/lib/validations/workflow";
import { WorkflowService } from "@/lib/services/workflow-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const result = await WorkflowService.list(member.organizationId, {
      status: searchParams.get("status") ?? undefined,
      folderId: searchParams.get("folderId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      limit: Number(searchParams.get("limit")) || undefined,
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return NextResponse.json(result);
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

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = createWorkflowSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const workflow = await WorkflowService.create({
      ...validation.data,
      organizationId: member.organizationId,
      userId: user.id,
    });

    return NextResponse.json({ data: workflow }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
