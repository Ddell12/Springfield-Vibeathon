import { expect,test } from "@playwright/test";

test.describe("Landing page", () => {
  test("hero heading is visible", async ({ page }) => {
    await page.goto("/");

    // The hero heading should mention therapy tools
    const heading = page.getByRole("heading").filter({ hasText: /therapy tool/i });
    await expect(heading.first()).toBeVisible();
  });

  test("'Start Building' CTA links to /builder", async ({ page }) => {
    await page.goto("/");

    const cta = page.getByRole("link", { name: /start building/i });
    await expect(cta.first()).toBeVisible();
    await expect(cta.first()).toHaveAttribute("href", "/builder");
  });

  test("header shows 'Bridges' brand text", async ({ page }) => {
    await page.goto("/");

    const brand = page.getByRole("link", { name: /bridges/i });
    await expect(brand.first()).toBeVisible();
  });
});
