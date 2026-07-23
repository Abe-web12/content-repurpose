import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { V1Helper } from "@/lib/dev-platform/v1-helper";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const notification = await prisma.notifications.findUnique({ where: { id } });
      if (!notification || notification.userId !== ctx.userId) {
        throw new AppError("Notification not found", 404);
      }
      await prisma.notifications.update({ where: { id }, data: { read: true } });
      return V1Helper.success({ success: true });
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
