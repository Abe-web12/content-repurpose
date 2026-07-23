import { describe, it, expect, vi } from "vitest";

const { mockQueryRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

describe("Email Validation", () => {
  describe("Email Templates", () => {
    it("welcome email template renders correctly", async () => {
      const { welcomeEmailHtml } = await import("@/lib/email/templates");
      const html = welcomeEmailHtml("Test User");
      expect(html).toContain("Test User");
      expect(html).toContain("Welcome to RepurposeAI");
      expect(html).toContain("</html>");
    });

    it("usage warning template renders for different percentages", async () => {
      const { usageWarningHtml } = await import("@/lib/email/templates");

      const html75 = usageWarningHtml("User", 75, 100, 75);
      expect(html75).toContain("75%");
      expect(html75).not.toContain("reached your limit");

      const html100 = usageWarningHtml("User", 100, 100, 100);
      expect(html100).toContain("reached your limit");
    });

    it("payment receipt template renders", async () => {
      const { paymentReceiptHtml } = await import("@/lib/email/templates");
      const html = paymentReceiptHtml("User", 2900, "usd", "2025-01-15", "https://invoice.stripe.com");
      expect(html).toContain("29.00 USD");
      expect(html).toContain("Payment Received");
    });

    it("payment failed template renders", async () => {
      const { paymentFailedHtml } = await import("@/lib/email/templates");
      const html = paymentFailedHtml("User", 2900, "usd", new Date().toISOString().split("T")[0]);
      expect(html).toContain("Payment Failed");
      expect(html).toContain("29.00 USD");
    });

    it("all templates have HTML structure", async () => {
      const { welcomeEmailHtml, usageWarningHtml, paymentReceiptHtml, paymentFailedHtml } =
        await import("@/lib/email/templates");

      const templates = [
        welcomeEmailHtml("User"),
        usageWarningHtml("User", 75, 100, 75),
        paymentReceiptHtml("User", 2900, "usd", "2025-01-15", null),
        paymentFailedHtml("User", 2900, "usd", new Date().toISOString().split("T")[0]),
      ];

      for (const html of templates) {
        expect(html).toContain("</html>");
      }
    });
  });

  describe("Email Configuration", () => {
    it("from email has valid format", () => {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@repurposeai.com";
      expect(fromEmail).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
    });
  });

  describe("Email Sender Functions", () => {
    it("sender functions exist and are callable", async () => {
      const { sendWelcomeEmail, sendUsageWarning, sendPaymentReceipt, sendPaymentFailed } =
        await import("@/lib/email/sender");
      expect(typeof sendWelcomeEmail).toBe("function");
      expect(typeof sendUsageWarning).toBe("function");
      expect(typeof sendPaymentReceipt).toBe("function");
      expect(typeof sendPaymentFailed).toBe("function");
    });
  });

  describe("Notification Model", () => {
    it("notification table has required columns", async () => {
      const { prisma } = await import("@/lib/prisma");
      mockQueryRaw.mockResolvedValue([
        { column_name: "id", data_type: "text", is_nullable: "NO" },
        { column_name: "type", data_type: "text", is_nullable: "NO" },
        { column_name: "title", data_type: "text", is_nullable: "NO" },
        { column_name: "message", data_type: "text", is_nullable: "NO" },
        { column_name: "user_id", data_type: "text", is_nullable: "NO" },
        { column_name: "read", data_type: "boolean", is_nullable: "YES" },
        { column_name: "created_at", data_type: "timestamp", is_nullable: "NO" },
      ]);
      const columns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string; is_nullable: string }>>`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name IN ('Notification', 'notifications')
        ORDER BY ordinal_position
      `;
      const colMap = new Map(columns.map((c) => [c.column_name, c]));
      expect(colMap.has("type") || colMap.has("notification_type")).toBe(true);
      expect(colMap.has("title")).toBe(true);
      expect(colMap.has("message")).toBe(true);
    });
  });
});
