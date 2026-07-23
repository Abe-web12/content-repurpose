export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { MarketplaceManager } from "@/lib/integrations/marketplace";
import { filterDefaultIntegrations, getDefaultCategories } from "@/lib/integrations/defaults";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const sort = (searchParams.get("sort") || "popular") as any;
    const featured = searchParams.get("featured") === "true" || undefined;
    const isFree = searchParams.get("isFree") !== null ? searchParams.get("isFree") === "true" : undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "20");

    const dbCount = await MarketplaceManager.getListings({ page: 1, perPage: 1 });
    const hasDbRecords = dbCount.total > 0;

    if (!hasDbRecords) {
      const filtered = filterDefaultIntegrations({ category, search, sort, featured, isFree });
      const start = (page - 1) * perPage;
      const items = filtered.slice(start, start + perPage);
      return NextResponse.json({
        data: {
          items: items.map((d) => ({
            id: d.id,
            integrationKey: d.integrationKey,
            name: d.name,
            description: d.description,
            category: d.category,
            featured: d.featured,
            installCount: d.installCount,
            averageRating: d.averageRating,
            isFree: d.isFree,
            tags: d.tags,
          })),
          total: filtered.length,
          page,
          perPage,
          hasMore: start + perPage < filtered.length,
        },
      });
    }

    const result = await MarketplaceManager.getListings({
      category,
      search,
      sort,
      featured,
      isFree,
      page,
      perPage,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
