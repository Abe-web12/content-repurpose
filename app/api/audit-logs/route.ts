import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { AuditService } from "@/lib/audit";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  userId: z.string().optional(),
  event: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`audit:list:${user.id}`, {
      windowMs: 60000,
      maxRequests: 30,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const { searchParams } = new URL(request.url);
    const query = querySchema.safeParse({
      userId: searchParams.get("userId"),
      event: searchParams.get("event"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
    });
    if (!query.success) {
      throw new AppError(query.error.errors.map((e) => e.message).join(", "), 400);
    }

    const result = await AuditService.query({
      userId: query.data.userId,
      event: query.data.event as any,
      startDate: query.data.startDate ? new Date(query.data.startDate) : undefined,
      endDate: query.data.endDate ? new Date(query.data.endDate) : undefined,
      limit: query.data.limit,
      offset: query.data.offset,
    });

    return NextResponse.json(result);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
