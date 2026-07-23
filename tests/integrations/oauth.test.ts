import { describe, it, expect, vi, beforeEach } from "vitest";
import { OAuthManager, generateCodeVerifier, generateCodeChallenge } from "@/lib/integrations/oauth";
import { OAuthProvider } from "@/lib/integrations/types";

describe("OAuthManager", () => {
  describe("generateCodeVerifier", () => {
    it("should generate a code verifier", () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe("string");
      expect(verifier.length).toBeGreaterThan(0);
    });

    it("should generate unique verifiers", () => {
      const v1 = generateCodeVerifier();
      const v2 = generateCodeVerifier();
      expect(v1).not.toBe(v2);
    });
  });

  describe("generateCodeChallenge", () => {
    it("should generate a code challenge from verifier", () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe("string");
    });

    it("should produce consistent output for same input", () => {
      const verifier = "test-verifier";
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });
  });

  describe("getAuthorizationUrl", () => {
    it("should build an authorization URL", () => {
      const url = OAuthManager.getAuthorizationUrl(
        "GITHUB" as OAuthProvider,
        {
          clientId: "test-client",
          clientSecret: "test-secret",
          redirectUri: "http://localhost:3000/callback",
          scopes: ["repo", "user"],
          authUrl: "https://github.com/login/oauth/authorize",
          tokenUrl: "https://github.com/login/oauth/access_token",
        },
        "test-state"
      );

      expect(url).toContain("client_id=test-client");
      expect(url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback");
      expect(url).toContain("scope=repo");
      expect(url).toContain("state=test-state");
    });
  });
});
