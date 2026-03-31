import { expect,test } from "./fixtures";

test.describe("Dashboard — authenticated", () => {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !process.env.E2E_CLERK_USER_PASSWORD,
    "E2E Clerk creds not set"
  );

  test("'What would you like to build?' heading visible", async ({
    authedPage,
  }) => {
    await authedPage.goto("/builder");
    await expect(authedPage.getByRole("textbox", { name: /what would you like to build/i })).toBeVisible();
  });

  test("prompt input is visible", async ({ authedPage }) => {
    await authedPage.goto("/builder");
    const input = authedPage
      .getByRole("textbox")
      .or(authedPage.getByPlaceholder(/describe/i));
    await expect(input.first()).toBeVisible();
  });

  test("template chips render", async ({ authedPage }) => {
    await authedPage.goto("/builder");
    await expect(authedPage.getByText("Token Board")).toBeVisible();
    await expect(authedPage.getByText("Visual Schedule")).toBeVisible();
  });

  test("/dashboard redirects authenticated users to /builder", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await expect(authedPage).toHaveURL(/\/builder/);
  });

  test("suggestion chips and composer actions are visible", async ({
    authedPage,
  }) => {
    await authedPage.goto("/builder");
    await expect(authedPage.getByRole("button", { name: /guided/i })).toBeVisible();
    await expect(authedPage.getByRole("button", { name: /communication board/i })).toBeVisible();
    await expect(authedPage.getByRole("button", { name: /feelings check-in/i })).toBeVisible();
  });

  test("builder sidebar new app entry links back to /builder", async ({ authedPage }) => {
    await authedPage.goto("/builder");
    const newApp = authedPage.getByRole("link", { name: /new app/i });
    await expect(newApp).toBeVisible();
    await expect(newApp).toHaveAttribute("href", /\/builder\?new=1/);
  });
});
