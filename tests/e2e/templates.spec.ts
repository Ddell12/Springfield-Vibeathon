import { expect,test } from "@playwright/test";

test.describe("Templates page", () => {
  test("templates heading is visible", async ({ page }) => {
    await page.goto("/templates");

    const heading = page.getByRole("heading").filter({ hasText: /template/i });
    await expect(heading.first()).toBeVisible();
  });

  test("category tabs render", async ({ page }) => {
    await page.goto("/templates");

    // Category tabs should be present (tab role or button list)
    const tabs = page.getByRole("tab").or(
      page.getByRole("button").filter({ hasText: /all|communication|schedule|token/i }),
    );
    await expect(tabs.first()).toBeVisible();
  });

  test.fixme("template cards load from backend", async ({ page }) => {
    // Requires seeded Convex backend with template data
    await page.goto("/templates");

    const cards = page.getByRole("article").or(
      page.locator("[data-testid='template-card']"),
    );
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test.fixme("clicking a template opens the builder with pre-filled config", async ({ page }) => {
    // Requires seeded Convex backend
    await page.goto("/templates");

    const firstCard = page.getByRole("article").first();
    await firstCard.click();

    await expect(page).toHaveURL(/\/builder/);
  });
});
