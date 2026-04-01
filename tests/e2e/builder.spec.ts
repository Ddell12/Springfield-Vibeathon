import { expect,test } from "./fixtures";
import { TIMEOUTS } from "./helpers";

const TEST_PROMPT =
  "Create a simple visual timer that counts down from 30 seconds with a big number display";

test.describe("Builder — authenticated", () => {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !process.env.E2E_CLERK_USER_PASSWORD,
    "E2E Clerk creds not set"
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

  test.fixme(
    "continue card appears if recent session",
    async ({ authedPage }) => {
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

    const preview = authedPage.locator("iframe[title='App preview']");
    const previewFrame = authedPage.frameLocator("iframe[title='App preview']");
    const readyText = authedPage.getByText(/app is live and ready/i);
    const failureCopy = authedPage.getByText(/Something didn't look right/i);

    await expect(readyText).toBeVisible({ timeout: 90_000 });

    await authedPage.screenshot({ path: "test-results/builder-complete.png" });

    await expect(preview).toBeVisible({ timeout: 60_000 });
    await expect(previewFrame.locator("body")).toBeVisible({ timeout: 30_000 });
    await expect.poll(async () =>
      previewFrame.locator("body").evaluate((body) => body.ownerDocument.readyState)
    ).toBe("complete");
    await expect(failureCopy).toHaveCount(0);
  });

  test.fixme(
    "view toggle has Preview and Code tabs",
    async ({ authedPage }) => {
      // Needs active session with generated content
      await authedPage.goto("/builder?new=1");
      await expect(authedPage.getByRole("tab", { name: /preview/i })).toBeVisible();
      await expect(authedPage.getByRole("tab", { name: /code/i })).toBeVisible();
    }
  );

  test.fixme(
    "device selector has Mobile and Desktop",
    async ({ authedPage }) => {
      // Needs active session with generated content
      await authedPage.goto("/builder?new=1");
      await expect(authedPage.getByRole("button", { name: /mobile/i })).toBeVisible();
      await expect(authedPage.getByRole("button", { name: /desktop/i })).toBeVisible();
    }
  );

  test.fixme("Share button in toolbar", async ({ authedPage }) => {
    // Needs active session with generated content
    await authedPage.goto("/builder?new=1");
    await expect(authedPage.getByRole("button", { name: /share/i })).toBeVisible();
  });
});
