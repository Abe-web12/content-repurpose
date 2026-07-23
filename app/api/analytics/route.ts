export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { cacheGet, cacheKey } from "@/lib/utils/cache";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [aggregations, dbUser] = await Promise.all([
      prisma.$queryRaw<Array<{
        total_generations: bigint;
        total_scheduled: bigint;
        total_published: bigint;
        weekly_trend: string;
        monthly_trend: string;
        platform_json: string;
      }>>`
        SELECT
          (SELECT COUNT(*)::bigint FROM generations WHERE user_id = ${user.id} AND deleted_at IS NULL) AS total_generations,
          (SELECT COUNT(*)::bigint FROM scheduled_posts WHERE user_id = ${user.id}) AS total_scheduled,
          (SELECT COUNT(*)::bigint FROM scheduled_posts WHERE user_id = ${user.id} AND status = 'PUBLISHED') AS total_published,
          COALESCE(
            (SELECT json_agg(json_build_object('date', d::date, 'count', COALESCE(cnt, 0))) FROM
              generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d
              LEFT JOIN (SELECT created_at::date AS day, COUNT(*)::int AS cnt FROM generations
                WHERE user_id = ${user.id} AND deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '6 days'
                GROUP BY day) sub ON d::date = sub.day
            )::text,
            '[]'
          ) AS weekly_trend,
          COALESCE(
            (SELECT json_agg(json_build_object('date', d::date, 'count', COALESCE(cnt, 0))) FROM
              generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day') AS d
              LEFT JOIN (SELECT created_at::date AS day, COUNT(*)::int AS cnt FROM generations
                WHERE user_id = ${user.id} AND deleted_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '29 days'
                GROUP BY day) sub ON d::day = sub.day
            )::text,
            '[]'
          ) AS monthly_trend,
          COALESCE(
            (SELECT json_agg(json_build_object('name', output_format, 'value', cnt)) FROM
              (SELECT output_format, COUNT(*)::int AS cnt FROM generations
                WHERE user_id = ${user.id} AND deleted_at IS NULL AND output_format IS NOT NULL
                GROUP BY output_format) sub
            )::text,
            '[]'
          ) AS platform_json
      `,
      prisma.users.findUnique({
        where: { id: user.id },
        select: { generationsUsed: true, generationsLimit: true, plan: true },
      }),
    ]);

    const row = Array.isArray(aggregations) ? aggregations[0] : aggregations;

    return NextResponse.json({
      data: {
        totalGenerations: Number(row?.total_generations ?? 0),
        totalScheduled: Number(row?.total_scheduled ?? 0),
        totalPublished: Number(row?.total_published ?? 0),
        weeklyTrend: JSON.parse(row?.weekly_trend ?? "[]"),
        monthlyTrend: JSON.parse(row?.monthly_trend ?? "[]"),
        platformBreakdown: JSON.parse(row?.platform_json ?? "[]"),
        usage: {
          used: dbUser?.generationsUsed ?? 0,
          limit: dbUser?.generationsLimit ?? 3,
          plan: dbUser?.plan ?? "free",
        },
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
