import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { chunkText } from "@/lib/studio/knowledge-engine";

export const runtime = "nodejs";

function generateMockEmbedding(dimensions = 1536): string {
  const vec = Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
  return JSON.stringify(vec);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<{
      knowledgeBaseId: string;
      title: string;
      source?: string | null;
      content: string;
      sourceType: string;
      fileSize?: number | null;
      fileType?: string | null;
    }>(request);

    const kb = await prisma.knowledgeBases.findFirst({
      where: { id: body.knowledgeBaseId, organizationId: member.organizationId },
    });
    if (!kb) throw new AppError("Knowledge base not found", 404);

    const document = await prisma.knowledgeDocuments.create({
      data: {
        knowledgeBaseId: kb.id,
        organizationId: member.organizationId,
        userId: user.id,
        title: body.title,
        source: body.source ?? "",
        sourceType: body.sourceType,
        content: body.content,
        fileSize: body.fileSize ?? null,
        fileType: body.fileType ?? null,
        status: "PROCESSING",
      },
    });

    const chunks = chunkText(body.content, kb.chunkSize, kb.chunkOverlap);

    for (const chunk of chunks) {
      const createdChunk = await prisma.knowledgeChunks.create({
        data: {
          documentId: document.id,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          tokenCount: chunk.tokenCount,
        },
      });

      await prisma.embeddings.create({
        data: {
          chunkId: createdChunk.id,
          model: kb.embeddingModel ?? "text-embedding-3-small",
          vector: generateMockEmbedding(),
          dimensions: 1536,
        },
      });
    }

    const updated = await prisma.knowledgeDocuments.update({
      where: { id: document.id },
      data: { status: "READY" },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
