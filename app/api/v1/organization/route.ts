import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { V1Helper } from "@/lib/dev-platform/v1-helper";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireOrg(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const org = await prisma.organizations.findUnique({ where: { id: ctx.organizationId } });
      if (!org) throw new AppError("Organization not found", 404);
      return V1Helper.success(org);
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireOrg(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const body = await request.json();
      const allowed = ["name", "timezone"];
      const updateData: any = {};
      for (const key of allowed) {
        if (body[key] !== undefined) updateData[key] = body[key];
      }

      const org = await prisma.organizations.update({
        where: { id: ctx.organizationId },
        data: updateData,
      });
      return V1Helper.success(org);
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
