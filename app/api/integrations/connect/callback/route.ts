export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppError, sanitizeError } from "@/lib/utils/api-errors";
import { OAuthManager } from "@/lib/integrations/oauth";
import { IntegrationLogger } from "@/lib/integrations/logs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL("/integrations?error=oauth_denied", request.url)
      );
    }

    if (!code || !state) {
      throw new AppError("Missing OAuth parameters", 400);
    }

    let stateData: { userId: string; organizationId: string; integrationKey: string };
    try {
      stateData = JSON.parse(state);
    } catch {
      throw new AppError("Invalid state parameter", 400);
    }

    const { organizationId, integrationKey } = stateData;

    const integration = await prisma.integrations.findUnique({
      where: { key: integrationKey },
    });
    if (!integration || !integration.oauthProvider) {
      throw new AppError("Integration not found or OAuth not configured", 404);
    }

    const configSchema = integration.configSchema as Record<string, unknown> | null;
    const oauthConfig = (configSchema?.oauth ?? {}) as Record<string, string>;

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/connect/callback`;

    const token = await OAuthManager.exchangeCode(
      integration.oauthProvider as any,
      {
        clientId: oauthConfig.clientId,
        clientSecret: oauthConfig.clientSecret,
        redirectUri: oauthConfig.redirectUri || redirectUri,
        scopes: (oauthConfig.scopes || "").split(",").filter(Boolean),
        authUrl: oauthConfig.authUrl,
        tokenUrl: oauthConfig.tokenUrl,
      },
      code,
      redirectUri
    );

    const installed = await prisma.installedIntegrations.findUnique({
      where: {
        organizationId_integrationKey: {
          organizationId,
          integrationKey,
        },
      },
    });

    if (!installed) {
      throw new AppError("Integration not installed", 404);
    }

    const { encryptValue } = await import("@/lib/integrations/installer");

    await prisma.oauthConnections.create({
      data: {
        installedId: installed.id,
        organizationId,
        provider: integration.oauthProvider as any,
        accessToken: encryptValue(token.accessToken),
        refreshToken: token.refreshToken ? encryptValue(token.refreshToken) : null,
        idToken: token.idToken,
        tokenType: token.tokenType,
        scope: token.scope,
        expiresAt: token.expiresAt,
        refreshExpiresAt: token.refreshExpiresAt,
        providerUserId: token.providerUserId,
        providerUsername: token.providerUsername,
        providerEmail: token.providerEmail,
      },
    });

    await prisma.installedIntegrations.update({
      where: { id: installed.id },
      data: { status: "CONNECTED" },
    });

    await IntegrationLogger.log(
      installed.id,
      organizationId,
      "info",
      `OAuth connection established for ${integrationKey}`,
      { provider: integration.oauthProvider },
      "oauth"
    );

    return NextResponse.redirect(
      new URL(`/integrations?id=${installed.id}&oauth=success`, request.url)
    );
  } catch (err) {
    const { error: errMsg } = sanitizeError(err);
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(errMsg)}`, request.url)
    );
  }
}
