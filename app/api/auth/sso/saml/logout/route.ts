import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { SAMLService } from "@/lib/security/saml";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) throw new AppError("Unauthorized", 401);

    const rl = await rateLimit(`saml:logout:${userId}`, { windowMs: 60000, maxRequests: 10 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const body = await request.json().catch(() => ({}));
    const { providerId, organizationId } = body as {
      providerId?: string;
      organizationId?: string;
    };

    if (!providerId) throw new AppError("providerId is required", 400);
    if (!organizationId) throw new AppError("organizationId is required", 400);

    const { redirectUrl } = await SAMLService.initiateLogout(
      organizationId,
      providerId,
      userId
    );

    if (redirectUrl) {
      return NextResponse.json({ data: { redirectUrl } });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
