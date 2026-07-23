import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/utils/api-errors";
import { parseIdPMetadata, validateIdPCertificate } from "./parser";
import type { IdPConfig, AttributeMapping, SpMetadataConfig } from "./types";

export class SAMLProviderManager {
  static async getProviders(organizationId: string) {
    return prisma.ssoProviders.findMany({
      where: { organizationId, providerType: "SAML" },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getProvider(providerId: string, organizationId: string) {
    const provider = await prisma.ssoProviders.findFirst({
      where: { id: providerId, organizationId },
    });
    if (!provider) throw new AppError("SAML provider not found", 404);
    return provider;
  }

  static async createProvider(
    organizationId: string,
    createdById: string,
    data: {
      label: string;
      metadataXml?: string;
      metadataUrl?: string;
      certificate?: string;
      attributeMapping?: AttributeMapping;
      enforceForOrg?: boolean;
    }
  ) {
    if (!data.label?.trim()) {
      throw new AppError("Provider label is required", 400);
    }

    let idpConfig: Partial<IdPConfig> = {};
    let certificate = data.certificate;

    if (data.metadataXml) {
      idpConfig = parseIdPMetadata(data.metadataXml);
      certificate = idpConfig.certificate || certificate;
    }

    if (certificate) {
      if (!validateIdPCertificate(certificate)) {
        throw new AppError("Invalid IdP certificate: must be RSA >= 2048 bits or EC", 400);
      }
    }

    const provider = await prisma.$transaction(async (tx) => {
      const p = await tx.ssoProviders.create({
        data: {
          organizationId,
          providerType: "SAML",
          label: data.label.trim(),
          metadataXml: data.metadataXml || null,
          metadataUrl: data.metadataUrl || null,
          certificate: certificate || null,
          attributeMapping: (data.attributeMapping || {}) as any,
          enforceForOrg: data.enforceForOrg ?? false,
        },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: createdById,
          action: "saml.provider.create",
          entityType: "saml_provider",
          entityId: p.id,
          details: { label: data.label },
        },
      });

      return p;
    });

    return provider;
  }

  static async updateProvider(
    providerId: string,
    organizationId: string,
    updatedById: string,
    data: {
      label?: string;
      metadataXml?: string;
      metadataUrl?: string;
      certificate?: string;
      attributeMapping?: AttributeMapping;
      enabled?: boolean;
      enforceForOrg?: boolean;
    }
  ) {
    const existing = await this.getProvider(providerId, organizationId);

    let certificate = data.certificate;
    let idpConfig: Partial<IdPConfig> = {};

    if (data.metadataXml) {
      idpConfig = parseIdPMetadata(data.metadataXml);
      certificate = idpConfig.certificate || certificate;
    }

    if (certificate) {
      if (!validateIdPCertificate(certificate)) {
        throw new AppError("Invalid IdP certificate: must be RSA >= 2048 bits or EC", 400);
      }
    }

    const updateData: Record<string, any> = {};
    if (data.label !== undefined) updateData.label = data.label.trim();
    if (data.metadataXml !== undefined) updateData.metadataXml = data.metadataXml;
    if (data.metadataUrl !== undefined) updateData.metadataUrl = data.metadataUrl;
    if (certificate !== undefined) updateData.certificate = certificate;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.enforceForOrg !== undefined) updateData.enforceForOrg = data.enforceForOrg;
    if (data.attributeMapping !== undefined) updateData.attributeMapping = data.attributeMapping as any;

    const provider = await prisma.$transaction(async (tx) => {
      const p = await tx.ssoProviders.update({
        where: { id: providerId },
        data: updateData,
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: updatedById,
          action: "saml.provider.update",
          entityType: "saml_provider",
          entityId: providerId,
          details: { changes: Object.keys(updateData) },
        },
      });

      return p;
    });

    return provider;
  }

  static async deleteProvider(providerId: string, organizationId: string, deletedById: string) {
    const existing = await this.getProvider(providerId, organizationId);

    await prisma.$transaction(async (tx) => {
      await tx.ssoDomains.updateMany({
        where: { providerId },
        data: { providerId: null },
      });

      await tx.ssoSessions.deleteMany({
        where: { providerId },
      });

      await tx.ssoProviders.delete({
        where: { id: providerId },
      });

      await tx.organizationAuditLogs.create({
        data: {
          organizationId,
          actorId: deletedById,
          action: "saml.provider.delete",
          entityType: "saml_provider",
          entityId: providerId,
          details: { label: existing.label },
        },
      });
    });
  }

  static async rotateCertificate(
    providerId: string,
    organizationId: string,
    updatedById: string,
    newCertificate: string
  ) {
    if (!validateIdPCertificate(newCertificate)) {
      throw new AppError("Invalid certificate", 400);
    }

    return this.updateProvider(providerId, organizationId, updatedById, {
      certificate: newCertificate,
    });
  }

  static async getSAMLConfig(providerId: string, organizationId: string): Promise<IdPConfig> {
    const provider = await this.getProvider(providerId, organizationId);
    const idpConfig = provider.metadataXml
      ? parseIdPMetadata(provider.metadataXml)
      : null;

    return {
      entityId: idpConfig?.entityId || provider.label,
      ssoUrl: idpConfig?.ssoUrl || "",
      sloUrl: idpConfig?.sloUrl,
      certificate: provider.certificate || idpConfig?.certificate,
      metadataXml: provider.metadataXml || undefined,
    };
  }

  static async getAttributeMapping(providerId: string, organizationId: string): Promise<AttributeMapping> {
    const provider = await this.getProvider(providerId, organizationId);
    return (provider.attributeMapping as AttributeMapping) || {};
  }

  static generateSpMetadata(config: SpMetadataConfig): string {
    const certData = config.certificate
      ? config.certificate
          .replace("-----BEGIN CERTIFICATE-----", "")
          .replace("-----END CERTIFICATE-----", "")
          .replace(/\s+/g, "")
      : "";

    const keyDescriptorBlock = certData
      ? `
      <md:KeyDescriptor use="signing">
        <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
          <ds:X509Data>
            <ds:X509Certificate>${certData}</ds:X509Certificate>
          </ds:X509Data>
        </ds:KeyInfo>
      </md:KeyDescriptor>`
      : "";

    return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     entityID="${this.escapeXml(config.entityId)}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"
                       AuthnRequestsSigned="true"
                       WantAssertionsSigned="true">
    ${keyDescriptorBlock}
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                  Location="${this.escapeXml(config.acsUrl)}"
                                  index="0"
                                  isDefault="true"/>
    ${config.sloUrl ? `<md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="${this.escapeXml(config.sloUrl)}"/>` : ""}
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</md:NameIDFormat>
    ${config.orgName ? `<md:Organization><md:OrganizationName xml:lang="en">${this.escapeXml(config.orgName)}</md:OrganizationName>${config.orgDisplayName ? `<md:OrganizationDisplayName xml:lang="en">${this.escapeXml(config.orgDisplayName)}</md:OrganizationDisplayName>` : ""}</md:Organization>` : ""}
    ${config.contactEmail && config.contactPerson ? `<md:ContactPerson contactType="${this.escapeXml(config.contactPerson)}"><md:EmailAddress>${this.escapeXml(config.contactEmail)}</md:EmailAddress></md:ContactPerson>` : ""}
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
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
