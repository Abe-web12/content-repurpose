import { describe, it, expect } from "vitest";
import { encryptValue, decryptValue, maskSecret } from "@/lib/integrations/installer";

// Mock the encryption key
process.env.ENCRYPTION_KEY = "test-encryption-key-1234567890";

describe("IntegrationInstaller", () => {
  describe("encryptValue / decryptValue", () => {
    it("should encrypt and decrypt a value", () => {
      const original = "my-secret-api-key-12345";
      const encrypted = encryptValue(original);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(original);

      const decrypted = decryptValue(encrypted);
      expect(decrypted).toBe(original);
    });

    it("should produce different ciphertexts for same input", () => {
      const value = "same-value";
      const e1 = encryptValue(value);
      const e2 = encryptValue(value);
      expect(e1).not.toBe(e2);
    });

    it("should handle empty strings", () => {
      const encrypted = encryptValue("");
      const decrypted = decryptValue(encrypted);
      expect(decrypted).toBe("");
    });
  });

  describe("maskSecret", () => {
    it("should mask a secret value", () => {
      const masked = maskSecret("my-api-key-12345");
      expect(masked).toContain("****");
      expect(masked).not.toContain("my-api-key");
    });

    it("should show first 4 chars", () => {
      const masked = maskSecret("abcdefghijklmnop");
      expect(masked.startsWith("abcd")).toBe(true);
    });

    it("should return **** for short values", () => {
      expect(maskSecret("ab")).toBe("****");
    });
  });
});
