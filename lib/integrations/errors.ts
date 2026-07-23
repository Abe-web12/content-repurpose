export class IntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

export class OAuthError extends IntegrationError {
  constructor(message: string, code = "OAUTH_ERROR", details?: Record<string, unknown>) {
    super(message, code, 401, details);
    this.name = "OAuthError";
  }
}

export class CredentialError extends IntegrationError {
  constructor(message: string, code = "CREDENTIAL_ERROR", details?: Record<string, unknown>) {
    super(message, code, 401, details);
    this.name = "CredentialError";
  }
}

export class SyncError extends IntegrationError {
  constructor(message: string, code = "SYNC_ERROR", details?: Record<string, unknown>) {
    super(message, code, 500, details);
    this.name = "SyncError";
  }
}

export class WebhookDispatchError extends IntegrationError {
  constructor(message: string, code = "WEBHOOK_DISPATCH_ERROR", details?: Record<string, unknown>) {
    super(message, code, 500, details);
    this.name = "WebhookDispatchError";
  }
}

export class IntegrationNotFoundError extends IntegrationError {
  constructor(key: string) {
    super(`Integration "${key}" not found`, "INTEGRATION_NOT_FOUND", 404);
  }
}

export class IntegrationNotInstalledError extends IntegrationError {
  constructor(orgId: string, key: string) {
    super(`Integration "${key}" not installed for org "${orgId}"`, "INTEGRATION_NOT_INSTALLED", 404);
  }
}

export class RateLimitError extends IntegrationError {
  constructor(retryAfter: number) {
    super("Rate limit exceeded", "RATE_LIMITED", 429, { retryAfter });
    this.name = "RateLimitError";
  }
}

export function sanitizeError(err: unknown): IntegrationError {
  if (err instanceof IntegrationError) return err;
  const message = err instanceof Error ? err.message : "Unknown error";
  return new IntegrationError(message, "UNKNOWN_ERROR");
}
