export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { createClient } from "@/lib/supabase/server";
import { MarketplaceManager } from "@/lib/integrations/marketplace";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const [featured, topRated, recentlyAdded] = await Promise.all([
      MarketplaceManager.getFeatured(),
      MarketplaceManager.getTopRated(10),
      MarketplaceManager.getRecentlyAdded(10),
    ]);

    return NextResponse.json({ data: { featured, topRated, recentlyAdded } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
