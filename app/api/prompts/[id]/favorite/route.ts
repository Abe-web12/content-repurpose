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

    const prompt = await prisma.promptTemplates.findFirst({
      where: { id, organizationId: member.organizationId, deletedAt: null },
    });
    if (!prompt) throw new AppError("Prompt not found", 404);

    const existing = await prisma.promptFavorites.findUnique({
      where: { promptId_userId: { promptId: id, userId: user.id } },
    });

    if (existing) {
      await prisma.promptFavorites.delete({
        where: { promptId_userId: { promptId: id, userId: user.id } },
      });
      await prisma.promptTemplates.update({
        where: { id },
        data: { isFavorite: false },
      });
      return NextResponse.json({ data: { favorited: false } });
    }

    await prisma.promptFavorites.create({
      data: { promptId: id, userId: user.id },
    });
    await prisma.promptTemplates.update({
      where: { id },
      data: { isFavorite: true },
    });

    return NextResponse.json({ data: { favorited: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
