import { expect, test } from "@playwright/test";

test.describe("Shared tool page", () => {
  test("invalid slug shows the current not-found state and CTA", async ({ page }) => {
    await page.goto("/tool/nonexistent-slug-xyz");

    const notFoundMessage = page.getByText(/doesn't exist/i);
    await expect(notFoundMessage).toBeVisible({ timeout: 15_000 });

    const cta = page.getByRole("link", { name: /build your own/i });
    await expect(cta).toBeVisible();
    expect(await cta.getAttribute("href")).toBe("/builder");

    await page.screenshot({ path: "test-results/shared-tool-not-found.png" });
  });

  test("valid slug renders tool iframe", async ({ page }) => {
    test.skip(!process.env.TEST_SHARE_SLUG, "Set TEST_SHARE_SLUG to a seeded share slug to run this test");
    const slug = process.env.TEST_SHARE_SLUG!;

    await page.goto(`/tool/${slug}`);

    // SharedToolPage renders an <iframe> when app has a valid previewUrl or publishedUrl
    const iframe = page.locator("iframe");
    await expect(iframe).toBeVisible({ timeout: 15_000 });
  });

  test("shared tool footer has 'Create Tool' CTA", async ({ page }) => {
    test.skip(!process.env.TEST_SHARE_SLUG, "Set TEST_SHARE_SLUG to a seeded share slug to run this test");
    const slug = process.env.TEST_SHARE_SLUG!;

    await page.goto(`/tool/${slug}`);

    // SharedToolPage renders a fixed footer with a "Create Tool" link to /builder
    await page.locator("iframe").waitFor({ timeout: 15_000 });

    const cta = page.getByRole("link", { name: /create tool/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toBe("/builder");
  });
});
