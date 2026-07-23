export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { z } from "zod";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  search: z.string().optional(),
  plan: z.string().optional(),
  status: z.string().optional(),
});

const updateUserSchema = z.object({
  plan: z.enum(["free", "starter", "pro", "business", "enterprise"]).optional(),
  generationsLimit: z.number().optional(),
  stripeSubscriptionId: z.string().nullable().optional(),
});

async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new AppError("Unauthorized", 401);

  const member = await prisma.organizationMembers.findFirst({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
  });

  const user = await prisma.users.findUnique({ where: { id: userId } });
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

  if (!user?.email || !adminEmails.includes(user.email.toLowerCase())) {
    throw new AppError("Forbidden", 403);
  }

  return userId;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: "insensitive" } },
        { name: { contains: params.search, mode: "insensitive" } },
        { fullName: { contains: params.search, mode: "insensitive" } },
      ];
    }
    if (params.plan) where.plan = params.plan;

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where,
        select: {
          id: true, email: true, name: true, fullName: true, avatarUrl: true,
          plan: true, generationsUsed: true, generationsLimit: true,
          stripeCustomerId: true, stripeSubscriptionId: true,
          createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: params.limit,
        skip: params.offset,
      }),
      prisma.users.count({ where }),
    ]);

    return NextResponse.json({ data: { users, total } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminId = await requireAdmin();

    const rl = await rateLimitByUser(adminId, { windowMs: 60_000, maxRequests: 30 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON", 400);
    });

    const { userId, ...updateData } = body;
    if (!userId || typeof userId !== "string") {
      throw new AppError("userId is required", 400);
    }

    const validated = updateUserSchema.parse(updateData);

    const updated = await prisma.users.update({
      where: { id: userId },
      data: validated,
      select: {
        id: true, email: true, name: true, plan: true,
        generationsLimit: true, stripeSubscriptionId: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
