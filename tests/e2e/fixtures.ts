import { expect, type Page, test as base, type TestInfo } from "@playwright/test";

type AuthFixtures = {
  authedPage: Page;
  slpPage: Page;
  caregiverPage: Page;
};

function requireEnvOrSkip(name: string, testInfo: TestInfo): string {
  const value = process.env[name];
  testInfo.skip(!value, `${name} must be set for authenticated tests`);
  return value!;
}

/**
 * Sign in via email+password form.
 * If sign-in fails (account doesn't exist), creates the account via sign-up.
 */
async function signInAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect away from /sign-in
  await page.waitForURL(/\/(dashboard|family|builder)/, { timeout: 15_000 });
}

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use, testInfo) => {
    const email = requireEnvOrSkip("E2E_SLP_EMAIL", testInfo);
    const password = requireEnvOrSkip("E2E_SLP_PASSWORD", testInfo);
    await signInAs(page, email, password);
    await use(page);
  },

  slpPage: async ({ page }, use, testInfo) => {
    const email = requireEnvOrSkip("E2E_SLP_EMAIL", testInfo);
    const password = requireEnvOrSkip("E2E_SLP_PASSWORD", testInfo);
    await signInAs(page, email, password);
    await use(page);
  },

  caregiverPage: async ({ page }, use, testInfo) => {
    const email = requireEnvOrSkip("E2E_CAREGIVER_EMAIL", testInfo);
    const password = requireEnvOrSkip("E2E_CAREGIVER_PASSWORD", testInfo);
    await signInAs(page, email, password);
    await use(page);
  },
});

export { expect };
