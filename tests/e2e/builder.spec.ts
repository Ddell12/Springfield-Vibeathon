import { expect,test } from "./fixtures";
import { expectPreviewReady, TIMEOUTS } from "./helpers";

const TEST_PROMPT =
  "Create a simple visual timer that counts down from 30 seconds with a big number display";

test.describe("Builder — authenticated", () => {
  test.skip(
    !process.env.E2E_BUILDER_ENABLED,
    "Set E2E_BUILDER_ENABLED=1 to run builder E2E tests"
  );

  test("prompt screen shows heading and input", async ({ authedPage }) => {
    await authedPage.goto("/builder?new=1");
    await expect(
      authedPage.getByRole("heading", { name: /what would you like to build/i })
    ).toBeVisible();
    await expect(
      authedPage.getByPlaceholder(/describe the therapy tool/i)
    ).toBeVisible();
  });

  test("suggestion chips render", async ({ authedPage }) => {
    await authedPage.goto("/builder?new=1");
    await expect(
      authedPage.getByText(/token board with star rewards/i)
    ).toBeVisible();
  });

  test(
    "continue card appears if recent session",
    async ({ authedPage }) => {
      test.skip(!process.env.E2E_BUILDER_DATA, "Set E2E_BUILDER_DATA=1 to run tests that need seeded backend data");
      // Needs backend data (existing session)
      await authedPage.goto("/builder");
      await expect(authedPage.getByText(/continue/i)).toBeVisible();
    }
  );

  test("prompt input accepts text", async ({ authedPage }) => {
    await authedPage.goto("/builder?new=1");
    const input = authedPage.getByPlaceholder(/describe the therapy tool/i);
    await input.fill("Test prompt text");
    await expect(input).toHaveValue("Test prompt text");
  });

  test("generation: type prompt, submit, status appears", async ({
    authedPage,
  }) => {
    test.setTimeout(TIMEOUTS.SSE_GENERATION);
    await authedPage.goto("/builder?new=1");
    await authedPage.screenshot({ path: "test-results/builder-start.png" });

    const input = authedPage.getByPlaceholder(/describe the therapy tool/i);
    await input.fill(TEST_PROMPT);
    await input.press("Enter");

    await expect(
      authedPage.getByText(/thinking|understanding/i)
    ).toBeVisible({ timeout: 15_000 });
  });

  test("generation: completes with preview iframe", async ({ authedPage }) => {
    test.setTimeout(TIMEOUTS.SSE_GENERATION);
    await authedPage.goto("/builder?new=1");

    const input = authedPage.getByPlaceholder(/describe the therapy tool/i);
    await input.fill(TEST_PROMPT);
    await input.press("Enter");

    const readyText = authedPage.getByText(/app is live and ready/i);

    await expect(readyText).toBeVisible({ timeout: 90_000 });

    await authedPage.screenshot({ path: "test-results/builder-complete.png" });

    await expectPreviewReady(authedPage);
  });

  test(
    "view toggle has Preview and Code tabs",
    async ({ authedPage }) => {
      test.skip(!process.env.E2E_BUILDER_DATA, "Set E2E_BUILDER_DATA=1 to run tests that need an active generated session");
      // Needs active session with generated content
      await authedPage.goto("/builder?new=1");
      await expect(authedPage.getByRole("tab", { name: /preview/i })).toBeVisible();
      await expect(authedPage.getByRole("tab", { name: /code/i })).toBeVisible();
    }
  );

  test(
    "device selector has Mobile and Desktop",
    async ({ authedPage }) => {
      test.skip(!process.env.E2E_BUILDER_DATA, "Set E2E_BUILDER_DATA=1 to run tests that need an active generated session");
      // Needs active session with generated content
      await authedPage.goto("/builder?new=1");
      await expect(authedPage.getByRole("button", { name: /mobile/i })).toBeVisible();
      await expect(authedPage.getByRole("button", { name: /desktop/i })).toBeVisible();
    }
  );

  test("Share button in toolbar", async ({ authedPage }) => {
    test.skip(!process.env.E2E_BUILDER_DATA, "Set E2E_BUILDER_DATA=1 to run tests that need an active generated session");
    // Needs active session with generated content
    await authedPage.goto("/builder?new=1");
    await expect(authedPage.getByRole("button", { name: /share/i })).toBeVisible();
  });
});
