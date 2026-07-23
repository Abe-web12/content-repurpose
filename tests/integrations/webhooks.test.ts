import { describe, it, expect, vi } from "vitest";
import { IntegrationWebhookManager } from "@/lib/integrations/webhooks";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    integrationWebhooks: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    integrationEvents: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/integrations/logs", () => ({
  IntegrationLogger: {
    log: vi.fn(),
  },
}));

describe("IntegrationWebhookManager", () => {
  describe("register", () => {
    it("should create a webhook registration", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.integrationWebhooks.create as any).mockResolvedValue({
        id: "wh-1",
        installedId: "inst-1",
        organizationId: "org-1",
        event: "SYNC_COMPLETED",
        targetUrl: "https://example.com/webhook",
        isActive: true,
      });

      const result = await IntegrationWebhookManager.register(
        "inst-1",
        "org-1",
        "SYNC_COMPLETED",
        "https://example.com/webhook"
      );

      expect(result.id).toBe("wh-1");
    });
  });
});
