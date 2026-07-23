export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { IntegrationWebhookManager } from "@/lib/integrations/webhooks";
import { IntegrationPermissions } from "@/lib/integrations/permissions";
import { z } from "zod";

const registerSchema = z.object({
  installedId: z.string().min(1),
  organizationId: z.string().min(1),
  event: z.string().min(1),
  targetUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = registerSchema.parse(body);

    await IntegrationPermissions.validateOrgAccess(parsed.organizationId, user.id, "configure");

    const webhook = await IntegrationWebhookManager.register(
      parsed.installedId,
      parsed.organizationId,
      parsed.event,
      parsed.targetUrl
    );

    return NextResponse.json({ data: webhook }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("webhookId");
    if (!webhookId) throw new AppError("webhookId is required", 400);

    await IntegrationWebhookManager.unregister(webhookId);

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
