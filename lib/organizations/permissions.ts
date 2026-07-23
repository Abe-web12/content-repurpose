/**
 * Organization-specific permissions.
 *
 * NOTE: The canonical role hierarchy and base permissions are defined in
 * lib/constants/roles.ts. This file adds org-specific action permissions
 * on top of that base. The getRoleHierarchy function here mirrors the
 * canonical hierarchy so callers in lib/organizations/ don't need to
 * import from two files.
 */

export const Permission = {
  ORG_VIEW: "org:view",
  ORG_EDIT: "org:edit",
  ORG_DELETE: "org:delete",
  MEMBER_VIEW: "member:view",
  MEMBER_INVITE: "member:invite",
  MEMBER_REMOVE: "member:remove",
  MEMBER_SUSPEND: "member:suspend",
  MEMBER_ROLE: "member:role",
  BILLING_VIEW: "billing:view",
  BILLING_MANAGE: "billing:manage",
  ANALYTICS_VIEW: "analytics:view",
  GENERATION_CREATE: "generation:create",
  GENERATION_VIEW: "generation:view",
  GENERATION_DELETE: "generation:delete",
  TEMPLATE_MANAGE: "template:manage",
  VOICE_MANAGE: "voice:manage",
  BRAND_MANAGE: "brand:manage",
  SCHEDULE_MANAGE: "schedule:manage",
  TEAM_CREATE: "team:create",
  TEAM_VIEW: "team:view",
  TEAM_EDIT: "team:edit",
  TEAM_DELETE: "team:delete",
  TEAM_MANAGE_MEMBERS: "team:manage_members",
  DEPARTMENT_CREATE: "department:create",
  DEPARTMENT_VIEW: "department:view",
  DEPARTMENT_EDIT: "department:edit",
  DEPARTMENT_DELETE: "department:delete",
  DEPARTMENT_MANAGE_TEAMS: "department:manage_teams",
  REFERRAL_VIEW: "referral:view",
  API_KEY_MANAGE: "api_key:manage",
  SETTINGS_MANAGE: "settings:manage",
  AUDIT_VIEW: "audit:view",
  ADMIN: "admin:*",
} as const;

export type PermissionType = (typeof Permission)[keyof typeof Permission];

const ROLE_PERMISSIONS: Record<string, PermissionType[]> = {
  OWNER: Object.values(Permission),
  ADMIN: [
    Permission.ORG_VIEW, Permission.ORG_EDIT,
    Permission.MEMBER_VIEW, Permission.MEMBER_INVITE, Permission.MEMBER_REMOVE, Permission.MEMBER_SUSPEND, Permission.MEMBER_ROLE,
    Permission.BILLING_VIEW, Permission.BILLING_MANAGE,
    Permission.ANALYTICS_VIEW,
    Permission.GENERATION_CREATE, Permission.GENERATION_VIEW, Permission.GENERATION_DELETE,
    Permission.TEMPLATE_MANAGE,
    Permission.VOICE_MANAGE,
    Permission.BRAND_MANAGE,
    Permission.TEAM_CREATE, Permission.TEAM_VIEW, Permission.TEAM_EDIT, Permission.TEAM_DELETE, Permission.TEAM_MANAGE_MEMBERS,
    Permission.DEPARTMENT_CREATE, Permission.DEPARTMENT_VIEW, Permission.DEPARTMENT_EDIT, Permission.DEPARTMENT_DELETE, Permission.DEPARTMENT_MANAGE_TEAMS,
    Permission.SCHEDULE_MANAGE,
    Permission.REFERRAL_VIEW,
    Permission.API_KEY_MANAGE,
    Permission.SETTINGS_MANAGE,
    Permission.AUDIT_VIEW,
  ],
  MANAGER: [
    Permission.ORG_VIEW,
    Permission.MEMBER_VIEW,
    Permission.TEAM_VIEW, Permission.TEAM_CREATE, Permission.TEAM_EDIT, Permission.TEAM_MANAGE_MEMBERS,
    Permission.DEPARTMENT_VIEW,
    Permission.ANALYTICS_VIEW,
    Permission.GENERATION_CREATE, Permission.GENERATION_VIEW, Permission.GENERATION_DELETE,
    Permission.TEMPLATE_MANAGE,
    Permission.VOICE_MANAGE,
    Permission.BRAND_MANAGE,
    Permission.SCHEDULE_MANAGE,
    Permission.REFERRAL_VIEW,
    Permission.AUDIT_VIEW,
  ],
  EDITOR: [
    Permission.ORG_VIEW,
    Permission.MEMBER_VIEW,
    Permission.TEAM_VIEW,
    Permission.GENERATION_CREATE, Permission.GENERATION_VIEW, Permission.GENERATION_DELETE,
    Permission.TEMPLATE_MANAGE,
    Permission.VOICE_MANAGE,
    Permission.BRAND_MANAGE,
    Permission.SCHEDULE_MANAGE,
  ],
  VIEWER: [
    Permission.ORG_VIEW,
    Permission.MEMBER_VIEW,
    Permission.TEAM_VIEW,
    Permission.DEPARTMENT_VIEW,
    Permission.GENERATION_VIEW,
    Permission.ANALYTICS_VIEW,
  ],
};

export function getRolePermissions(role: string): PermissionType[] {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.VIEWER;
}

export function hasPermission(role: string, permission: PermissionType): boolean {
  const perms = getRolePermissions(role);
  if (perms.includes(Permission.ADMIN)) return true;
  return perms.includes(permission);
}

/**
 * Mirrors the hierarchy from lib/constants/roles.ts but uses string
 * keys for compatibility with Prisma's Role enum.
 */
export function getRoleHierarchy(): Record<string, number> {
  return { OWNER: 100, ADMIN: 80, MANAGER: 60, EDITOR: 40, VIEWER: 20 };
}

export function canManageRole(actorRole: string, targetRole: string): boolean {
  const hierarchy = getRoleHierarchy();
  return (hierarchy[actorRole] ?? 0) > (hierarchy[targetRole] ?? 0);
}
