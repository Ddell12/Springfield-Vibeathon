import { expect,test } from "./fixtures";
import { MOBILE_VIEWPORT } from "./helpers";

test.describe("Mobile — authenticated", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !process.env.E2E_CLERK_USER_PASSWORD,
    "E2E Clerk creds not set"
  );

  test("sidebar hidden on mobile", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    // Sidebar has `hidden md:flex` — at mobile width it must not be visible
    await expect(authedPage.locator("aside")).toBeHidden();
  });

  test("hamburger menu visible on dashboard", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await expect(
      authedPage.getByLabel("Open navigation menu")
    ).toBeVisible();
  });

  test("hamburger opens mobile nav drawer", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await authedPage.getByLabel("Open navigation menu").click();
    // Sheet content should contain "Bridges" brand text
    await expect(authedPage.getByText("Bridges")).toBeVisible();
  });

  test("drawer has all nav items", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await authedPage.getByLabel("Open navigation menu").click();
    // Wait for Sheet animation to complete
    await authedPage.waitForTimeout(300);
    await expect(authedPage.getByText(/home/i)).toBeVisible();
    await expect(authedPage.getByText(/builder/i)).toBeVisible();
    await expect(authedPage.getByText(/flashcards/i)).toBeVisible();
    await expect(authedPage.getByText(/templates/i)).toBeVisible();
    await expect(authedPage.getByText(/my apps/i)).toBeVisible();
  });

  test("drawer has 'New Project' button", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await authedPage.getByLabel("Open navigation menu").click();
    await expect(
      authedPage.getByRole("link", { name: /new project/i })
    ).toBeVisible();
  });

  test("closing drawer hides it", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await authedPage.getByLabel("Open navigation menu").click();
    // Wait for sheet to open
    await expect(authedPage.getByText("Bridges")).toBeVisible();
    await authedPage.getByLabel("Close navigation").click();
    // Sheet content should no longer be visible
    await expect(authedPage.getByText("Bridges")).toBeHidden();
  });

  test("'Bridges' branding in drawer", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await authedPage.getByLabel("Open navigation menu").click();
    await expect(authedPage.getByText("Bridges")).toBeVisible();
  });
});
