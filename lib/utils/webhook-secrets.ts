import crypto from "crypto";

const ALGORITHM = "sha256";
const KEY_LENGTH = 32;

function getSigningKey(): Buffer {
  const key = process.env.WEBHOOK_SIGNING_KEY || process.env.CRON_SECRET;
  if (!key) {
    throw new Error("WEBHOOK_SIGNING_KEY or CRON_SECRET must be set for webhook secret hashing");
  }
  return crypto.scryptSync(key, "webhook-secret-salt", KEY_LENGTH);
}

export function hashWebhookSecret(secret: string): string {
  const key = getSigningKey();
  const hmac = crypto.createHmac(ALGORITHM, key);
  hmac.update(secret);
  return hmac.digest("hex");
}

export function verifyWebhookSecret(stored: string, provided: string): boolean {
  const hash = hashWebhookSecret(provided);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(stored));
}

export function maskSecret(secret: string): string {
  if (secret.length <= 4) return "****";
  return secret.slice(0, 4) + "*".repeat(Math.min(secret.length - 4, 12));
}
