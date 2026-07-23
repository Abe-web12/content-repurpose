import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { AgentKnowledge } from "@/lib/agents/knowledge";
import { documentSchema } from "@/lib/validations/agents";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> },
) {
  try {
    const { kbId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`agents:documents:list:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const { searchParams } = new URL(request.url);
    const documents = await AgentKnowledge.getDocuments(kbId, {
      limit: Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100),
      cursor: searchParams.get("cursor") ?? undefined,
    });

    return NextResponse.json({ data: documents.data, nextCursor: documents.nextCursor, hasMore: documents.hasMore });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kbId: string }> },
) {
  try {
    const { kbId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`agents:documents:create:${user.id}`, { windowMs: 60000, maxRequests: 30 });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } });
    if (!member) throw new AppError("No organization found", 404);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = documentSchema.parse(body);

    const doc = await AgentKnowledge.addDocument(kbId, { organizationId: member.organizationId, userId: user.id }, {
      title: parsed.title,
      source: parsed.source,
      sourceType: parsed.sourceType,
      content: parsed.content,
    });

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
