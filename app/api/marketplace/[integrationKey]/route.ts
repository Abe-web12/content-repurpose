export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { MarketplaceManager } from "@/lib/integrations/marketplace";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ integrationKey: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { integrationKey } = await params;
    const listing = await MarketplaceManager.getListing(integrationKey);
    return NextResponse.json({ data: listing });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
