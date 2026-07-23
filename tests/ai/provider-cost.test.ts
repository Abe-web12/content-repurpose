import { AICostTracker } from "@/lib/ai/provider-cost";

describe("AICostTracker", () => {
  describe("estimateTokens", () => {
    it("estimates tokens from text length", () => {
      const tokens = AICostTracker.estimateTokens("Hello world");
      expect(tokens).toBe(Math.ceil("Hello world".length / 4));
    });

    it("returns 0 for empty string", () => {
      expect(AICostTracker.estimateTokens("")).toBe(0);
    });
  });

  describe("formatCost", () => {
    it("formats nanodollars", () => {
      expect(AICostTracker.formatCost(0.000000001)).toMatch(/nUSD/);
    });

    it("formats microdollars", () => {
      expect(AICostTracker.formatCost(0.000001)).toMatch(/µUSD/);
    });

    it("formats millidollars", () => {
      expect(AICostTracker.formatCost(0.001)).toMatch(/mUSD/);
    });

    it("formats dollars", () => {
      expect(AICostTracker.formatCost(1)).toMatch(/^\$/);
    });
  });
});
