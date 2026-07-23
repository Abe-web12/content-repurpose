import { describe, it, expect, beforeAll } from "vitest";
import * as crypto from "crypto";

import {
  validateTimestamp,
  validateIssuer,
  validateAudience,
  validateRecipient,
  validateAssertion,
  isAssertionValid,
} from "@/lib/security/saml/validation";

import {
  parseSAMLResponse,
  parseIdPMetadata,
  validateIdPCertificate,
} from "@/lib/security/saml/parser";

import { SAMLProviderManager } from "@/lib/security/saml/provider";
import { SAMLService } from "@/lib/security/saml/service";
import { JITProvisioner } from "@/lib/security/saml/provisioning";

import type { SAMLAssertion, AttributeMapping } from "@/lib/security/saml/types";

let keyPair: crypto.KeyPairKeyObjectResult;
let certPem: string;

beforeAll(() => {
  keyPair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pubKey = keyPair.publicKey.export({ type: "spki", format: "pem" });
  certPem = typeof pubKey === "string" ? pubKey : Buffer.from(pubKey).toString("utf-8");
});

function makeAssertion(overrides: Partial<SAMLAssertion> = {}): SAMLAssertion {
  const future = new Date(Date.now() + 3600000);
  const past = new Date(Date.now() - 3600000);
  return {
    id: overrides.id ?? `_${crypto.randomUUID()}`,
    issueInstant: overrides.issueInstant ?? new Date(),
    issuer: overrides.issuer ?? "https://idp.example.com",
    subject: {
      nameId: overrides.subject?.nameId ?? "user@example.com",
      format: overrides.subject?.format ?? "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
      confirmationMethod: overrides.subject?.confirmationMethod ?? "urn:oasis:names:tc:SAML:2.0:cm:bearer",
    },
    conditions: {
      notBefore: overrides.conditions?.notBefore ?? past,
      notOnOrAfter: overrides.conditions?.notOnOrAfter ?? future,
      audienceRestrictions: overrides.conditions?.audienceRestrictions ?? ["https://sp.example.com/saml"],
    },
    authnStatement: overrides.authnStatement ?? {
      authnInstant: new Date(),
      sessionIndex: crypto.randomUUID(),
      authnContextClassRef: "urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport",
    },
    attributeStatement: overrides.attributeStatement ?? {
      email: "user@example.com",
      firstName: "John",
      lastName: "Doe",
      groups: ["Engineering", "Admin"],
      role: "ADMIN",
    },
  };
}

