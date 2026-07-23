import { describe, it, expect } from "vitest";
import { PLANS, canGenerate, getRemainingGenerations, getUsagePercentage } from "@/lib/constants/plans";

describe("Plans", () => {
  it("free plan has 3 generations", () => {
    expect(PLANS.free.generations).toBe(3);
  });

  it("starter plan has 30 generations", () => {
    expect(PLANS.starter.generations).toBe(30);
  });

  it("pro plan has unlimited generations", () => {
    expect(PLANS.pro.generations).toBe(-1);
  });

  it("canGenerate returns true when under limit", () => {
    expect(canGenerate("free", 0)).toBe(true);
    expect(canGenerate("free", 2)).toBe(true);
  });

  it("canGenerate returns false when at limit", () => {
    expect(canGenerate("free", 3)).toBe(false);
    expect(canGenerate("free", 5)).toBe(false);
  });

  it("canGenerate returns true for unlimited plan", () => {
    expect(canGenerate("pro", 100)).toBe(true);
    expect(canGenerate("pro", 99999)).toBe(true);
  });

  it("getRemainingGenerations returns correct count", () => {
    expect(getRemainingGenerations("free", 1)).toBe(2);
    expect(getRemainingGenerations("free", 3)).toBe(0);
  });

  it("getRemainingGenerations returns Infinity for pro", () => {
    expect(getRemainingGenerations("pro", 100)).toBe(Infinity);
  });

  it("getUsagePercentage returns 0-100", () => {
    expect(getUsagePercentage("free", 0)).toBe(0);
    expect(getUsagePercentage("free", 1)).toBe(33);
    expect(getUsagePercentage("free", 3)).toBe(100);
    expect(getUsagePercentage("pro", 100)).toBe(0);
  });
});
