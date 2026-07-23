import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import * as crypto from "crypto";
import {
  SAMLAssertion,
  SAMLResponseData,
  SAMLStatus,
  SAMLSubject,
  SAMLConditions,
  SAMLAuthnStatement,
  SAMLValidationResult,
} from "./types";
import { validateAssertion } from "./validation";
import { AppError } from "@/lib/utils/api-errors";

const SAML_NS = "urn:oasis:names:tc:SAML:2.0:assertion";
const SAMLP_NS = "urn:oasis:names:tc:SAML:2.0:protocol";
const DSIG_NS = "http://www.w3.org/2000/09/xmldsig#";
const MAX_XML_SIZE = 1024 * 1024;
const REPLAY_CACHE_TTL = 300_000;

const replayCache = new Map<string, number>();
let replayCleanupTimer: ReturnType<typeof setInterval> | null = null;

function startReplayCleanup(): void {
  if (replayCleanupTimer) return;
  replayCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, ts] of replayCache) {
      if (now - ts > REPLAY_CACHE_TTL) replayCache.delete(id);
    }
  }, 60_000);
}

function checkReplay(assertionId: string): void {
  startReplayCleanup();
  if (replayCache.has(assertionId)) {
    throw new AppError("SAML assertion replay detected", 403);
  }
  replayCache.set(assertionId, Date.now());
  if (replayCache.size > 10000) {
    const entries = [...replayCache.entries()].sort((a, b) => a[1] - b[1]);
    for (const [id] of entries.slice(0, Math.floor(entries.length * 0.2))) {
      replayCache.delete(id);
    }
  }
}

function getElementsByNS(
  elem: Element,
  ns: string,
  localName: string
): Element[] {
  const result: Element[] = [];
  const children = elem.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === 1) {
      const el = child as Element;
      if (el.namespaceURI === ns && el.localName === localName) {
        result.push(el);
      }
      result.push(...getElementsByNS(el, ns, localName));
    }
  }
  return result;
}

function getFirstByNS(
  elem: Element,
  ns: string,
  localName: string
): Element | null {
  const all = getElementsByNS(elem, ns, localName);
  return all.length > 0 ? all[0] : null;
}

function textContent(elem: Element | null): string | undefined {
  if (!elem) return undefined;
  return (elem.textContent || "").trim() || undefined;
}

function extractStatus(responseNode: Element): SAMLStatus {
  const statusEl = getFirstByNS(responseNode, SAMLP_NS, "Status");
  const statusCodeEl = statusEl ? getFirstByNS(statusEl, SAMLP_NS, "StatusCode") : null;
  const statusMessageEl = statusEl ? getFirstByNS(statusEl, SAMLP_NS, "StatusMessage") : null;
  const secondStatus = statusCodeEl ? getFirstByNS(statusCodeEl, SAMLP_NS, "StatusCode") : null;

  return {
    code: statusCodeEl?.getAttribute("Value") || "urn:oasis:names:tc:SAML:2.0:status:Responder",
    subCode: secondStatus?.getAttribute("Value") || undefined,
    message: textContent(statusMessageEl),
  };
}

function extractSubject(assertionNode: Element): SAMLSubject | undefined {
  const subjectEl = getFirstByNS(assertionNode, SAML_NS, "Subject");
  if (!subjectEl) return undefined;

  const nameIdEl = getFirstByNS(subjectEl, SAML_NS, "NameID");
  const confirmEl = getFirstByNS(subjectEl, SAML_NS, "SubjectConfirmation");

  return {
    nameId: textContent(nameIdEl) || "",
    format: nameIdEl?.getAttribute("Format") || undefined,
    confirmationMethod: confirmEl?.getAttribute("Method") || undefined,
  };
}

