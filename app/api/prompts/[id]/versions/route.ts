import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { encodeCursor, decodeCursor } from "@/lib/utils/cursor-pagination";

export const runtime = "nodejs";

export async function GET(
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

    const prompt = await prisma.promptTemplates.findFirst({
      where: { id, organizationId: member.organizationId, deletedAt: null },
    });
    if (!prompt) throw new AppError("Prompt not found", 404);

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const where: Record<string, unknown> = { promptId: id };

    if (cursor) {
      const decoded = decodeCursor(cursor);
      const num = Number(decoded);
      where.version = { lt: isNaN(num) ? decoded : num };
    }

    const versions = await prisma.promptVersions.findMany({
      where,
      take: limit + 1,
      orderBy: { version: "desc" },
    });

    const hasMore = versions.length > limit;
    const data = hasMore ? versions.slice(0, limit) : versions;
    const nextCursor = hasMore && data.length > 0
      ? encodeCursor(String(data[data.length - 1].version))
      : null;

    return NextResponse.json({ data, nextCursor, hasMore });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

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
      include: { variables: true },
    });
    if (!prompt) throw new AppError("Prompt not found", 404);

    const newVersion = prompt.version + 1;

    const version = await prisma.promptVersions.create({
      data: {
        promptId: id,
        version: newVersion,
        content: prompt.content,
        variables: prompt.variables ?? [],
        status: "draft",
        createdById: user.id,
      },
    });

    await prisma.promptTemplates.update({
      where: { id },
      data: { version: newVersion },
    });

    return NextResponse.json({ data: version }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
