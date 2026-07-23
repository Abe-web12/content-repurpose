import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { WorkflowTemplates } from "@/lib/workflows/templates";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`workflow:templates:apply:${user.id}`, { windowMs: 60000, maxRequests: 10 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const { templateId } = body as Record<string, string>;
    if (!templateId) throw new AppError("templateId required", 400);

    const workflow = await WorkflowTemplates.applyTemplate(templateId, member.organizationId, user.id);
    return NextResponse.json({ data: { id: workflow.id, name: workflow.name } }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
