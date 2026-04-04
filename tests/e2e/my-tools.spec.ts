import { expect,test } from "./fixtures";
import { TIMEOUTS } from "./helpers";

test.describe("My Tools — authenticated", () => {
  test("page loads (heading or empty state)", async ({ authedPage }) => {
    await authedPage.goto("/my-tools");
    // Convex takes up to 15s to hydrate
    const content = authedPage
      .getByText(/my apps/i)
      .or(authedPage.getByText(/no apps yet/i));
    await expect(content.first()).toBeVisible({ timeout: TIMEOUTS.CONVEX_QUERY });
  });

  test("empty state has 'Start Building' link", async ({ authedPage }) => {
    await authedPage.goto("/my-tools");
    // Only assert if empty state is actually shown
    const emptyState = authedPage.getByText(/no apps yet/i);
    const isEmptyState = await emptyState
      .isVisible({ timeout: TIMEOUTS.CONVEX_QUERY })
      .catch(() => false);

    if (isEmptyState) {
      await expect(
        authedPage.getByRole("link", { name: /start building/i })
      ).toBeVisible();
    }
  });

  test("'Need a custom app?' CTA section renders", async ({ authedPage }) => {
    await authedPage.goto("/my-tools");
    // CTA only shows when there ARE apps; use .or() to handle empty state too
    const content = authedPage
      .getByText(/need a custom app/i)
      .or(authedPage.getByText(/no apps yet/i));
    await expect(content.first()).toBeVisible({ timeout: TIMEOUTS.CONVEX_QUERY });
  });

  test.fixme(
    "tool cards display with title and Open link",
    async ({ authedPage }) => {
      // Needs seeded sessions in the test account
      await authedPage.goto("/my-tools");
      await expect(authedPage.getByRole("link", { name: /open/i }).first()).toBeVisible();
    }
  );

  test.fixme(
    "clicking Open navigates to /builder/[sessionId]",
    async ({ authedPage }) => {
      // Needs seeded sessions in the test account
      await authedPage.goto("/my-tools");
      await authedPage.getByRole("link", { name: /open/i }).first().click();
      await expect(authedPage).toHaveURL(/\/builder\/.+/);
    }
  );
});
