export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { AuditService } from "@/lib/audit";
import { IntegrationInstaller } from "@/lib/integrations/installer";
import { IntegrationPermissions } from "@/lib/integrations/permissions";
import { z } from "zod";

const uninstallSchema = z.object({
  integrationKey: z.string().min(1),
  organizationId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = uninstallSchema.parse(body);

    await IntegrationPermissions.validateOrgAccess(parsed.organizationId, user.id, "uninstall");

    await IntegrationInstaller.uninstall(parsed.organizationId, parsed.integrationKey);

    AuditService.log({
      event: "ADMIN_ACTION",
      userId: user.id,
      action: `Uninstalled integration ${parsed.integrationKey}`,
      metadata: { integrationKey: parsed.integrationKey, organizationId: parsed.organizationId },
    }).catch(() => {});

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
