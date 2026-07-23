export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";
import { rateLimitByIp } from "@/lib/utils/rate-limit";
import { sendWelcomeEmail } from "@/lib/email/sender";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimitByIp(ip, { windowMs: 60_000, maxRequests: 5 });
    if (!rl.success) {
      throw new AppError("Too many requests. Please try again later.", 429);
    }

    const { userId } = await auth();
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress || "";

    const dbUser = await prisma.users.upsert({
      where: { id: userId },
      update: {
        email,
        name: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
          : null,
        fullName: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
          : null,
        avatarUrl: clerkUser.imageUrl || null,
      },
      create: {
        id: userId,
        email,
        passwordHash: "",
        name: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
          : null,
        fullName: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
          : null,
        avatarUrl: clerkUser.imageUrl || null,
      },
    });

    const displayName = dbUser.fullName || dbUser.name || dbUser.email.split("@")[0];
    sendWelcomeEmail(dbUser.email, displayName).catch(() => {});

    return NextResponse.json({ user: dbUser });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
