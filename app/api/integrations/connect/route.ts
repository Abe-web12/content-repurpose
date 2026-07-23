export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { OAuthManager, generateCodeVerifier, generateCodeChallenge } from "@/lib/integrations/oauth";
import { IntegrationManager } from "@/lib/integrations/manager";
import { IntegrationPermissions } from "@/lib/integrations/permissions";
import { z } from "zod";

const connectSchema = z.object({
  integrationKey: z.string().min(1),
  organizationId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new AppError("Unauthorized", 401);

    const body = await parseBody<Record<string, unknown>>(request);
    const parsed = connectSchema.parse(body);

    await IntegrationPermissions.validateOrgAccess(parsed.organizationId, user.id, "configure");

    const integration = await IntegrationManager.getIntegration(parsed.integrationKey);
    if (!integration.hasOAuth || !integration.oauthProvider) {
      throw new AppError("This integration does not support OAuth", 400);
    }

    const configSchema = integration.configSchema as Record<string, unknown> | null;
    const oauthConfig = (configSchema?.oauth ?? {}) as Record<string, string>;

    if (!oauthConfig.clientId || !oauthConfig.clientSecret) {
      throw new AppError("OAuth not configured for this integration", 400);
    }

    const state = JSON.stringify({
      userId: user.id,
      organizationId: parsed.organizationId,
      integrationKey: parsed.integrationKey,
    });

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/connect/callback`;

    const pkceEnabled = oauthConfig.pkce === "true";

    const authUrl = OAuthManager.getAuthorizationUrl(
      integration.oauthProvider as any,
      {
        clientId: oauthConfig.clientId,
        clientSecret: oauthConfig.clientSecret,
        redirectUri: oauthConfig.redirectUri || redirectUri,
        scopes: (oauthConfig.scopes || "").split(",").filter(Boolean),
        authUrl: oauthConfig.authUrl,
        tokenUrl: oauthConfig.tokenUrl,
        pkce: pkceEnabled,
      },
      state
    );

    return NextResponse.json({ data: { authUrl, redirectUri } });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
