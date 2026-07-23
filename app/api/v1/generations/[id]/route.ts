import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { V1Helper } from "@/lib/dev-platform/v1-helper";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const generation = await prisma.generations.findUnique({ where: { id } });
      if (!generation || (generation.userId !== ctx.userId && generation.deletedAt)) {
        throw new AppError("Generation not found", 404);
      }
      return V1Helper.success(generation);
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const generation = await prisma.generations.findUnique({ where: { id } });
      if (!generation || generation.userId !== ctx.userId) {
        throw new AppError("Generation not found", 404);
      }
      await prisma.generations.update({ where: { id }, data: { deletedAt: new Date() } });
      return V1Helper.success({ success: true });
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
