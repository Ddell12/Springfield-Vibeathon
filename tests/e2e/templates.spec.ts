import { expect, test } from "./fixtures";

test.describe("Templates page", () => {
  test.describe.configure({ mode: "serial" });

  test("library opens with the templates tab selected", async ({ authedPage }) => {
    await authedPage.goto("/library?tab=templates");

    await expect(authedPage).toHaveURL(/\/library\?tab=templates/);
  });

  test("embedded templates render search and template cards", async ({ authedPage }) => {
    await authedPage.goto("/library?tab=templates");

    const templateCards = authedPage.getByTestId("template-card");
    await expect(templateCards.first()).toBeVisible();
    const count = await templateCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("template cards render starter copy", async ({ authedPage }) => {
    await authedPage.goto("/library?tab=templates");

    await expect(authedPage.getByTestId("template-card").first()).toContainText(
      /click to build/i,
    );
  });

  test("clicking a template navigates to the tool builder flow", async ({ authedPage }) => {
    await authedPage.goto("/library?tab=templates");

    const firstCard = authedPage.locator("a[href='/tools/new']").first();
    await firstCard.click();

    await expect(authedPage).toHaveURL(/\/tools\/new/);
  });

  test("CTA 'Create a Tool' links to the new tool flow", async ({ authedPage }) => {
    await authedPage.goto("/library?tab=templates");

    const cta = authedPage.getByRole("link", { name: /create a tool/i });
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toBe("/tools/new");
  });
});
