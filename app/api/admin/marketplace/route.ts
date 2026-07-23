export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { AuditService } from "@/lib/audit";
import { IntegrationCache } from "@/lib/integrations/cache";
import { z } from "zod";

async function requireAdmin(userId: string) {
  const user = await prisma.users.findUnique({ where: { id: userId }, select: { plan: true } });
  const member = await prisma.organizationMembers.findFirst({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!member) throw new AppError("Admin access required", 403);
  return member;
}

const updateListingSchema = z.object({
  id: z.string(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]).optional(),
  featured: z.boolean().optional(),
  featuredUntil: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    await requireAdmin(user.id);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "20");

    const where: Prisma.MarketplaceListingsWhereInput = {};
    if (status) where.status = status as any;

    const [listings, total] = await Promise.all([
      prisma.marketplaceListings.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: perPage,
        skip: (page - 1) * perPage,
      }),
      prisma.marketplaceListings.count({ where }),
    ]);

    return NextResponse.json({
      data: { items: listings, total, page, perPage, hasMore: page * perPage < total },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const admin = await requireAdmin(user.id);
    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = updateListingSchema.parse(body);

    const updateData: Prisma.MarketplaceListingsUpdateInput = {};
    if (parsed.status) updateData.status = parsed.status as any;
    if (parsed.featured !== undefined) updateData.featured = parsed.featured;
    if (parsed.featuredUntil) updateData.featuredUntil = new Date(parsed.featuredUntil);

    if (parsed.status === "APPROVED") {
      updateData.approvedAt = new Date();
      updateData.publishedAt = new Date();
    }

    const listing = await prisma.marketplaceListings.update({
      where: { id: parsed.id },
      data: updateData,
    });

    await IntegrationCache.invalidatePattern("marketplace:*");

    AuditService.log({
      event: "ADMIN_ACTION",
      userId: user.id,
      action: `Updated marketplace listing ${listing.name}`,
      metadata: { listingId: parsed.id, updates: updateData },
    }).catch(() => {});

    return NextResponse.json({ data: listing });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    await requireAdmin(user.id);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new AppError("id is required", 400);

    await prisma.marketplaceListings.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await IntegrationCache.invalidatePattern("marketplace:*");

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
