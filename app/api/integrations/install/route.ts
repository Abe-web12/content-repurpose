export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { AuditService } from "@/lib/audit";
import { IntegrationInstaller } from "@/lib/integrations/installer";
import { IntegrationPermissions } from "@/lib/integrations/permissions";
import { z } from "zod";

const installSchema = z.object({
  integrationKey: z.string().min(1),
  organizationId: z.string().min(1),
  config: z.record(z.unknown()).optional(),
  credentials: z.record(z.string()).optional(),
  oauthCode: z.string().optional(),
  oauthRedirectUri: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = installSchema.parse(body);

    await IntegrationPermissions.validateOrgAccess(parsed.organizationId, user.id, "install");

    const result = await IntegrationInstaller.install(
      parsed.organizationId,
      parsed.integrationKey,
      {
        organizationId: parsed.organizationId,
        userId: user.id,
        config: parsed.config,
        credentials: parsed.credentials,
        oauthCode: parsed.oauthCode,
        oauthRedirectUri: parsed.oauthRedirectUri,
      }
    );

    AuditService.log({
      event: "ADMIN_ACTION",
      userId: user.id,
      action: `Installed integration ${parsed.integrationKey}`,
      metadata: { integrationKey: parsed.integrationKey, organizationId: parsed.organizationId },
    }).catch(() => {});

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
