import { describe, it, expect } from "vitest";
import {
  IntegrationError,
  OAuthError,
  CredentialError,
  SyncError,
  WebhookDispatchError,
  IntegrationNotFoundError,
  IntegrationNotInstalledError,
  RateLimitError,
  sanitizeError,
} from "@/lib/integrations/errors";

describe("Integration Errors", () => {
  it("should create IntegrationError with correct properties", () => {
    const err = new IntegrationError("Test error", "TEST_CODE", 400, { detail: "test" });
    expect(err.message).toBe("Test error");
    expect(err.code).toBe("TEST_CODE");
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ detail: "test" });
  });

  it("should create OAuthError with default code", () => {
    const err = new OAuthError("OAuth failed");
    expect(err.code).toBe("OAUTH_ERROR");
    expect(err.statusCode).toBe(401);
  });

  it("should create IntegrationNotFoundError with 404", () => {
    const err = new IntegrationNotFoundError("my-integration");
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("my-integration");
  });

  it("should create RateLimitError with 429", () => {
    const err = new RateLimitError(60);
    expect(err.statusCode).toBe(429);
    expect(err.details?.retryAfter).toBe(60);
  });

  it("sanitizeError should pass through IntegrationError", () => {
    const original = new IntegrationError("test", "CODE");
    expect(sanitizeError(original)).toBe(original);
  });

  it("sanitizeError should wrap unknown errors", () => {
    const result = sanitizeError(new Error("random"));
    expect(result).toBeInstanceOf(IntegrationError);
    expect(result.message).toBe("random");
  });
});
