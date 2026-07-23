import { NextRequest, NextResponse } from "next/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { SAMLProviderManager } from "@/lib/security/saml";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const entityId = `${baseUrl}/auth/sso/saml/metadata?orgId=${orgId}`;
    const acsUrl = `${baseUrl}/api/auth/sso/saml/acs`;

    const metadata = SAMLProviderManager.generateSpMetadata({
      entityId,
      acsUrl,
      orgName: undefined,
    });

    return new NextResponse(metadata, {
      headers: {
        "Content-Type": "application/samlmetadata+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
