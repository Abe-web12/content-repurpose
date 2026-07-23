import { describe, it, expect } from "vitest";
import {
  analyticsPeriodSchema,
  reportSchema,
  alertSchema,
  segmentSchema,
  benchmarkSchema,
  kpiSchema,
  predictionSchema,
} from "@/lib/validations/analytics";

describe("analytics validations", () => {
  describe("analyticsPeriodSchema", () => {
    it("defaults period to 30d", () => {
      const r = analyticsPeriodSchema.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.period).toBe("30d");
    });
    it("accepts valid periods", () => {
      for (const p of ["7d", "30d", "90d", "365d", "custom"]) {
        expect(analyticsPeriodSchema.safeParse({ period: p }).success).toBe(true);
      }
    });
    it("rejects invalid period", () => {
      expect(analyticsPeriodSchema.safeParse({ period: "5d" }).success).toBe(false);
    });
  });

  describe("reportSchema", () => {
    it("requires a title", () => {
      expect(reportSchema.safeParse({ type: "revenue" }).success).toBe(false);
    });
    it("accepts valid report", () => {
      const r = reportSchema.safeParse({ title: "Q3 Report", type: "revenue", format: "csv" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.format).toBe("csv");
    });
    it("rejects invalid type", () => {
      expect(reportSchema.safeParse({ title: "x", type: "invalid" }).success).toBe(false);
    });
    it("defaults format to pdf", () => {
      const r = reportSchema.safeParse({ title: "x", type: "executive" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.format).toBe("pdf");
    });
  });

  describe("alertSchema", () => {
    it("requires name, metric, condition, threshold", () => {
      expect(alertSchema.safeParse({ name: "a", metric: "mrr", condition: "gt", threshold: 1 }).success).toBe(true);
    });
    it("rejects invalid condition", () => {
      expect(alertSchema.safeParse({ name: "a", metric: "mrr", condition: "between", threshold: 1 }).success).toBe(false);
    });
    it("defaults channels to email", () => {
      const r = alertSchema.safeParse({ name: "a", metric: "mrr", condition: "gt", threshold: 1 });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.channels).toEqual(["email"]);
    });
  });

  describe("segmentSchema", () => {
    it("accepts customer segment", () => {
      const r = segmentSchema.safeParse({ name: "Power", type: "customer", criteria: { isSuspended: false } });
      expect(r.success).toBe(true);
    });
    it("rejects missing criteria object", () => {
      expect(segmentSchema.safeParse({ name: "x", criteria: "bad" }).success).toBe(false);
    });
  });

  describe("benchmarkSchema", () => {
    it("accepts valid metric and period", () => {
      const r = benchmarkSchema.safeParse({ name: "b", metric: "mrr", period: "monthly" });
      expect(r.success).toBe(true);
    });
    it("defaults period to monthly", () => {
      const r = benchmarkSchema.safeParse({ name: "b", metric: "mrr" });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.period).toBe("monthly");
    });
  });

  describe("kpiSchema", () => {
    it("accepts valid KPI", () => {
      const r = kpiSchema.safeParse({ name: "k", metric: "mrr", target: 100 });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.direction).toBe("up");
    });
    it("rejects empty name", () => {
      expect(kpiSchema.safeParse({ name: "", metric: "mrr" }).success).toBe(false);
    });
  });

  describe("predictionSchema", () => {
    it("accepts mrr 30 days", () => {
      const r = predictionSchema.safeParse({ metric: "mrr", days: "30" });
      expect(r.success).toBe(true);
    });
    it("accepts all horizons", () => {
      for (const d of ["7", "30", "90", "365"]) {
        expect(predictionSchema.safeParse({ metric: "revenue", days: d }).success).toBe(true);
      }
    });
    it("rejects invalid metric", () => {
      expect(predictionSchema.safeParse({ metric: "unknown", days: "30" }).success).toBe(false);
    });
  });
});
