/** Shared timeout constants for E2E tests */
import { expect, type Page } from "@playwright/test";

export const TIMEOUTS = {
  /** Time for auth state to initialize on page load */
  AUTH_INIT: 10_000,
  /** Time for Convex queries to resolve and hydrate UI */
  CONVEX_QUERY: 15_000,
  /** Time for full SSE generation cycle (Claude streaming) */
  SSE_GENERATION: 120_000,
} as const;

/** iPhone 14 Pro viewport for mobile responsiveness tests */
export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

export async function expectPreviewReady(page: Page) {
  const preview = page.locator("iframe[title='App preview']");
  const previewFrame = page.frameLocator("iframe[title='App preview']");

  await expect(preview).toBeVisible({ timeout: 60_000 });
  await expect(previewFrame.locator("body")).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () =>
    previewFrame.locator("body").evaluate((body) => body.ownerDocument.readyState)
  ).toBe("complete");
  await expect.poll(async () =>
    previewFrame.locator("body").evaluate((body) => {
      const text = (body.textContent ?? "").trim();
      const elementCount = body.querySelectorAll("*").length;
      return text.length > 0 || elementCount > 0;
    })
  ).toBe(true);
  await expect(page.getByText(/Something didn't look right/i)).toHaveCount(0);
}
