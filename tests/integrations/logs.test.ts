import { describe, it, expect, vi } from "vitest";
import { IntegrationLogger } from "@/lib/integrations/logs";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    integrationLogs: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe("IntegrationLogger", () => {
  describe("log", () => {
    it("should create a log entry", async () => {
      const { prisma } = await import("@/lib/prisma");
      const mockLog = {
        id: "log-1",
        installedId: "inst-1",
        organizationId: "org-1",
        level: "info",
        message: "Test log",
        source: "test",
      };
      (prisma.integrationLogs.create as any).mockResolvedValue(mockLog);

      const result = await IntegrationLogger.log(
        "inst-1",
        "org-1",
        "info",
        "Test log",
        { key: "value" },
        "test"
      );

      expect(result.id).toBe("log-1");
    });
  });

  describe("getErrorSummary", () => {
    it("should return error counts", async () => {
      const { prisma } = await import("@/lib/prisma");
      (prisma.integrationLogs.count as any).mockResolvedValue(5);

      const summary = await IntegrationLogger.getErrorSummary("inst-1");
      expect(summary.total).toBe(5);
      expect(summary.error).toBe(5);
    });
  });
});
