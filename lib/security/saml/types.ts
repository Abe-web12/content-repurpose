export interface SAMLConfig {
  entityId: string;
  acsUrl: string;
  audience: string;
  certificate?: string;
  privateKey?: string;
}

export interface IdPConfig {
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate?: string;
  metadataXml?: string;
}

export interface SAMLSubject {
  nameId: string;
  format?: string;
  confirmationMethod?: string;
}

export interface SAMLConditions {
  notBefore: Date;
  notOnOrAfter: Date;
  audienceRestrictions: string[];
}

export interface SAMLAuthnStatement {
  authnInstant: Date;
  sessionIndex?: string;
  authnContextClassRef?: string;
}

export interface SAMLAssertion {
  id: string;
  issueInstant: Date;
  issuer: string;
  subject: SAMLSubject;
  conditions: SAMLConditions;
  authnStatement?: SAMLAuthnStatement;
  attributeStatement?: Record<string, string | string[]>;
  signature?: string;
}

export interface SAMLStatus {
  code: string;
  subCode?: string;
  message?: string;
}

export interface SAMLResponseData {
  id: string;
  inResponseTo?: string;
  destination: string;
  issuer: string;
  status: SAMLStatus;
  assertion?: SAMLAssertion;
}

export interface AttributeMapping {
  email?: string;
  firstName?: string;
  lastName?: string;
  groups?: string;
  role?: string;
  department?: string;
}

export interface ProvisioningResult {
  userCreated: boolean;
  userUpdated: boolean;
  orgAssigned: boolean;
  roleAssigned: string;
  groups: string[];
}

export interface SAMLValidationResult {
  valid: boolean;
  assertion?: SAMLAssertion;
  errors: string[];
}

export interface SpMetadataConfig {
  entityId: string;
  acsUrl: string;
  sloUrl?: string;
  certificate?: string;
  orgName?: string;
  orgDisplayName?: string;
  contactPerson?: string;
  contactEmail?: string;
}

export type SSOSessionData = {
  userId: string;
  providerId: string;
  nameId: string;
  sessionIndex?: string;
  attributes: Record<string, string | string[]>;
};
