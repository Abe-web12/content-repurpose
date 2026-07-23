import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  try {
    const { id, versionId } = await params;
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

    const version = await prisma.promptVersions.findFirst({
      where: { id: versionId, promptId: id },
    });
    if (!version) throw new AppError("Version not found", 404);

    return NextResponse.json({ data: version });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  try {
    const { id, versionId } = await params;
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

    const version = await prisma.promptVersions.findFirst({
      where: { id: versionId, promptId: id },
    });
    if (!version) throw new AppError("Version not found", 404);

    const body = await parseBody<{ status?: string }>(request);
    const { status: newStatus } = body;

    if (!newStatus || !["draft", "published", "archived"].includes(newStatus)) {
      throw new AppError("Status must be one of: draft, published, archived", 400);
    }

    const updated = await prisma.promptVersions.update({
      where: { id: versionId },
      data: { status: newStatus },
    });

    if (newStatus === "published") {
      await prisma.promptTemplates.update({
        where: { id },
        data: { status: "PUBLISHED", content: version.content },
      });
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
