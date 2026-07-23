import { IntegrationError } from "./errors";

type PermissionAction =
  | "read"
  | "write"
  | "admin"
  | "sync"
  | "install"
  | "uninstall"
  | "configure"
  | "view_logs";

const ROLE_PERMISSIONS: Record<string, PermissionAction[]> = {
  OWNER: ["read", "write", "admin", "sync", "install", "uninstall", "configure", "view_logs"],
  ADMIN: ["read", "write", "admin", "sync", "install", "uninstall", "configure", "view_logs"],
  MANAGER: ["read", "write", "sync", "install", "uninstall", "configure", "view_logs"],
  EDITOR: ["read", "write", "sync", "view_logs"],
  VIEWER: ["read", "view_logs"],
};

export class IntegrationPermissions {
  static check(role: string, action: PermissionAction): void {
    const allowed = ROLE_PERMISSIONS[role];
    if (!allowed) {
      throw new IntegrationError(`Unknown role: ${role}`, "UNKNOWN_ROLE", 403);
    }
    if (!allowed.includes(action)) {
      throw new IntegrationError(
        `Role "${role}" does not have "${action}" permission`,
        "INSUFFICIENT_PERMISSIONS",
        403
      );
    }
  }

  static can(role: string, action: PermissionAction): boolean {
    const allowed = ROLE_PERMISSIONS[role];
    if (!allowed) return false;
    return allowed.includes(action);
  }

  static async validateOrgAccess(
    organizationId: string,
    userId: string,
    action: PermissionAction
  ): Promise<string> {
    const { prisma } = await import("@/lib/prisma");
    const member = await prisma.organizationMembers.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!member) {
      throw new IntegrationError("Not a member of this organization", "FORBIDDEN", 403);
    }

    this.check(member.role, action);
    return member.role;
  }
}
