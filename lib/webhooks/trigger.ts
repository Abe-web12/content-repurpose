export type WebhookDeliveryStatus = "success" | "failed";

export interface WebhookDeliveryResult {
  status: WebhookDeliveryStatus;
  statusCode: number | null;
  durationMs: number;
  webhookId: string;
}

export type WebhookFailureReason =
  | "invalid_url"
  | "timeout"
  | "network_error"
  | "non_2xx"
  | "payload_too_large"
  | "unknown";

export class WebhookDeliveryError extends Error {
  constructor(
    message: string,
    public readonly reason: WebhookFailureReason,
    public readonly statusCode: number | null = null,
    public readonly webhookId: string = "unknown",
  ) {
    super(message);
    this.name = "WebhookDeliveryError";
  }
}

interface DeliverOptions {
  timeoutMs?: number;
  secret?: string | null;
  event?: string;
  webhookId: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_PAYLOAD_BYTES = 256_000;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

function prepareHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "User-Agent": "RepurposeAI-Webhook/1.0",
  };
}

export async function deliverWebhook(
  url: string,
  payload: Record<string, unknown>,
  options: DeliverOptions,
): Promise<WebhookDeliveryResult> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, webhookId } = options;
  const startedAt = Date.now();

  if (!isValidUrl(url)) {
    throw new WebhookDeliveryError(
      `Webhook ${webhookId}: target URL is not a valid HTTP(S) URL`,
      "invalid_url",
      null,
      webhookId,
    );
  }

  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson).length;

  if (payloadBytes > MAX_PAYLOAD_BYTES) {
    throw new WebhookDeliveryError(
      `Webhook ${webhookId}: payload ${payloadBytes}B exceeds ${MAX_PAYLOAD_BYTES}B limit`,
      "payload_too_large",
      null,
      webhookId,
    );
  }

  const headers = prepareHeaders();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payloadJson,
      signal: controller.signal,
    });

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const statusCode = response.status;
      console.warn(
        `[Webhook] delivery failed: id=${webhookId} event=${options.event ?? "?"} status=${statusCode} duration=${durationMs}ms`,
      );
      throw new WebhookDeliveryError(
        `Webhook ${webhookId}: responded with ${statusCode}`,
        "non_2xx",
        statusCode,
        webhookId,
      );
    }

    console.info(
      `[Webhook] delivered: id=${webhookId} event=${options.event ?? "?"} status=${response.status} duration=${durationMs}ms`,
    );

    return { status: "success", statusCode: response.status, durationMs, webhookId };
  } catch (err) {
    const durationMs = Date.now() - startedAt;

    if (err instanceof WebhookDeliveryError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn(
        `[Webhook] timeout: id=${webhookId} event=${options.event ?? "?"} timeout=${timeoutMs}ms duration=${durationMs}ms`,
      );
      throw new WebhookDeliveryError(
        `Webhook ${webhookId}: timed out after ${timeoutMs}ms`,
        "timeout",
        null,
        webhookId,
      );
    }

    const fetchErr = err as Error;
    const hostname = sanitizeUrlForLog(url);
    console.warn(
      `[Webhook] network error: id=${webhookId} event=${options.event ?? "?"} host=${hostname} duration=${durationMs}ms`,
    );
    throw new WebhookDeliveryError(
      `Webhook ${webhookId}: network error — ${fetchErr.message}`,
      "network_error",
      null,
      webhookId,
    );
  } finally {
    clearTimeout(timer);
  }
}
