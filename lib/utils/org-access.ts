import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { AppError } from "@/lib/utils/api-errors";
import { hasPermission, type Role, type Permission } from "@/lib/constants/roles";

export interface OrgSession {
  user: { id: string; email: string };
  member: {
    id: string;
    role: Role;
    organizationId: string;
  };
}

export async function getOrgSession(organizationId: string): Promise<OrgSession> {
  const { userId } = await auth();
  if (!userId) throw new AppError("Unauthorized", 401);

  const dbUser = await prisma.users.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!dbUser?.email) throw new AppError("User not found", 404);

  const member = await prisma.organizationMembers.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!member) throw new AppError("You are not a member of this organization", 403);

  return {
    user: { id: userId, email: dbUser.email },
    member: {
      id: member.id,
      role: member.role as Role,
      organizationId: member.organizationId,
    },
  };
}

export function requirePermission(session: OrgSession, permission: Permission): void {
  if (!hasPermission(session.member.role, permission)) {
    throw new AppError("You do not have permission to perform this action", 403);
  }
}

export function requireRole(session: OrgSession, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(session.member.role)) {
    throw new AppError("You do not have permission to perform this action", 403);
  }
}
