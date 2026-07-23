import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    organizationMembers: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

import { AgentPermissions } from "@/lib/agents/permissions";
import { prisma } from "@/lib/prisma";

const agent = { organizationId: "org-1", userId: "creator-1", visibility: "ORGANIZATION" };

describe("AgentPermissions", () => {
  describe("verify", () => {
    it("throws for non-member", async () => {
      vi.mocked(prisma.organizationMembers.findFirst).mockResolvedValueOnce(null);
      await expect(
        AgentPermissions.verify("unknown-user", agent, "view")
      ).rejects.toThrow("Not a member of this organization");
    });

    it("passes for OWNER role", async () => {
      vi.mocked(prisma.organizationMembers.findFirst).mockResolvedValueOnce({
        role: "OWNER",
      } as any);
      await expect(
        AgentPermissions.verify("owner-user", agent, "edit")
      ).resolves.not.toThrow();
    });

    it("passes for ADMIN role", async () => {
      vi.mocked(prisma.organizationMembers.findFirst).mockResolvedValueOnce({
        role: "ADMIN",
      } as any);
      await expect(
        AgentPermissions.verify("admin-user", agent, "delete")
      ).resolves.not.toThrow();
    });

    it("passes for agent creator", async () => {
      vi.mocked(prisma.organizationMembers.findFirst).mockResolvedValueOnce({
        role: "EDITOR",
      } as any);
      const ownAgent = { ...agent, userId: "editor-user" };
      await expect(
        AgentPermissions.verify("editor-user", ownAgent, "edit")
      ).resolves.not.toThrow();
    });

    it("passes view for PUBLIC visibility", async () => {
      vi.mocked(prisma.organizationMembers.findFirst).mockResolvedValueOnce({
        role: "VIEWER",
      } as any);
      const publicAgent = { ...agent, visibility: "PUBLIC", userId: "other-user" };
      await expect(
        AgentPermissions.verify("viewer-user", publicAgent, "view")
      ).resolves.not.toThrow();
    });

    it("throws manage for non-admin roles", async () => {
      vi.mocked(prisma.organizationMembers.findFirst).mockResolvedValueOnce({
        role: "EDITOR",
      } as any);
      await expect(
        AgentPermissions.verify("editor-user", agent, "manage")
      ).rejects.toThrow("Insufficient permissions");
    });

    it("passes manage for ADMIN role", async () => {
      vi.mocked(prisma.organizationMembers.findFirst).mockResolvedValueOnce({
        role: "ADMIN",
      } as any);
      await expect(
        AgentPermissions.verify("admin-user", agent, "manage")
      ).resolves.not.toThrow();
    });

    it("passes manage for OWNER role", async () => {
      vi.mocked(prisma.organizationMembers.findFirst).mockResolvedValueOnce({
        role: "OWNER",
      } as any);
      await expect(
        AgentPermissions.verify("owner-user", agent, "manage")
      ).resolves.not.toThrow();
    });

    it("throws for PRIVATE visibility by other user", async () => {
      vi.mocked(prisma.organizationMembers.findFirst).mockResolvedValueOnce({
        role: "VIEWER",
      } as any);
      const privateAgent = { ...agent, visibility: "PRIVATE", userId: "other-creator" };
      await expect(
        AgentPermissions.verify("viewer-user", privateAgent, "view")
      ).rejects.toThrow("Insufficient permissions");
    });
  });

  describe("canEdit", () => {
    it("returns true for OWNER", () => {
      expect(AgentPermissions.canEdit("OWNER")).toBe(true);
    });

    it("returns true for ADMIN", () => {
      expect(AgentPermissions.canEdit("ADMIN")).toBe(true);
    });

    it("returns true for EDITOR", () => {
      expect(AgentPermissions.canEdit("EDITOR")).toBe(true);
    });

    it("returns true for MANAGER", () => {
      expect(AgentPermissions.canEdit("MANAGER")).toBe(true);
    });

    it("returns false for VIEWER", () => {
      expect(AgentPermissions.canEdit("VIEWER")).toBe(false);
    });

    it("returns false for unknown role", () => {
      expect(AgentPermissions.canEdit("UNKNOWN")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(AgentPermissions.canEdit("")).toBe(false);
    });
  });

  describe("canView", () => {
    it("returns true for OWNER", () => {
      expect(AgentPermissions.canView("OWNER")).toBe(true);
    });

    it("returns true for ADMIN", () => {
      expect(AgentPermissions.canView("ADMIN")).toBe(true);
    });

    it("returns true for EDITOR", () => {
      expect(AgentPermissions.canView("EDITOR")).toBe(true);
    });

    it("returns true for VIEWER", () => {
      expect(AgentPermissions.canView("VIEWER")).toBe(true);
    });

    it("returns true for MANAGER", () => {
      expect(AgentPermissions.canView("MANAGER")).toBe(true);
    });

    it("returns true for any role string", () => {
      expect(AgentPermissions.canView("SOME_RANDOM_ROLE")).toBe(true);
    });
  });

  describe("canDelete", () => {
    it("returns true for OWNER", () => {
      expect(AgentPermissions.canDelete("OWNER")).toBe(true);
    });

    it("returns true for ADMIN", () => {
      expect(AgentPermissions.canDelete("ADMIN")).toBe(true);
    });

    it("returns false for EDITOR", () => {
      expect(AgentPermissions.canDelete("EDITOR")).toBe(false);
    });

    it("returns false for VIEWER", () => {
      expect(AgentPermissions.canDelete("VIEWER")).toBe(false);
    });

    it("returns false for MANAGER", () => {
      expect(AgentPermissions.canDelete("MANAGER")).toBe(false);
    });
  });
});
