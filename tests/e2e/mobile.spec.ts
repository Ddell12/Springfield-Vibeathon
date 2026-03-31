import { expect,test } from "./fixtures";
import { MOBILE_VIEWPORT } from "./helpers";

test.describe("Mobile — authenticated", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !process.env.E2E_CLERK_USER_PASSWORD,
    "E2E Clerk creds not set"
  );

  test("sidebar hidden on mobile", async ({ authedPage }) => {
    await authedPage.goto("/builder");
    // Sidebar has `hidden md:flex` — at mobile width it must not be visible
    await expect(authedPage.locator("aside")).toBeHidden();
  });

  test("hamburger menu visible on builder", async ({ authedPage }) => {
    await authedPage.goto("/builder");
    await expect(
      authedPage.getByLabel("Open navigation")
    ).toBeVisible();
  });

  test("hamburger opens mobile nav drawer", async ({ authedPage }) => {
    await authedPage.goto("/builder");
    await authedPage.getByLabel("Open navigation").click();
    await expect(authedPage.getByRole("link", { name: /builder/i })).toBeVisible();
  });

  test("drawer has all nav items", async ({ authedPage }) => {
    await authedPage.goto("/builder");
    await authedPage.getByLabel("Open navigation").click();
    // Wait for Sheet animation to complete
    await authedPage.waitForTimeout(300);
    await expect(authedPage.getByText(/builder/i)).toBeVisible();
    await expect(authedPage.getByText(/patients/i)).toBeVisible();
    await expect(authedPage.getByText(/sessions/i)).toBeVisible();
    await expect(authedPage.getByText(/billing/i)).toBeVisible();
    await expect(authedPage.getByText(/speech coach/i)).toBeVisible();
    await expect(authedPage.getByText(/library/i)).toBeVisible();
  });

  test("mobile header still shows notifications and user menu", async ({ authedPage }) => {
    await authedPage.goto("/builder");
    await expect(authedPage.getByRole("button", { name: /notifications/i })).toBeVisible();
    await expect(authedPage.getByRole("button", { name: /open user menu/i })).toBeVisible();
  });

  test("closing drawer hides it", async ({ authedPage }) => {
    await authedPage.goto("/builder");
    await authedPage.getByLabel("Open navigation").click();
    // Wait for sheet to open
    await expect(authedPage.getByRole("link", { name: /builder/i })).toBeVisible();
    await authedPage.getByRole("button", { name: /close/i }).click();
    // Sheet content should no longer be visible
    await expect(authedPage.getByRole("link", { name: /builder/i })).toBeHidden();
  });

  test("/dashboard redirects to /builder on mobile", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await expect(authedPage).toHaveURL(/\/builder/);
  });
});
