import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { V1Helper } from "@/lib/dev-platform/v1-helper";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireOrg(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const { searchParams } = new URL(request.url);
      const pagination = V1Helper.parsePagination(searchParams);
      const role = searchParams.get("role");

      const where: any = { organizationId: ctx.organizationId };
      if (role) where.role = role;

      const [items, total] = await Promise.all([
        prisma.organizationMembers.findMany({
          where,
          take: pagination.perPage,
          skip: (pagination.page! - 1) * pagination.perPage,
          orderBy: { joinedAt: "desc" },
        }),
        prisma.organizationMembers.count({ where }),
      ]);

      return V1Helper.success(V1Helper.paginate(items, pagination, total));
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
