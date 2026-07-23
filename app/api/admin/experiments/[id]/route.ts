import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { ExperimentFramework } from "@/lib/experiments";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum(["start", "stop", "declare_winner", "assign", "record_metric"]),
  variantName: z.string().optional(),
  userId: z.string().optional(),
  metric: z.object({
    name: z.string(),
    value: z.number(),
  }).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { id } = await params;
    const experiment = await ExperimentFramework.getExperiment(id);
    if (!experiment) throw new AppError("Experiment not found", 404);

    const results = await ExperimentFramework.getResults(id);
    return NextResponse.json({ data: results });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`admin:experiments:${user.id}`, {
      windowMs: 60000,
      maxRequests: 30,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const { id } = await params;
    const body = await parseBody<Record<string, unknown>>(request);
    const validation = actionSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError("Invalid action payload", 400);
    }

    const { action, variantName, userId: targetUserId, metric } = validation.data;

    switch (action) {
      case "start":
        await ExperimentFramework.startExperiment(id);
        break;
      case "stop":
        await ExperimentFramework.stopExperiment(id);
        break;
      case "declare_winner":
        if (!variantName) throw new AppError("variantName required", 400);
        await ExperimentFramework.declareWinner(id, variantName);
        break;
      case "assign":
        if (!targetUserId) throw new AppError("userId required", 400);
        const variant = await ExperimentFramework.assignVariant(id, { userId: targetUserId });
        return NextResponse.json({ data: { variant } });
      case "record_metric":
        if (!variantName || !metric) throw new AppError("variantName and metric required", 400);
        await ExperimentFramework.recordMetric(id, variantName, metric);
        break;
    }

    return NextResponse.json({ data: { id, action, success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
