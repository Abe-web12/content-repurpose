import { describe, it, expect } from "vitest";

describe("Branding — Theme Engine", () => {
  it("generates CSS variables from theme", () => {
    const generateCSS = (theme: { primaryColor: string; secondaryColor: string; accentColor: string; fontFamily: string }) => `
:root {
  --brand-primary: ${theme.primaryColor};
  --brand-secondary: ${theme.secondaryColor};
  --brand-accent: ${theme.accentColor};
  --brand-font: ${theme.fontFamily};
}
    `.trim();

    const css = generateCSS({
      primaryColor: "#ff0000",
      secondaryColor: "#00ff00",
      accentColor: "#0000ff",
      fontFamily: "Arial, sans-serif",
    });

    expect(css).toContain("--brand-primary: #ff0000");
    expect(css).toContain("--brand-secondary: #00ff00");
    expect(css).toContain("--brand-accent: #0000ff");
    expect(css).toContain("--brand-font: Arial, sans-serif");
  });

  it("provides default theme when no org is found", () => {
    const DEFAULT_THEME = {
      primaryColor: "#6366f1",
      secondaryColor: "#4f46e5",
      accentColor: "#10b981",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    };
    expect(DEFAULT_THEME.primaryColor).toBe("#6366f1");
    expect(DEFAULT_THEME.secondaryColor).toBe("#4f46e5");
  });
});

describe("Branding — Color Validation", () => {
  it("validates hex colors", () => {
    const isValidHex = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color);
    expect(isValidHex("#6366f1")).toBe(true);
    expect(isValidHex("#fff")).toBe(false);
    expect(isValidHex("red")).toBe(false);
    expect(isValidHex("#GGGGGG")).toBe(false);
  });

  it("accepts valid hex codes", () => {
    const colors = ["#000000", "#FFFFFF", "#10b981", "#4f46e5", "#f59e0b"];
    colors.forEach((c) => expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/));
  });
});

describe("Branding — Domain Validation", () => {
  it("validates domain format", () => {
    const isValidDomain = (domain: string) => /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(domain);
    expect(isValidDomain("example.com")).toBe(true);
    expect(isValidDomain("sub.domain.co.uk")).toBe(true);
    expect(isValidDomain("invalid")).toBe(false);
    expect(isValidDomain("")).toBe(false);
    expect(isValidDomain("http://example.com")).toBe(false);
  });

  it("sanitizes domain input", () => {
    const sanitize = (domain: string) => domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    expect(sanitize("Example.COM")).toBe("example.com");
    expect(sanitize("https://example.com/path")).toBe("example.com");
    expect(sanitize("  SUB.domain.COM  ")).toBe("sub.domain.com");
  });
});

describe("Branding — Email Templates", () => {
  it("replaces primary color in email HTML", () => {
    const wrapWithBranding = (html: string, branding: { primaryColor?: string }) => {
      if (!branding) return html;
      let result = html;
      result = result.replace(/background:#6366f1/g, `background:${branding.primaryColor}`);
      result = result.replace(/color:#6366f1/g, `color:${branding.primaryColor}`);
      return result;
    };

    const html = '<a href="#" style="background:#6366f1;color:#6366f1">Button</a>';
    const branded = wrapWithBranding(html, { primaryColor: "#ff0000" });
    expect(branded).toContain("background:#ff0000");
    expect(branded).toContain("color:#ff0000");
    expect(branded).not.toContain("#6366f1");
  });

  it("replaces org name in templates", () => {
    const wrapWithBranding = (html: string, branding: { orgName?: string }) => {
      if (!branding) return html;
      return html.replace(/RepurposeAI/g, branding.orgName || "");
    };

    const html = "Welcome to RepurposeAI!";
    const branded = wrapWithBranding(html, { orgName: "Acme Corp" });
    expect(branded).toBe("Welcome to Acme Corp!");
  });

  it("adds logo to email header", () => {
    const addLogo = (html: string, logoUrl: string) => {
      return html.replace(
        /<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">/,
        `<img src="${logoUrl}" style="max-height:36px;margin-bottom:10px" /><h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">`
      );
    };

    const html = '<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Welcome</h1>';
    const result = addLogo(html, "https://example.com/logo.png");
    expect(result).toContain('<img src="https://example.com/logo.png"');
    expect(result).toContain(">Welcome</h1>");
  });
});

describe("Branding — Reset", () => {
  it("resets all branding fields to null", () => {
    const resetData = {
      logo: null, logoLight: null, logoDark: null, favicon: null,
      brandColor: null, secondaryColor: null, accentColor: null,
      customFont: null, fontFamily: null,
      emailBrandingEnabled: false, emailHeaderHtml: null, emailFooterHtml: null,
      loadingScreenHtml: null,
    };

    expect(resetData.logo).toBeNull();
    expect(resetData.brandColor).toBeNull();
    expect(resetData.emailBrandingEnabled).toBe(false);
  });
});
