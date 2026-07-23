import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { OAuthError } from "./errors";
import { OAuthProvider, OAuthConfig, OAuthToken } from "./types";
import { encryptValue, decryptValue } from "./installer";

function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export function generateCodeVerifier(): string {
  return base64URLEncode(randomBytes(96));
}

export function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(createHash("sha256").update(verifier).digest());
}

function encryptToken(value: string): string {
  return encryptValue(value);
}

function decryptToken(encrypted: string): string {
  return decryptValue(encrypted);
}

function buildQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

export class OAuthManager {
  static getAuthorizationUrl(
    provider: OAuthProvider,
    config: OAuthConfig,
    state?: string
  ): string {
    const params: Record<string, string> = {
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
    };

    if (state) {
      params.state = state;
    }

    if (config.pkce) {
      const verifier = generateCodeVerifier();
      params.code_challenge = generateCodeChallenge(verifier);
      params.code_challenge_method = "S256";
    }

    return `${config.authUrl}?${buildQueryString(params)}`;
  }

  static async exchangeCode(
    provider: OAuthProvider,
    config: OAuthConfig,
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<OAuthToken> {
    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    let response: Response;
    try {
      response = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: buildQueryString(body),
      });
    } catch (err) {
      throw new OAuthError(
        `Failed to exchange authorization code: ${err instanceof Error ? err.message : "Network error"}`,
        "TOKEN_EXCHANGE_FAILED"
      );
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new OAuthError(
        `Token exchange failed with status ${response.status}: ${errorBody}`,
        "TOKEN_EXCHANGE_FAILED",
        { status: response.status, body: errorBody }
      );
    }

    const data = await response.json();

    const token: OAuthToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      tokenType: data.token_type ?? "Bearer",
      scope: data.scope ?? "",
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      refreshExpiresAt: data.refresh_expires_in
        ? new Date(Date.now() + data.refresh_expires_in * 1000)
        : undefined,
      providerUserId: data.provider_user_id,
      providerUsername: data.provider_username,
      providerEmail: data.provider_email,
    };

    return token;
  }

  static async refreshToken(connectionId: string): Promise<OAuthToken> {
    const connection = await prisma.oauthConnections.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.isRevoked) {
      throw new OAuthError("OAuth connection not found or revoked", "CONNECTION_NOT_FOUND");
    }

    if (!connection.refreshToken) {
      throw new OAuthError("No refresh token available", "NO_REFRESH_TOKEN");
    }

    if (connection.refreshExpiresAt && connection.refreshExpiresAt < new Date()) {
      throw new OAuthError("Refresh token has expired", "REFRESH_EXPIRED");
    }

    const decodedRefreshToken = decryptToken(connection.refreshToken);

    const integration = await prisma.integrations.findFirst({
      where: { oauthProvider: connection.provider },
    });

    if (!integration) {
      throw new OAuthError("Integration not found for OAuth provider", "INTEGRATION_NOT_FOUND");
    }

    const configSchema = integration.configSchema as Record<string, unknown> | null;
    const oauthConfig = (configSchema?.oauth ?? {}) as Record<string, string>;

    const body: Record<string, string> = {
      grant_type: "refresh_token",
      refresh_token: decodedRefreshToken,
      client_id: oauthConfig.clientId || "",
      client_secret: oauthConfig.clientSecret || "",
    };

    let response: Response;
    try {
      response = await fetch(oauthConfig.tokenUrl || "", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: buildQueryString(body),
      });
    } catch (err) {
      throw new OAuthError(
        `Failed to refresh token: ${err instanceof Error ? err.message : "Network error"}`,
        "TOKEN_REFRESH_FAILED"
      );
    }

    if (!response.ok) {
      throw new OAuthError(
        `Token refresh failed with status ${response.status}`,
        "TOKEN_REFRESH_FAILED",
        { status: response.status }
      );
    }

    const data = await response.json();

    const newAccessToken = data.access_token;
    const newRefreshToken = data.refresh_token ?? decodedRefreshToken;

    await prisma.oauthConnections.update({
      where: { id: connectionId },
      data: {
        accessToken: encryptToken(newAccessToken),
        refreshToken: newRefreshToken !== decodedRefreshToken ? encryptToken(newRefreshToken) : connection.refreshToken,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
        refreshExpiresAt: data.refresh_expires_in
          ? new Date(Date.now() + data.refresh_expires_in * 1000)
          : connection.refreshExpiresAt,
        lastRefreshedAt: new Date(),
        tokenRotatedAt: new Date(),
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: data.token_type ?? "Bearer",
      scope: data.scope ?? "",
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      refreshExpiresAt: data.refresh_expires_in
        ? new Date(Date.now() + data.refresh_expires_in * 1000)
        : undefined,
    };
  }

  static async revokeConnection(connectionId: string): Promise<void> {
    const connection = await prisma.oauthConnections.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.isRevoked) return;

    const integration = await prisma.integrations.findFirst({
      where: { oauthProvider: connection.provider },
    });

    const configSchema = (integration?.configSchema ?? {}) as Record<string, unknown>;
    const oauthConfig = (configSchema.oauth ?? {}) as Record<string, string>;
    const revocationUrl = oauthConfig.revocationUrl;

    if (revocationUrl) {
      try {
        const accessToken = decryptToken(connection.accessToken);
        await fetch(revocationUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: buildQueryString({ token: accessToken }),
        });
      } catch {
        // continue with local revocation
      }
    }

    await prisma.oauthConnections.update({
      where: { id: connectionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  static async getConnection(installedId: string) {
    const connection = await prisma.oauthConnections.findFirst({
      where: { installedId, isRevoked: false },
    });

    return connection;
  }

  static async getValidToken(installedId: string): Promise<string> {
    const connection = await prisma.oauthConnections.findFirst({
      where: { installedId, isRevoked: false },
    });

    if (!connection) {
      throw new OAuthError("No active OAuth connection found", "NO_CONNECTION");
    }

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (connection.expiresAt && connection.expiresAt < fiveMinutesFromNow) {
      if (!connection.refreshToken) {
        throw new OAuthError("Token expired and no refresh token available", "TOKEN_EXPIRED");
      }
      const refreshed = await this.refreshToken(connection.id);
      return refreshed.accessToken;
    }

    return decryptToken(connection.accessToken);
  }
}
