import { NextRequest } from "next/server";
import { V1Helper } from "@/lib/dev-platform/v1-helper";
import { WebhookManager } from "@/lib/dev-platform/webhooks";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireAuth(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const result = await WebhookManager.rotateSecret(id);
      return V1Helper.success(result);
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
