import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockCreateMany, mockFindMany, mockCount, mockUpdateMany, mockDelete, mockFindUnique } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockCreateMany: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockDelete: vi.fn(),
  mockFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notifications: {
      create: mockCreate,
      createMany: mockCreateMany,
      findMany: mockFindMany,
      count: mockCount,
      updateMany: mockUpdateMany,
      delete: mockDelete,
    },
    users: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("@/lib/notifications/web-push", () => ({
  WebPushManager: {
    sendToUser: vi.fn().mockResolvedValue({ sent: 1, failed: 0 }),
  },
}));

vi.mock("@/lib/notifications/fcm", () => ({
  FCMService: {},
}));

import { NotificationService } from "@/lib/notifications";

describe("NotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue({ email: "user@test.com", notifyOnBilling: true });
  });

  describe("create", () => {
    it("should create an in-app notification", async () => {
      mockCreate.mockResolvedValue({ id: "notif1" });

      await NotificationService.create({
        userId: "user1",
        type: "info",
        category: "billing",
        title: "Payment received",
        message: "Your payment was successful",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user1",
            title: "Payment received",
            message: "Your payment was successful",
          }),
        })
      );
    });

    it("should create notification with link", async () => {
      mockCreate.mockResolvedValue({ id: "notif1" });

      await NotificationService.create({
        userId: "user1",
        type: "info",
        category: "usage",
        title: "Usage warning",
        message: "You've used 80% of your limit",
        link: "/dashboard/billing",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            link: "/dashboard/billing",
          }),
        })
      );
    });

    it("should handle push channel delivery", async () => {
      mockCreate.mockResolvedValue({ id: "notif1" });

      await NotificationService.create({
        userId: "user1",
        type: "alert",
        category: "billing",
        title: "Test",
        message: "Test push",
        channel: "push",
      });

      const { WebPushManager } = await import("@/lib/notifications/web-push");
      expect(WebPushManager.sendToUser).toHaveBeenCalled();
    });
  });

  describe("bulkCreate", () => {
    it("should create multiple notifications", async () => {
      mockCreateMany.mockResolvedValue({ count: 3 });

      const count = await NotificationService.bulkCreate([
        { userId: "user1", type: "info", category: "system", title: "A", message: "Msg A" },
        { userId: "user1", type: "info", category: "system", title: "B", message: "Msg B" },
        { userId: "user2", type: "info", category: "system", title: "C", message: "Msg C" },
      ]);

      expect(count).toBe(3);
    });
  });

  describe("list", () => {
    it("should return paginated notifications", async () => {
      mockFindMany.mockResolvedValue([
        { id: "n1", title: "Test", message: "Body", read: false },
      ]);
      mockCount.mockResolvedValueOnce(10);
      mockCount.mockResolvedValueOnce(3);

      const result = await NotificationService.list("user1", { limit: 10 });
      expect(result.notifications).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.unreadCount).toBe(3);
    });

    it("should filter by unread only", async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValueOnce(0);
      mockCount.mockResolvedValueOnce(0);

      await NotificationService.list("user1", { unreadOnly: true });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ read: false }),
        })
      );
    });
  });

  describe("markRead", () => {
    it("should mark notification as read", async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 });

      await NotificationService.markRead("notif1", "user1");
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "notif1", userId: "user1" },
          data: { read: true },
        })
      );
    });
  });

  describe("markAllRead", () => {
    it("should mark all as read for user", async () => {
      mockUpdateMany.mockResolvedValue({ count: 5 });

      await NotificationService.markAllRead("user1");
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user1", read: false },
          data: { read: true },
        })
      );
    });
  });

  describe("getUnreadCount", () => {
    it("should return unread count", async () => {
      mockCount.mockResolvedValue(3);

      const count = await NotificationService.getUnreadCount("user1");
      expect(count).toBe(3);
    });
  });

  describe("convenience methods", () => {
    it("notifyBilling should create billing notification", async () => {
      mockCreate.mockResolvedValue({ id: "n1" });

      await NotificationService.notifyBilling("user1", "Invoice", "Your invoice is ready");
      expect(mockCreate).toHaveBeenCalled();
    });

    it("notifyUsage should create usage notification", async () => {
      mockCreate.mockResolvedValue({ id: "n1" });

      await NotificationService.notifyUsage("user1", 80, 100);
      expect(mockCreate).toHaveBeenCalled();
    });

    it("notifyWorkflow should create workflow notification", async () => {
      mockCreate.mockResolvedValue({ id: "n1" });

      await NotificationService.notifyWorkflow("user1", "Daily Report", "completed");
      expect(mockCreate).toHaveBeenCalled();
    });

    it("notifyTeam should create team notification", async () => {
      mockCreate.mockResolvedValue({ id: "n1" });

      await NotificationService.notifyTeam("user1", "joined the team", "Alice");
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
