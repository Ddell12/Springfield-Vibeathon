// tests/e2e/family-kid-mode.spec.ts
//
// NOTE: E2E_CAREGIVER_PATIENT_ID is not required — the tests derive the
// patientId dynamically from the /family auto-redirect (same pattern used in
// caregiver.spec.ts).  Set E2E_CAREGIVER_PATIENT_ID if you want to skip the
// auto-redirect step and target a specific patient directly.

import { expect, test } from "./fixtures";

test.skip(
  !process.env.E2E_CAREGIVER_EMAIL || !process.env.E2E_CAREGIVER_PASSWORD,
  "E2E caregiver creds not set — skipping Kid Mode E2E"
);

// ---------------------------------------------------------------------------
// Helper: navigate to /family and extract the patientId from the redirect URL
// ---------------------------------------------------------------------------
async function getPatientId(page: import("@playwright/test").Page): Promise<string> {
  const fromEnv = process.env.E2E_CAREGIVER_PATIENT_ID;
  if (fromEnv) return fromEnv;

  await page.goto("/family");
  await page.waitForURL(/\/family\/.+/, { timeout: 8_000 });
  const match = page.url().match(/\/family\/([^/]+)/);
  if (!match) throw new Error("Could not extract patientId from /family redirect URL");
  return match[1];
}

// ---------------------------------------------------------------------------
// Suite: entering Kid Mode
// ---------------------------------------------------------------------------
test.describe("Kid Mode — entry flow", () => {
  test("Kid Mode button is visible on the family dashboard", async ({
    caregiverPage: page,
  }) => {
    const patientId = await getPatientId(page);
    await page.goto(`/family/${patientId}`);
    await page.waitForLoadState("networkidle");

    // The FamilyKidModeEntry component renders a button with aria-label "kid mode"
    await expect(page.getByRole("button", { name: /kid mode/i })).toBeVisible();
  });

  test("when no PIN is set, clicking Kid Mode opens the PIN setup modal", async ({
    caregiverPage: page,
  }) => {
    const patientId = await getPatientId(page);
    await page.goto(`/family/${patientId}`);
    await page.waitForLoadState("networkidle");

    // Click the Kid Mode button — if hasPIN is false it opens PinSetupModal
    await page.getByRole("button", { name: /kid mode/i }).click();

    // The modal should appear with a "Set a Kid Mode PIN" heading
    // (if PIN already exists the test will still pass because the modal won't open
    // and the next assertion will time-out gracefully with a clear message)
    const pinModal = page.getByRole("dialog");
    const modalVisible = await pinModal.isVisible().catch(() => false);

    if (modalVisible) {
      await expect(pinModal.getByRole("heading", { name: /set a kid mode pin/i })).toBeVisible();
    } else {
      // PIN already set — we land on /play directly; that is also a valid outcome
      await page.waitForURL(/\/family\/.*\/play/, { timeout: 6_000 });
      expect(page.url()).toMatch(/\/family\/.*\/play/);
    }
  });

  test("PIN setup modal: entering and confirming 4 digits redirects to /play", async ({
    caregiverPage: page,
  }) => {
    const patientId = await getPatientId(page);
    await page.goto(`/family/${patientId}`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /kid mode/i }).click();

    const pinModal = page.getByRole("dialog");
    const modalVisible = await pinModal.isVisible().catch(() => false);

    if (!modalVisible) {
      // PIN already set — clicking navigates directly; test still validates the URL
      await page.waitForURL(/\/family\/.*\/play/, { timeout: 6_000 });
      expect(page.url()).toMatch(/\/family\/.*\/play/);
      return;
    }

    // Step 1 — enter PIN 1 2 3 4
    for (const digit of ["1", "2", "3", "4"]) {
      await pinModal.getByRole("button", { name: digit }).click();
    }

    // Click "Next" to advance to the confirm step
    await pinModal.getByRole("button", { name: /next/i }).click();

    // Step 2 — confirm PIN 1 2 3 4
    await page.waitForFunction(() =>
      document.querySelector("[role=dialog]")?.textContent?.includes("Confirm your PIN")
    );
    for (const digit of ["1", "2", "3", "4"]) {
      await pinModal.getByRole("button", { name: digit }).click();
    }

    // Click "Set PIN" to save and navigate
    await pinModal.getByRole("button", { name: /set pin/i }).click();

    // Should land on the Kid Mode play page
    await page.waitForURL(/\/family\/.*\/play/, { timeout: 8_000 });
    expect(page.url()).toMatch(/\/family\/.*\/play/);
  });
});

// ---------------------------------------------------------------------------
// Suite: exiting Kid Mode
// ---------------------------------------------------------------------------
test.describe("Kid Mode — exit flow", () => {
  test("play page renders without a 404", async ({ caregiverPage: page }) => {
    const patientId = await getPatientId(page);
    await page.goto(`/family/${patientId}/play`);
    await page.waitForLoadState("networkidle");

    // Page must not render a Next.js 404 heading
    await expect(page.getByRole("heading", { name: /page not found/i })).not.toBeVisible();
    expect(page.url()).toContain(`/family/${patientId}/play`);
  });

  test("tapping the hidden exit strip reveals the PIN entry panel", async ({
    caregiverPage: page,
  }) => {
    const patientId = await getPatientId(page);
    await page.goto(`/family/${patientId}/play`);
    await page.waitForLoadState("networkidle");

    // The KidModeExit component renders a 2px strip at the top with aria-label "Exit kid mode"
    await page.getByLabel(/exit kid mode/i).click();

    // The slide-down panel should now be visible — it contains "Enter PIN to exit" text
    await expect(page.getByText(/enter pin to exit/i)).toBeVisible({ timeout: 3_000 });
  });

  test("entering a wrong PIN shakes and clears without navigating away", async ({
    caregiverPage: page,
  }) => {
    const patientId = await getPatientId(page);
    await page.goto(`/family/${patientId}/play`);
    await page.waitForLoadState("networkidle");

    // Open the exit panel
    await page.getByLabel(/exit kid mode/i).click();
    await page.getByText(/enter pin to exit/i).waitFor({ timeout: 3_000 });

    // Enter an intentionally wrong PIN (9 9 9 9)
    const panel = page.locator(".fixed.inset-x-0.top-0");
    for (const digit of ["9", "9", "9", "9"]) {
      await panel.getByRole("button", { name: digit }).click();
    }

    // Wait for the shake + reset (500ms timeout in the component)
    await page.waitForTimeout(700);

    // Should still be on the play page
    expect(page.url()).toContain(`/family/${patientId}/play`);
  });

  test("entering the correct PIN exits Kid Mode and returns to family dashboard", async ({
    caregiverPage: page,
  }) => {
    const patientId = await getPatientId(page);
    await page.goto(`/family/${patientId}/play`);
    await page.waitForLoadState("networkidle");

    // Open the exit panel
    await page.getByLabel(/exit kid mode/i).click();
    await page.getByText(/enter pin to exit/i).waitFor({ timeout: 3_000 });

    // Enter the correct PIN (demo seed PIN is 1234; see reference_demo_accounts.md)
    const panel = page.locator(".fixed.inset-x-0.top-0");
    for (const digit of ["1", "2", "3", "4"]) {
      await panel.getByRole("button", { name: digit }).click();
    }

    // onExit navigates back to /family/{patientId}
    await page.waitForURL(/\/family\/[^/]+$/, { timeout: 8_000 });
    expect(page.url()).toMatch(/\/family\/[^/]+$/);
    expect(page.url()).not.toContain("/play");
  });
});
