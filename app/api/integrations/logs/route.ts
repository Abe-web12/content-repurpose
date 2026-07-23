export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { IntegrationLogger } from "@/lib/integrations/logs";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const installedId = searchParams.get("installedId");
    const organizationId = searchParams.get("organizationId");
    const level = searchParams.get("level") as any;
    const source = searchParams.get("source") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined;
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined;

    if (!installedId) throw new AppError("installedId is required", 400);

    const result = await IntegrationLogger.getLogs(installedId, {
      limit,
      offset,
      level,
      source,
      startDate,
      endDate,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
