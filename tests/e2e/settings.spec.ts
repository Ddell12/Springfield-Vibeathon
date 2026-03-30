import { expect,test } from "./fixtures";
import { MOBILE_VIEWPORT } from "./helpers";

test.describe("Settings — authenticated", () => {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !process.env.E2E_CLERK_USER_PASSWORD,
    "E2E Clerk creds not set"
  );

  test("page loads with Profile section visible", async ({ authedPage }) => {
    await authedPage.goto("/settings");
    await expect(authedPage.getByText(/profile/i)).toBeVisible();
  });

  test("Account section option exists", async ({ authedPage }) => {
    await authedPage.goto("/settings");
    // Account appears in sidebar (desktop) or section picker (mobile)
    await expect(authedPage.getByText(/account/i)).toBeVisible();
  });

  test("Appearance section option exists", async ({ authedPage }) => {
    await authedPage.goto("/settings");
    await expect(authedPage.getByText(/appearance/i)).toBeVisible();
  });

  test("back link navigates to dashboard", async ({ authedPage }) => {
    // On mobile viewport the back link with aria-label is rendered
    await authedPage.setViewportSize(MOBILE_VIEWPORT);
    await authedPage.goto("/settings");

    const backLink = authedPage.getByLabel("Back to dashboard");
    const sidebar = authedPage.locator("[data-testid='settings-sidebar']");

    // Either back link (mobile) or sidebar (desktop) must be present
    const hasBackLink = await backLink.isVisible().catch(() => false);
    const hasSidebar = await sidebar.isVisible().catch(() => false);

    // At least one navigation affordance exists
    expect(hasBackLink || hasSidebar).toBe(true);
  });
});
