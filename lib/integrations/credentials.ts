import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { CredentialError } from "./errors";
import { decryptValue, encryptValue } from "./installer";

interface DecryptedCredential {
  id: string;
  label: string;
  value: string;
  type: string;
  keyIdentifier: string | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  metadata: Prisma.JsonValue | null;
}

export class CredentialManager {
  static async getCredentials(installedId: string): Promise<DecryptedCredential[]> {
    const credentials = await prisma.integrationCredentials.findMany({
      where: { installedId, isActive: true },
    });

    return credentials.map((cred) => ({
      id: cred.id,
      label: cred.label,
      value: decryptValue(cred.encryptedValue),
      type: cred.type,
      keyIdentifier: cred.keyIdentifier,
      expiresAt: cred.expiresAt,
      lastUsedAt: cred.lastUsedAt,
      metadata: cred.metadata,
    }));
  }

  static async storeCredential(
    installedId: string,
    organizationId: string,
    type: string,
    label: string,
    value: string
  ) {
    const encrypted = encryptValue(value);

    const credential = await prisma.integrationCredentials.create({
      data: {
        installedId,
        organizationId,
        type: type as any,
        label,
        encryptedValue: encrypted,
        keyIdentifier: label,
        isActive: true,
      },
    });

    return credential;
  }

  static async deleteCredential(id: string): Promise<void> {
    await prisma.integrationCredentials.update({
      where: { id },
      data: { isActive: false },
    });
  }

  static async rotateCredential(installedId: string, key: string, newValue: string) {
    const existing = await prisma.integrationCredentials.findFirst({
      where: { installedId, keyIdentifier: key, isActive: true },
    });

    if (!existing) {
      throw new CredentialError(`Credential "${key}" not found for installation`, "CREDENTIAL_NOT_FOUND");
    }

    const encrypted = encryptValue(newValue);

    await prisma.integrationCredentials.update({
      where: { id: existing.id },
      data: {
        encryptedValue: encrypted,
        expiresAt: null,
      },
    });

    return existing;
  }

  static async validateCredentials(installedId: string): Promise<boolean> {
    const count = await prisma.integrationCredentials.count({
      where: {
        installedId,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return count > 0;
  }
}
