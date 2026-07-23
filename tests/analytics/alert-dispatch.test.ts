import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindMany, mockFindUnique, mockFindFirst, mockUpdate, mockCreate, mockZadd, mockZrem, mockZrangebyscore } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockZadd: vi.fn(),
  mockZrem: vi.fn(),
  mockZrangebyscore: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMembers: { findMany: mockFindMany },
    webhookEndpoints: { findMany: mockFindMany },
    installedIntegrations: { findFirst: mockFindFirst },
    securityPolicies: { findUnique: mockFindUnique },
    analyticsAlerts: { findUnique: mockFindUnique, findFirst: mockFindFirst },
    analyticsAlertEvents: { findMany: mockFindMany, update: mockUpdate },
    users: { findUnique: mockFindUnique },
  },
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    zadd: mockZadd,
    zrem: mockZrem,
    zrangebyscore: mockZrangebyscore,
  },
}));

vi.mock("@/lib/notifications", () => ({
  NotificationService: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

import { AlertDispatcher } from "@/lib/analytics/alert-dispatch";

describe("AlertDispatcher", () => {
  const mockAlert = {
    id: "alert1",
    organizationId: "org1",
    name: "High Churn Alert",
    metric: "churn_rate",
    channels: ["email", "slack"],
    userId: "user1",
  };

  const mockEvent = {
    id: "event1",
    value: 15.5,
    threshold: 10,
    condition: "gt",
    message: "Churn rate exceeded threshold: 15.50 (threshold: 10)",
    createdAt: new Date("2026-07-21T10:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("dispatch", () => {
    it("should dispatch through all configured channels", async () => {
      mockFindMany.mockResolvedValue([]);
      mockFindFirst.mockResolvedValue(null);

      const results = await AlertDispatcher.dispatch(mockAlert, mockEvent);

      expect(results).toHaveLength(2);
      expect(results[0].channel).toBe("email");
      expect(results[1].channel).toBe("slack");
    });

    it("should default to email if channels is empty", async () => {
      mockFindMany.mockResolvedValue([]);

      const results = await AlertDispatcher.dispatch(
        { ...mockAlert, channels: [] },
        mockEvent
      );

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe("email");
    });

    it("should handle unknown channels gracefully", async () => {
      mockFindMany.mockResolvedValue([]);

      const results = await AlertDispatcher.dispatch(
        { ...mockAlert, channels: ["unknown_channel" as any] },
        mockEvent
      );

      expect(results).toHaveLength(0);
    });
  });

  describe("getDispatchStatus", () => {
    it("should return dispatch history for an alert", async () => {
      mockFindMany.mockResolvedValue([
        {
          id: "event1",
          status: "triggered",
          message: "Test alert",
          value: 15,
          threshold: 10,
          condition: "gt",
          createdAt: new Date(),
          acknowledgedAt: null,
          resolvedAt: null,
        },
      ]);

      const status = await AlertDispatcher.getDispatchStatus("alert1");
      expect(status).toHaveLength(1);
      expect(status[0].status).toBe("triggered");
      expect(status[0].value).toBe(15);
    });
  });

  describe("processRetryQueue", () => {
    it("should process items from retry queue", async () => {
      mockZrangebyscore.mockResolvedValue([
        JSON.stringify({
          alert: mockAlert,
          event: mockEvent,
          channel: "email",
          attempt: 1,
          retryAt: Date.now(),
        }),
      ]);
      mockFindMany.mockResolvedValue([]);

      const processed = await AlertDispatcher.processRetryQueue();
      expect(mockZrangebyscore).toHaveBeenCalled();
      expect(typeof processed).toBe("number");
    });
  });

  describe("dispatchAlert", () => {
    it("should call dispatch and create notification on success", async () => {
      mockFindMany.mockResolvedValue([]);
      mockFindFirst.mockResolvedValue(null);

      await AlertDispatcher.dispatchAlert(mockAlert, mockEvent);

      const { NotificationService } = await import("@/lib/notifications");
      expect(NotificationService.create).toHaveBeenCalled();
    });
  });
});
