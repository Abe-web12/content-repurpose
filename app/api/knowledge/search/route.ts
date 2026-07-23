import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { searchKnowledgeSchema } from "@/lib/validations/knowledge";
import { cosineSimilarity, parseEmbeddingVector } from "@/lib/studio/knowledge-engine";

export const runtime = "nodejs";

function generateMockEmbedding(dimensions = 1536): number[] {
  return Array.from({ length: dimensions }, () => Math.random() * 2 - 1);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = searchKnowledgeSchema.parse(body);

    const whereBaseId = parsed.knowledgeBaseId
      ? { knowledgeBaseId: parsed.knowledgeBaseId }
      : {};

    const queryEmbedding = generateMockEmbedding();

    const documents = await prisma.knowledgeDocuments.findMany({
      where: {
        ...whereBaseId,
        status: "READY",
        knowledgeBase: { organizationId: member.organizationId },
      },
      include: {
        chunks: {
          include: { embeddings: true },
        },
      },
    });

    const results: {
      chunkId: string;
      content: string;
      score: number;
      documentTitle: string;
      documentId: string;
    }[] = [];

    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        for (const emb of chunk.embeddings) {
          const vector = parseEmbeddingVector(emb.vector);
          const score = cosineSimilarity(queryEmbedding, vector);
          if (score >= parsed.threshold) {
            results.push({
              chunkId: chunk.id,
              content: chunk.content,
              score,
              documentTitle: doc.title,
              documentId: doc.id,
            });
          }
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, parsed.limit);

    return NextResponse.json({ data: topResults });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
