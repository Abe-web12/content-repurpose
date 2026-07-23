import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { ExperimentFramework } from "@/lib/experiments";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  type: z.string().default("provider"),
  variants: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    provider: z.string().optional(),
    config: z.record(z.unknown()).optional(),
    traffic: z.number().min(1).optional().default(1),
  })).min(2, "At least 2 variants required"),
});

const assignSchema = z.object({
  experimentId: z.string(),
  userId: z.string(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const experiments = await ExperimentFramework.listExperiments();
    return NextResponse.json({ data: experiments });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`admin:experiments:${user.id}`, {
      windowMs: 60000,
      maxRequests: 20,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = createSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError(
        Object.values(validation.error.flatten().fieldErrors).flat()[0] as string || "Invalid input",
        400,
      );
    }

    const experiment = await ExperimentFramework.createExperiment({
      name: validation.data.name,
      description: validation.data.description,
      type: validation.data.type,
      variants: validation.data.variants as any,
      createdById: user.id,
    });

    return NextResponse.json({ data: experiment }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