function extractConditions(assertionNode: Element): SAMLConditions {
  const conditionsEl = getFirstByNS(assertionNode, SAML_NS, "Conditions");
  if (!conditionsEl) {
    throw new AppError("Assertion missing Conditions element", 400);
  }

  const notBefore = conditionsEl.getAttribute("NotBefore");
  const notOnOrAfter = conditionsEl.getAttribute("NotOnOrAfter");

  if (!notBefore || !notOnOrAfter) {
    throw new AppError("Assertion Conditions missing NotBefore or NotOnOrAfter", 400);
  }

  const audienceRestrictions: string[] = [];
  const arEls = getElementsByNS(conditionsEl, SAML_NS, "AudienceRestriction");
  for (const ar of arEls) {
    const audEls = getElementsByNS(ar, SAML_NS, "Audience");
    for (const a of audEls) {
      const val = textContent(a);
      if (val) audienceRestrictions.push(val);
    }
  }

  return {
    notBefore: new Date(notBefore),
    notOnOrAfter: new Date(notOnOrAfter),
    audienceRestrictions,
  };
}

function extractAuthnStatement(assertionNode: Element): SAMLAuthnStatement | undefined {
  const authnEl = getFirstByNS(assertionNode, SAML_NS, "AuthnStatement");
  if (!authnEl) return undefined;

  const ctxEl = getFirstByNS(authnEl, SAML_NS, "AuthnContext");
  const classRefEl = ctxEl ? getFirstByNS(ctxEl, SAML_NS, "AuthnContextClassRef") : null;

  return {
    authnInstant: new Date(authnEl.getAttribute("AuthnInstant") || Date.now()),
    sessionIndex: authnEl.getAttribute("SessionIndex") || undefined,
    authnContextClassRef: textContent(classRefEl),
  };
}

function extractAttributes(assertionNode: Element): Record<string, string | string[]> | undefined {
  const attrStmtEl = getFirstByNS(assertionNode, SAML_NS, "AttributeStatement");
  if (!attrStmtEl) return undefined;

  const attrs: Record<string, string | string[]> = {};
  const attrEls = getElementsByNS(attrStmtEl, SAML_NS, "Attribute");

  for (const attr of attrEls) {
    const name = attr.getAttribute("Name") || attr.getAttribute("FriendlyName");
    if (!name) continue;

    const values = getElementsByNS(attr, SAML_NS, "AttributeValue")
      .map((v) => textContent(v) || "")
      .filter(Boolean);

    if (values.length === 1) {
      attrs[name] = values[0];
    } else if (values.length > 1) {
      attrs[name] = values;
    }
  }

  return Object.keys(attrs).length > 0 ? attrs : undefined;
}

function extractAssertion(
  assertionNode: Element,
  expectedIssuer: string,
  expectedAudience: string,
  expectedRecipient: string
): SAMLAssertion {
  const id = assertionNode.getAttribute("ID") || assertionNode.getAttribute("AssertionID") || "";
  const issueInstant = assertionNode.getAttribute("IssueInstant");
  const issuerEl = getFirstByNS(assertionNode, SAML_NS, "Issuer");
  const issuer = textContent(issuerEl) || "";

  if (!id) throw new AppError("Assertion missing ID", 400);
  if (!issueInstant) throw new AppError("Assertion missing IssueInstant", 400);

  const subject = extractSubject(assertionNode);
  const conditions = extractConditions(assertionNode);
  const authnStatement = extractAuthnStatement(assertionNode);
  const attributeStatement = extractAttributes(assertionNode);

  const assertion: SAMLAssertion = {
    id,
    issueInstant: new Date(issueInstant),
    issuer,
    subject: subject || { nameId: "", format: undefined, confirmationMethod: undefined },
    conditions,
    authnStatement,
    attributeStatement,
  };

  const valErrors = validateAssertion(assertion, expectedIssuer, expectedAudience, expectedRecipient);
  if (valErrors.length > 0) {
    throw new AppError(`Assertion validation failed: ${valErrors.join("; ")}`, 403);
  }

  return assertion;
}

