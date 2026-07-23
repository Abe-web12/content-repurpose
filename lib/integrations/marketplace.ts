import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { MarketplaceFilter } from "./types";
import { IntegrationError } from "./errors";

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
  nextCursor?: string;
}

interface CategoryWithCount {
  category: string;
  count: number;
}

interface CreateReviewData {
  rating: number;
  title?: string;
  content?: string;
}

interface UpdateReviewData {
  rating?: number;
  title?: string;
  content?: string;
}

export class MarketplaceManager {
  static async getListings(filter: MarketplaceFilter): Promise<PaginatedResult<unknown>> {
    const where: Prisma.MarketplaceListingsWhereInput = {
      status: "APPROVED",
    };

    if (filter.category) {
      where.category = filter.category;
    }
    if (filter.featured) {
      where.featured = true;
    }
    if (filter.isFree !== undefined) {
      where.isFree = filter.isFree;
    }
    if (filter.tags && filter.tags.length > 0) {
      where.tags = { hasSome: filter.tags };
    }
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: "insensitive" } },
        { description: { contains: filter.search, mode: "insensitive" } },
        { shortDescription: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const page = filter.page ?? 1;
    const perPage = Math.min(filter.perPage ?? 20, 100);
    const skip = (page - 1) * perPage;

    let orderBy: Prisma.MarketplaceListingsOrderByWithRelationInput;
    switch (filter.sort) {
      case "rating":
        orderBy = { averageRating: "desc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "name":
        orderBy = { name: "asc" };
        break;
      case "popular":
      default:
        orderBy = { installCount: "desc" };
        break;
    }

    const [items, total] = await Promise.all([
      prisma.marketplaceListings.findMany({
        where,
        orderBy,
        take: perPage,
        skip,
      }),
      prisma.marketplaceListings.count({ where }),
    ]);

    const hasMore = skip + perPage < total;
    const nextCursor = hasMore ? Buffer.from(String(page + 1)).toString("base64") : undefined;

    return { items, total, page, perPage, hasMore, nextCursor };
  }

  static async getListing(integrationKey: string) {
    const listing = await prisma.marketplaceListings.findUnique({
      where: { integrationKey },
    });

    if (!listing) {
      throw new IntegrationError(
        `Marketplace listing "${integrationKey}" not found`,
        "LISTING_NOT_FOUND",
        404
      );
    }

    return listing;
  }

  static async getFeatured() {
    return prisma.marketplaceListings.findMany({
      where: {
        featured: true,
        status: "APPROVED",
        OR: [
          { featuredUntil: null },
          { featuredUntil: { gt: new Date() } },
        ],
      },
      orderBy: { installCount: "desc" },
      take: 20,
    });
  }

  static async getTopRated(limit = 20) {
    return prisma.marketplaceListings.findMany({
      where: { status: "APPROVED" },
      orderBy: { averageRating: "desc" },
      take: Math.min(limit, 100),
    });
  }

  static async getRecentlyAdded(limit = 20) {
    return prisma.marketplaceListings.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });
  }

  static async getByCategory(category: string) {
    return prisma.marketplaceListings.findMany({
      where: { category, status: "APPROVED" },
      orderBy: { installCount: "desc" },
    });
  }

  static async search(query: string) {
    return prisma.marketplaceListings.findMany({
      where: {
        status: "APPROVED",
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { shortDescription: { contains: query, mode: "insensitive" } },
          { tags: { has: query } },
        ],
      },
      orderBy: [{ installCount: "desc" }, { averageRating: "desc" }],
      take: 50,
    });
  }

  static async getCategories(): Promise<CategoryWithCount[]> {
    const categories = await prisma.marketplaceListings.groupBy({
      by: ["category"],
      where: { status: "APPROVED" },
      _count: { category: true },
    });

    return categories.map((c) => ({
      category: c.category,
      count: c._count.category,
    }));
  }

  static async getReviews(
    listingId: string,
    options?: { limit?: number; offset?: number; page?: number }
  ) {
    const page = options?.page ?? 1;
    const perPage = Math.min(options?.limit ?? 20, 100);
    const skip = (page - 1) * perPage;

    const [reviews, total] = await Promise.all([
      prisma.marketplaceReviews.findMany({
        where: { listingId },
        orderBy: { createdAt: "desc" },
        take: perPage,
        skip: options?.offset ?? skip,
      }),
      prisma.marketplaceReviews.count({ where: { listingId } }),
    ]);

    return { reviews, total, page, perPage, hasMore: skip + perPage < total };
  }

  static async createReview(
    listingId: string,
    userId: string,
    organizationId: string,
    rating: number,
    content?: string,
    title?: string
  ) {
    if (rating < 1 || rating > 5) {
      throw new IntegrationError("Rating must be between 1 and 5", "INVALID_RATING", 400);
    }

    const existing = await prisma.marketplaceReviews.findUnique({
      where: { listingId_userId: { listingId, userId } },
    });

    if (existing) {
      throw new IntegrationError("You have already reviewed this listing", "ALREADY_REVIEWED", 409);
    }

    const review = await prisma.marketplaceReviews.create({
      data: {
        listingId,
        userId,
        organizationId,
        rating,
        title,
        content,
        isVerified: false,
        isEdited: false,
      },
    });

    await this.updateListingRatings(listingId);

    return review;
  }

  static async updateReview(id: string, data: UpdateReviewData) {
    const review = await prisma.marketplaceReviews.findUnique({
      where: { id },
    });

    if (!review) {
      throw new IntegrationError("Review not found", "REVIEW_NOT_FOUND", 404);
    }

    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new IntegrationError("Rating must be between 1 and 5", "INVALID_RATING", 400);
    }

    const updated = await prisma.marketplaceReviews.update({
      where: { id },
      data: {
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        isEdited: true,
      },
    });

    if (data.rating !== undefined) {
      await this.updateListingRatings(review.listingId);
    }

    return updated;
  }

  private static async updateListingRatings(listingId: string): Promise<void> {
    const aggregation = await prisma.marketplaceReviews.aggregate({
      where: { listingId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.marketplaceListings.update({
      where: { id: listingId },
      data: {
        averageRating: aggregation._avg.rating ?? 0,
        reviewCount: aggregation._count.rating,
      },
    });
  }
}