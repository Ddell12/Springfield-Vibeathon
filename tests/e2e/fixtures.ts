import { clerk } from "@clerk/testing/playwright";
import { test as base, expect, type Page } from "@playwright/test";

type AuthFixtures = {
  authedPage: Page;
  slpPage: Page;
  caregiverPage: Page;
};

/**
 * Sign in a Clerk test user via the testing helper.
 * Navigates to "/" first so Clerk JS can initialize.
 */
async function signInAs(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Wait for Clerk to mount (UserButton or Sign In link appears)
  await page.waitForSelector(
    "[data-clerk-component], a[href='/sign-in']",
    { timeout: 10_000 }
  );

  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: email,
      password,
    },
  });

  await page.waitForLoadState("networkidle");
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set for authenticated tests`);
  }
  return value;
}

/**
 * Extended Playwright test with role-based auth fixtures:
 *
 * - `authedPage`   — legacy default user (backward-compatible)
 * - `slpPage`      — SLP role (publicMetadata.role = "slp")
 * - `caregiverPage` — Caregiver role (publicMetadata.role = "caregiver")
 */
export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    const email = requireEnv("E2E_CLERK_USER_EMAIL");
    const password = requireEnv("E2E_CLERK_USER_PASSWORD");
    await signInAs(page, email, password);
    await use(page);
  },

  slpPage: async ({ page }, use) => {
    const email = requireEnv("E2E_SLP_EMAIL");
    const password = requireEnv("E2E_SLP_PASSWORD");
    await signInAs(page, email, password);
    await use(page);
  },

  caregiverPage: async ({ page }, use) => {
    const email = requireEnv("E2E_CAREGIVER_EMAIL");
    const password = requireEnv("E2E_CAREGIVER_PASSWORD");
    await signInAs(page, email, password);
    await use(page);
  },
});

export { expect };
