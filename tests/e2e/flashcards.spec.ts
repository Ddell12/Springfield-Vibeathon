import { expect,test } from "./fixtures";
import { TIMEOUTS } from "./helpers";

test.describe("Flashcards — authenticated", () => {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !process.env.E2E_CLERK_USER_PASSWORD,
    "E2E Clerk creds not set"
  );

  test("prompt screen heading visible", async ({ authedPage }) => {
    await authedPage.goto("/flashcards");
    // Look for a prominent heading on the flashcard prompt screen
    const heading = authedPage
      .getByRole("heading", { name: /flashcard/i })
      .or(authedPage.getByRole("heading", { name: /what would you like/i }))
      .or(authedPage.getByRole("heading", { name: /create/i }));
    await expect(heading.first()).toBeVisible();
  });

  test("suggestion chips render", async ({ authedPage }) => {
    await authedPage.goto("/flashcards");
    await expect(authedPage.getByText(/basic colors/i)).toBeVisible();
  });

  test("prompt input accepts text", async ({ authedPage }) => {
    await authedPage.goto("/flashcards");
    const input = authedPage.getByRole("textbox").first();
    await input.fill("Farm animals flashcard deck");
    await expect(input).toHaveValue("Farm animals flashcard deck");
  });

  test.fixme("submitting prompt starts generation", async ({ authedPage }) => {
    // Needs AI backend (Anthropic API key)
    test.setTimeout(TIMEOUTS.SSE_GENERATION);
    await authedPage.goto("/flashcards");
    const input = authedPage.getByRole("textbox").first();
    await input.fill("Make flashcards for basic colors");
    await input.press("Enter");
    await expect(authedPage.getByText(/thinking|generating/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test.fixme(
    "generated deck appears in preview",
    async ({ authedPage }) => {
      // Needs completed generation
      await authedPage.goto("/flashcards");
      await expect(authedPage.locator("[data-testid='flashcard-preview']")).toBeVisible();
    }
  );

  test.fixme("deck sheet opens listing decks", async ({ authedPage }) => {
    // Needs generated decks in the session
    await authedPage.goto("/flashcards");
    await authedPage.getByRole("button", { name: /deck|decks/i }).click();
    await expect(authedPage.getByRole("dialog")).toBeVisible();
  });
});
