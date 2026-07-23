import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { rateLimit } from "@/lib/utils/rate-limit";
import { SAMLProviderManager } from "@/lib/security/saml";
import { OrganizationManager, hasPermission, Permission } from "@/lib/organizations";

export const runtime = "nodejs";

async function checkPermission(orgId: string, userId: string): Promise<void> {
  const role = await OrganizationManager.getUserRole(orgId, userId);
  if (!role || !hasPermission(role, Permission.SETTINGS_MANAGE)) {
    throw new AppError("Insufficient permissions", 403);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new AppError("Unauthorized", 401);

    const { id: providerId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) throw new AppError("orgId is required", 400);

    await checkPermission(orgId, userId);

    const provider = await SAMLProviderManager.getProvider(providerId, orgId);
    const safeProvider = {
      id: provider.id,
      label: provider.label,
      providerType: provider.providerType,
      enabled: provider.enabled,
      enforceForOrg: provider.enforceForOrg,
      metadataUrl: provider.metadataUrl,
      hasMetadataXml: !!provider.metadataXml,
      hasCertificate: !!provider.certificate,
      attributeMapping: provider.attributeMapping,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };

    return NextResponse.json({ data: safeProvider });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new AppError("Unauthorized", 401);

    const rl = await rateLimit(`saml:providers:${userId}`, { windowMs: 60000, maxRequests: 20 });
    if (!rl.success) throw new AppError("Too many requests", 429);

    const { id: providerId } = await params;
    const body = await request.json().catch(() => {
      throw new AppError("Invalid JSON", 400);
    });

    const { orgId, ...data } = body as {
      orgId: string;
      label?: string;
      metadataXml?: string;
      metadataUrl?: string;
      certificate?: string;
      enabled?: boolean;
      enforceForOrg?: boolean;
      attributeMapping?: Record<string, string>;
    };

    if (!orgId) throw new AppError("orgId is required", 400);
    await checkPermission(orgId, userId);

    const provider = await SAMLProviderManager.updateProvider(
      providerId,
      orgId,
      userId,
      data
    );

    return NextResponse.json({
      data: {
        id: provider.id,
        label: provider.label,
        enabled: provider.enabled,
        enforceForOrg: provider.enforceForOrg,
        updatedAt: provider.updatedAt,
      },
    });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) throw new AppError("Unauthorized", 401);

    const { id: providerId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) throw new AppError("orgId is required", 400);

    await checkPermission(orgId, userId);

    await SAMLProviderManager.deleteProvider(providerId, orgId, userId);

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