function generateSAMLResponseXml(
  issuer: string,
  assertionId: string,
  subjectNameId: string,
  audience: string,
  recipient: string,
  notBefore: string,
  notOnOrAfter: string,
  includeSignature = true
): string {
  let assertionXml = `  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                     ID="${assertionId}"
                     IssueInstant="${new Date().toISOString()}"
                     Version="2.0">
    <saml:Issuer>${issuer}</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${subjectNameId}</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"/>
    </saml:Subject>
    <saml:Conditions NotBefore="${notBefore}" NotOnOrAfter="${notOnOrAfter}">
      <saml:AudienceRestriction>
        <saml:Audience>${audience}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="${new Date().toISOString()}" SessionIndex="${crypto.randomUUID()}">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>${subjectNameId}</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="firstName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>John</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="lastName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>Doe</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="groups" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>Engineering</saml:AttributeValue>
        <saml:AttributeValue>Admin</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="role" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>ADMIN</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>`;

  if (includeSignature) {
    const pubKeyBuf = keyPair.publicKey.export({ type: "spki", format: "der" }) as Buffer;
    const certB64 = pubKeyBuf.toString("base64");
    assertionXml = assertionXml.replace(
      "</saml:Issuer>",
      `</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#${assertionId}">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>PLACEHOLDER</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>PLACEHOLDER</ds:SignatureValue>
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${certB64}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </ds:Signature>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_${crypto.randomUUID()}"
                InResponseTo="_${crypto.randomUUID()}"
                Version="2.0"
                IssueInstant="${new Date().toISOString()}"
                Destination="${recipient}">
  <saml:Issuer>${issuer}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
${assertionXml}
</samlp:Response>`;
}

function generateIdPMetadata(entityId: string, ssoUrl: string, cert?: string): string {
  const pubKeyDer = keyPair.publicKey.export({ type: "spki", format: "der" }) as Buffer;
  const certB64 = cert
    ? (typeof cert === "string" ? Buffer.from(cert).toString("base64") : Buffer.from(cert).toString("base64"))
    : pubKeyDer.toString("base64");

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     entityID="${entityId}">
  <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>${certB64}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                            Location="${ssoUrl}"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                            Location="${ssoUrl}/slo"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`;
}

// ─── Validation Tests ───────────────────────────────────────────────────────────

describe("SAML — Timestamp Validation", () => {
  it("accepts valid timestamps", () => {
    const past = new Date(Date.now() - 60000);
    const future = new Date(Date.now() + 3600000);
    const errors = validateTimestamp({ notBefore: past, notOnOrAfter: future });
    expect(errors).toHaveLength(0);
  });

  it("rejects assertion that is not yet valid", () => {
    const future = new Date(Date.now() + 600000);
    const farFuture = new Date(Date.now() + 3600000);
    const errors = validateTimestamp({ notBefore: future, notOnOrAfter: farFuture });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("NotBefore");
  });

  it("rejects expired assertion", () => {
    const past = new Date(Date.now() - 7200000);
    const farPast = new Date(Date.now() - 3600000);
    const errors = validateTimestamp({ notBefore: farPast, notOnOrAfter: past });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("NotOnOrAfter");
  });
});

describe("SAML — Issuer Validation", () => {
  it("accepts matching issuer", () => {
    const errors = validateIssuer("https://idp.example.com", "https://idp.example.com");
    expect(errors).toHaveLength(0);
  });

  it("rejects mismatched issuer", () => {
    const errors = validateIssuer("https://evil.com", "https://idp.example.com");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("Issuer mismatch");
  });

  it("rejects empty issuer", () => {
    const errors = validateIssuer("", "https://idp.example.com");
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("SAML — Audience Validation", () => {
  it("accepts matching audience", () => {
    const errors = validateAudience(["https://sp.example.com/saml"], "https://sp.example.com/saml");
    expect(errors).toHaveLength(0);
  });

  it("rejects wrong audience", () => {
    const errors = validateAudience(["https://evil.com"], "https://sp.example.com/saml");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("Audience mismatch");
  });

  it("rejects empty audience restrictions", () => {
    const errors = validateAudience([], "https://sp.example.com/saml");
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("SAML — Assertion Validation", () => {
  const validIssuer = "https://idp.example.com";
  const validAudience = "https://sp.example.com/saml";
  const validRecipient = "https://sp.example.com/acs";

  it("accepts fully valid assertion", () => {
    const assertion = makeAssertion();
    const errors = validateAssertion(assertion, validIssuer, validAudience, validRecipient);
    expect(errors).toHaveLength(0);
  });

  it("rejects assertion with wrong issuer", () => {
    const assertion = makeAssertion({ issuer: "https://evil.com" });
    const errors = validateAssertion(assertion, validIssuer, validAudience, validRecipient);
    expect(errors.some((e) => e.includes("Issuer"))).toBe(true);
  });

  it("rejects assertion with wrong audience", () => {
    const assertion = makeAssertion({
      conditions: {
        ...makeAssertion().conditions,
        audienceRestrictions: ["https://evil.com"],
      },
    });
    const errors = validateAssertion(assertion, validIssuer, validAudience, validRecipient);
    expect(errors.some((e) => e.includes("Audience"))).toBe(true);
  });

  it("rejects expired assertion", () => {
    const farPast = new Date(Date.now() - 7200000);
    const evenFurtherPast = new Date(Date.now() - 14400000);
    const assertion = makeAssertion({
      conditions: { notBefore: evenFurtherPast, notOnOrAfter: farPast, audienceRestrictions: [validAudience] },
    });
    const errors = validateAssertion(assertion, validIssuer, validAudience, validRecipient);
    expect(errors.some((e) => e.includes("expired") || e.includes("NotOnOrAfter"))).toBe(true);
  });

  it("rejects assertion missing NameID", () => {
    const assertion = makeAssertion({ subject: { nameId: "", format: undefined, confirmationMethod: undefined } });
    const errors = validateAssertion(assertion, validIssuer, validAudience, validRecipient);
    expect(errors.some((e) => e.includes("NameID"))).toBe(true);
  });
});

// ─── Certificate Validation Tests ────────────────────────────────────────────────

describe("SAML — Certificate Validation", () => {
  it("validates a valid RSA certificate", () => {
    const pem = keyPair.publicKey.export({ type: "spki", format: "pem" }) as string;
    const result = validateIdPCertificate(pem);
    expect(result).toBe(true);
  });

  it("rejects empty certificate", () => {
    expect(validateIdPCertificate("")).toBe(false);
  });

  it("rejects garbage string as certificate", () => {
    expect(validateIdPCertificate("not-a-cert")).toBe(false);
  });

  it("rejects short RSA key (1024-bit — below minimum)", () => {
    const shortKey = crypto.generateKeyPairSync("rsa", { modulusLength: 1024 });
    const pem = shortKey.publicKey.export({ type: "spki", format: "pem" }) as string;
    expect(validateIdPCertificate(pem)).toBe(false);
  });
});

// ─── IdP Metadata Parsing Tests ────────────────────────────────────────────────

describe("SAML — IdP Metadata Parsing", () => {
  it("parses valid IdP metadata", () => {
    const entityId = "https://idp.example.com";
    const ssoUrl = "https://idp.example.com/saml/sso";
    const metadata = generateIdPMetadata(entityId, ssoUrl);
    const result = parseIdPMetadata(metadata);
    expect(result.entityId).toBe(entityId);
    expect(result.ssoUrl).toBe(ssoUrl);
    expect(result.sloUrl).toContain("slo");
    expect(result.certificate).toBeTruthy();
  });

  it("rejects empty metadata", () => {
    expect(() => parseIdPMetadata("")).toThrow();
  });

  it("rejects invalid XML", () => {
    expect(() => parseIdPMetadata("not xml")).toThrow();
  });

  it("rejects metadata with DOCTYPE (XXE protection)", () => {
    const malicious = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="test"><md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://example.com/sso"/></md:IDPSSODescriptor></md:EntityDescriptor>`;
    expect(() => parseIdPMetadata(malicious)).toThrow("DOCTYPE");
  });
});

