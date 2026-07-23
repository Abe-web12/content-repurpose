import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { updateCategorySchema } from "@/lib/validations/prompt";

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

    const category = await prisma.promptCategories.findFirst({
      where: { id, organizationId: member.organizationId },
      include: { _count: { select: { prompts: true } } },
    });

    if (!category) throw new AppError("Category not found", 404);

    return NextResponse.json({ data: category });
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

    const existing = await prisma.promptCategories.findFirst({
      where: { id, organizationId: member.organizationId },
    });
    if (!existing) throw new AppError("Category not found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = updateCategorySchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const category = await prisma.promptCategories.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ data: category });
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

    const existing = await prisma.promptCategories.findFirst({
      where: { id, organizationId: member.organizationId },
    });
    if (!existing) throw new AppError("Category not found", 404);

    await prisma.promptTemplates.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await prisma.promptCategories.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
