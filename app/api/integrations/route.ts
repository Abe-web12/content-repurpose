export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimitByIp } from "@/lib/utils/rate-limit";
import { AuditService } from "@/lib/audit";
import { IntegrationManager } from "@/lib/integrations/manager";
import { IntegrationPermissions } from "@/lib/integrations/permissions";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;

    const integrations = await IntegrationManager.getIntegrations({
      type,
      category,
      search,
    });

    return NextResponse.json({ data: integrations });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
