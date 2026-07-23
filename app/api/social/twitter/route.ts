export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { exchangeAuthorizationCode, getMe, getAuthorizationUrl } from "@/lib/social/twitter";
import crypto from "crypto";
import { sanitizeError, AppError } from "@/lib/utils/api-errors";

function validateTwitterEnv(): void {
  if (!process.env.TWITTER_CLIENT_ID) throw new AppError("TWITTER_CLIENT_ID not configured", 500);
  if (!process.env.TWITTER_CLIENT_SECRET) throw new AppError("TWITTER_CLIENT_SECRET not configured", 500);
}

function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sha256(buffer: string): Buffer {
  return crypto.createHash("sha256").update(buffer).digest();
}

function getRedirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/social/twitter`;
}

export async function GET(request: NextRequest) {
  try {
    validateTwitterEnv();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL("/settings?error=twitter_denied", request.url)
      );
    }

    if (code && state) {
      const storedState = (await redis.get(`oauth:twitter:state:${user.id}`)) as string | null;
      if (!storedState || storedState !== state) {
        return NextResponse.redirect(
          new URL("/settings?error=twitter_invalid_state", request.url)
        );
      }
      await redis.del(`oauth:twitter:state:${user.id}`);

      const storedVerifier = (await redis.get(`oauth:twitter:verifier:${user.id}`)) as string | null;
      const codeVerifier = storedVerifier || "";
      await redis.del(`oauth:twitter:verifier:${user.id}`);

      const redirectUri = getRedirectUri();
      const tokenData = await exchangeAuthorizationCode(code, codeVerifier, redirectUri);
      const me = await getMe(tokenData.access_token);

      const existingAccount = await prisma.socialAccounts.findFirst({
        where: { provider: "twitter", providerUserId: me.data.id },
      });

      if (existingAccount && existingAccount.userId !== user.id) {
        return NextResponse.redirect(
          new URL("/settings?error=twitter_account_in_use", request.url)
        );
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
      await prisma.socialAccounts.upsert({
        where: existingAccount
          ? { id: existingAccount.id }
          : { provider_providerUserId: { provider: "twitter", providerUserId: me.data.id } },
        create: {
          provider: "twitter",
          providerUserId: me.data.id,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt,
          scopes: tokenData.scope,
          userId: user.id,
        },
        update: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          expiresAt,
          scopes: tokenData.scope,
          userId: user.id,
        },
      });

      return NextResponse.redirect(new URL("/settings?twitter=connected", request.url));
    }

    const codeVerifier = base64URLEncode(crypto.randomBytes(32));
    const codeChallenge = base64URLEncode(sha256(codeVerifier));
    const csrfState = crypto.randomBytes(16).toString("hex");

    await redis.set(`oauth:twitter:state:${user.id}`, csrfState, { ex: 300 });
    await redis.set(`oauth:twitter:verifier:${user.id}`, codeVerifier, { ex: 300 });

    const redirectUri = getRedirectUri();
    const authUrl = getAuthorizationUrl(redirectUri, csrfState, codeChallenge);

    return NextResponse.json({ url: authUrl });
  } catch (err) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }
}
