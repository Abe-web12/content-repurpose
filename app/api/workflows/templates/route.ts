import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { WorkflowTemplates } from "@/lib/workflows/templates";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (templateId) {
      const template = await WorkflowTemplates.getById(templateId);
      return NextResponse.json({ data: template });
    }

    const result = await WorkflowTemplates.list({
      category: searchParams.get("category") ?? undefined,
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

    const limitResult = await rateLimit(`workflow:templates:${user.id}`, { windowMs: 60000, maxRequests: 10 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const { workflowId, name, description, category } = body as Record<string, string>;

    if (!workflowId || !name) throw new AppError("workflowId and name are required", 400);

    const template = await WorkflowTemplates.createFromWorkflow(workflowId, {
      name,
      description,
      category,
      organizationId: member.organizationId,
      userId: user.id,
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
