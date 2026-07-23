import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { SAMLService } from "@/lib/security/saml";
import { OrganizationManager } from "@/lib/organizations";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) throw new AppError("Unauthorized", 401);

    const rl = await rateLimit(`saml:login:${userId}`, { windowMs: 60000, maxRequests: 10 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("providerId");
    const organizationId = searchParams.get("orgId");

    if (!providerId) throw new AppError("providerId is required", 400);
    if (!organizationId) throw new AppError("orgId is required", 400);

    const membership = await OrganizationManager.getUserRole(organizationId, userId);
    if (!membership) {
      throw new AppError("You are not a member of this organization", 403);
    }

    const { redirectUrl, relayState } = await SAMLService.initiateLogin(
      organizationId,
      providerId
    );

    return NextResponse.redirect(redirectUrl, 302);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