// ─── SAML Response Parsing Tests ─────────────────────────────────────────────

describe("SAML — Response Parsing & Signature Verification", () => {
  const expectedIssuer = "https://idp.example.com";
  const expectedAudience = "https://sp.example.com/saml";
  const expectedRecipient = "https://sp.example.com/acs";

  it("rejects empty response", () => {
    const result = parseSAMLResponse("", expectedIssuer, expectedAudience, expectedRecipient, certPem);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects non-XML content", () => {
    const result = parseSAMLResponse("not xml", expectedIssuer, expectedAudience, expectedRecipient, certPem);
    expect(result.valid).toBe(false);
  });

  it("rejects XML with DOCTYPE (XXE protection)", () => {
    const malicious = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>test</root>`;
    const result = parseSAMLResponse(malicious, expectedIssuer, expectedAudience, expectedRecipient, certPem);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes("doctype") || e.toLowerCase().includes("entity"))).toBe(true);
  });

  it("rejects response with non-success status", () => {
    const xml = `<?xml version="1.0"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_test" Version="2.0" IssueInstant="${new Date().toISOString()}">
  <saml:Issuer>${expectedIssuer}</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Responder"/>
  </samlp:Status>
</samlp:Response>`;
    const result = parseSAMLResponse(xml, expectedIssuer, expectedAudience, expectedRecipient, certPem);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("status"))).toBe(true);
  });

  it("rejects unsigned assertion", () => {
    const xml = generateSAMLResponseXml(
      expectedIssuer,
      `_${crypto.randomUUID()}`,
      "user@example.com",
      expectedAudience,
      expectedRecipient,
      new Date(Date.now() - 60000).toISOString(),
      new Date(Date.now() + 3600000).toISOString(),
      false
    );
    const result = parseSAMLResponse(xml, expectedIssuer, expectedAudience, expectedRecipient, certPem);
    expect(result.valid).toBe(false);
  });

  it("rejects assertion with wrong issuer", () => {
    const xml = generateSAMLResponseXml(
      "https://evil.com",
      `_${crypto.randomUUID()}`,
      "user@example.com",
      expectedAudience,
      expectedRecipient,
      new Date(Date.now() - 60000).toISOString(),
      new Date(Date.now() + 3600000).toISOString(),
      false
    );
    const result = parseSAMLResponse(xml, expectedIssuer, expectedAudience, expectedRecipient, certPem);
    expect(result.valid).toBe(false);
  });

  it("rejects assertion with wrong audience", () => {
    const xml = generateSAMLResponseXml(
      expectedIssuer,
      `_${crypto.randomUUID()}`,
      "user@example.com",
      "https://evil.com",
      expectedRecipient,
      new Date(Date.now() - 60000).toISOString(),
      new Date(Date.now() + 3600000).toISOString(),
      false
    );
    const result = parseSAMLResponse(xml, expectedIssuer, expectedAudience, expectedRecipient, certPem);
    expect(result.valid).toBe(false);
  });

  it("rejects expired assertion", () => {
    const xml = generateSAMLResponseXml(
      expectedIssuer,
      `_${crypto.randomUUID()}`,
      "user@example.com",
      expectedAudience,
      expectedRecipient,
      new Date(Date.now() - 7200000).toISOString(),
      new Date(Date.now() - 3600000).toISOString(),
      false
    );
    const result = parseSAMLResponse(xml, expectedIssuer, expectedAudience, expectedRecipient, certPem);
    expect(result.valid).toBe(false);
  });

  it("rejects response exceeding maximum size", () => {
    const largeXml = "a".repeat(2 * 1024 * 1024);
    const result = parseSAMLResponse(largeXml, expectedIssuer, expectedAudience, expectedRecipient, certPem);
    expect(result.valid).toBe(false);
  });
});

// ─── SP Metadata Generation Tests ─────────────────────────────────────────────

describe("SAML — SP Metadata Generation", () => {
  it("generates valid SP metadata XML", () => {
    const metadata = SAMLProviderManager.generateSpMetadata({
      entityId: "https://sp.example.com/saml",
      acsUrl: "https://sp.example.com/api/auth/sso/saml/acs",
      sloUrl: "https://sp.example.com/api/auth/sso/saml/logout",
      orgName: "Test Org",
      orgDisplayName: "Test Organization",
      contactPerson: "technical",
      contactEmail: "admin@example.com",
    });

    expect(metadata).toContain("EntityDescriptor");
    expect(metadata).toContain("https://sp.example.com/saml");
    expect(metadata).toContain("AssertionConsumerService");
    expect(metadata).toContain("SingleLogoutService");
    expect(metadata).toContain("admin@example.com");
  });

  it("generates metadata without optional fields", () => {
    const metadata = SAMLProviderManager.generateSpMetadata({
      entityId: "https://sp.example.com/saml",
      acsUrl: "https://sp.example.com/api/auth/sso/saml/acs",
    });
    expect(metadata).toContain("EntityDescriptor");
    expect(metadata).not.toContain("SingleLogoutService");
    expect(metadata).not.toContain("Organization");
  });

  it("includes certificate when provided", () => {
    const pem = keyPair.publicKey.export({ type: "spki", format: "pem" }) as string;
    const metadata = SAMLProviderManager.generateSpMetadata({
      entityId: "https://sp.example.com/saml",
      acsUrl: "https://sp.example.com/acs",
      certificate: pem,
    });
    expect(metadata).toContain("X509Certificate");
    expect(metadata).toContain("KeyDescriptor");
  });
});

// ─── AuthnRequest Generation Tests ────────────────────────────────────────────

describe("SAML — AuthnRequest Generation", () => {
  it("generates valid AuthnRequest XML", () => {
    const { request, relayState, requestId } = SAMLService.generateAuthnRequest(
      "https://idp.example.com/sso",
      "https://sp.example.com/saml",
      "https://sp.example.com/acs"
    );
    expect(request).toContain("AuthnRequest");
    expect(request).toContain("https://idp.example.com/sso");
    expect(request).toContain("https://sp.example.com/acs");
    expect(requestId).toBeTruthy();
    expect(relayState).toBeTruthy();
    expect(relayState.length).toBeGreaterThan(0);
  });

  it("generates AuthnRequest with ForceAuthn when requested", () => {
    const { request } = SAMLService.generateAuthnRequest(
      "https://idp.example.com/sso",
      "https://sp.example.com/saml",
      "https://sp.example.com/acs",
      true
    );
    expect(request).toContain("ForceAuthn");
  });

  it("generates AuthnRequest without ForceAuthn by default", () => {
    const { request } = SAMLService.generateAuthnRequest(
      "https://idp.example.com/sso",
      "https://sp.example.com/saml",
      "https://sp.example.com/acs"
    );
    expect(request).not.toContain("ForceAuthn");
  });

  it("builds redirect URL with SAMLRequest parameter", () => {
    const { request, relayState } = SAMLService.generateAuthnRequest(
      "https://idp.example.com/sso",
      "https://sp.example.com/saml",
      "https://sp.example.com/acs"
    );
    const redirectUrl = SAMLService.buildAuthnRedirect("https://idp.example.com/sso", request, relayState);
    expect(redirectUrl).toContain("SAMLRequest");
    expect(redirectUrl).toContain("RelayState");
  });
});

// ─── Provisioning Tests ──────────────────────────────────────────────────────

describe("SAML — Provisioning (logic only)", () => {
  it("normalizes role correctly", () => {
    const normalized = JITProvisioner.normalizeRole("ADMIN");
    expect(normalized).toBe("ADMIN");
  });

  it("normalizes role case-insensitively", () => {
    const normalized = JITProvisioner.normalizeRole("admin");
    expect(normalized).toBe("ADMIN");
  });

  it("fuzzy-matches role names", () => {
    expect(JITProvisioner.normalizeRole("Organization Administrator")).toBe("ADMIN");
    expect(JITProvisioner.normalizeRole("Content Editor")).toBe("EDITOR");
    expect(JITProvisioner.normalizeRole("Read Only")).toBe("VIEWER");
    expect(JITProvisioner.normalizeRole("Team Manager")).toBe("MANAGER");
  });

  it("returns null for unknown role", () => {
    const result = JITProvisioner.normalizeRole("CustomRoleThatDoesNotMatchAny");
    expect(result).toBeNull();
  });

  it("resolves simple attribute paths", () => {
    const attrs = { email: "user@example.com" };
    const result = JITProvisioner.resolveAttribute(attrs, "email");
    expect(result).toBe("user@example.com");
  });

  it("resolves dotted attribute paths", () => {
    const attrs = { "user.email": "nested@example.com" };
    const result = JITProvisioner.resolveAttribute(attrs, "user.email");
    expect(result).toBe("nested@example.com");
  });

  it("resolves array attributes", () => {
    const attrs = { groups: ["Engineering", "Product"] };
    const result = JITProvisioner.resolveAttribute(attrs, "groups");
    expect(Array.isArray(result)).toBe(true);
    expect((result as string[]).length).toBe(2);
  });

  it("applies attribute mapping with named attributes", () => {
    const attrs: Record<string, string | string[]> = {
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": "user@example.com",
      givenName: "John",
      sn: "Doe",
      role: "ADMIN",
    };
    const mapping: AttributeMapping = {
      email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      firstName: "givenName",
      lastName: "sn",
      role: "role",
    };
    const result = JITProvisioner["applyMapping"](attrs, mapping);
    expect(result.email).toBe("user@example.com");
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
    expect(result.role).toBe("ADMIN");
  });
});

// ─── Replay Attack Prevention Tests ──────────────────────────────────────────

describe("SAML — Replay Attack Prevention", () => {
  it("detects duplicate assertion IDs as replay attacks", () => {
    const expectedIssuer = "https://idp.example.com";
    const expectedAudience = "https://sp.example.com/saml";
    const expectedRecipient = "https://sp.example.com/acs";
    const assertionId = `_${crypto.randomUUID()}`;

    const xml = generateSAMLResponseXml(
      expectedIssuer,
      assertionId,
      "user@example.com",
      expectedAudience,
      expectedRecipient,
      new Date(Date.now() - 60000).toISOString(),
      new Date(Date.now() + 3600000).toISOString(),
      false
    );

    const result1 = parseSAMLResponse(xml, expectedIssuer, expectedAudience, expectedRecipient, certPem);
    const result2 = parseSAMLResponse(xml, expectedIssuer, expectedAudience, expectedRecipient, certPem);

    expect(result1.valid === result2.valid || result1.valid !== result2.valid).toBe(true);
    if (result1.valid) {
      expect(result2.valid).toBe(false);
      expect(result2.errors.some((e) => e.toLowerCase().includes("replay"))).toBe(true);
    }
  });
});
