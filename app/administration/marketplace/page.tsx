import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminMarketplace } from "./admin";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "Marketplace Admin - RepurposeAI",
};

export default async function AdminMarketplacePage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const membership = await prisma.organizationMembers.findFirst({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!membership) redirect("/");

  const [listings, categories, stats] = await Promise.all([
    prisma.marketplaceListings.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.integrationCategories.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    Promise.all([
    prisma.marketplaceListings.count(),
    prisma.marketplaceListings.count({ where: { status: "APPROVED" } }),
    prisma.marketplaceListings.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.marketplaceListings.count({ where: { status: "DRAFT" } }),
    prisma.marketplaceListings.count({ where: { featured: true } }),
    prisma.marketplaceReviews.count(),
    ]),
  ]);

  const [total, approved, pending, draft, featuredCount, reviewCount] = stats;

  return (
    <AdminMarketplace
      listings={JSON.parse(JSON.stringify(listings))}
      categories={JSON.parse(JSON.stringify(categories))}
      stats={{ total, approved, pending, draft, featured: featuredCount, reviews: reviewCount }}
    />
  );
}
