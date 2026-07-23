export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { MarketplaceManager } from "@/lib/integrations/marketplace";
import { z } from "zod";

const createReviewSchema = z.object({
  listingId: z.string().min(1),
  organizationId: z.string().min(1),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  content: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    if (!listingId) throw new AppError("listingId is required", 400);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const result = await MarketplaceManager.getReviews(listingId, { page, limit });
    return NextResponse.json({ data: result });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = createReviewSchema.parse(body);

    const review = await MarketplaceManager.createReview(
      parsed.listingId,
      user.id,
      parsed.organizationId,
      parsed.rating,
      parsed.content,
      parsed.title
    );

    return NextResponse.json({ data: review }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
