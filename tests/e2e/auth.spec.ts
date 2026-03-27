import { expect, test } from "@playwright/test";

test.describe("Auth pages", () => {
  test("/sign-in renders Clerk sign-in component", async ({ page }) => {
    await page.goto("/sign-in");

    // Clerk mounts its component as a custom element or with a data-clerk-component attribute
    const clerkComponent = page.locator("[data-clerk-component]");
    await expect(clerkComponent).toBeVisible({ timeout: 10_000 });
  });

  test("sign-in page has link to sign-up", async ({ page }) => {
    await page.goto("/sign-in");

    // Clerk's SignIn component renders a link to the sign-up page
    const signUpLink = page.getByRole("link", { name: /sign.?up/i }).or(
      page.getByText(/sign.?up/i),
    );
    await expect(signUpLink.first()).toBeVisible({ timeout: 10_000 });
  });

  test("/sign-up renders Clerk sign-up component", async ({ page }) => {
    await page.goto("/sign-up");

    // Clerk mounts its component as a custom element or with a data-clerk-component attribute
    const clerkComponent = page.locator("[data-clerk-component]");
    await expect(clerkComponent).toBeVisible({ timeout: 10_000 });
  });

  test("sign-up page has link to sign-in", async ({ page }) => {
    await page.goto("/sign-up");

    // Clerk's SignUp component renders a link back to the sign-in page
    const signInLink = page.getByRole("link", { name: /sign.?in/i }).or(
      page.getByText(/sign.?in/i),
    );
    await expect(signInLink.first()).toBeVisible({ timeout: 10_000 });
  });
});
