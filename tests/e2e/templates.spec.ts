import { expect, test } from "@playwright/test";

test.describe("Templates page", () => {
  test("heading 'Start with a Template' is visible", async ({ page }) => {
    await page.goto("/templates");

    const heading = page.getByRole("heading", { name: /start with a template/i });
    await expect(heading).toBeVisible();
  });

  test("template cards render with builder links", async ({ page }) => {
    await page.goto("/templates");

    // TemplatesPage renders <Link href="/builder?prompt=..."> for each THERAPY_SEED_PROMPTS entry
    // These are static imports — no Convex connection required
    const templateLinks = page.locator("a[href^='/builder?prompt=']");
    await expect(templateLinks.first()).toBeVisible();
    const count = await templateLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("each card has 'Click to build' text", async ({ page }) => {
    await page.goto("/templates");

    // Each template card footer renders a static "Click to build" paragraph
    const clickToBuild = page.getByText(/click to build/i);
    await expect(clickToBuild.first()).toBeVisible();
    const count = await clickToBuild.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("clicking a template navigates to /builder with prompt", async ({ page }) => {
    await page.goto("/templates");

    // Click the first template card and verify we land on the builder with a prompt param
    const firstCard = page.locator("a[href^='/builder?prompt=']").first();
    await firstCard.click();

    await expect(page).toHaveURL(/\/builder\?prompt=/);
  });

  test("CTA 'Build a Custom App' links to /builder", async ({ page }) => {
    await page.goto("/templates");

    const cta = page.getByRole("link", { name: /build a custom app/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toBe("/builder");
  });
});
