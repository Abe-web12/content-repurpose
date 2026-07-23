import { describe, it, expect, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "test-user" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findFirst: vi.fn().mockResolvedValue({ organizationId: "test-org" }),
    },
  },
}));

vi.mock("@/lib/utils/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));

import { createWorkflowSchema, updateWorkflowSchema, saveWorkflowNodesSchema, runWorkflowSchema } from "@/lib/validations/workflow";

describe("Workflow API Validation", () => {
  describe("createWorkflowSchema", () => {
    it("accepts valid input", () => {
      const result = createWorkflowSchema.safeParse({ name: "My Workflow" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = createWorkflowSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects name over 128 chars", () => {
      const result = createWorkflowSchema.safeParse({ name: "x".repeat(129) });
      expect(result.success).toBe(false);
    });

    it("accepts optional description", () => {
      const result = createWorkflowSchema.safeParse({ name: "Test", description: "A test workflow" });
      expect(result.success).toBe(true);
    });

    it("accepts optional tags", () => {
      const result = createWorkflowSchema.safeParse({ name: "Test", tags: ["ai", "content"] });
      expect(result.success).toBe(true);
    });

    it("rejects more than 10 tags", () => {
      const result = createWorkflowSchema.safeParse({ name: "Test", tags: Array(11).fill("tag") });
      expect(result.success).toBe(false);
    });
  });

  describe("saveWorkflowNodesSchema", () => {
    it("accepts valid nodes and edges", () => {
      const result = saveWorkflowNodesSchema.safeParse({
        nodes: [{ id: "a", type: "TRIGGER", label: "Start", positionX: 0, positionY: 0 }],
        edges: [{ id: "e1", sourceNodeId: "a", targetNodeId: "b" }],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty nodes", () => {
      const result = saveWorkflowNodesSchema.safeParse({
        nodes: [],
        edges: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("runWorkflowSchema", () => {
    it("accepts empty triggerData", () => {
      const result = runWorkflowSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts triggerData with custom fields", () => {
      const result = runWorkflowSchema.safeParse({
        triggerData: { topic: "AI", platform: "linkedin" },
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateWorkflowSchema", () => {
    it("accepts partial updates", () => {
      const result = updateWorkflowSchema.safeParse({ name: "Updated Name" });
      expect(result.success).toBe(true);
    });

    it("accepts node updates", () => {
      const result = updateWorkflowSchema.safeParse({
        nodes: [{ id: "n1", type: "AI_GENERATE", label: "Gen", positionX: 100, positionY: 200 }],
        edges: [],
      });
      expect(result.success).toBe(true);
    });
  });
});
