import { expect, type Page,test as base, type TestInfo } from "@playwright/test";

type AuthFixtures = {
  authedPage: Page;
  slpPage: Page;
  caregiverPage: Page;
};

/**
 * Sign in a Clerk test user via the testing helper.
 * Navigates to "/" first so Clerk JS can initialize.
 */
async function signInAs(page: Page, email: string, role: "slp" | "caregiver") {
  await page.goto(`/sign-in?role=${role}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("textbox", { name: /email address/i })).toBeVisible();
  await page.getByRole("textbox", { name: /email address/i }).fill(email);
  await page.getByRole("button", { name: /continue with email/i }).click();

  const codeInput = page.getByLabel(/verification code/i);
  const revealCodeButton = page.getByRole("button", { name: /enter verification code/i });

  await page.waitForTimeout(1000);
  if (await revealCodeButton.isVisible().catch(() => false)) {
    await revealCodeButton.click();
  } else {
    await expect(codeInput.or(revealCodeButton)).toBeVisible({ timeout: 20_000 });
    if (await revealCodeButton.isVisible().catch(() => false)) {
      await revealCodeButton.click();
    }
  }

  await page.getByLabel(/verification code/i).fill("424242");
  await page.getByRole("button", { name: /verify and continue/i }).click();
  await expect(page).not.toHaveURL(/\/sign-in/);
  await page.waitForLoadState("networkidle");
}

function requireEnvOrSkip(name: string, testInfo: TestInfo): string {
  const value = process.env[name];
  testInfo.skip(!value, `${name} must be set for authenticated tests`);
  return value!;
}

/**
 * Extended Playwright test with role-based auth fixtures:
 *
 * - `authedPage`   — legacy default user (backward-compatible)
 * - `slpPage`      — SLP role (publicMetadata.role = "slp")
 * - `caregiverPage` — Caregiver role (publicMetadata.role = "caregiver")
 */
export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use, testInfo) => {
    const email = requireEnvOrSkip("E2E_CLERK_USER_EMAIL", testInfo);
    await signInAs(page, email, "slp");
    await use(page);
  },

  slpPage: async ({ page }, use, testInfo) => {
    const email = requireEnvOrSkip("E2E_SLP_EMAIL", testInfo);
    await signInAs(page, email, "slp");
    await use(page);
  },

  caregiverPage: async ({ page }, use, testInfo) => {
    const email = requireEnvOrSkip("E2E_CAREGIVER_EMAIL", testInfo);
    await signInAs(page, email, "caregiver");
    await use(page);
  },
});

export { expect };
