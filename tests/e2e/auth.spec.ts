import { expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test("unauthenticated user is redirected from protected route to /sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-in page renders email and password fields", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("sign-in with wrong password shows error", async ({ page }) => {
    await page.goto("/sign-in");
    await page.fill('input[type="email"]', "notauser@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    // Should stay on sign-in and show an error
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.locator(".bg-error-container")).toBeVisible({ timeout: 5_000 });
  });

  test("sign-in page has Google and Apple OAuth buttons", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Continue with Google")).toBeVisible();
    await expect(page.getByText("Sign in with Apple")).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByText("Send reset code")).toBeVisible();
  });
});
