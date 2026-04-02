import { expect, test } from "./fixtures";
import { expectPreviewReady } from "./helpers";

test.describe("Builder preview (authenticated)", () => {
  test("builder page loads with chat and preview panels", async ({ authedPage }) => {
    await authedPage.goto("/builder?new=1");
    await authedPage.waitForLoadState("networkidle");

    // Either the prompt screen or the builder split-panel should be visible
    const promptInput = authedPage.getByPlaceholder(/describe the therapy tool/i);
    const chatInput = authedPage.getByPlaceholder(/request changes/i);
    const heading = authedPage.getByText(/what would you like to build/i);

    // At least one of these should be visible (depends on whether a session auto-resumed)
    await expect(promptInput.or(chatInput).or(heading)).toBeVisible({ timeout: 10_000 });
    await authedPage.screenshot({ path: "test-results/builder-loaded.png" });
  });

  test("generate a simple app and verify preview renders", async ({ authedPage }) => {
    test.setTimeout(120_000); // generation can take up to 2 minutes

    await authedPage.goto("/builder?new=1");
    await authedPage.waitForLoadState("networkidle");

    // Type a prompt
    const chatInput = authedPage.getByPlaceholder(/describe the therapy tool/i);
    await chatInput.fill("Create a simple visual timer that counts down from 30 seconds with a big number display");
    await chatInput.press("Enter");

    // Wait for generation to start
    await expect(
      authedPage.getByText(/thinking|understanding/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Wait for "App is live and ready!" success state
    await expect(authedPage.getByText(/app is live and ready/i)).toBeVisible({
      timeout: 90_000,
    });

    await expectPreviewReady(authedPage);
  });
});
