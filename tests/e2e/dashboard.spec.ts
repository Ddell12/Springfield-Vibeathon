import { expect,test } from "./fixtures";
import { TIMEOUTS } from "./helpers";

test.describe("Dashboard — authenticated", () => {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !process.env.E2E_CLERK_USER_PASSWORD,
    "E2E Clerk creds not set"
  );

  test("'What would you like to build?' heading visible", async ({
    authedPage,
  }) => {
    await authedPage.goto("/dashboard");
    await expect(
      authedPage.getByRole("heading", { name: /what would you like to build/i })
    ).toBeVisible();
  });

  test("prompt input is visible", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    const input = authedPage
      .getByRole("textbox")
      .or(authedPage.getByPlaceholder(/describe/i));
    await expect(input.first()).toBeVisible();
  });

  test("template chips render", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await expect(authedPage.getByText("Token Board")).toBeVisible();
    await expect(authedPage.getByText("Visual Schedule")).toBeVisible();
  });

  test("all 4 tabs render", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await expect(
      authedPage.getByRole("tab", { name: /recently viewed/i })
    ).toBeVisible();
    await expect(
      authedPage.getByRole("tab", { name: /my apps/i })
    ).toBeVisible();
    await expect(
      authedPage.getByRole("tab", { name: /shared with me/i })
    ).toBeVisible();
    await expect(
      authedPage.getByRole("tab", { name: /templates/i })
    ).toBeVisible();
  });

  test("clicking 'My Apps' tab updates URL", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await authedPage.getByRole("tab", { name: /my apps/i }).click();
    await expect(authedPage).toHaveURL(/tab=my-projects/);
  });

  test("clicking 'Templates' tab updates URL", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await authedPage.getByRole("tab", { name: /templates/i }).click();
    await expect(authedPage).toHaveURL(/tab=templates/);
  });

  test("empty state or project cards visible on recent tab", async ({
    authedPage,
  }) => {
    await authedPage.goto("/dashboard");
    // Convex may take a moment to hydrate
    const content = authedPage
      .getByText(/no apps yet/i)
      .or(authedPage.locator("[data-testid='loading-skeleton']"))
      .or(authedPage.getByRole("link", { name: /open/i }));
    await expect(content.first()).toBeVisible({
      timeout: TIMEOUTS.CONVEX_QUERY,
    });
  });

  test("'Create New' link in desktop header", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    const createNew = authedPage.getByRole("link", { name: /create new/i });
    await expect(createNew).toBeVisible();
    await expect(createNew).toHaveAttribute("href", /\/builder/);
  });
});
