import { NextRequest } from "next/server";
import { V1Helper } from "@/lib/dev-platform/v1-helper";
import { WebhookManager } from "@/lib/dev-platform/webhooks";
import { parseBody } from "@/lib/utils/api-errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireOrg(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const endpoints = await WebhookManager.getEndpoints(ctx.organizationId);
      return V1Helper.success(endpoints);
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireOrg(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const body = await parseBody<{ name: string; url: string; trigger_events: string[]; description?: string; retry_count?: number; timeout?: number }>(request);
      const endpoint = await WebhookManager.createEndpoint(ctx.organizationId, ctx.userId, {
        name: body.name,
        url: body.url,
        triggerEvents: body.trigger_events,
        description: body.description,
        retryCount: body.retry_count,
        timeout: body.timeout,
      });
      return V1Helper.success(endpoint, 201);
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
