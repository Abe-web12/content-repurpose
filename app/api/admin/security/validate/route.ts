import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { SecurityService } from "@/lib/security";
import { rateLimit } from "@/lib/utils/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const validateSchema = z.object({
  input: z.string().min(1).max(50000),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const limitResult = await rateLimit(`admin:validate:${user.id}`, {
      windowMs: 60000,
      maxRequests: 100,
    });
    if (!limitResult.success) throw new AppError("Too many requests", 429);

    const body = await parseBody<Record<string, unknown>>(request);
    const validation = validateSchema.safeParse(body);
    if (!validation.success) {
      throw new AppError("Input is required", 400);
    }

    const hasSuspicious = SecurityService.containsSuspiciousContent(validation.data.input);
    const sanitized = SecurityService.sanitizeInput(validation.data.input);

    return NextResponse.json({
      data: {
        suspicious: hasSuspicious,
        sanitized: sanitized !== validation.data.input ? sanitized : undefined,
        originalLength: validation.data.input.length,
        sanitizedLength: sanitized.length,
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
