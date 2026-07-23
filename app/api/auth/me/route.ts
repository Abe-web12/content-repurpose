export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError } from "@/lib/utils/api-errors";
import { rateLimitByUser } from "@/lib/utils/rate-limit";

const userSelect = {
  id: true,
  email: true,
  name: true,
  fullName: true,
  avatarUrl: true,
  plan: true,
  generationsUsed: true,
  generationsLimit: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimitByUser(userId, { windowMs: 60_000, maxRequests: 30 });
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let dbUser = await prisma.users.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!dbUser) {
      try {
        dbUser = await prisma.users.create({
          data: {
            id: userId,
            email: `clerk-${userId}@placeholder.com`,
            passwordHash: "",
          },
          select: userSelect,
        });
      } catch (createErr: any) {
        if (createErr?.code === "P2002") {
          dbUser = await prisma.users.findUnique({
            where: { id: userId },
            select: userSelect,
          });
        } else {
          throw createErr;
        }
      }
    }

    if (!dbUser) {
      return NextResponse.json({ error: "Failed to find or create user" }, { status: 500 });
    }

    let organizationId: string | null = null;
    try {
      const membership = await prisma.organizationMembers.findFirst({
        where: { userId },
        select: { organizationId: true },
      });

      if (membership) {
        organizationId = membership.organizationId;
      } else {
        const { OrganizationManager } = await import("@/lib/organizations");
        const orgName = `${dbUser.fullName || dbUser.name || "Personal"}'s Workspace`;
        const org = await OrganizationManager.create(orgName, userId);
        organizationId = org.id;
      }
    } catch {
      organizationId = null;
    }

    return NextResponse.json({
      user: dbUser,
      organizationId,
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
