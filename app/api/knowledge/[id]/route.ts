import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { updateKnowledgeBaseSchema } from "@/lib/validations/knowledge";

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

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const kb = await prisma.knowledgeBases.findFirst({
      where: { id, organizationId: member.organizationId },
      include: {
        _count: { select: { documents: true } },
      },
    });

    if (!kb) throw new AppError("Knowledge base not found", 404);

    return NextResponse.json({ data: kb });
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

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const existing = await prisma.knowledgeBases.findFirst({
      where: { id, organizationId: member.organizationId },
    });
    if (!existing) throw new AppError("Knowledge base not found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = updateKnowledgeBaseSchema.parse(body);

    const kb = await prisma.knowledgeBases.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.description !== undefined && { description: parsed.description }),
        ...(parsed.chunkingStrategy !== undefined && { chunkingStrategy: parsed.chunkingStrategy }),
        ...(parsed.chunkSize !== undefined && { chunkSize: parsed.chunkSize }),
        ...(parsed.chunkOverlap !== undefined && { chunkOverlap: parsed.chunkOverlap }),
        ...(parsed.embeddingModel !== undefined && { embeddingModel: parsed.embeddingModel }),
      },
    });

    return NextResponse.json({ data: kb });
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

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const existing = await prisma.knowledgeBases.findFirst({
      where: { id, organizationId: member.organizationId },
    });
    if (!existing) throw new AppError("Knowledge base not found", 404);

    await prisma.knowledgeBases.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
