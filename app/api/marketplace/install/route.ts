export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { AuditService } from "@/lib/audit";
import { IntegrationInstaller } from "@/lib/integrations/installer";
import { IntegrationPermissions } from "@/lib/integrations/permissions";
import { z } from "zod";

const installSchema = z.object({
  integrationKey: z.string().min(1),
  organizationId: z.string().min(1),
  config: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = installSchema.parse(body);

    await IntegrationPermissions.validateOrgAccess(parsed.organizationId, user.id, "install");

    const result = await IntegrationInstaller.install(parsed.organizationId, parsed.integrationKey, {
      organizationId: parsed.organizationId,
      userId: user.id,
      config: parsed.config,
    });

    await prisma.marketplaceListings.update({
      where: { integrationKey: parsed.integrationKey },
      data: { installCount: { increment: 1 } },
    });

    AuditService.log({
      event: "ADMIN_ACTION",
      userId: user.id,
      action: `Installed marketplace integration ${parsed.integrationKey}`,
      metadata: { integrationKey: parsed.integrationKey },
    }).catch(() => {});

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
