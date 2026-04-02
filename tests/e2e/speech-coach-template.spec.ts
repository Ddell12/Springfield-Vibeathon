import { expect, test } from "./fixtures";
import { TIMEOUTS } from "./helpers";

test.describe("speech coach templates", () => {
  test("slp can navigate to template library and see heading", async ({
    authedPage,
  }) => {
    const page = authedPage;

    await page.goto("/speech-coach/templates");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /speech coach templates/i })
    ).toBeVisible({ timeout: TIMEOUTS.CONVEX_QUERY });

    await expect(
      page.getByRole("button", { name: /new template/i })
    ).toBeVisible();
  });

  test("slp can open new template form", async ({ authedPage }) => {
    const page = authedPage;

    await page.goto("/speech-coach/templates");
    await page.waitForLoadState("networkidle");

    // Wait for page to hydrate
    await expect(
      page.getByRole("heading", { name: /speech coach templates/i })
    ).toBeVisible({ timeout: TIMEOUTS.CONVEX_QUERY });

    // Open the new template form
    await page.getByRole("button", { name: /new template/i }).click();

    // Editor should appear
    await expect(
      page.getByRole("heading", { name: /new template/i })
    ).toBeVisible({ timeout: 5_000 });

    // Cancel closes the editor
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(
      page.getByRole("heading", { name: /new template/i })
    ).toHaveCount(0);
  });

  test("template library shows empty state or template list", async ({
    authedPage,
  }) => {
    const page = authedPage;

    await page.goto("/speech-coach/templates");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /speech coach templates/i })
    ).toBeVisible({ timeout: TIMEOUTS.CONVEX_QUERY });

    // Either a "no templates" message or an existing template list is visible
    const emptyState = page.getByText(/no templates yet/i);
    const templateList = page.locator("ul li").first();

    const hasEmpty = await emptyState.isVisible().catch(() => false);
    const hasList = await templateList.isVisible().catch(() => false);

    expect(hasEmpty || hasList).toBe(true);
  });
});
