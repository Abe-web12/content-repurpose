import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { createCategorySchema } from "@/lib/validations/prompt";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
    });
    if (!member) throw new AppError("No organization found", 404);

    const categories = await prisma.promptCategories.findMany({
      where: { organizationId: member.organizationId },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { prompts: true } } },
    });

    return NextResponse.json({ data: categories });
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
    const validation = createCategorySchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(validation.error.errors.map((e) => e.message).join(", "), 400);
    }

    const category = await prisma.promptCategories.create({
      data: {
        ...validation.data,
        organizationId: member.organizationId,
      },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
