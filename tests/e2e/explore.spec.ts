import { expect, test } from "@playwright/test";

test.describe("Explore page", () => {
  test("page loads with hero heading", async ({ page }) => {
    await page.goto("/explore");

    const heading = page.getByRole("heading", { name: /see what you can build/i });
    await expect(heading).toBeVisible();
  });

  test("renders 6 demo tool cards", async ({ page }) => {
    await page.goto("/explore");

    const cards = page.getByRole("button", { name: /try it/i });
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    await expect(cards).toHaveCount(6);
  });

  test("'Start Building' CTA links to /builder", async ({ page }) => {
    await page.goto("/explore");

    const cta = page.getByRole("link", { name: /start building/i });
    await expect(cta.first()).toBeVisible();
    const href = await cta.first().getAttribute("href");
    expect(href).toContain("/builder");
  });

  test("'Browse Templates' CTA links to /templates", async ({ page }) => {
    await page.goto("/explore");

    const cta = page.getByRole("link", { name: /browse templates/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toContain("/templates");
  });

  test("header includes Explore nav link", async ({ page }) => {
    await page.goto("/explore");

    const navLink = page.locator("header").getByRole("link", { name: /explore/i });
    await expect(navLink.first()).toBeVisible();
  });

  test("cards stack to single column on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/explore");

    const cards = page.getByRole("button", { name: /try it/i });
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();
    expect(Math.abs(firstBox!.x - secondBox!.x)).toBeLessThan(10);
  });
});
