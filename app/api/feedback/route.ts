export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError, parseBody } from "@/lib/utils/api-errors";
import { z } from "zod";

const feedbackSchema = z.object({
  type: z.enum(["general", "feature_request", "bug_report", "nps"]).optional().default("general"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError(Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Invalid input", 400);
    }

    await prisma.feedback.create({
      data: {
        type: parsed.data.type.toUpperCase() as any,
        message: parsed.data.message,
        rating: parsed.data.rating || null,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
