/**
 * Unified roles and permissions system.
 *
 * This is the canonical source of truth. The similar system in
 * lib/organizations/permissions.ts delegates here for the common
 * subset and augments with org-specific permissions.
 *
 * Roles: OWNER > ADMIN > MANAGER > EDITOR > VIEWER
 */

export type Role = "OWNER" | "ADMIN" | "MANAGER" | "EDITOR" | "VIEWER";

export type Permission =
  | "manage_organization"
  | "manage_members"
  | "manage_brand_kits"
  | "manage_templates"
  | "manage_workflows"
  | "manage_publishing"
  | "manage_prompts"
  | "manage_knowledge"
  | "manage_playground"
  | "manage_rag"
  | "manage_agents"
  | "generate"
  | "edit"
  | "schedule"
  | "read"
  | "manage_teams"
  | "manage_departments";

export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 100,
  ADMIN: 70,
  MANAGER: 50,
  EDITOR: 40,
  VIEWER: 10,
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [
    "manage_organization",
    "manage_members",
    "manage_teams",
    "manage_departments",
    "manage_brand_kits",
    "manage_templates",
    "manage_workflows",
    "manage_publishing",
    "manage_prompts",
    "manage_knowledge",
    "manage_playground",
    "manage_rag",
    "manage_agents",
    "generate",
    "edit",
    "schedule",
    "read",
  ],
  ADMIN: [
    "manage_members",
    "manage_teams",
    "manage_departments",
    "manage_brand_kits",
    "manage_templates",
    "manage_workflows",
    "manage_publishing",
    "manage_prompts",
    "manage_knowledge",
    "manage_playground",
    "manage_rag",
    "manage_agents",
    "generate",
    "edit",
    "schedule",
    "read",
  ],
  MANAGER: [
    "manage_teams",
    "manage_templates",
    "manage_workflows",
    "manage_publishing",
    "manage_prompts",
    "manage_knowledge",
    "manage_playground",
    "manage_rag",
    "manage_agents",
    "generate",
    "edit",
    "schedule",
    "read",
  ],
  EDITOR: [
    "manage_prompts",
    "manage_knowledge",
    "manage_playground",
    "manage_rag",
    "generate",
    "edit",
    "schedule",
    "read",
  ],
  VIEWER: [
    "read",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canManageRole(actor: Role, target: Role): boolean {
  return ROLE_HIERARCHY[actor] > ROLE_HIERARCHY[target];
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Full access to everything including billing and organization settings",
  ADMIN: "Can manage members, brand kits, templates, workflows, and publishing",
  MANAGER: "Can manage workflows, prompts, knowledge, and agents",
  EDITOR: "Can generate, edit, and schedule content",
  VIEWER: "Read-only access to organization content",
};
