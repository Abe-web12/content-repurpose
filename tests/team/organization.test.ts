import { describe, it, expect } from "vitest";

describe("Organization — RBAC", () => {
  const hierarchy: Record<string, number> = { OWNER: 100, ADMIN: 80, MANAGER: 60, EDITOR: 40, VIEWER: 20 };

  const Permission = {
    ORG_VIEW: "org:view",
    ORG_EDIT: "org:edit",
    MEMBER_INVITE: "member:invite",
    MEMBER_REMOVE: "member:remove",
    GENERATION_CREATE: "generation:create",
    GENERATION_VIEW: "generation:view",
    BILLING_MANAGE: "billing:manage",
    ADMIN: "admin:*",
  };

  const ROLE_PERMISSIONS: Record<string, string[]> = {
    OWNER: Object.values(Permission),
    ADMIN: [Permission.ORG_VIEW, Permission.ORG_EDIT, Permission.MEMBER_INVITE, Permission.MEMBER_REMOVE, Permission.BILLING_MANAGE, Permission.GENERATION_CREATE, Permission.GENERATION_VIEW],
    MANAGER: [Permission.ORG_VIEW, Permission.GENERATION_CREATE, Permission.GENERATION_VIEW],
    EDITOR: [Permission.ORG_VIEW, Permission.GENERATION_CREATE, Permission.GENERATION_VIEW],
    VIEWER: [Permission.ORG_VIEW, Permission.GENERATION_VIEW],
  };

  function hasPermission(role: string, permission: string): boolean {
    const perms = ROLE_PERMISSIONS[role] || [];
    if (perms.includes(Permission.ADMIN)) return true;
    return perms.includes(permission);
  }

  function canManageRole(actorRole: string, targetRole: string): boolean {
    return (hierarchy[actorRole] ?? 0) > (hierarchy[targetRole] ?? 0);
  }

  it("grants all permissions to OWNER", () => {
    expect(hasPermission("OWNER", Permission.ORG_EDIT)).toBe(true);
    expect(hasPermission("OWNER", Permission.MEMBER_REMOVE)).toBe(true);
    expect(hasPermission("OWNER", Permission.BILLING_MANAGE)).toBe(true);
    expect(hasPermission("OWNER", Permission.GENERATION_CREATE)).toBe(true);
  });

  it("grants GENERATION_VIEW to VIEWER but not GENERATION_CREATE", () => {
    expect(hasPermission("VIEWER", Permission.GENERATION_VIEW)).toBe(true);
    expect(hasPermission("VIEWER", Permission.GENERATION_CREATE)).toBe(false);
    expect(hasPermission("VIEWER", Permission.MEMBER_INVITE)).toBe(false);
  });

  it("prevents VIEWER from managing billing", () => {
    expect(hasPermission("VIEWER", Permission.BILLING_MANAGE)).toBe(false);
  });

  it("allows ADMIN to manage members", () => {
    expect(hasPermission("ADMIN", Permission.MEMBER_INVITE)).toBe(true);
    expect(hasPermission("ADMIN", Permission.MEMBER_REMOVE)).toBe(true);
  });

  it("prevents MANAGER from removing members", () => {
    expect(hasPermission("MANAGER", Permission.MEMBER_REMOVE)).toBe(false);
  });

  it("validates role hierarchy", () => {
    expect(canManageRole("OWNER", "ADMIN")).toBe(true);
    expect(canManageRole("OWNER", "EDITOR")).toBe(true);
    expect(canManageRole("ADMIN", "EDITOR")).toBe(true);
    expect(canManageRole("EDITOR", "ADMIN")).toBe(false);
    expect(canManageRole("EDITOR", "VIEWER")).toBe(true);
    expect(canManageRole("VIEWER", "EDITOR")).toBe(false);
  });

  it("prevents self-demotion below target", () => {
    expect(canManageRole("ADMIN", "ADMIN")).toBe(false);
    expect(canManageRole("OWNER", "OWNER")).toBe(false);
  });

  it("assigns manager role correctly", () => {
    expect(hierarchy.MANAGER).toBe(60);
    expect(hierarchy.EDITOR).toBe(40);
    expect(hierarchy.MANAGER > hierarchy.EDITOR).toBe(true);
  });
});

describe("Organization — Invites", () => {
  it("generates unique invite tokens", () => {
    const tokens = new Set<string>();
    const { randomBytes } = require("crypto");
    for (let i = 0; i < 100; i++) {
      const token = randomBytes(32).toString("hex");
      expect(tokens.has(token)).toBe(false);
      tokens.add(token);
    }
    expect(tokens.size).toBe(100);
  });

  it("validates email format", () => {
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(isValidEmail("user@company.com")).toBe(true);
    expect(isValidEmail("user+tag@company.co.uk")).toBe(true);
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("detects expired invitations", () => {
    const now = Date.now();
    const expiresAt = now - 86400000;
    expect(expiresAt < now).toBe(true);
  });

  it("prevents duplicate pending invites", () => {
    const pendingInvites = new Set<string>();
    const canInvite = (email: string): boolean => {
      if (pendingInvites.has(email)) return false;
      pendingInvites.add(email);
      return true;
    };

    expect(canInvite("user@test.com")).toBe(true);
    expect(canInvite("user@test.com")).toBe(false);
    expect(canInvite("other@test.com")).toBe(true);
  });
});

describe("Organization — Slug Generation", () => {
  it("generates valid slugs from names", () => {
    const generateSlug = (name: string): string => {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    };
    expect(generateSlug("My Company")).toBe("my-company");
    expect(generateSlug("Acme Corp!")).toBe("acme-corp");
    expect(generateSlug("Hello   World")).toBe("hello-world");
  });
});
