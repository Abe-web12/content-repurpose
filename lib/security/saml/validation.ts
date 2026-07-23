import { SAMLAssertion } from "./types";

const CLOCK_SKEW_MS = 5 * 60 * 1000;

export function validateTimestamp(conditions: { notBefore: Date; notOnOrAfter: Date }): string[] {
  const errors: string[] = [];
  const now = new Date();
  const notBefore = new Date(conditions.notBefore);
  const notOnOrAfter = new Date(conditions.notOnOrAfter);

  if (now.getTime() + CLOCK_SKEW_MS < notBefore.getTime()) {
    errors.push(`Assertion is not yet valid. NotBefore: ${notBefore.toISOString()}`);
  }

  if (now.getTime() - CLOCK_SKEW_MS > notOnOrAfter.getTime()) {
    errors.push(`Assertion has expired. NotOnOrAfter: ${notOnOrAfter.toISOString()}`);
  }

  return errors;
}

export function validateIssuer(assertionIssuer: string, expectedIssuer: string): string[] {
  const errors: string[] = [];
  if (!assertionIssuer) {
    errors.push("Assertion missing issuer");
  } else if (assertionIssuer !== expectedIssuer) {
    errors.push(`Issuer mismatch: expected "${expectedIssuer}", got "${assertionIssuer}"`);
  }
  return errors;
}

export function validateAudience(
  audienceRestrictions: string[],
  expectedAudience: string
): string[] {
  const errors: string[] = [];
  if (!audienceRestrictions || audienceRestrictions.length === 0) {
    errors.push("Assertion has no audience restrictions");
  } else if (!audienceRestrictions.includes(expectedAudience)) {
    errors.push(
      `Audience mismatch: expected "${expectedAudience}", got [${audienceRestrictions.join(", ")}]`
    );
  }
  return errors;
}

export function validateRecipient(assertion: SAMLAssertion, expectedRecipient: string): string[] {
  const errors: string[] = [];
  const method = assertion.subject?.confirmationMethod;
  if (
    method === "urn:oasis:names:tc:SAML:2.0:cm:bearer" &&
    expectedRecipient
  ) {
    const confirmationData = (assertion as any)._rawConfirmationData;
    if (confirmationData && confirmationData.Recipient !== expectedRecipient) {
      errors.push(
        `Recipient mismatch: expected "${expectedRecipient}", got "${confirmationData.Recipient}"`
      );
    }
  }
  return errors;
}

export function validateAssertion(
  assertion: SAMLAssertion,
  expectedIssuer: string,
  expectedAudience: string,
  expectedRecipient: string
): string[] {
  const errors: string[] = [
    ...validateTimestamp(assertion.conditions),
    ...validateIssuer(assertion.issuer, expectedIssuer),
    ...validateAudience(assertion.conditions.audienceRestrictions, expectedAudience),
    ...validateRecipient(assertion, expectedRecipient),
  ];

  if (!assertion.subject?.nameId) {
    errors.push("Assertion missing subject NameID");
  }

  return errors;
}

export function isAssertionValid(
  assertion: SAMLAssertion,
  expectedIssuer: string,
  expectedAudience: string,
  expectedRecipient: string
): boolean {
  return validateAssertion(assertion, expectedIssuer, expectedAudience, expectedRecipient).length === 0;
}
