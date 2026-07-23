import { describe, it, expect } from "vitest";
import { z } from "zod";

const exportSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  workflow: z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  }),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    positionX: z.number(),
    positionY: z.number(),
  })),
  edges: z.array(z.object({
    id: z.string(),
    sourceNodeId: z.string(),
    targetNodeId: z.string(),
  })),
});

describe("Workflow Export/Import", () => {
  it("validates export schema structure", () => {
    const validExport = {
      version: "1.0",
      exportedAt: "2025-01-01T00:00:00.000Z",
      workflow: { name: "Test", description: "A test", tags: ["test"] },
      nodes: [{ id: "n1", type: "TRIGGER", label: "Start", positionX: 0, positionY: 0 }],
      edges: [{ id: "e1", sourceNodeId: "n1", targetNodeId: "n2" }],
    };
    const result = exportSchema.safeParse(validExport);
    expect(result.success).toBe(true);
  });

  it("rejects export without version", () => {
    const result = exportSchema.safeParse({
      workflow: { name: "Test" },
      nodes: [],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects export without nodes", () => {
    const result = exportSchema.safeParse({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      workflow: { name: "Test" },
      nodes: "invalid",
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it("preserves node positions during export", () => {
    const nodes = [
      { id: "a", type: "TRIGGER", label: "A", positionX: 100, positionY: 200 },
      { id: "b", type: "AI_GENERATE", label: "B", positionX: 400, positionY: 200 },
    ];
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      workflow: { name: "Test" },
      nodes,
      edges: [{ id: "e1", sourceNodeId: "a", targetNodeId: "b" }],
    };

    const parsed = exportSchema.parse(exportData);
    expect(parsed.nodes[0].positionX).toBe(100);
    expect(parsed.nodes[0].positionY).toBe(200);
    expect(parsed.nodes[1].positionX).toBe(400);
  });

  it("validates edges reference existing nodes", () => {
    const data = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      workflow: { name: "Test" },
      nodes: [{ id: "a", type: "TRIGGER", label: "A", positionX: 0, positionY: 0 }],
      edges: [{ id: "e1", sourceNodeId: "a", targetNodeId: "nonexistent" }],
    };

    const parsed = exportSchema.parse(data);
    const nodeIds = new Set(parsed.nodes.map((n) => n.id));
    const hasInvalidEdge = parsed.edges.some(
      (e) => !nodeIds.has(e.sourceNodeId) || !nodeIds.has(e.targetNodeId),
    );
    expect(hasInvalidEdge).toBe(true);
  });
});