function verifyXmlSignatureWithCrypto(
  assertionNode: Element,
  expectedCert: string
): void {
  const signatureEl = getFirstByNS(assertionNode, DSIG_NS, "Signature");
  if (!signatureEl) {
    throw new AppError("Assertion has no XML signature", 403);
  }

  const signedInfoEl = getFirstByNS(signatureEl, DSIG_NS, "SignedInfo");
  const signatureValueEl = getFirstByNS(signatureEl, DSIG_NS, "SignatureValue");
  const keyInfoEl = getFirstByNS(signatureEl, DSIG_NS, "KeyInfo");

  if (!signedInfoEl || !signatureValueEl) {
    throw new AppError("Invalid SAML signature structure", 403);
  }

  const sigValueB64 = textContent(signatureValueEl)?.replace(/\s+/g, "") || "";
  const sigValue = Buffer.from(sigValueB64, "base64");

  const signingCert = extractCertificate(keyInfoEl) || expectedCert;

  const canonicalizationMethod = getFirstByNS(signedInfoEl, DSIG_NS, "CanonicalizationMethod");
  const signatureMethod = getFirstByNS(signedInfoEl, DSIG_NS, "SignatureMethod");
  const sigAlgo = signatureMethod?.getAttribute("Algorithm") || "";

  const serializer = new XMLSerializer();
  const signedInfoXml = serializer.serializeToString(signedInfoEl as any);

  const canonicalSignedInfo = simpleExclusiveC14N(signedInfoXml);

  const nodeAlgo = mapSignatureAlgorithm(sigAlgo);

  const certPem = formatCertPEM(signingCert);

  let publicKey: crypto.KeyObject;
  try {
    publicKey = crypto.createPublicKey(certPem);
  } catch {
    throw new AppError("Invalid IdP certificate", 403);
  }

  const verifier = crypto.createVerify(nodeAlgo);
  verifier.update(canonicalSignedInfo);
  const isValid = verifier.verify(publicKey, sigValue);

  if (!isValid) {
    throw new AppError("SAML assertion signature verification failed", 403);
  }

  verifyReferencesDigest(assertionNode, signatureEl);
}

function extractCertificate(keyInfoEl: Element | null): string | null {
  if (!keyInfoEl) return null;
  const x509Data = getFirstByNS(keyInfoEl, DSIG_NS, "X509Data");
  if (!x509Data) return null;
  const certEl = getFirstByNS(x509Data, DSIG_NS, "X509Certificate");
  if (!certEl) return null;
  return textContent(certEl) || null;
}

function verifyReferencesDigest(assertionNode: Element, signatureEl: Element): void {
  const signedInfoEl = getFirstByNS(signatureEl, DSIG_NS, "SignedInfo");
  if (!signedInfoEl) return;

  const refEls = getElementsByNS(signedInfoEl, DSIG_NS, "Reference");
  const serializer = new XMLSerializer();

  for (const ref of refEls) {
    const uri = ref.getAttribute("URI") || "";
    const digestMethodEl = getFirstByNS(ref, DSIG_NS, "DigestMethod");
    const digestValueEl = getFirstByNS(ref, DSIG_NS, "DigestValue");

    if (!digestValueEl) continue;

    const expectedDigestB64 = textContent(digestValueEl)?.replace(/\s+/g, "") || "";
    const digestAlgo = digestMethodEl?.getAttribute("Algorithm") || "http://www.w3.org/2001/04/xmlenc#sha256";
    const nodeDigest = mapDigestAlgorithm(digestAlgo);

    let targetXml = "";

    if (!uri || uri === "") {
      targetXml = serializer.serializeToString(assertionNode as any);
    } else if (uri.startsWith("#")) {
      const targetId = uri.substring(1);
      const idNodes = (assertionNode.ownerDocument as unknown as Document)?.getElementById(targetId);
      if (idNodes) {
        targetXml = serializer.serializeToString(idNodes as any);
      }

      if (!targetXml) {
        const allElements = assertionNode.getElementsByTagName("*");
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i] as Element;
          if (el.getAttribute("ID") === targetId || el.getAttribute("Id") === targetId) {
            targetXml = serializer.serializeToString(el as any);
            break;
          }
        }
      }
    }

    if (targetXml) {
      const canonicalTarget = simpleExclusiveC14N(targetXml);
      const computedDigest = crypto.createHash(nodeDigest).update(canonicalTarget).digest("base64");

      const transforms = getElementsByNS(ref, DSIG_NS, "Transform");
      if (transforms.some((t) => t.getAttribute("Algorithm")?.includes("enveloped-signature"))) {
        const strippedXml = stripSignatureElement(targetXml);
        const strippedDigest = crypto.createHash(nodeDigest).update(simpleExclusiveC14N(strippedXml)).digest("base64");
        if (strippedDigest !== expectedDigestB64) {
          throw new AppError("SAML assertion digest validation failed", 403);
        }
      } else {
        if (computedDigest !== expectedDigestB64) {
          throw new AppError("SAML assertion digest validation failed", 403);
        }
      }
    }
  }
}

