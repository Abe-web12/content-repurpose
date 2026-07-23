import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { WorkflowService } from "@/lib/services/workflow-service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
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

    const workflow = await WorkflowService.archive(workflowId, member.organizationId, user.id);

    return NextResponse.json({ data: workflow });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
