import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { updatePromptSchema } from "@/lib/validations/prompt";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const prompt = await prisma.promptTemplates.findFirst({
      where: { id, organizationId: member.organizationId, deletedAt: null },
      include: {
        category: true,
        variables: { orderBy: { sortOrder: "asc" } },
        versions: { orderBy: { version: "desc" } },
      },
    });

    if (!prompt) throw new AppError("Prompt not found", 404);

    return NextResponse.json({ data: prompt });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const existing = await prisma.promptTemplates.findFirst({
      where: { id, organizationId: member.organizationId, deletedAt: null },
    });
    if (!existing) throw new AppError("Prompt not found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = updatePromptSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const { variables, ...promptData } = validation.data;

    const prompt = await prisma.promptTemplates.update({
      where: { id },
      data: {
        ...promptData,
        tags: promptData.tags ?? undefined,
      },
      include: { variables: true, category: true },
    });

    if (variables) {
      await prisma.promptVariables.deleteMany({ where: { promptId: id } });
      await prisma.promptVariables.createMany({
        data: variables.map((v) => ({
          promptId: id,
          name: v.name,
          label: v.label,
          type: v.type,
          defaultValue: v.defaultValue,
          required: v.required,
          options: v.options ?? [],
          description: v.description,
          sortOrder: v.sortOrder,
        })),
      });
    }

    return NextResponse.json({ data: prompt });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const existing = await prisma.promptTemplates.findFirst({
      where: { id, organizationId: member.organizationId, deletedAt: null },
    });
    if (!existing) throw new AppError("Prompt not found", 404);

    await prisma.promptTemplates.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
