export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { webhookSchema } from "@/lib/validations/webhook";
import { sanitizeError, AppError, parseBody } from "@/lib/utils/api-errors";
import { hashWebhookSecret, maskSecret } from "@/lib/utils/webhook-secrets";

function transformWebhook(wh: any) {
  return {
    id: wh.id,
    user_id: wh.userId,
    name: wh.name || "Default",
    url: wh.url,
    secret: wh.secret ? maskSecret(wh.secret) : null,
    trigger_events: wh.triggerEvents || [],
    is_active: wh.isActive ?? true,
    retry_count: wh.retryCount || 0,
    last_success_at: wh.lastSuccessAt?.toISOString?.() || wh.lastSuccessAt || null,
    last_failure_at: wh.lastFailureAt?.toISOString?.() || wh.lastFailureAt || null,
    last_error: wh.lastError || null,
    created_at: wh.createdAt?.toISOString?.() || wh.createdAt,
    updated_at: wh.updatedAt?.toISOString?.() || wh.updatedAt,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const data = await prisma.userWebhooks.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: data ? transformWebhook(data) : null });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = webhookSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Invalid input";
      throw new AppError(firstError, 400);
    }

    const existing = await prisma.userWebhooks.findFirst({
      where: { userId: user.id },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    const rawSecret = parsed.data.secret || "";
    const hashedSecret = rawSecret ? hashWebhookSecret(rawSecret) : null;

    const payload = {
      url: parsed.data.url,
      secret: hashedSecret,
      isActive: parsed.data.is_active,
      triggerEvents: parsed.data.trigger_events,
    };

    let result;

    if (existing) {
      result = await prisma.userWebhooks.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      result = await prisma.userWebhooks.create({
        data: { ...payload, userId: user.id, name: "Default" },
      });
    }

    return NextResponse.json({ data: transformWebhook(result) });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
