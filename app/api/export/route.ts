import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { ExportService } from "@/lib/export";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const exportSchema = z.object({
  format: z.enum(["csv", "json"]),
  entity: z.enum(["generations", "scheduled_posts", "workflow_runs", "audit_logs"]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`export:${user.id}`, {
      windowMs: 60000,
      maxRequests: 10,
    });
    if (!limitResult.success) throw new AppError("Too many requests. Please slow down.", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = exportSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const result = await ExportService.export({
      ...validation.data,
      userId: user.id,
    });

    return NextResponse.json({
      data: result,
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
