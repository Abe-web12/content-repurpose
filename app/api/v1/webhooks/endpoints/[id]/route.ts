import { NextRequest } from "next/server";
import { AppError, parseBody } from "@/lib/utils/api-errors";
import { V1Helper } from "@/lib/dev-platform/v1-helper";
import { WebhookManager } from "@/lib/dev-platform/webhooks";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const endpoint = await WebhookManager.getEndpoint(id);
      return V1Helper.success(endpoint);
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const body = await parseBody<any>(request);
      const endpoint = await WebhookManager.updateEndpoint(id, body);
      return V1Helper.success(endpoint);
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      await WebhookManager.deleteEndpoint(id);
      return V1Helper.success({ success: true });
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
