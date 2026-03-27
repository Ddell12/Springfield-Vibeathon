import { clerk } from "@clerk/testing/playwright";
import { test as base, expect, type Page } from "@playwright/test";

type AuthFixtures = {
  authedPage: Page;
};

/**
 * Custom test fixture that extends Playwright's base test with an `authedPage`
 * fixture. Tests needing authentication destructure `{ authedPage }` instead
 * of `{ page }` — the Clerk sign-in ceremony is handled automatically.
 *
 * Tests that do NOT need auth continue using `{ page }` and pay zero auth cost.
 */
export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    const email = process.env.E2E_CLERK_USER_EMAIL;
    const password = process.env.E2E_CLERK_USER_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD must be set for authenticated tests"
      );
    }

    // Navigate to an unprotected page so Clerk JS can initialize
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for Clerk to mount (UserButton or Sign In link appears)
    await page.waitForSelector(
      "[data-clerk-component], a[href='/sign-in']",
      { timeout: 10_000 }
    );

    // Authenticate via Clerk testing helper
    await clerk.signIn({
      page,
      signInParams: {
        strategy: "password",
        identifier: email,
        password,
      },
    });

    // Wait for session to be fully established
    await page.waitForLoadState("networkidle");

    await use(page);
  },
});

export { expect };