function stripSignatureElement(xml: string): string {
  return xml.replace(/<ds:Signature[^>]*>[\s\S]*?<\/ds:Signature>/g, "")
    .replace(/<Signature[^>]*>[\s\S]*?<\/Signature>/g, "");
}

function simpleExclusiveC14N(xml: string): string {
  return xml
    .replace(/\r\n?/g, "\n")
    .replace(/>\s+</g, "><")
    .replace(/\s+>/g, ">")
    .replace(/<\s+/g, "<")
    .trim();
}

function mapSignatureAlgorithm(algo: string): string {
  const map: Record<string, string> = {
    "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256": "rsa-sha256",
    "http://www.w3.org/2000/09/xmldsig#rsa-sha1": "rsa-sha1",
    "http://www.w3.org/2001/04/xmldsig-more#rsa-sha384": "rsa-sha384",
    "http://www.w3.org/2001/04/xmldsig-more#rsa-sha512": "rsa-sha512",
    "http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256": "ecdsa-with-SHA256",
    "http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha384": "ecdsa-with-SHA384",
    "http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha512": "ecdsa-with-SHA512",
  };
  return map[algo] || "rsa-sha256";
}

function mapDigestAlgorithm(algo: string): string {
  const map: Record<string, string> = {
    "http://www.w3.org/2001/04/xmlenc#sha256": "sha256",
    "http://www.w3.org/2000/09/xmldsig#sha1": "sha1",
    "http://www.w3.org/2001/04/xmldsig-more#sha384": "sha384",
    "http://www.w3.org/2001/04/xmlenc#sha512": "sha512",
  };
  return map[algo] || "sha256";
}

