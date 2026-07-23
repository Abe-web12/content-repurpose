export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { AuditService } from "@/lib/audit";
import { OAuthManager } from "@/lib/integrations/oauth";
import { IntegrationPermissions } from "@/lib/integrations/permissions";
import { z } from "zod";

const disconnectSchema = z.object({
  installedId: z.string().min(1),
  organizationId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = disconnectSchema.parse(body);

    await IntegrationPermissions.validateOrgAccess(parsed.organizationId, user.id, "configure");

    const connection = await prisma.oauthConnections.findFirst({
      where: { installedId: parsed.installedId, isRevoked: false },
    });

    if (connection) {
      await OAuthManager.revokeConnection(connection.id);
    }

    await prisma.installedIntegrations.update({
      where: { id: parsed.installedId },
      data: { status: "DISCONNECTED" },
    });

    AuditService.log({
      event: "OAUTH_DISCONNECTED",
      userId: user.id,
      action: "Disconnected integration OAuth",
      metadata: { installedId: parsed.installedId },
    }).catch(() => {});

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
