import { NextResponse, type NextRequest } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { OrganizationManager } from "@/lib/organizations";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const next = url.searchParams.get("next") || "/dashboard";

    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

    const session = await auth();
    const userId = session?.userId;

    if (userId) {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      const email =
        clerkUser.primaryEmailAddress?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        "";

      if (email) {
        await prisma.users.upsert({
          where: { id: userId },
          update: {
            email,
            name: clerkUser.firstName
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

        const existingMembership = await prisma.organizationMembers.findFirst({
          where: { userId },
        });

        if (!existingMembership) {
          const displayName = clerkUser.firstName
            ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
            : email.split("@")[0];
          await OrganizationManager.create(
            `${displayName}'s Organization`,
            userId,
          );
        }
      }
    }

    return NextResponse.redirect(new URL(safeNext, url.origin));
  } catch (error) {
    console.error("[CALLBACK_ERROR]", error);
    const url = new URL(request.url);
    return NextResponse.redirect(new URL("/login?error=callback_failed", url.origin));
  }
}
