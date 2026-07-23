import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

import { createPromptSchema, updatePromptSchema, runPromptSchema, comparePromptSchema, createCategorySchema } from "@/lib/validations/prompt";
import { createKnowledgeBaseSchema, uploadDocumentSchema, searchKnowledgeSchema } from "@/lib/validations/knowledge";
import { ragQuerySchema } from "@/lib/validations/rag";
import { extractVariables, resolvePrompt, estimateTokens, validateSyntax, buildSearchQuery } from "@/lib/studio/prompt-engine";
import { chunkText, cosineSimilarity, validateFileType, getFileType, parseEmbeddingVector, vectorToString, generateEmbeddingId } from "@/lib/studio/knowledge-engine";
import { buildContext, buildRAGPrompt, extractCitations, hybridSearch } from "@/lib/studio/rag-engine";

describe("Studio - Validations", () => {
  describe("Prompt Validations", () => {
    it("validates create prompt schema", () => {
      const valid = createPromptSchema.safeParse({
        name: "Test Prompt",
        content: "Hello {{name}}, welcome to {{place}}",
      });
      expect(valid.success).toBe(true);

      const invalid = createPromptSchema.safeParse({ name: "", content: "" });
      expect(invalid.success).toBe(false);
    });

    it("validates update prompt schema", () => {
      const result = updatePromptSchema.safeParse({ name: "Updated" });
      expect(result.success).toBe(true);
    });

    it("validates run prompt schema", () => {
      const result = runPromptSchema.safeParse({
        promptId: "123",
        provider: "openai",
        model: "gpt-4",
        userPrompt: "Hello",
      });
      expect(result.success).toBe(true);
    });

    it("validates compare prompt schema", () => {
      const result = comparePromptSchema.safeParse({
        runs: [
          { promptId: "1", provider: "openai", model: "gpt-4", userPrompt: "Hi" },
          { promptId: "2", provider: "anthropic", model: "claude-3", userPrompt: "Hi" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects compare with single run", () => {
      const result = comparePromptSchema.safeParse({
        runs: [
          { promptId: "1", provider: "openai", model: "gpt-4", userPrompt: "Hi" },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("validates category schema", () => {
      const result = createCategorySchema.safeParse({ name: "Marketing" });
      expect(result.success).toBe(true);
    });
  });

  describe("Knowledge Validations", () => {
    it("validates create knowledge base", () => {
      const result = createKnowledgeBaseSchema.safeParse({ name: "My KB" });
      expect(result.success).toBe(true);
    });

    it("validates upload document", () => {
      const result = uploadDocumentSchema.safeParse({
        title: "doc.pdf",
        sourceType: "pdf",
        content: "some content",
      });
      expect(result.success).toBe(true);
    });

    it("validates search", () => {
      const result = searchKnowledgeSchema.safeParse({
        query: "test query",
        knowledgeBaseId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("RAG Validations", () => {
    it("validates rag query", () => {
      const result = ragQuerySchema.safeParse({
        query: "What is AI?",
        knowledgeBaseIds: ["550e8400-e29b-41d4-a716-446655440000"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects rag query without knowledgeBaseIds", () => {
      const result = ragQuerySchema.safeParse({
        query: "What is AI?",
        knowledgeBaseIds: [],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Studio - Prompt Engine", () => {
  describe("extractVariables", () => {
    it("extracts variables from template", () => {
      const result = extractVariables("Hello {{name}}, your {{role}} is active");
      expect(result).toEqual(["name", "role"]);
    });

    it("returns empty array for no variables", () => {
      expect(extractVariables("Plain text")).toEqual([]);
    });

    it("deduplicates variables", () => {
      expect(extractVariables("{{name}} is {{name}}")).toEqual(["name"]);
    });
  });

  describe("resolvePrompt", () => {
    it("replaces variables with values", () => {
      const result = resolvePrompt("Hello {{name}}", { name: "Alice" });
      expect(result).toBe("Hello Alice");
    });

    it("leaves unresolved variables as-is", () => {
      const result = resolvePrompt("Hello {{name}}", {});
      expect(result).toBe("Hello {{name}}");
    });
  });

  describe("estimateTokens", () => {
    it("estimates token count", () => {
      const text = "Hello world";
      expect(estimateTokens(text)).toBe(Math.ceil(text.length / 4));
    });
  });

  describe("validateSyntax", () => {
    it("validates correct syntax", () => {
      const result = validateSyntax("Hello {{name}}");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("detects mismatched braces", () => {
      const result = validateSyntax("Hello {{name}} {{");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe("Studio - Knowledge Engine", () => {
  describe("chunkText", () => {
    it("chunks text into pieces", () => {
      const text = Array(100).fill("word").join(" ");
      const chunks = chunkText(text, 10, 2);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].chunkIndex).toBe(0);
    });

    it("handles small text", () => {
      const chunks = chunkText("small text", 500, 50);
      expect(chunks.length).toBe(1);
    });
  });

  describe("cosineSimilarity", () => {
    it("returns 1 for identical vectors", () => {
      expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    });

    it("returns 0 for orthogonal vectors", () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });
  });
});

describe("Studio - RAG Engine", () => {
  describe("buildContext", () => {
    it("builds context string from chunks", () => {
      const chunks = [
        { id: "1", content: "Content A", score: 0.9, documentTitle: "Doc A", source: null, metadata: null },
        { id: "2", content: "Content B", score: 0.8, documentTitle: "Doc B", source: "source.txt", metadata: null },
      ];
      const ctx = buildContext(chunks);
      expect(ctx).toContain("[1]");
      expect(ctx).toContain("Content A");
      expect(ctx).toContain("Doc A");
      expect(ctx).toContain("source.txt");
    });
  });

  describe("buildRAGPrompt", () => {
    it("builds prompt with system and user parts", () => {
      const result = buildRAGPrompt("What is X?", "Context about X", "You are an expert");
      expect(result.system).toContain("You are an expert");
      expect(result.system).toContain("cite your sources");
      expect(result.user).toContain("Context about X");
      expect(result.user).toContain("What is X?");
    });
  });

  describe("extractCitations", () => {
    it("extracts citations from response", () => {
      const chunks = [
        { id: "1", content: "Content A", score: 0.9, documentTitle: "Doc A", source: null, metadata: null },
        { id: "2", content: "Content B", score: 0.8, documentTitle: "Doc B", source: null, metadata: null },
      ];
      const response = "According to [1] and [2], the answer is clear.";
      const citations = extractCitations(response, chunks as any);
      expect(citations).toHaveLength(2);
      expect(citations[0].chunkId).toBe("1");
      expect(citations[1].chunkId).toBe("2");
    });

    it("deduplicates citations", () => {
      const chunks = [
        { id: "1", content: "Content A", score: 0.9, documentTitle: "Doc A", source: null, metadata: null },
      ];
      const response = "See [1] and also [1] for more.";
      const citations = extractCitations(response, chunks as any);
      expect(citations).toHaveLength(1);
    });

    it("returns empty when no citations", () => {
      const chunks: any[] = [];
      expect(extractCitations("No citations here", chunks)).toEqual([]);
    });
  });

  describe("hybridSearch", () => {
    it("merges and scores results", () => {
      const a = { id: "1", content: "A", score: 0.9, documentTitle: "Doc", source: null, metadata: null };
      const b = { id: "2", content: "B", score: 0.8, documentTitle: "Doc", source: null, metadata: null };
      const results = hybridSearch([a], [b], 0.5);
      expect(results).toHaveLength(2);
    });

    it("combines duplicate results", () => {
      const a = { id: "1", content: "A", score: 0.9, documentTitle: "Doc", source: null, metadata: null };
      const results = hybridSearch([a], [a], 0.5);
      expect(results).toHaveLength(1);
    });
  });
});

describe("Studio - Additional Engine Features", () => {
  describe("validateFileType", () => {
    it("accepts supported types", () => {
      expect(validateFileType("doc.pdf")).toBe(true);
      expect(validateFileType("file.docx")).toBe(true);
      expect(validateFileType("notes.txt")).toBe(true);
      expect(validateFileType("readme.md")).toBe(true);
      expect(validateFileType("data.csv")).toBe(true);
    });

    it("rejects unsupported types", () => {
      expect(validateFileType("image.png")).toBe(false);
      expect(validateFileType("video.mp4")).toBe(false);
    });
  });

  describe("getFileType", () => {
    it("extracts file extension", () => {
      expect(getFileType("doc.pdf")).toBe("pdf");
      expect(getFileType("path/to/file.docx")).toBe("docx");
    });

    it("returns filename when no extension", () => {
      expect(getFileType("noext")).toBe("noext");
    });

    it("returns empty string for empty input", () => {
      expect(getFileType("")).toBe("");
    });
  });

  describe("parseEmbeddingVector", () => {
    it("parses valid JSON vector", () => {
      const result = parseEmbeddingVector("[0.1,0.2,0.3]");
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it("returns empty array for invalid JSON", () => {
      expect(parseEmbeddingVector("not-json")).toEqual([]);
    });
  });

  describe("vectorToString", () => {
    it("converts to JSON string", () => {
      expect(vectorToString([0.1, 0.2])).toBe("[0.1,0.2]");
    });
  });

  describe("generateEmbeddingId", () => {
    it("generates composite ID", () => {
      expect(generateEmbeddingId("chunk-1", "model-v3")).toBe("chunk-1:model-v3");
    });
  });

  describe("buildSearchQuery", () => {
    it("builds query with search term", () => {
      const query = buildSearchQuery("test");
      expect(query.OR).toBeDefined();
      expect(query.deletedAt).toBeNull();
    });

    it("builds query with tags", () => {
      const query = buildSearchQuery(undefined, ["ai", "ml"]);
      expect(query.tags).toEqual({ hasSome: ["ai", "ml"] });
    });

    it("builds query with category", () => {
      const query = buildSearchQuery(undefined, undefined, "cat-1");
      expect(query.categoryId).toBe("cat-1");
    });

    it("builds empty query", () => {
      const query = buildSearchQuery();
      expect(query).toEqual({ deletedAt: null });
    });
  });
});
