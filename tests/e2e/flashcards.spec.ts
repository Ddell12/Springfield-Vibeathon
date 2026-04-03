import { expect,test } from "./fixtures";
import { TIMEOUTS } from "./helpers";

test.describe("Flashcards — authenticated", () => {
  test.skip(
    !process.env.E2E_FLASHCARDS_ENABLED,
    "Set E2E_FLASHCARDS_ENABLED=1 to run flashcard E2E tests"
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

  test("submitting prompt starts generation", async ({ authedPage }) => {
    test.skip(!process.env.E2E_FLASHCARDS_AI, "Set E2E_FLASHCARDS_AI=1 to run tests that require AI backend (Anthropic API key)");
    test.setTimeout(TIMEOUTS.SSE_GENERATION);
    await authedPage.goto("/flashcards");
    const input = authedPage.getByRole("textbox").first();
    await input.fill("Make flashcards for basic colors");
    await input.press("Enter");
    await expect(authedPage.getByText(/thinking|generating/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test(
    "generated deck appears in preview",
    async ({ authedPage }) => {
      test.skip(!process.env.E2E_FLASHCARDS_AI, "Set E2E_FLASHCARDS_AI=1 to run tests that require completed generation");
      // Needs completed generation
      await authedPage.goto("/flashcards");
      await expect(authedPage.locator("[data-testid='flashcard-preview']")).toBeVisible();
    }
  );

  test("deck sheet opens listing decks", async ({ authedPage }) => {
    test.skip(!process.env.E2E_FLASHCARDS_AI, "Set E2E_FLASHCARDS_AI=1 to run tests that require generated decks in the session");
    // Needs generated decks in the session
    await authedPage.goto("/flashcards");
    await authedPage.getByRole("button", { name: /deck|decks/i }).click();
    await expect(authedPage.getByRole("dialog")).toBeVisible();
  });
});
