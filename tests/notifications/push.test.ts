import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUnique, mockFindMany, mockCreate, mockUpdate, mockUpdateMany, mockDeleteMany, mockGroupBy, mockCount } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockGroupBy: vi.fn(),
  mockCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pushSubscriptions: {
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      create: mockCreate,
      update: mockUpdate,
      updateMany: mockUpdateMany,
      deleteMany: mockDeleteMany,
      count: mockCount,
      groupBy: mockGroupBy,
    },
  },
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    sadd: vi.fn().mockResolvedValue(1),
    srem: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
  },
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn().mockResolvedValue({ statusCode: 201 }),
}));

import { WebPushManager } from "@/lib/notifications/web-push";
import { FCMService } from "@/lib/notifications/fcm";

describe("WebPushManager", () => {
  const mockSubscription = {
    endpoint: "https://fcm.googleapis.com/push/test",
    keys: {
      p256dh: "test_p256dh_key",
      auth: "test_auth_key",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("subscribe", () => {
    it("should create a new push subscription", async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "sub1",
        endpoint: mockSubscription.endpoint,
        isActive: true,
      });

      const result = await WebPushManager.subscribe(
        "user1",
        "org1",
        mockSubscription,
        "browser",
        "Chrome/120"
      );

      expect(result.id).toBe("sub1");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user1",
            organizationId: "org1",
            endpoint: mockSubscription.endpoint,
            p256dhKey: "test_p256dh_key",
            authKey: "test_auth_key",
            isActive: true,
          }),
        })
      );
    });

    it("should reactivate existing subscription", async () => {
      mockFindUnique.mockResolvedValue({
        id: "sub1",
        endpoint: mockSubscription.endpoint,
        isActive: false,
      });
      mockUpdate.mockResolvedValue({
        id: "sub1",
        isActive: true,
      });

      const result = await WebPushManager.subscribe(
        "user1",
        "org1",
        mockSubscription
      );

      expect(result.isActive).toBe(true);
    });
  });

  describe("unsubscribe", () => {
    it("should mark subscription as inactive", async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 });

      await WebPushManager.unsubscribe("user1", mockSubscription.endpoint);

      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user1", endpoint: mockSubscription.endpoint, isActive: true },
          data: { isActive: false },
        })
      );
    });
  });

  describe("getSubscriptions", () => {
    it("should return active subscriptions for user", async () => {
      mockFindMany.mockResolvedValue([
        { id: "sub1", endpoint: "https://push.test/1", isActive: true },
        { id: "sub2", endpoint: "https://push.test/2", isActive: true },
      ]);

      const subs = await WebPushManager.getSubscriptions("user1");
      expect(subs).toHaveLength(2);
    });
  });

  describe("sendToUser", () => {
    it("should send push notification to all user devices", async () => {
      mockFindMany.mockResolvedValue([
        { id: "sub1", endpoint: "https://push.test/1", p256dhKey: "k1", authKey: "a1", isActive: true },
      ]);

      const webpushDefault = (await import("web-push")).default;
      (webpushDefault.sendNotification as any).mockResolvedValue({ statusCode: 201 });

      const result = await WebPushManager.sendToUser("user1", {
        title: "Test",
        body: "Test body",
      });

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("should deactivate failed subscriptions", async () => {
      mockFindMany.mockResolvedValue([
        { id: "sub1", endpoint: "https://push.test/1", p256dhKey: "k1", authKey: "a1", isActive: true },
      ]);

      // web-push.ts imports default export, so override default.sendNotification
      const webpushDefault = (await import("web-push")).default;
      const err = new Error("Subscription expired") as any;
      err.statusCode = 410;
      (webpushDefault.sendNotification as any).mockRejectedValue(err);

      const result = await WebPushManager.sendToUser("user1", {
        title: "Test",
        body: "Test body",
      });

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sub1" },
          data: { isActive: false },
        })
      );
    });
  });

  describe("sendToOrganization", () => {
    it("should send to all org members", async () => {
      mockFindMany.mockResolvedValue([
        { id: "sub1", endpoint: "https://push.test/1", p256dhKey: "k1", authKey: "a1", isActive: true },
        { id: "sub2", endpoint: "https://push.test/2", p256dhKey: "k2", authKey: "a2", isActive: true },
      ]);

      const webpushDefault = (await import("web-push")).default;
      (webpushDefault.sendNotification as any).mockResolvedValue({ statusCode: 201 });

      const result = await WebPushManager.sendToOrganization("org1", {
        title: "Org notification",
        body: "Hello team",
      });

      expect(result.sent).toBe(2);
    });
  });

  describe("getStats", () => {
    it("should return subscription statistics", async () => {
      mockCount.mockResolvedValueOnce(10);
      mockCount.mockResolvedValueOnce(8);
      mockGroupBy.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }]);

      const stats = await WebPushManager.getStats();
      expect(stats.totalSubscriptions).toBe(10);
      expect(stats.activeSubscriptions).toBe(8);
      expect(stats.uniqueUsers).toBe(3);
    });
  });

  describe("cleanupExpired", () => {
    it("should delete inactive subscriptions", async () => {
      mockDeleteMany.mockResolvedValue({ count: 5 });

      const count = await WebPushManager.cleanupExpired();
      expect(count).toBe(5);
    });
  });

  describe("sendSilentNotification", () => {
    it("should send silent notification with data", async () => {
      mockFindMany.mockResolvedValue([
        { id: "sub1", endpoint: "https://push.test/1", p256dhKey: "k1", authKey: "a1", isActive: true },
      ]);

      const webpushDefault = (await import("web-push")).default;
      (webpushDefault.sendNotification as any).mockResolvedValue({ statusCode: 201 });

      const result = await WebPushManager.sendSilentNotification("user1", {
        type: "background_sync",
        timestamp: Date.now(),
      });

      expect(result.sent).toBe(1);
    });
  });
});

describe("FCMService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendToDevice", () => {
    it("should return error when FCM is not configured", async () => {
      const originalProjectId = process.env.FCM_PROJECT_ID;
      process.env.FCM_PROJECT_ID = "";
      process.env.FCM_SERVICE_ACCOUNT = "";

      const result = await FCMService.sendToDevice("device_token", {
        title: "Test",
        body: "Test body",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("FCM not configured");

      process.env.FCM_PROJECT_ID = originalProjectId;
    });
  });

  describe("getUserTokens", () => {
    it("should return empty array when no tokens", async () => {
      const tokens = await FCMService.getUserTokens("user1");
      expect(tokens).toEqual([]);
    });
  });

  describe("registerToken", () => {
    it("should register token without throwing", async () => {
      await expect(
        FCMService.registerToken("user1", "org1", "fcm_token_123")
      ).resolves.not.toThrow();
    });
  });

  describe("unregisterToken", () => {
    it("should unregister token without throwing", async () => {
      await expect(
        FCMService.unregisterToken("user1", "org1", "fcm_token_123")
      ).resolves.not.toThrow();
    });
  });
});
