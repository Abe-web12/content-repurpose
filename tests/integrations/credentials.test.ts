import { describe, it, expect, vi } from "vitest";
import { CredentialManager } from "@/lib/integrations/credentials";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    integrationCredentials: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/integrations/installer", () => ({
  decryptValue: vi.fn((v) => `decrypted-${v}`),
  encryptValue: vi.fn((v) => `encrypted-${v}`),
}));

describe("CredentialManager", () => {
  describe("getCredentials", () => {
    it("should return decrypted credentials", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.integrationCredentials.findMany as any).mockResolvedValue([
        { id: "cred-1", label: "api-key", encryptedValue: "enc-value", type: "API_KEY", keyIdentifier: "key", expiresAt: null, lastUsedAt: null, metadata: null },
      ]);

      const credentials = await CredentialManager.getCredentials("inst-1");
      expect(credentials).toHaveLength(1);
      expect(credentials[0].value).toContain("decrypted-");
    });
  });
});
