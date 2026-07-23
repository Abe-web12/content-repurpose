import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";

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

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const kb = await prisma.knowledgeBases.findFirst({
      where: { id, organizationId: member.organizationId },
    });
    if (!kb) throw new AppError("Knowledge base not found", 404);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);
    const cursor = searchParams.get("cursor") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const where: Record<string, unknown> = { knowledgeBaseId: id };
    if (status) where.status = status;

    const documents = await prisma.knowledgeDocuments.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = documents.length > limit;
    const data = hasMore ? documents.slice(0, limit) : documents;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return NextResponse.json({ data, nextCursor, hasMore });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
