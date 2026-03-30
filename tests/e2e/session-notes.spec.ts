import { test, expect } from "./fixtures";
import { TIMEOUTS } from "./helpers";

/** Timeout for AI SOAP generation (streaming via SSE) */
const SOAP_GENERATION_TIMEOUT = 30_000;

test.describe("Session Notes — create, generate, sign flow", () => {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL || !process.env.E2E_CLERK_USER_PASSWORD,
    "E2E Clerk creds not set"
  );

  test("full lifecycle: create session, generate SOAP, sign note", async ({
    authedPage,
  }) => {
    const page = authedPage;

    // ── Step 1: Navigate to /patients ────────────────────────────────────────
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");

    // Wait for patient list to load (Convex hydration)
    const patientRow = page
      .locator("button[aria-expanded]")
      .first()
      .or(page.getByText(/no patients/i));
    await expect(patientRow).toBeVisible({ timeout: TIMEOUTS.CONVEX_QUERY });

    // If no patients exist, skip the rest of this test
    const noPatients = await page.getByText(/no patients/i).isVisible().catch(() => false);
    if (noPatients) {
      test.skip(true, "No patients in the database — cannot run session notes E2E");
      return;
    }

    // ── Step 2: Click first patient to expand, then view full profile ────────
    const firstPatientRow = page.locator("button[aria-expanded]").first();
    await firstPatientRow.click();

    // Click "View Full Profile" link in expanded row
    const viewProfileLink = page.getByRole("link", { name: /view full profile/i });
    await expect(viewProfileLink).toBeVisible();
    await viewProfileLink.click();

    // Wait for patient detail page to load
    await expect(page.getByText(/back to caseload/i)).toBeVisible({
      timeout: TIMEOUTS.CONVEX_QUERY,
    });

    // Store the patient detail URL for later navigation back
    const patientDetailUrl = page.url();

    // ── Step 3: Click "New Session" in the session notes widget ──────────────
    const newSessionButton = page
      .getByRole("link", { name: /new session/i })
      .or(page.getByRole("link", { name: /document first session/i }));
    await expect(newSessionButton.first()).toBeVisible({
      timeout: TIMEOUTS.CONVEX_QUERY,
    });
    await newSessionButton.first().click();

    // Wait for session note editor to load
    await expect(
      page.getByRole("heading", { name: /new session note/i })
    ).toBeVisible({ timeout: TIMEOUTS.CONVEX_QUERY });

    // ── Step 4: Fill in target data ──────────────────────────────────────────
    // The form starts with one empty target entry
    const targetInput = page.getByPlaceholder("Target name").first();
    await expect(targetInput).toBeVisible();
    await targetInput.fill("/r/ in initial position");

    // Fill trials count
    const trialsInput = page.getByPlaceholder("Trials").first();
    await trialsInput.fill("20");

    // Fill correct count
    const correctInput = page.getByPlaceholder("Correct").first();
    await correctInput.fill("15");

    // ── Step 5: Wait for auto-save to create the note ────────────────────────
    // Auto-save triggers after 1s of inactivity; wait for URL to update with note ID
    await page.waitForTimeout(2000);

    // ── Step 6: Generate SOAP Note ───────────────────────────────────────────
    const generateButton = page.getByRole("button", {
      name: /generate soap note/i,
    });
    await expect(generateButton).toBeEnabled({ timeout: 5_000 });
    await generateButton.click();

    // ── Step 7: Wait for SOAP to appear (streaming, up to 30s) ───────────────
    // During generation, the button text changes to "Generating..."
    await expect(
      page.getByText(/generating/i)
    ).toBeVisible({ timeout: 5_000 });

    // Wait for SOAP note sections to appear (generation complete)
    await expect(page.getByText("SOAP Note")).toBeVisible({
      timeout: SOAP_GENERATION_TIMEOUT,
    });

    // ── Step 8: Verify "AI Generated" badge ──────────────────────────────────
    await expect(page.getByText("AI Generated")).toBeVisible({
      timeout: 5_000,
    });

    // Verify all four SOAP sections are rendered
    await expect(page.getByText("Subjective")).toBeVisible();
    await expect(page.getByText("Objective")).toBeVisible();
    await expect(page.getByText("Assessment")).toBeVisible();
    await expect(page.getByText("Plan")).toBeVisible();

    // ── Step 9: Mark Complete ────────────────────────────────────────────────
    const markCompleteButton = page.getByRole("button", {
      name: /mark complete/i,
    });
    await expect(markCompleteButton).toBeVisible();
    await markCompleteButton.click();

    // Verify status updates to "Complete"
    await expect(page.getByText("Complete")).toBeVisible({ timeout: 5_000 });

    // ── Step 10: Sign Note ───────────────────────────────────────────────────
    const signButton = page.getByRole("button", { name: /sign note/i });
    await expect(signButton).toBeEnabled({ timeout: 5_000 });
    await signButton.click();

    // ── Step 11: Verify "Signed" status ──────────────────────────────────────
    await expect(page.getByText("Signed")).toBeVisible({ timeout: 5_000 });

    // ── Step 12: Navigate back to patient detail ─────────────────────────────
    const backLink = page.getByRole("link", { name: /back to patient/i });
    await expect(backLink).toBeVisible();
    await backLink.click();

    // Wait for patient detail page to load
    await expect(page.getByText(/back to caseload/i)).toBeVisible({
      timeout: TIMEOUTS.CONVEX_QUERY,
    });

    // ── Step 13: Verify session visible in the session notes widget ──────────
    // The SessionNoteCard should show the target name and "signed" status
    await expect(
      page.getByText("/r/ in initial position")
    ).toBeVisible({ timeout: TIMEOUTS.CONVEX_QUERY });

    // Verify the signed status chip is visible on the card
    await expect(page.getByText("signed")).toBeVisible();
  });

  test("session notes widget shows 'New Session' button", async ({
    authedPage,
  }) => {
    const page = authedPage;

    await page.goto("/patients");
    await page.waitForLoadState("networkidle");

    // Skip if no patients
    const patientRow = page.locator("button[aria-expanded]").first();
    const hasPatients = await patientRow
      .isVisible({ timeout: TIMEOUTS.CONVEX_QUERY })
      .catch(() => false);
    if (!hasPatients) {
      test.skip(true, "No patients in the database");
      return;
    }

    // Expand first patient and navigate to profile
    await patientRow.click();
    await page.getByRole("link", { name: /view full profile/i }).click();
    await expect(page.getByText(/back to caseload/i)).toBeVisible({
      timeout: TIMEOUTS.CONVEX_QUERY,
    });

    // Session Notes widget header and New Session button should be visible
    await expect(page.getByText("Session Notes")).toBeVisible();
    const newSessionLink = page.getByRole("link", { name: /new session/i });
    await expect(newSessionLink.first()).toBeVisible();
  });

  test("new session editor renders form fields", async ({ authedPage }) => {
    const page = authedPage;

    await page.goto("/patients");
    await page.waitForLoadState("networkidle");

    // Skip if no patients
    const patientRow = page.locator("button[aria-expanded]").first();
    const hasPatients = await patientRow
      .isVisible({ timeout: TIMEOUTS.CONVEX_QUERY })
      .catch(() => false);
    if (!hasPatients) {
      test.skip(true, "No patients in the database");
      return;
    }

    // Expand first patient and click "New Session" directly
    await patientRow.click();
    const newSessionLink = page.getByRole("link", { name: /new session/i });
    await expect(newSessionLink.first()).toBeVisible();
    await newSessionLink.first().click();

    // Verify the editor renders the expected form elements
    await expect(
      page.getByRole("heading", { name: /new session note/i })
    ).toBeVisible({ timeout: TIMEOUTS.CONVEX_QUERY });

    // Session details section
    await expect(page.getByText("Session Details")).toBeVisible();
    await expect(page.getByLabel("Date")).toBeVisible();
    await expect(page.getByText("Duration (minutes)")).toBeVisible();
    await expect(page.getByText("Session Type")).toBeVisible();

    // Session type radio options
    await expect(page.getByText("In-Person")).toBeVisible();
    await expect(page.getByText("Teletherapy")).toBeVisible();
    await expect(page.getByText("Parent Consultation")).toBeVisible();

    // Targets section
    await expect(page.getByText("Targets Worked On")).toBeVisible();
    await expect(page.getByPlaceholder("Target name")).toBeVisible();

    // Generate SOAP button (disabled until target is filled)
    const generateButton = page.getByRole("button", {
      name: /generate soap note/i,
    });
    await expect(generateButton).toBeVisible();

    // Additional notes section
    await expect(page.getByText("Additional Notes")).toBeVisible();
    await expect(page.getByLabel("Behavior Notes")).toBeVisible();
    await expect(page.getByLabel("Parent Feedback")).toBeVisible();
    await expect(page.getByLabel("Homework Assigned")).toBeVisible();
    await expect(page.getByLabel("Next Session Focus")).toBeVisible();
  });
});
