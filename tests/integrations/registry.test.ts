import { describe, it, expect, beforeEach } from "vitest";
import { IntegrationRegistry } from "@/lib/integrations/registry";
import { IntegrationInterface } from "@/lib/integrations/types";
import { IntegrationNotFoundError } from "@/lib/integrations/errors";

function createMockIntegration(id: string, name: string): IntegrationInterface {
  return {
    id,
    name,
    version: "1.0.0",
    icon: "puzzle",
    description: `Test integration ${name}`,
    category: "TEST",
    type: "OTHER",
    permissions: [],
    configuration: {},
    healthCheck: async () => ({ healthy: true }),
    install: async () => ({ installedId: id, status: "ok", config: {} }),
    uninstall: async () => {},
    sync: async () => ({ success: true }),
  };
}

describe("IntegrationRegistry", () => {
  let registry: IntegrationRegistry;

  beforeEach(() => {
    registry = IntegrationRegistry.getInstance();
    registry.clear();
  });

  describe("register and get", () => {
    it("should register and retrieve an integration", () => {
      const mock = createMockIntegration("test-1", "Test One");
      registry.register(mock);

      const retrieved = registry.get("test-1");
      expect(retrieved).toBe(mock);
    });

    it("should throw for unknown integration", () => {
      expect(() => registry.get("unknown")).toThrow(IntegrationNotFoundError);
    });
  });

  describe("getAll", () => {
    it("should return all registered integrations", () => {
      registry.register(createMockIntegration("a", "A"));
      registry.register(createMockIntegration("b", "B"));

      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe("registerBuiltIn", () => {
    it("should register a built-in integration", () => {
      registry.registerBuiltIn("builtin-1", createMockIntegration("builtin-1", "BuiltIn"));

      const retrieved = registry.get("builtin-1");
      expect(retrieved.name).toBe("BuiltIn");
    });
  });
});
