import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MarketplaceHome } from "./home";
import { auth } from "@clerk/nextjs/server";
import {
  DEFAULT_INTEGRATIONS,
  getDefaultCategories,
  getDefaultFeatured,
} from "@/lib/integrations/defaults";

export const metadata = {
  title: "Marketplace - RepurposeAI",
  description: "Browse and install integrations",
};

export default async function MarketplacePage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const membership = await prisma.organizationMembers.findFirst({
    where: { userId: userId },
    select: { organizationId: true },
  });

  if (!membership) redirect("/");

  const [dbFeatured, dbCategories, dbListings] = await Promise.all([
    prisma.marketplaceListings.findMany({
      where: {
        featured: true,
        status: "APPROVED",
        OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }],
      },
      orderBy: { installCount: "desc" },
      take: 6,
    }),
    prisma.marketplaceListings.groupBy({
      by: ["category"],
      where: { status: "APPROVED" },
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
    }),
    prisma.marketplaceListings.findMany({
      where: { status: "APPROVED" },
      orderBy: { installCount: "desc" },
      take: 12,
    }),
  ]);

  const hasDbRecords = dbListings.length > 0;

  const featured = hasDbRecords
    ? JSON.parse(JSON.stringify(dbFeatured))
    : getDefaultFeatured();

  const categories = hasDbRecords
    ? dbCategories.map((c) => ({ category: c.category, count: c._count.category }))
    : getDefaultCategories();

  const listings = hasDbRecords
    ? JSON.parse(JSON.stringify(dbListings))
    : DEFAULT_INTEGRATIONS.map((d) => ({
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
      }));

  return (
    <MarketplaceHome
      featured={featured}
      categories={categories}
      listings={listings}
      organizationId={membership.organizationId}
    />
  );
}