function formatCertPEM(certContent: string): string {
  if (certContent.includes("-----BEGIN CERTIFICATE-----")) {
    return certContent;
  }
  const clean = certContent.replace(/\s+/g, "");
  const lines = clean.match(/.{1,64}/g) || [clean];
  return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----`;
}

function parseXmlSafe(xml: string): Document {
  if (!xml || xml.length === 0) {
    throw new AppError("XML content is empty", 400);
  }
  if (xml.length > MAX_XML_SIZE) {
    throw new AppError("XML exceeds maximum size", 400);
  }
  if (/<!DOCTYPE/i.test(xml)) {
    throw new AppError("DOCTYPE declaration is not allowed", 400);
  }
  if (/<!ENTITY\s+\S+\s+(SYSTEM|PUBLIC)\s+/i.test(xml)) {
    throw new AppError("XML external entities are not allowed", 400);
  }

  const parser = new DOMParser();

  const doc = parser.parseFromString(xml, "text/xml") as unknown as Document;
  if (!doc || !doc.documentElement) {
    throw new AppError("Invalid XML: document is empty", 400);
  }
  return doc;
}

export function parseSAMLResponse(
  samlResponseXml: string,
  expectedIssuer: string,
  expectedAudience: string,
  expectedRecipient: string,
  idpCertificate: string,
  expectedInResponseTo?: string
): SAMLValidationResult {
  try {
    const doc = parseXmlSafe(samlResponseXml);
    const responseNode = doc.documentElement;

    if (responseNode.localName !== "Response" || responseNode.namespaceURI !== SAMLP_NS) {
      return { valid: false, errors: ["Root element must be a SAML Response"] };
    }

    const responseId = responseNode.getAttribute("ID") || "";
    const inResponseTo = responseNode.getAttribute("InResponseTo") || undefined;
    const destination = responseNode.getAttribute("Destination") || "";

    if (expectedInResponseTo && inResponseTo !== expectedInResponseTo) {
      return {
        valid: false,
        errors: [`InResponseTo mismatch: expected "${expectedInResponseTo}", got "${inResponseTo}"`],
      };
    }

    const status = extractStatus(responseNode);
    if (status.code !== "urn:oasis:names:tc:SAML:2.0:status:Success") {
      return {
        valid: false,
        errors: [`SAML response status: ${status.code}${status.message ? `: ${status.message}` : ""}`],
      };
    }

    let assertionNode = getFirstByNS(responseNode, SAML_NS, "Assertion");
    if (!assertionNode) {
      const encryptedEl = getFirstByNS(responseNode, SAML_NS, "EncryptedAssertion");
      if (encryptedEl) {
        return { valid: false, errors: ["Encrypted assertions are not supported"] };
      }
      return { valid: false, errors: ["No assertion found in SAML response"] };
    }

    const assertionId = assertionNode.getAttribute("ID") || assertionNode.getAttribute("AssertionID") || "";

    const signatureEl = getFirstByNS(assertionNode, DSIG_NS, "Signature");
    if (!signatureEl) {
      return { valid: false, errors: ["Assertion is not signed"] };
    }

    try {
      verifyXmlSignatureWithCrypto(assertionNode, idpCertificate);
    } catch (err: any) {
      return { valid: false, errors: [err.message || "Signature verification failed"] };
    }

    checkReplay(assertionId);

    const assertion = extractAssertion(assertionNode, expectedIssuer, expectedAudience, expectedRecipient);

    return { valid: true, assertion, errors: [] };
  } catch (err: any) {
    return { valid: false, errors: [err.message || "Unknown error parsing SAML response"] };
  }
}

export function parseIdPMetadata(metadataXml: string): {
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate?: string;
} {
  const doc = parseXmlSafe(metadataXml);
  const root = doc.documentElement;

  if (root.localName !== "EntityDescriptor" || root.namespaceURI !== "urn:oasis:names:tc:SAML:2.0:metadata") {
    throw new AppError("Metadata root element must be EntityDescriptor", 400);
  }

  const entityId = root.getAttribute("entityID") || "";
  if (!entityId) throw new AppError("Metadata missing entityID", 400);

  const mdNS = "urn:oasis:names:tc:SAML:2.0:metadata";

  const idpSsoDesc = getFirstByNS(root, mdNS, "IDPSSODescriptor");
  if (!idpSsoDesc) throw new AppError("Metadata missing IDPSSODescriptor", 400);

  const ssoServices = getElementsByNS(idpSsoDesc, mdNS, "SingleSignOnService");
  const httpPost = ssoServices.find(
    (el) => el.getAttribute("Binding") === "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
  );
  const httpRedirect = ssoServices.find(
    (el) => el.getAttribute("Binding") === "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
  );
  const ssoUrl = httpPost?.getAttribute("Location") || httpRedirect?.getAttribute("Location") || "";
  if (!ssoUrl) throw new AppError("Metadata missing SingleSignOnService endpoint", 400);

  const sloServices = getElementsByNS(idpSsoDesc, mdNS, "SingleLogoutService");
  const sloUrl = sloServices.length > 0 ? sloServices[0].getAttribute("Location") || undefined : undefined;

  const keyDescriptors = getElementsByNS(idpSsoDesc, mdNS, "KeyDescriptor");
  const signingKey = keyDescriptors.find(
    (el) => el.getAttribute("use") !== "encryption"
  ) || keyDescriptors[0];

  let certificate: string | undefined;
  if (signingKey) {
    const keyInfo = getFirstByNS(signingKey, DSIG_NS, "KeyInfo");
    if (keyInfo) {
      const x509Data = getFirstByNS(keyInfo, DSIG_NS, "X509Data");
      if (x509Data) {
        const certEl = getFirstByNS(x509Data, DSIG_NS, "X509Certificate");
        const certContent = textContent(certEl);
        if (certContent) {
          certificate = certContent.replace(/\s+/g, "");
        }
      }
    }
  }

  return { entityId, ssoUrl, sloUrl, certificate };
}

export function validateIdPCertificate(certificate: string): boolean {
  if (!certificate) return false;
  const formats = [
    certificate,
    formatCertPEM(certificate),
    certificate.includes("PUBLIC KEY") ? certificate : "",
  ].filter(Boolean);

  for (const fmt of formats) {
    try {
      const key = crypto.createPublicKey(fmt);
      const keyType = key.asymmetricKeyType;
      if (keyType !== "rsa" && keyType !== "ec") return false;

      if (keyType === "rsa") {
        const jwk = key.export({ format: "jwk" }) as any;
        if (jwk.n) {
          const bits = Buffer.from(jwk.n, "base64url").length * 8;
          if (bits < 2048) return false;
        }
      }
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

export type { SAMLValidationResult };
