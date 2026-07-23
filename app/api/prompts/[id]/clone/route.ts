import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";

export const runtime = "nodejs";

export async function POST(
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

    const original = await prisma.promptTemplates.findFirst({
      where: { id, organizationId: member.organizationId, deletedAt: null },
      include: { variables: true },
    });
    if (!original) throw new AppError("Prompt not found", 404);

    const clone = await prisma.promptTemplates.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        content: original.content,
        categoryId: original.categoryId,
        tags: original.tags,
        organizationId: member.organizationId,
        userId: user.id,
        version: 1,
        status: "DRAFT",
        variables: {
          create: original.variables.map((v) => ({
            name: v.name,
            label: v.label,
            type: v.type,
            defaultValue: v.defaultValue,
            required: v.required,
            options: v.options,
            description: v.description,
            sortOrder: v.sortOrder,
          })),
        },
      },
      include: { variables: true, category: true },
    });

    return NextResponse.json({ data: clone }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
