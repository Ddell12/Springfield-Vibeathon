import { expect, test } from "@playwright/test";

function getHandshakeRedirect(urlString: string): string | null {
  const url = new URL(urlString);
  if (!url.hostname.endsWith(".clerk.accounts.dev")) {
    return null;
  }

  return url.searchParams.get("redirect_url");
}

async function expectAuthRoute(
  page: import("@playwright/test").Page,
  expectedPath: string | RegExp,
) {
  const redirectUrl = getHandshakeRedirect(page.url());
  if (redirectUrl) {
    if (typeof expectedPath === "string") {
      expect(redirectUrl).toContain(expectedPath);
    } else {
      expect(redirectUrl).toMatch(expectedPath);
    }
    return;
  }

  await expect(page).toHaveURL(expectedPath);
}

test.describe("Auth pages", () => {
  test("/sign-in renders the current auth entrypoint", async ({ page }) => {
    await page.goto("/sign-in");

    const redirectUrl = getHandshakeRedirect(page.url());
    if (redirectUrl) {
      expect(redirectUrl).toContain("/sign-in");
      return;
    }

    await expect(page.getByRole("heading", { name: /describe it\./i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email address/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with email/i })).toBeVisible();
  });

  test("sign-in page includes the current auth/legal affordances", async ({ page }) => {
    await page.goto("/sign-in");

    const redirectUrl = getHandshakeRedirect(page.url());
    if (redirectUrl) {
      expect(redirectUrl).toContain("/sign-in");
      expect(page.url()).toContain("dev-browser-missing");
      return;
    }

    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByText(/privacy policy/i)).toBeVisible();
  });

  test("/sign-up resolves into the current auth flow", async ({ page }) => {
    await page.goto("/sign-up");

    const redirectUrl = getHandshakeRedirect(page.url());
    if (redirectUrl) {
      expect(redirectUrl).toContain("/sign-up");
      return;
    }

    await expectAuthRoute(page, /\/sign-in\?role=slp/);
    await expect(page.getByRole("textbox", { name: /email address/i })).toBeVisible();
  });

  test("caregiver sign-in preserves the caregiver entry route", async ({ page }) => {
    await page.goto("/sign-in?role=caregiver");

    const redirectUrl = getHandshakeRedirect(page.url());
    if (redirectUrl) {
      expect(redirectUrl).toContain("/sign-in?role=caregiver");
      return;
    }

    await expect(page.getByText(/caregiver access is usually created from an invite/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with email/i })).toBeVisible();
  });
});
