import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { V1Helper } from "@/lib/dev-platform/v1-helper";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireOrg(ctx);
    await V1Helper.withRateLimit(ctx, "/api/v1/generations");

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const { searchParams } = new URL(request.url);
      const pagination = V1Helper.parsePagination(searchParams);
      const sort = searchParams.get("sort") || "created_at";
      const order = searchParams.get("order") || "desc";
      const platform = searchParams.get("platform");
      const search = searchParams.get("search");

      const where: any = { userId: ctx.userId, deletedAt: null };
      if (platform) where.platform = platform;
      if (search) where.OR = [{ title: { contains: search } }, { content: { contains: search } }];

      const orderBy: any = {};
      orderBy[sort === "title" ? "title" : "createdAt"] = order;

      const [items, total] = await Promise.all([
        prisma.generations.findMany({
          where,
          orderBy,
          take: pagination.perPage,
          skip: (pagination.page! - 1) * pagination.perPage,
        }),
        prisma.generations.count({ where }),
      ]);

      return V1Helper.success(V1Helper.paginate(items, pagination, total));
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
