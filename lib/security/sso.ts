import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { randomBytes } from "crypto";
import { z } from "zod";

interface ProviderConfig {
  id: string;
  organizationId: string;
  providerType: string;
  label: string;
  issuerUrl: string | null;
  clientId: string | null;
  clientSecret: string | null;
  metadataUrl: string | null;
  metadataXml: string | null;
  certificate: string | null;
  enabled: boolean;
  enforceForOrg: boolean;
  attributeMapping: Record<string, unknown> | null;
}

interface OIDCConfig {
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

interface OIDCTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
}

interface OIDCUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  picture?: string;
}

interface SAMLConfig {
  entityId: string;
  acsUrl: string;
  audience: string;
  certificate: string;
  privateKey?: string;
}

export class SSOManager {
  static async getProviders(orgId: string): Promise<ProviderConfig[]> {
    return prisma.ssoProviders.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    }) as unknown as ProviderConfig[];
  }

  static async getProvider(providerId: string): Promise<ProviderConfig | null> {
    return prisma.ssoProviders.findUnique({
      where: { id: providerId },
    }) as unknown as ProviderConfig | null;
  }

  static async createProvider(
    orgId: string,
    data: {
      providerType: string;
      label: string;
      issuerUrl?: string;
      clientId?: string;
      clientSecret?: string;
      metadataUrl?: string;
      certificate?: string;
      attributeMapping?: Record<string, string>;
    }
  ): Promise<ProviderConfig> {
    const existing = await prisma.ssoProviders.findFirst({
      where: {
        organizationId: orgId,
        providerType: data.providerType as any,
        enabled: true,
      },
    });
    if (existing) throw new AppError("A provider of this type already exists for this organization", 409);

    return prisma.ssoProviders.create({
      data: {
        organizationId: orgId,
        providerType: data.providerType as any,
        label: data.label,
        issuerUrl: data.issuerUrl,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        metadataUrl: data.metadataUrl,
        certificate: data.certificate,
        attributeMapping: (data.attributeMapping ?? {}) as any,
        enabled: true,
      },
    }) as unknown as ProviderConfig;
  }

  static async updateProvider(providerId: string, data: Partial<ProviderConfig>): Promise<ProviderConfig> {
    return prisma.ssoProviders.update({
      where: { id: providerId },
      data: data as any,
    }) as unknown as ProviderConfig;
  }

  static async deleteProvider(providerId: string): Promise<void> {
    await prisma.ssoProviders.delete({ where: { id: providerId } });
  }

  static async getOIDCConfig(provider: ProviderConfig): Promise<OIDCConfig> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    if (!provider.issuerUrl) {
      throw new AppError("OIDC provider must have an issuer URL", 400);
    }

    if (provider.providerType === "AZURE_AD") {
      return {
        authorizationUrl: `${provider.issuerUrl}/oauth2/v2.0/authorize`,
        tokenUrl: `${provider.issuerUrl}/oauth2/v2.0/token`,
        userInfoUrl: "https://graph.microsoft.com/oidc/userinfo",
        clientId: provider.clientId ?? "",
        clientSecret: provider.clientSecret ?? "",
        redirectUri: `${baseUrl}/api/sso/callback`,
        scope: "openid email profile",
      };
    }

    if (provider.providerType === "OKTA") {
      return {
        authorizationUrl: `${provider.issuerUrl}/v1/authorize`,
        tokenUrl: `${provider.issuerUrl}/v1/token`,
        userInfoUrl: `${provider.issuerUrl}/v1/userinfo`,
        clientId: provider.clientId ?? "",
        clientSecret: provider.clientSecret ?? "",
        redirectUri: `${baseUrl}/api/sso/callback`,
        scope: "openid email profile",
      };
    }

    if (provider.providerType === "GOOGLE") {
      return {
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
        clientId: provider.clientId ?? "",
        clientSecret: provider.clientSecret ?? "",
        redirectUri: `${baseUrl}/api/sso/callback`,
        scope: "openid email profile",
      };
    }

    return {
      authorizationUrl: `${provider.issuerUrl}/authorize`,
      tokenUrl: `${provider.issuerUrl}/token`,
      userInfoUrl: `${provider.issuerUrl}/userinfo`,
      clientId: provider.clientId ?? "",
      clientSecret: provider.clientSecret ?? "",
      redirectUri: `${baseUrl}/api/sso/callback`,
      scope: "openid email profile",
    };
  }

  static async getAuthorizationUrl(providerId: string): Promise<{ url: string; state: string }> {
    const provider = await this.getProvider(providerId);
    if (!provider) throw new AppError("SSO provider not found", 404);

    const config = await this.getOIDCConfig(provider);
    const state = randomBytes(32).toString("hex");
    const nonce = randomBytes(16).toString("hex");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      state,
      nonce,
    });

    return { url: `${config.authorizationUrl}?${params.toString()}`, state };
  }

  static async handleCallback(
    providerId: string,
    code: string,
    state: string,
    expectedState: string
  ): Promise<OIDCUserInfo> {
    if (state !== expectedState) {
      throw new AppError("Invalid OAuth state parameter - possible CSRF attack", 401);
    }

    const provider = await this.getProvider(providerId);
    if (!provider) throw new AppError("SSO provider not found", 404);

    const config = await this.getOIDCConfig(provider);

    const tokenResponse = await this.exchangeCodeForToken(config, code);
    const userInfo = await this.getUserInfo(config.userInfoUrl, tokenResponse.access_token);

    const existingSession = await prisma.ssoSessions.findFirst({
      where: { userId: userInfo.sub, providerId },
    });

    if (existingSession) {
      await prisma.ssoSessions.update({
        where: { id: existingSession.id },
        data: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token ?? existingSession.refreshToken,
          expiresAt: tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
        },
      });
    } else {
      await prisma.ssoSessions.create({
        data: {
          userId: userInfo.sub,
          providerId,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : null,
        },
      });
    }

    return userInfo;
  }

  static async exchangeCodeForToken(config: OIDCConfig, code: string): Promise<OIDCTokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new AppError(`Token exchange failed: ${error}`, 401);
    }

    return response.json();
  }

  static async getUserInfo(userInfoUrl: string, accessToken: string): Promise<OIDCUserInfo> {
    const response = await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new AppError("Failed to fetch user info from IdP", 401);
    }

    return response.json();
  }

  static async refreshSession(providerId: string, userId: string): Promise<void> {
    const session = await prisma.ssoSessions.findFirst({
      where: { userId, providerId },
    });
    if (!session?.refreshToken) {
      throw new AppError("No refresh token available for session", 401);
    }

    const provider = await this.getProvider(providerId);
    if (!provider) throw new AppError("SSO provider not found", 404);

    const config = await this.getOIDCConfig(provider);
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) {
      await prisma.ssoSessions.delete({
        where: { id: session.id },
      });
      throw new AppError("Session refresh failed - please re-authenticate", 401);
    }

    const data: OIDCTokenResponse = await response.json();

    await prisma.ssoSessions.update({
      where: { id: session.id },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? session.refreshToken,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      },
    });
  }

  static getSAMLConfig(provider: ProviderConfig): SAMLConfig {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const orgId = provider.organizationId;

    return {
      entityId: `${baseUrl}/saml/${orgId}/metadata`,
      acsUrl: `${baseUrl}/api/sso/saml/callback`,
      audience: `${baseUrl}/saml/${orgId}`,
      certificate: provider.certificate ?? "",
    };
  }

  static async generateSAMLMetadata(orgId: string): Promise<string> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const providers = await this.getProviders(orgId);
    const samlProvider = providers.find((p) => p.providerType === "SAML");

    const entityId = `${baseUrl}/saml/${orgId}/metadata`;
    const acsUrl = `${baseUrl}/api/sso/saml/callback`;

    return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="true"
    WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}" index="0" isDefault="true"/>
    <md:AttributeConsumingService index="0">
      <md:ServiceName xml:lang="en">${samlProvider?.label ?? "Enterprise SSO"}</md:ServiceName>
      <md:RequestedAttribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic" isRequired="true"/>
      <md:RequestedAttribute Name="firstName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"/>
      <md:RequestedAttribute Name="lastName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"/>
    </md:AttributeConsumingService>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  static async jitProvision(
    orgId: string,
    userInfo: OIDCUserInfo,
    providerId: string
  ): Promise<{ userId: string; created: boolean }> {
    const email = userInfo.email;
    if (!email) throw new AppError("Email is required from IdP for JIT provisioning", 400);

    const user = await prisma.users.findFirst({
      where: { email },
    });

    if (!user) {
      return { userId: email, created: false };
    }

    const existingMember = await prisma.organizationMembers.findFirst({
      where: {
        organizationId: orgId,
        userId: user.id,
      },
    });

    if (existingMember) {
      return { userId: existingMember.userId, created: false };
    }

    const provider = await this.getProvider(providerId);
    const mapping = (provider?.attributeMapping ?? {}) as Record<string, string>;

    const role = mapping.role === "admin" ? "ADMIN" : "MEMBER";

    await prisma.organizationMembers.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        role: role as any,
      },
    });

    return { userId: user.id, created: true };
  }

  static async addDomain(orgId: string, domain: string, providerId?: string) {
    const token = randomBytes(16).toString("hex");
    const existing = await prisma.ssoDomains.findUnique({
      where: { domain: domain.toLowerCase().trim() },
    });
    if (existing) throw new AppError("Domain is already registered", 409);

    return prisma.ssoDomains.create({
      data: {
        organizationId: orgId,
        domain: domain.toLowerCase().trim(),
        providerId,
        verificationToken: token,
        verified: false,
      },
    });
  }

  static async verifyDomain(domainId: string): Promise<boolean> {
    await prisma.ssoDomains.update({
      where: { id: domainId },
      data: { verified: true },
    });
    return true;
  }

  static async removeDomain(domainId: string): Promise<void> {
    await prisma.ssoDomains.delete({ where: { id: domainId } });
  }

  static async getDomains(orgId: string) {
    return prisma.ssoDomains.findMany({
      where: { organizationId: orgId },
      orderBy: { domain: "asc" },
    });
  }

  static async getLoginEvents(orgId: string, limit = 50) {
    return prisma.ssoLoginEvents.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async logLoginEvent(data: {
    userId: string;
    providerId?: string;
    organizationId?: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
  }): Promise<void> {
    await prisma.ssoLoginEvents.create({ data: data as any });
  }

  static async checkDomain(domain: string): Promise<{ providerId: string; organizationId: string } | null> {
    const domainRecord = await prisma.ssoDomains.findUnique({
      where: { domain: domain.toLowerCase().trim() },
    });

    if (!domainRecord?.verified || !domainRecord.providerId) {
      return null;
    }

    const provider = await prisma.ssoProviders.findUnique({
      where: { id: domainRecord.providerId },
    });

    if (!provider?.enabled) {
      return null;
    }

    return {
      providerId: provider.id,
      organizationId: domainRecord.organizationId,
    };
  }
}
