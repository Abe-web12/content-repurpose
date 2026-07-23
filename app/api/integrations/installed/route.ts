export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { IntegrationManager } from "@/lib/integrations/manager";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    if (!organizationId) throw new AppError("organizationId is required", 400);

    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const installed = await IntegrationManager.getInstalled(organizationId, {
      status,
      search,
    });

    return NextResponse.json({ data: installed });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
