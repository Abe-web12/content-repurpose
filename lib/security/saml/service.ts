import * as crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { parseSAMLResponse } from "./parser";
import { SAMLProviderManager } from "./provider";
import { JITProvisioner } from "./provisioning";
import type { SAMLValidationResult, SSOSessionData } from "./types";

export class SAMLService {
  static generateAuthnRequest(
    idpSsoUrl: string,
    spEntityId: string,
    acsUrl: string,
    forceAuthn = false
  ): { request: string; relayState: string; requestId: string } {
    const requestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();

    const request = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                    ID="${requestId}"
                    Version="2.0"
                    IssueInstant="${issueInstant}"
                    Destination="${this.escapeXml(idpSsoUrl)}"
                    AssertionConsumerServiceURL="${this.escapeXml(acsUrl)}"
                    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                    ${forceAuthn ? 'ForceAuthn="true"' : ""}>
  <saml:Issuer>${this.escapeXml(spEntityId)}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                      AllowCreate="true"/>
</samlp:AuthnRequest>`;

    const relayState = crypto.randomBytes(16).toString("hex");

    return { request, relayState, requestId };
  }

  static buildAuthnRedirect(
    idpSsoUrl: string,
    authnRequest: string,
    relayState: string,
    signingPrivateKey?: string
  ): string {
    const base64Request = Buffer.from(authnRequest, "utf-8").toString("base64");
    const encodedRequest = encodeURIComponent(base64Request);

    let params = `SAMLRequest=${encodedRequest}`;
    if (relayState) {
      params += `&RelayState=${encodeURIComponent(relayState)}`;
    }

    if (signingPrivateKey) {
      const signer = crypto.createSign("rsa-sha256");
      signer.update(params);
      const signature = signer.sign(signingPrivateKey, "base64");
      params += `&SigAlg=${encodeURIComponent("http://www.w3.org/2001/04/xmldsig-more#rsa-sha256")}`;
      params += `&Signature=${encodeURIComponent(signature)}`;
    }

    return `${idpSsoUrl}?${params}`;
  }

  static async handleACSResponse(
    samlResponseXml: string,
    organizationId: string,
    providerId: string,
    expectedInResponseTo?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ validation: SAMLValidationResult; session?: SSOSessionData }> {
    const provider = await SAMLProviderManager.getProvider(providerId, organizationId);
    const idpConfig = await SAMLProviderManager.getSAMLConfig(providerId, organizationId);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const spEntityId = `${baseUrl}/auth/sso/saml/metadata?orgId=${organizationId}`;
    const acsUrl = `${baseUrl}/api/auth/sso/saml/acs`;

    if (!idpConfig.certificate) {
      throw new AppError("SAML provider has no certificate configured", 400);
    }

    const result = parseSAMLResponse(
      samlResponseXml,
      idpConfig.entityId,
      spEntityId,
      acsUrl,
      idpConfig.certificate,
      expectedInResponseTo
    );

    if (!result.valid || !result.assertion) {
      await prisma.ssoLoginEvents.create({
        data: {
          userId: "",
          providerId,
          organizationId,
          ipAddress,
          userAgent,
          success: false,
          failureReason: result.errors.join("; "),
        },
      });
      return { validation: result };
    }

    const attributeMapping = await SAMLProviderManager.getAttributeMapping(providerId, organizationId);
    const provisioningResult = await JITProvisioner.provision(
      organizationId,
      result.assertion,
      attributeMapping,
      providerId
    );

    const nameId = result.assertion.subject.nameId;
    const session: SSOSessionData = {
      userId: provisioningResult.userCreated
        ? (await prisma.users.findUnique({ where: { email: nameId }, select: { id: true } }))?.id || ""
        : (await prisma.organizationMembers.findFirst({
            where: { organizationId, user: { email: nameId } },
            select: { userId: true },
          }))?.userId || "",
      providerId,
      nameId,
      sessionIndex: result.assertion.authnStatement?.sessionIndex,
      attributes: result.assertion.attributeStatement || {},
    };

    if (session.userId) {
      const expiresAt = new Date(result.assertion.conditions.notOnOrAfter);
      await prisma.ssoSessions.create({
        data: {
          userId: session.userId,
          providerId,
          idpSessionId: result.assertion.authnStatement?.sessionIndex || null,
          expiresAt,
        },
      });
    }

    return { validation: result, session };
  }

  static async initiateLogin(
    organizationId: string,
    providerId: string
  ): Promise<{ redirectUrl: string; requestId: string; relayState: string }> {
    const idpConfig = await SAMLProviderManager.getSAMLConfig(providerId, organizationId);

    if (!idpConfig.ssoUrl) {
      throw new AppError("SAML provider has no SSO URL configured", 400);
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const spEntityId = `${baseUrl}/auth/sso/saml/metadata?orgId=${organizationId}`;
    const acsUrl = `${baseUrl}/api/auth/sso/saml/acs`;

    const { request, relayState, requestId } = this.generateAuthnRequest(
      idpConfig.ssoUrl,
      spEntityId,
      acsUrl
    );

    const redirectUrl = this.buildAuthnRedirect(idpConfig.ssoUrl, request, relayState, idpConfig.certificate);

    return { redirectUrl, requestId, relayState };
  }

  static async initiateLogout(
    organizationId: string,
    providerId: string,
    userId: string
  ): Promise<{ redirectUrl?: string }> {
    const idpConfig = await SAMLProviderManager.getSAMLConfig(providerId, organizationId);

    if (!idpConfig.sloUrl) {
      return { redirectUrl: undefined };
    }

    const session = await prisma.ssoSessions.findFirst({
      where: { userId, providerId },
      orderBy: { createdAt: "desc" },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const spEntityId = `${baseUrl}/auth/sso/saml/metadata?orgId=${organizationId}`;

    const logoutRequestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();

    let logoutRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                     xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                     ID="${logoutRequestId}"
                     Version="2.0"
                     IssueInstant="${issueInstant}"
                     Destination="${this.escapeXml(idpConfig.sloUrl)}">
  <saml:Issuer>${this.escapeXml(spEntityId)}</saml:Issuer>`;

    if (session?.idpSessionId) {
      logoutRequest += `
  <samlp:SessionIndex>${this.escapeXml(session.idpSessionId)}</samlp:SessionIndex>`;
    }

    logoutRequest += `
  <saml:NameID>${this.escapeXml(session?.idpSessionId || userId)}</saml:NameID>
</samlp:LogoutRequest>`;

    const base64Request = Buffer.from(logoutRequest, "utf-8").toString("base64");
    const redirectUrl = `${idpConfig.sloUrl}?SAMLRequest=${encodeURIComponent(base64Request)}`;

    return { redirectUrl };
  }

  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
