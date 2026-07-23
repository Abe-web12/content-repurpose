export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { webhookTestSchema } from "@/lib/validations/webhook";
import { deliverWebhook, WebhookDeliveryError } from "@/lib/webhooks/trigger";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = webhookTestSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: Object.values(firstError).flat()[0] || "Invalid input" },
        { status: 400 },
      );
    }

    const testPayload = {
      event: "test.ping",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test payload from RepurposeAI.",
      },
    };

    await deliverWebhook(parsed.data.url, testPayload, {
      webhookId: "test-connection",
      event: "test.ping",
      secret: parsed.data.secret || undefined,
      timeoutMs: 8_000,
    });

    return NextResponse.json({ success: true, message: "Webhook endpoint responded successfully." });
  } catch (err) {
    if (err instanceof WebhookDeliveryError) {
      const userMessage = {
        invalid_url: "The webhook URL is not a valid HTTP or HTTPS address.",
        timeout: "The endpoint did not respond within 8 seconds.",
        network_error: "Could not reach the endpoint. Check the URL and ensure the server is accessible.",
        non_2xx: `The endpoint returned status ${err.statusCode}.`,
        payload_too_large: "Test payload exceeds size limits.",
        unknown: "An unexpected error occurred while testing the webhook.",
      };

      return NextResponse.json(
        { error: userMessage[err.reason] || userMessage.unknown },
        { status: 400 },
      );
    }

    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
