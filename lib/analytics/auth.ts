import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { hasPermission, type Role, type Permission } from "@/lib/constants/roles";
import { auth } from "@clerk/nextjs/server";

export interface AnalyticsAuth {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
  isAdmin: boolean;
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | undefined): boolean {
  if (ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes((email || "").toLowerCase());
}

export async function requireAnalyticsAccess(
  organizationId: string,
  permission: Permission = "read"
): Promise<AnalyticsAuth> {
  const { userId } = await auth();
  if (!userId) throw new AppError("Unauthorized", 401);

  const dbUser = await prisma.users.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!dbUser?.email) throw new AppError("User not found", 404);

  if (isAdminEmail(dbUser.email)) {
    return { userId, email: dbUser.email, organizationId, role: "ADMIN", isAdmin: true };
  }

  const member = await prisma.organizationMembers.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!member) throw new AppError("You are not a member of this organization", 403);

  const role = member.role as Role;
  if (!hasPermission(role, permission)) {
    throw new AppError("You do not have permission to view analytics", 403);
  }

  return { userId, email: dbUser.email, organizationId, role: member.role, isAdmin: false };
}

export function getOrganizationId(searchParams: URLSearchParams, fallback?: string): string {
  const orgId = searchParams.get("organizationId") || fallback;
  if (!orgId) throw new AppError("organizationId is required", 400);
  return orgId;
}
