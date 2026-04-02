import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders the current Vocali public marketing surface", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /describe it\./i })).toBeVisible();

    const buildCta = page.getByRole("link", { name: /build your first app/i }).first();
    await expect(buildCta).toBeVisible();
    expect(await buildCta.getAttribute("href")).toContain("/builder");

    const templatesCta = page.getByRole("link", { name: /browse templates/i }).first();
    await expect(templatesCta).toBeVisible();
    expect(await templatesCta.getAttribute("href")).toContain("/library?tab=templates");

    const brand = page.locator("header").getByRole("link", { name: /vocali/i }).first();
    await expect(brand).toBeVisible();

    await expect(
      page.getByRole("heading", {
        name: /from a description to a working therapy app/i,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /families.*therapists/i }),
    ).toBeVisible();

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(/vocali/i);
  });
});
