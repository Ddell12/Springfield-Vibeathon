import { expect, test } from "@playwright/test";

test.describe("Shared tool page", () => {
  test("invalid slug shows 'doesn't exist' error", async ({ page }) => {
    await page.goto("/tool/nonexistent-slug-xyz");

    // SharedToolPage shows a loading skeleton first (app === undefined), then when
    // the Convex query resolves to null it renders the "doesn't exist" state.
    // We wait up to 15s because Convex needs to be connected and the query must resolve.
    await expect(page.getByText(/doesn't exist/i)).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: "test-results/shared-tool-not-found.png" });
  });

  test("error page has 'Build Your Own' CTA", async ({ page }) => {
    await page.goto("/tool/nonexistent-slug-xyz");

    // Wait for the not-found state (same dependency as above)
    await page.getByText(/doesn't exist/i).waitFor({ timeout: 15_000 });

    const cta = page.getByRole("link", { name: /build your own/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toBe("/builder");
  });

  test.fixme("valid slug renders tool iframe", async ({ page }) => {
    // Requires TEST_SHARE_SLUG env var pointing to a seeded share slug in Convex
    const slug = process.env.TEST_SHARE_SLUG;
    if (!slug) throw new Error("TEST_SHARE_SLUG env var required");

    await page.goto(`/tool/${slug}`);

    // SharedToolPage renders an <iframe> when app has a valid previewUrl or publishedUrl
    const iframe = page.locator("iframe");
    await expect(iframe).toBeVisible({ timeout: 15_000 });
  });

  test.fixme("shared tool footer has 'Create Tool' CTA", async ({ page }) => {
    // Requires a valid tool loaded — depends on TEST_SHARE_SLUG and seeded Convex data
    const slug = process.env.TEST_SHARE_SLUG;
    if (!slug) throw new Error("TEST_SHARE_SLUG env var required");

    await page.goto(`/tool/${slug}`);

    // SharedToolPage renders a fixed footer with a "Create Tool" link to /builder
    await page.locator("iframe").waitFor({ timeout: 15_000 });

    const cta = page.getByRole("link", { name: /create tool/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toBe("/builder");
  });
});
