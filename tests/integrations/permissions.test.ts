import { describe, it, expect } from "vitest";
import { IntegrationPermissions } from "@/lib/integrations/permissions";
import { IntegrationError } from "@/lib/integrations/errors";

describe("IntegrationPermissions", () => {
  describe("check", () => {
    it("should allow OWNER to do all actions", () => {
      expect(() => IntegrationPermissions.check("OWNER", "admin")).not.toThrow();
      expect(() => IntegrationPermissions.check("OWNER", "install")).not.toThrow();
      expect(() => IntegrationPermissions.check("OWNER", "read")).not.toThrow();
      expect(() => IntegrationPermissions.check("OWNER", "sync")).not.toThrow();
    });

    it("should allow ADMIN to do all actions", () => {
      expect(() => IntegrationPermissions.check("ADMIN", "admin")).not.toThrow();
      expect(() => IntegrationPermissions.check("ADMIN", "uninstall")).not.toThrow();
    });

    it("should restrict VIEWER from write", () => {
      expect(() => IntegrationPermissions.check("VIEWER", "write")).toThrow(IntegrationError);
    });

    it("should restrict EDITOR from install", () => {
      expect(() => IntegrationPermissions.check("EDITOR", "install")).toThrow(IntegrationError);
    });

    it("should throw for unknown roles", () => {
      expect(() => IntegrationPermissions.check("UNKNOWN", "read")).toThrow(IntegrationError);
    });
  });

  describe("can", () => {
    it("should return true for allowed actions", () => {
      expect(IntegrationPermissions.can("OWNER", "install")).toBe(true);
      expect(IntegrationPermissions.can("VIEWER", "read")).toBe(true);
    });

    it("should return false for denied actions", () => {
      expect(IntegrationPermissions.can("VIEWER", "admin")).toBe(false);
      expect(IntegrationPermissions.can("EDITOR", "uninstall")).toBe(false);
    });
  });
});
