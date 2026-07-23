export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import {
  exchangeAuthorizationCode,
  getProfile,
  getAuthorizationUrl,
} from "@/lib/social/linkedin";
import crypto from "crypto";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";

function validateLinkedInEnv(): void {
  if (!process.env.LINKEDIN_CLIENT_ID) throw new AppError("LINKEDIN_CLIENT_ID not configured", 500);
  if (!process.env.LINKEDIN_CLIENT_SECRET) throw new AppError("LINKEDIN_CLIENT_SECRET not configured", 500);
}

function getRedirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/social/linkedin`;
}

export async function GET(request: NextRequest) {
  try {
    validateLinkedInEnv();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL("/settings?error=linkedin_denied", request.url)
      );
    }

    if (code && state) {
      const storedState = (await redis.get(`oauth:linkedin:state:${user.id}`)) as string | null;
      if (!storedState || storedState !== state) {
        return NextResponse.redirect(
          new URL("/settings?error=linkedin_invalid_state", request.url)
        );
      }
      await redis.del(`oauth:linkedin:state:${user.id}`);

      const redirectUri = getRedirectUri();
      const tokenData = await exchangeAuthorizationCode(code, redirectUri);
      const profile = await getProfile(tokenData.access_token);

      const existingAccount = await prisma.socialAccounts.findFirst({
        where: { provider: "linkedin", providerUserId: profile.sub },
      });

      if (existingAccount && existingAccount.userId !== user.id) {
        return NextResponse.redirect(
          new URL("/settings?error=linkedin_account_in_use", request.url)
        );
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      const refreshExpiresAt = tokenData.refresh_token_expires_in
        ? new Date(Date.now() + tokenData.refresh_token_expires_in * 1000)
        : null;

      await prisma.socialAccounts.upsert({
        where: existingAccount
          ? { id: existingAccount.id }
          : { provider_providerUserId: { provider: "linkedin", providerUserId: profile.sub } },
        create: {
          provider: "linkedin",
          providerUserId: profile.sub,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt,
          refreshExpiresAt,
          scopes: tokenData.scope,
          userId: user.id,
        },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt,
          refreshExpiresAt,
          scopes: tokenData.scope,
          userId: user.id,
        },
      });

      return NextResponse.redirect(new URL("/settings?linkedin=connected", request.url));
    }

    const csrfState = crypto.randomBytes(16).toString("hex");
    await redis.set(`oauth:linkedin:state:${user.id}`, csrfState, { ex: 300 });

    const redirectUri = getRedirectUri();
    const authUrl = getAuthorizationUrl(redirectUri, csrfState);

    return NextResponse.json({ url: authUrl });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
