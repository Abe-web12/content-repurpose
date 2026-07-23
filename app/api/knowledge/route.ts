import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { createKnowledgeBaseSchema } from "@/lib/validations/knowledge";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);
    const cursor = searchParams.get("cursor") ?? undefined;

    const knowledgeBases = await prisma.knowledgeBases.findMany({
      where: { organizationId: member.organizationId },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });

    const hasMore = knowledgeBases.length > limit;
    const data = hasMore ? knowledgeBases.slice(0, limit) : knowledgeBases;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return NextResponse.json({ data, nextCursor, hasMore });
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

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = createKnowledgeBaseSchema.parse(body);

    const kb = await prisma.knowledgeBases.create({
      data: {
        name: parsed.name,
        description: parsed.description ?? undefined,
        chunkingStrategy: parsed.chunkingStrategy ?? undefined,
        chunkSize: parsed.chunkSize ?? 500,
        chunkOverlap: parsed.chunkOverlap ?? 50,
        embeddingModel: parsed.embeddingModel ?? undefined,
        organizationId: member.organizationId,
        userId: user.id,
      },
    });

    return NextResponse.json({ data: kb }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
