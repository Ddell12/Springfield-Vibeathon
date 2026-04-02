import { expect, test } from "./fixtures";

test.describe("Explore page", () => {
  test("page loads with hero heading", async ({ authedPage }) => {
    await authedPage.goto("/explore");

    const heading = authedPage.getByRole("heading", { name: /see what you can build/i });
    await expect(heading).toBeVisible();
  });

  test("renders 6 demo tool cards", async ({ authedPage }) => {
    await authedPage.goto("/explore");

    const cards = authedPage.getByRole("button", { name: /try it/i });
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    await expect(cards).toHaveCount(6);
  });

  test("'Start Building' CTA links to /builder", async ({ authedPage }) => {
    await authedPage.goto("/explore");

    const cta = authedPage.getByRole("link", { name: /start building/i });
    await expect(cta.first()).toBeVisible();
    const href = await cta.first().getAttribute("href");
    expect(href).toContain("/builder");
  });

  test("'Browse Templates' CTA links to the library templates tab", async ({ authedPage }) => {
    await authedPage.goto("/explore");

    const cta = authedPage.getByRole("link", { name: /browse templates/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toContain("/library?tab=templates");
  });

  test("header includes current marketing navigation", async ({ authedPage }) => {
    await authedPage.goto("/explore");

    const navLink = authedPage.locator("header").getByRole("link", { name: /meet vocali/i });
    await expect(navLink.first()).toBeVisible();
  });

  test("cards stack to single column on mobile", async ({ authedPage }) => {
    await authedPage.setViewportSize({ width: 375, height: 812 });
    await authedPage.goto("/explore");

    const cards = authedPage.getByRole("button", { name: /try it/i });
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });

    const firstBox = await cards.nth(0).boundingBox();
    const secondBox = await cards.nth(1).boundingBox();
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();
    expect(Math.abs(firstBox!.x - secondBox!.x)).toBeLessThan(10);
  });
});
