export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { IntegrationManager } from "@/lib/integrations/manager";
import { IntegrationLogger } from "@/lib/integrations/logs";
import { IntegrationPermissions } from "@/lib/integrations/permissions";
import { z } from "zod";

const syncSchema = z.object({
  installedId: z.string().min(1),
  organizationId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = syncSchema.parse(body);

    await IntegrationPermissions.validateOrgAccess(parsed.organizationId, user.id, "sync");

    const installed = await prisma.installedIntegrations.findUnique({
      where: { id: parsed.installedId },
    });
    if (!installed) throw new AppError("Integration not installed", 404);

    if (installed.status !== "CONNECTED") {
      throw new AppError("Integration is not connected", 400);
    }

    await IntegrationManager.updateInstalledStatus(parsed.installedId, {
      lastSyncAt: new Date(),
      lastSyncStatus: "syncing",
    });

    const syncStart = Date.now();

    try {
      const { IntegrationRegistry } = await import("@/lib/integrations/registry");
      const adapter = IntegrationRegistry.getInstance().get(installed.integrationKey);

      const result = await adapter.sync(parsed.installedId, installed.config as Record<string, unknown>);

      const duration = Date.now() - syncStart;

      await IntegrationManager.updateInstalledStatus(parsed.installedId, {
        lastSyncAt: new Date(),
        lastSyncStatus: result.success ? "success" : "failed",
        lastError: result.errors?.join(", ") || null,
      });

      await IntegrationLogger.log(
        parsed.installedId,
        parsed.organizationId,
        result.success ? "info" : "error",
        result.success
          ? `Sync completed: ${result.recordsProcessed ?? 0} records processed`
          : `Sync failed: ${result.errors?.join(", ") || "Unknown error"}`,
        { duration, ...result.metadata },
        "sync"
      );

      return NextResponse.json({ data: result }, { status: result.success ? 200 : 500 });
    } catch (syncErr) {
      const duration = Date.now() - syncStart;
      const message = syncErr instanceof Error ? syncErr.message : "Sync failed";

      await IntegrationManager.updateInstalledStatus(parsed.installedId, {
        lastSyncAt: new Date(),
        lastSyncStatus: "failed",
        lastError: message,
      });

      await IntegrationLogger.log(
        parsed.installedId,
        parsed.organizationId,
        "error",
        `Sync failed: ${message}`,
        { duration },
        "sync"
      );

      throw new AppError(message, 500);
    }
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
