import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { V1Helper } from "@/lib/dev-platform/v1-helper";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const { searchParams } = new URL(request.url);
      const pagination = V1Helper.parsePagination(searchParams);
      const source = searchParams.get("source");

      const where: any = { userId: ctx.userId };
      if (source) where.source = source;

      const [items, total] = await Promise.all([
        prisma.creditTransactions.findMany({
          where,
          take: pagination.perPage,
          skip: (pagination.page! - 1) * pagination.perPage,
          orderBy: { createdAt: "desc" },
        }),
        prisma.creditTransactions.count({ where }),
      ]);

      const data = items.map((t) => ({
        id: t.id,
        amount: t.amount,
        source: t.source,
        description: t.description,
        balance_after: t.balanceAfter,
        created_at: t.createdAt,
      }));

      return V1Helper.success(V1Helper.paginate(data, pagination, total));
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
