import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { SAMLProviderManager } from "@/lib/security/saml";
import { OrganizationManager, hasPermission, Permission } from "@/lib/organizations";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) throw new AppError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) throw new AppError("orgId is required", 400);

    const role = await OrganizationManager.getUserRole(orgId, userId);
    if (!role || !hasPermission(role, Permission.SETTINGS_MANAGE)) {
      throw new AppError("Insufficient permissions", 403);
    }

    const providers = await SAMLProviderManager.getProviders(orgId);
    const safeProviders = providers.map((p: any) => ({
      id: p.id,
      label: p.label,
      providerType: p.providerType,
      enabled: p.enabled,
      enforceForOrg: p.enforceForOrg,
      metadataUrl: p.metadataUrl,
      hasMetadataXml: !!p.metadataXml,
      hasCertificate: !!p.certificate,
      attributeMapping: p.attributeMapping,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({ data: safeProviders });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) throw new AppError("Unauthorized", 401);

    const rl = await rateLimit(`saml:providers:${userId}`, { windowMs: 60000, maxRequests: 20 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON", 400);
    });

    const { orgId, ...data } = body as {
      orgId: string;
      label: string;
      metadataXml?: string;
      metadataUrl?: string;
      certificate?: string;
      attributeMapping?: Record<string, string>;
      enforceForOrg?: boolean;
    };

    if (!orgId) throw new AppError("orgId is required", 400);

    const role = await OrganizationManager.getUserRole(orgId, userId);
    if (!role || !hasPermission(role, Permission.SETTINGS_MANAGE)) {
      throw new AppError("Insufficient permissions", 403);
    }

    const provider = await SAMLProviderManager.createProvider(
      orgId,
      userId,
      data
    );

    const safeProvider = {
      id: provider.id,
      label: provider.label,
      providerType: provider.providerType,
      enabled: provider.enabled,
      enforceForOrg: provider.enforceForOrg,
      hasCertificate: !!provider.certificate,
      createdAt: provider.createdAt,
    };

    return NextResponse.json({ data: safeProvider }, { status: 201 });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
