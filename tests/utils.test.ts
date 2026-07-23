import { describe, it, expect } from "vitest";
import { cn, truncate, formatDate, capitalize } from "@/lib/utils";

describe("Utils", () => {
  it("cn merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
    expect(cn("foo", false && "bar")).toBe("foo");
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });

  it("truncate truncates long strings", () => {
    expect(truncate("Hello World", 5)).toBe("Hello...");
    expect(truncate("Hello", 10)).toBe("Hello");
  });

  it("formatDate formats dates", () => {
    const date = new Date("2024-01-15T12:00:00Z");
    const formatted = formatDate(date.toISOString());
    expect(formatted).toContain("2024");
  });

  it("capitalize capitalizes first character only", () => {
    expect(capitalize("hello")).toBe("Hello");
    expect(capitalize("HELLO")).toBe("HELLO");
    expect(capitalize("")).toBe("");
  });
});
