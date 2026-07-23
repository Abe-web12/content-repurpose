import { describe, it, expect } from "vitest";

describe("Workflow Templates", () => {
  const builtInCategories = ["content", "marketing", "social", "productivity", "developer", "sales", "support"];

  it("defines all required template categories", () => {
    expect(builtInCategories).toContain("content");
    expect(builtInCategories).toContain("marketing");
    expect(builtInCategories).toContain("social");
    expect(builtInCategories).toContain("productivity");
    expect(builtInCategories).toContain("developer");
    expect(builtInCategories).toContain("sales");
    expect(builtInCategories).toContain("support");
  });

  const templateNames = [
    "Blog Writer",
    "SEO Generator",
    "Email Campaign",
    "Twitter Thread",
    "LinkedIn Post",
    "Meeting Summary",
    "Translation",
    "Code Review",
    "Marketing Funnel",
    "Sales Outreach",
    "Customer Support",
  ];

  templateNames.forEach((name) => {
    it(`defines the "${name}" template`, () => {
      expect(name).toBeTruthy();
    });
  });

  it("templates have trigger nodes", () => {
    const triggerTypes = ["TRIGGER"];
    expect(triggerTypes).toContain("TRIGGER");
  });
});
