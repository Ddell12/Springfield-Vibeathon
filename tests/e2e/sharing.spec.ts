import { expect,test } from "@playwright/test";

test.describe("Shared tool page", () => {
  test.fixme("navigate to /tool/test-slug renders the shared tool", async ({ page }) => {
    // Requires a seeded backend with a known shareSlug = "test-slug"
    await page.goto("/tool/test-slug");

    await expect(page.locator("body")).toBeVisible();

    // Tool renderer or safe-space container should appear
    const toolContent = page
      .locator("[data-testid='tool-renderer']")
      .or(page.locator(".safe-space-container"));
    await expect(toolContent.first()).toBeVisible({ timeout: 10_000 });
  });

  test.fixme("shared tool page shows tool title", async ({ page }) => {
    // Requires seeded backend
    const TEST_SLUG = process.env.TEST_SHARE_SLUG ?? "test-slug";
    await page.goto(`/tool/${TEST_SLUG}`);

    const heading = page.getByRole("heading");
    await expect(heading.first()).toBeVisible({ timeout: 10_000 });
  });

  test.fixme("shared tool page has 'Use This Tool' CTA", async ({ page }) => {
    // Requires seeded backend
    const TEST_SLUG = process.env.TEST_SHARE_SLUG ?? "test-slug";
    await page.goto(`/tool/${TEST_SLUG}`);

    const cta = page.getByRole("link", { name: /use this tool|build your own/i });
    await expect(cta).toBeVisible({ timeout: 10_000 });
  });
});
