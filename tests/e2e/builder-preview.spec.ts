import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

import { expectPreviewReady } from "./helpers";

// Requires env vars: E2E_CLERK_USER_EMAIL + E2E_CLERK_USER_PASSWORD
// Test user must have a unique password NOT in any breach database (Clerk HIBP check).

const email = process.env.E2E_CLERK_USER_EMAIL;
const password = process.env.E2E_CLERK_USER_PASSWORD;

test.describe("Builder preview (authenticated)", () => {
  test.skip(!email || !password, "E2E_CLERK_USER_EMAIL/PASSWORD not set");

  test.beforeEach(async ({ page }) => {
    // Navigate to an unprotected page and wait for Clerk JS to load
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Wait for Clerk to initialize (the UserButton or Sign In link appears)
    await page.waitForSelector("[data-clerk-component], a[href='/sign-in']", { timeout: 10_000 });

    await clerk.signIn({
      page,
      signInParams: { strategy: "password", identifier: email!, password: password! },
    });

    // Wait for session to be established
    await page.waitForLoadState("networkidle");
  });

  test("builder page loads with chat and preview panels", async ({ page }) => {
    await page.goto("/builder?new=1");
    await page.waitForLoadState("networkidle");

    // Either the prompt screen or the builder split-panel should be visible
    const promptInput = page.getByPlaceholder(/describe the therapy tool/i);
    const chatInput = page.getByPlaceholder(/request changes/i);
    const heading = page.getByText(/what would you like to build/i);

    // At least one of these should be visible (depends on whether a session auto-resumed)
    await expect(promptInput.or(chatInput).or(heading)).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "test-results/builder-loaded.png" });
  });

  test("generate a simple app and verify preview renders", async ({ page }) => {
    test.setTimeout(120_000); // generation can take up to 2 minutes

    await page.goto("/builder?new=1");
    await page.waitForLoadState("networkidle");

    // Type a prompt
    const chatInput = page.getByPlaceholder(/describe the therapy tool/i);
    await chatInput.fill("Create a simple visual timer that counts down from 30 seconds with a big number display");
    await chatInput.press("Enter");

    // Wait for generation to start
    await expect(page.getByText(/thinking|understanding/i).first()).toBeVisible({ timeout: 15_000 });

    // Wait for "App is live and ready!" success state
    await expect(page.getByText(/app is live and ready/i)).toBeVisible({ timeout: 90_000 });

    await expectPreviewReady(page);
  });
});
