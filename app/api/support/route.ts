export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError, parseBody } from "@/lib/utils/api-errors";
import { z } from "zod";

const supportSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  category: z.enum(["general", "billing", "technical", "account", "feature"]).optional().default("general"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = supportSchema.safeParse(body);

    if (!parsed.success) {
      throw new AppError(Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Invalid input", 400);
    }

    const ticket = await prisma.supportTickets.create({
      data: {
        subject: parsed.data.subject,
        message: parsed.data.message,
        category: parsed.data.category,
        status: "OPEN",
        userId: user.id,
      },
    });

    return NextResponse.json({
      data: {
        id: ticket.id,
        status: ticket.status,
        created_at: ticket.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
