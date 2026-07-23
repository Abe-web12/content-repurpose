import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { IntegrationError, CredentialError } from "./errors";
import { InstallParams, InstallResult, OAuthProvider } from "./types";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new IntegrationError("ENCRYPTION_KEY environment variable is not set", "MISSING_ENCRYPTION_KEY", 500);
  }
  return createHash("sha256").update(key).digest();
}

export function encryptValue(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptValue(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new CredentialError("Invalid encrypted value format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function maskSecret(value: string): string {
  if (value.length <= 4) return "****";
  return `${value.substring(0, 4)}${"*".repeat(Math.min(value.length - 4, 20))}`;
}

export class IntegrationInstaller {
  static async install(organizationId: string, integrationKey: string, params: InstallParams): Promise<InstallResult> {
    const integration = await prisma.integrations.findUnique({
      where: { key: integrationKey },
    });
    if (!integration) {
      throw new IntegrationError(
        `Integration "${integrationKey}" not found`,
        "INTEGRATION_NOT_FOUND",
        404
      );
    }

    const existing = await prisma.installedIntegrations.findUnique({
      where: {
        organizationId_integrationKey: {
          organizationId,
          integrationKey,
        },
      },
    });
    if (existing) {
      throw new IntegrationError(
        `Integration "${integrationKey}" is already installed for this organization`,
        "ALREADY_INSTALLED",
        409
      );
    }

    const installed = await prisma.installedIntegrations.create({
      data: {
        organizationId,
        userId: params.userId,
        integrationKey,
        status: "PENDING",
        config: (params.config ?? {}) as any,
        version: integration.version,
      },
    });

    if (params.credentials) {
      for (const [key, value] of Object.entries(params.credentials)) {
        const encrypted = encryptValue(value);
        await prisma.integrationCredentials.create({
          data: {
            installedId: installed.id,
            organizationId,
            type: "API_KEY",
            label: key,
            encryptedValue: encrypted,
            keyIdentifier: key,
          },
        });
      }
    }

    if (integration.hasOAuth && integration.oauthProvider) {
      const oauthProvider = integration.oauthProvider as OAuthProvider;
      const oauthConfig = params.config?.oauth as Record<string, string> | undefined;

      if (params.oauthCode && oauthConfig) {
        const { OAuthManager } = await import("./oauth");
        await OAuthManager.exchangeCode(
          oauthProvider,
          {
            clientId: oauthConfig.clientId || "",
            clientSecret: oauthConfig.clientSecret || "",
            redirectUri: params.oauthRedirectUri || oauthConfig.redirectUri || "",
            scopes: (oauthConfig.scopes || "").split(",").filter(Boolean),
            authUrl: oauthConfig.authUrl || "",
            tokenUrl: oauthConfig.tokenUrl || "",
          },
          params.oauthCode,
          params.oauthRedirectUri || oauthConfig.redirectUri || ""
        );
      }
    }

    await prisma.installedIntegrations.update({
      where: { id: installed.id },
      data: { status: "CONNECTED" },
    });

    return {
      installedId: installed.id,
      status: "CONNECTED",
      config: params.config ?? {},
      credentials: params.credentials ? Object.keys(params.credentials).reduce<Record<string, string>>((acc, k) => {
        acc[k] = maskSecret(params.credentials![k]);
        return acc;
      }, {}) : undefined,
    };
  }

  static async uninstall(organizationId: string, integrationKey: string): Promise<void> {
    const installed = await prisma.installedIntegrations.findUnique({
      where: {
        organizationId_integrationKey: {
          organizationId,
          integrationKey,
        },
      },
    });
    if (!installed) return;

    const oauthConnection = await prisma.oauthConnections.findFirst({
      where: { installedId: installed.id },
    });

    if (oauthConnection && !oauthConnection.isRevoked) {
      try {
        const { OAuthManager } = await import("./oauth");
        await OAuthManager.revokeConnection(oauthConnection.id);
      } catch {
        // continue with cleanup even if revoke fails
      }
    }

    await prisma.integrationWebhooks.updateMany({
      where: { installedId: installed.id, isActive: true },
      data: { isActive: false },
    });

    await prisma.integrationCredentials.updateMany({
      where: { installedId: installed.id, isActive: true },
      data: { isActive: false },
    });

    await prisma.installedIntegrations.delete({
      where: { id: installed.id },
    });
  }
}
