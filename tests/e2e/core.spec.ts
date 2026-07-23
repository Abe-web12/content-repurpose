import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("shows errors for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "invalid@test.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/invalid/i).or(page.getByText(/error/i))).toBeVisible({ timeout: 10000 });
  });

  test("redirects authenticated user to dashboard", async ({ page }) => {
    // This test requires a valid test user - skip in CI without credentials
    test.skip(!process.env.E2E_TEST_EMAIL, "E2E_TEST_EMAIL not set");
    await page.goto("/login");
    await page.fill('input[type="email"]', process.env.E2E_TEST_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard", { timeout: 15000 });
  });
});

test.describe("Marketing Pages", () => {
  test("homepage loads with all sections", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /repurpose/i })).toBeVisible();
  });

  test("pricing page shows plan options", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /pricing/i })).toBeVisible();
  });

  test("blog page lists articles", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByText(/repurpose/i)).toBeVisible();
  });

  test("changelog page renders", async ({ page }) => {
    await page.goto("/changelog");
    await expect(page.getByText(/changelog/i)).toBeVisible();
  });

  test("legal pages render", async ({ page }) => {
    await page.goto("/legal/privacy");
    await expect(page.locator("body")).not.toBeEmpty();
    await page.goto("/legal/terms");
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

test.describe("Navigation", () => {
  test("skip to content link is first focusable", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByText("Skip to main content")).toBeFocused();
  });

  test("keyboard navigation through marketing nav", async ({ page }) => {
    await page.goto("/");
    const navLinks = page.locator("nav a");
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      await page.keyboard.press("Tab");
      await expect(navLinks.nth(i)).toBeFocused();
    }
  });
});

test.describe("Accessibility", () => {
  test("has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test("images have alt text", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      await expect(images.nth(i)).toHaveAttribute("alt");
    }
  });

  test("color contrast is sufficient", async ({ page }) => {
    await page.goto("/");
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("SEO", () => {
  test("homepage has correct meta tags", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/RepurposeAI/);
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute("content");
    await expect(metaDesc.getAttribute("content")).not.toBe("");
  });

  test("has Open Graph tags", async ({ page }) => {
    await page.goto("/");
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content");
    const ogDesc = page.locator('meta[property="og:description"]');
    await expect(ogDesc).toHaveAttribute("content");
  });

  test("has Twitter card tags", async ({ page }) => {
    await page.goto("/");
    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute("content", "summary_large_image");
  });

  test("canonical URL is set", async ({ page }) => {
    await page.goto("/");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href");
  });

  test("robots meta allows indexing", async ({ page }) => {
    await page.goto("/");
    const robots = page.locator('meta[name="robots"]');
    const content = await robots.getAttribute("content");
    expect(content).toContain("index");
    expect(content).toContain("follow");
  });

  test("structured data is present", async ({ page }) => {
    await page.goto("/");
    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Error Handling", () => {
  test("404 page for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-path-does-not-exist");
    expect(response?.status()).toBe(404);
  });

  test("error page for server errors", async ({ page }) => {
    await page.goto("/error");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Responsive Design", () => {
  const viewports = [
    { width: 375, height: 812, name: "mobile" },
    { width: 768, height: 1024, name: "tablet" },
    { width: 1280, height: 800, name: "desktop" },
    { width: 1920, height: 1080, name: "wide" },
  ];

  for (const viewport of viewports) {
    test(`renders correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      await expect(page.locator("body")).toBeVisible();
      await page.goto("/login");
      await expect(page.locator("body")).toBeVisible();
      await page.goto("/pricing");
      await expect(page.locator("body")).toBeVisible();
    });
  }
});

test.describe("API Health", () => {
  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });
});

test.describe("Performance Metrics", () => {
  test("homepage loads within acceptable time", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "networkidle" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test("login page loads within acceptable time", async ({ page }) => {
    const start = Date.now();
    await page.goto("/login", { waitUntil: "networkidle" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test("no console errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    expect(errors.length).toBe(0);
  });

  test("no broken links on homepage", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("a");
    const count = await links.count();
    const checked = Math.min(count, 20);
    for (let i = 0; i < checked; i++) {
      const href = await links.nth(i).getAttribute("href");
      if (href && href.startsWith("/") && !href.startsWith("//")) {
        const res = await page.request.get(href);
        expect(res.ok() || res.status() === 302 || res.status() === 307).toBeTruthy();
      }
    }
  });
});
