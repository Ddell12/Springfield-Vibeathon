import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("hero heading mentions therapy apps", async ({ page }) => {
    await page.goto("/");

    const heading = page.getByRole("heading").filter({ hasText: /therapy apps/i });
    await expect(heading.first()).toBeVisible();
  });

  test("'Start Building' CTA links to /builder", async ({ page }) => {
    await page.goto("/");

    const cta = page.getByRole("link", { name: /start building/i });
    await expect(cta.first()).toBeVisible();
    const href = await cta.first().getAttribute("href");
    expect(href).toContain("/builder");
  });

  test("'View Templates' CTA links to the library templates tab", async ({ page }) => {
    await page.goto("/");

    const cta = page.getByRole("link", { name: /view templates/i });
    await expect(cta.first()).toBeVisible();
    const href = await cta.first().getAttribute("href");
    expect(href).toContain("/library?tab=templates");
  });

  test("header shows 'Bridges' brand", async ({ page }) => {
    await page.goto("/");

    // The marketing header renders a Bridges link in the nav
    const brand = page.locator("header").getByRole("link", { name: /bridges/i });
    await expect(brand.first()).toBeVisible();
  });

  test("value proposition section renders", async ({ page }) => {
    await page.goto("/");

    const heading = page.getByRole("heading", {
      name: /built for the people who matter most/i,
    });
    await expect(heading).toBeVisible();
  });

  test("testimonials section renders", async ({ page }) => {
    await page.goto("/");

    // Testimonials section has an h2 "Families & Therapists Love Bridges"
    const heading = page.getByRole("heading", { name: /families.*therapists/i });
    await expect(heading).toBeVisible();
  });

  test("footer renders", async ({ page }) => {
    await page.goto("/");

    // LandingFooter renders a <footer> element with the Bridges copyright
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText(/bridges/i);
  });
});
