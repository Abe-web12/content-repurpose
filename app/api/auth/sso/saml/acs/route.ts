import { NextRequest, NextResponse } from "next/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { SAMLService } from "@/lib/security/saml";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const rl = await rateLimit(`saml:acs:${ip}`, { windowMs: 60000, maxRequests: 20 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const formData = await request.formData().catch(() => {
      throw new AppError("Invalid form data", 400);
    });

    const samlResponse = formData.get("SAMLResponse") as string | null;
    const relayState = formData.get("RelayState") as string | null;

    if (!samlResponse) {
      throw new AppError("Missing SAMLResponse parameter", 400);
    }

    const decodedXml = Buffer.from(samlResponse, "base64").toString("utf-8");

    let providerId: string | undefined;
    let organizationId: string | undefined;

    if (relayState) {
      try {
        const relayData = JSON.parse(Buffer.from(relayState, "hex").toString("utf-8"));
        providerId = relayData.providerId;
        organizationId = relayData.organizationId;
      } catch {
        const provider = await prisma.ssoProviders.findFirst({
          where: { providerType: "SAML", enabled: true },
        });
        if (provider) {
          providerId = provider.id;
          organizationId = provider.organizationId;
        }
      }
    }

    if (!providerId || !organizationId) {
      const provider = await prisma.ssoProviders.findFirst({
        where: { providerType: "SAML", enabled: true },
      });
      if (provider) {
        providerId = provider.id;
        organizationId = provider.organizationId;
      }
    }

    if (!providerId || !organizationId) {
      throw new AppError("No matching SAML provider found", 404);
    }

    const { validation, session } = await SAMLService.handleACSResponse(
      decodedXml,
      organizationId,
      providerId,
      undefined,
      ip,
      userAgent
    );

    if (!validation.valid) {
      throw new AppError(
        `SAML authentication failed: ${validation.errors.join("; ")}`,
        403
      );
    }

    const orgSlug = (await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    }))?.slug;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUrl = session?.userId
      ? `${appUrl}/auth/sso/callback?userId=${session.userId}&orgId=${organizationId}${orgSlug ? `&slug=${orgSlug}` : ""}`
      : `${appUrl}/login?error=provisioning_failed`;

    return NextResponse.redirect(redirectUrl, 302);
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
