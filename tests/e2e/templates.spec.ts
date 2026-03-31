import { expect, test } from "@playwright/test";

test.describe("Templates page", () => {
  test.describe.configure({ mode: "serial" });

  test("library opens with the templates tab selected", async ({ page }) => {
    await page.goto("/library?tab=templates");

    const heading = page.getByRole("heading", { name: /library/i });
    await expect(heading).toBeVisible();
    await expect(page.getByRole("tab", { name: "Templates" })).toHaveAttribute(
      "data-state",
      "active"
    );
  });

  test("embedded templates render search and template cards", async ({ page }) => {
    await page.goto("/library?tab=templates");

    await expect(page.getByRole("textbox", { name: /search templates/i })).toBeVisible();
    const templateLinks = page.locator("a[href^='/builder?prompt=']");
    await expect(templateLinks.first()).toBeVisible();
    const count = await templateLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("each card has 'Click to build' text", async ({ page }) => {
    await page.goto("/library?tab=templates");

    const clickToBuild = page.getByText(/click to build/i);
    await expect(clickToBuild.first()).toBeVisible();
    const count = await clickToBuild.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("clicking a template navigates to /builder with prompt", async ({ page }) => {
    await page.goto("/library?tab=templates");

    const firstCard = page.locator("a[href^='/builder?prompt=']").first();
    await firstCard.click();

    await expect(page).toHaveURL(/\/builder\?prompt=/);
  });

  test("CTA 'Build a Custom App' links to /builder", async ({ page }) => {
    await page.goto("/library?tab=templates");

    const cta = page.getByRole("link", { name: /build a custom app/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toBe("/builder");
  });
});
