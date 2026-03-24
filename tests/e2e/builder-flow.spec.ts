import { test, expect } from "@playwright/test";

// Phase 4 E2E tests — require a running Convex backend + Next.js dev server
// These tests verify the core sharing + persistence flows end-to-end.
// Most are marked test.fixme because they depend on a running backend.

test.describe("Builder flow", () => {
  test("navigate to /builder — chat area and preview panel visible", async ({
    page,
  }) => {
    await page.goto("/builder");

    // The builder layout should show both the chat panel and the preview panel
    await expect(page.locator("body")).toBeVisible();
    // Chat input area
    const chatInput = page.getByRole("textbox").or(
      page.locator("[placeholder*='describe']").or(
        page.locator("[data-testid='chat-input']"),
      ),
    );
    await expect(chatInput.first()).toBeVisible();
  });

  test("navigate to /my-tools — page renders (empty state OK)", async ({
    page,
  }) => {
    await page.goto("/my-tools");

    await expect(page.locator("body")).toBeVisible();
    // Either tool cards or empty state CTA should be visible
    const content = page
      .getByText(/my tools/i)
      .or(page.getByText(/no tools yet/i))
      .or(page.getByText(/create your first/i));
    await expect(content.first()).toBeVisible();
  });

  test.fixme(
    "navigate to /tool/nonexistent — not-found state visible",
    async ({ page }) => {
      // Requires Convex backend to return null for unknown slug
      await page.goto("/tool/nonexistent-slug-that-does-not-exist");

      await expect(page.locator("body")).toBeVisible();
      // Not-found state should appear
      const notFound = page
        .getByText(/not found|doesn't exist|couldn't find/i)
        .or(page.getByRole("link", { name: /build|builder/i }));
      await expect(notFound.first()).toBeVisible();
    },
  );

  test.fixme(
    "share dialog structure: builder page has Share button in header",
    async ({ page }) => {
      // Requires a saved tool with a shareSlug to test share button
      await page.goto("/builder");

      // Trigger the share dialog via the header share button
      // (only visible when a tool has been saved and has a shareSlug)
      const shareButton = page.getByRole("button", { name: /share/i });
      await expect(shareButton).toBeVisible();

      await shareButton.click();

      // Share dialog should open with a URL input and copy button
      const shareUrlInput = page.getByRole("textbox");
      await expect(shareUrlInput).toBeVisible();

      const copyButton = page.getByRole("button", { name: /copy link/i });
      await expect(copyButton).toBeVisible();
    },
  );
});

test.describe("My Tools page", () => {
  test.fixme(
    "saved tools appear on My Tools page after creation",
    async ({ page }) => {
      // Requires full auth + Convex session
      await page.goto("/builder");

      // Type a prompt and wait for the tool to be generated and saved
      const chatInput = page.getByRole("textbox").first();
      await chatInput.fill(
        "Create a simple morning routine schedule with 3 steps",
      );
      await chatInput.press("Enter");

      // Wait for tool to appear in preview
      await page.waitForSelector("[data-testid='tool-preview']", {
        timeout: 30_000,
      });

      // Navigate to My Tools and verify the tool appears
      await page.goto("/my-tools");
      await expect(
        page.getByText(/morning routine/i),
      ).toBeVisible({ timeout: 10_000 });
    },
  );

  test.fixme(
    "delete tool removes it from My Tools list",
    async ({ page }) => {
      // Requires a pre-existing tool in the database
      await page.goto("/my-tools");

      const deleteButtons = page.getByRole("button", { name: /delete/i });
      const count = await deleteButtons.count();
      if (count === 0) {
        test.skip();
        return;
      }

      page.on("dialog", (dialog) => dialog.accept());
      await deleteButtons.first().click();

      // The tool card count should decrease by one
      await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(
        count - 1,
      );
    },
  );
});

test.describe("Shared tool page", () => {
  test.fixme(
    "public share URL renders the tool without auth",
    async ({ page }) => {
      // Requires a known shared tool slug from the test database
      const TEST_SLUG = process.env.TEST_SHARE_SLUG ?? "test-tool-slug";
      await page.goto(`/tool/${TEST_SLUG}`);

      await expect(page.locator("body")).toBeVisible();
      // Tool renderer should appear
      await expect(
        page.locator("[data-testid='tool-renderer']").or(
          page.locator(".safe-space-container"),
        ),
      ).toBeVisible({ timeout: 10_000 });
    },
  );
});
