// tests/e2e/caregiver.spec.ts
import { expect, test } from "./fixtures";

/**
 * Caregiver E2E test suite.
 * Uses the caregiverPage fixture — already signed in as e2e+clerk_test+caregiver@bridges.ai.
 *
 * The test account has exactly one linked patient, so /family auto-redirects
 * to /family/{patientId}. We extract patientId from the URL after sign-in.
 */

test.describe("caregiver sign-in redirect", () => {
  test("lands on /family after sign-in (not /builder or /dashboard)", async ({
    caregiverPage: page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Single-child auto-redirect: /family → /family/{patientId}
    await page.waitForURL(/\/family\//, { timeout: 8_000 });
    expect(page.url()).toMatch(/\/family\//);
    expect(page.url()).not.toContain("/builder");
    expect(page.url()).not.toContain("/dashboard");
  });
});

test.describe("caregiver nav", () => {
  test("sidebar shows Home, Sessions, Speech Coach, Tools — not Patients or Billing", async ({
    caregiverPage: page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForURL(/\/family\//, { timeout: 8_000 });

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sessions" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Speech Coach" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Tools" })).toBeVisible();

    await expect(nav.getByRole("link", { name: "Patients" })).not.toBeVisible();
    await expect(nav.getByRole("link", { name: "Billing" })).not.toBeVisible();
  });
});

test.describe("family dashboard", () => {
  test("auto-redirects from /family to /family/{patientId} for single child", async ({
    caregiverPage: page,
  }) => {
    await page.goto("/family");
    await page.waitForURL(/\/family\/.+/, { timeout: 8_000 });
    expect(page.url()).toMatch(/\/family\/[a-z0-9]+$/);
  });

  test("shows child name, speech coach section, and message therapist link", async ({
    caregiverPage: page,
  }) => {
    await page.goto("/family");
    await page.waitForURL(/\/family\/.+/, { timeout: 8_000 });
    await page.waitForLoadState("networkidle");

    // Heading includes child name (ends with "'s Practice")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Practice");

    // Speech Coach section header
    await expect(page.getByRole("heading", { name: "Speech Coach" })).toBeVisible();

    // Message therapist link
    await expect(page.getByRole("link", { name: /message therapist/i })).toBeVisible();
  });
});

test.describe("family sub-routes", () => {
  async function getPatientId(page: import("@playwright/test").Page): Promise<string> {
    await page.goto("/family");
    await page.waitForURL(/\/family\/.+/, { timeout: 8_000 });
    const match = page.url().match(/\/family\/([^/]+)/);
    if (!match) throw new Error("Could not extract patientId from URL");
    return match[1];
  }

  test("/family/{patientId}/messages — empty state and compose box", async ({
    caregiverPage: page,
  }) => {
    const patientId = await getPatientId(page);
    await page.goto(`/family/${patientId}/messages`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    // Compose box
    await expect(page.getByPlaceholder(/type a message/i)).toBeVisible();
  });

  test("/family/{patientId}/speech-coach without ?program shows 'No program selected'", async ({
    caregiverPage: page,
  }) => {
    const patientId = await getPatientId(page);
    await page.goto(`/family/${patientId}/speech-coach`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/no program selected/i)).toBeVisible();
  });

  test("/family/{patientId}/speech-coach?program=… shows config form", async ({
    caregiverPage: page,
  }) => {
    const patientId = await getPatientId(page);
    // Navigate via the link on the family dashboard which carries the real programId
    await page.goto(`/family/${patientId}`);
    await page.waitForLoadState("networkidle");
    const speechCoachLink = page.getByRole("link", { name: /speech coach/i }).first();
    await speechCoachLink.click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Speech Coach" })).toBeVisible();
    await expect(page.getByRole("button", { name: /start session/i })).toBeVisible();
  });

  test("/family/{patientId}/play renders (empty state or grid)", async ({
    caregiverPage: page,
  }) => {
    const patientId = await getPatientId(page);
    await page.goto(`/family/${patientId}/play`);
    await page.waitForLoadState("networkidle");

    // Either apps are shown or an empty-state message is shown — page doesn't 404
    const url = page.url();
    expect(url).toContain(`/family/${patientId}/play`);
    // Page renders — no Next.js 404 heading
    await expect(page.getByRole("heading", { name: /page not found/i })).not.toBeVisible();
  });
});

test.describe("sessions", () => {
  test("/sessions shows caregiver subtitle and no Availability button", async ({
    caregiverPage: page,
  }) => {
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/upcoming sessions for your family/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /availability/i })).not.toBeVisible();
  });
});

test.describe("tools — caregiver access allowed", () => {
  test("/builder loads without redirect", async ({ caregiverPage: page }) => {
    await page.goto("/builder");
    await page.waitForLoadState("networkidle");

    // Should stay on /builder (not redirect to /family)
    expect(page.url()).toContain("/builder");
    await expect(page.getByRole("heading", { name: /page not found/i })).not.toBeVisible();
  });

  test("/flashcards loads without redirect", async ({ caregiverPage: page }) => {
    await page.goto("/flashcards");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/flashcards");
    await expect(page.getByRole("heading", { name: /page not found/i })).not.toBeVisible();
  });
});

test.describe("SLP-only route guards", () => {
  test("/patients redirects to /family", async ({ caregiverPage: page }) => {
    await page.goto("/patients");
    await page.waitForURL(/\/family/, { timeout: 6_000 });
    expect(page.url()).toContain("/family");
  });

  test("/billing redirects to /family", async ({ caregiverPage: page }) => {
    await page.goto("/billing");
    await page.waitForURL(/\/family/, { timeout: 6_000 });
    expect(page.url()).toContain("/family");
  });

  test("/dashboard redirects to /family (server-side)", async ({
    caregiverPage: page,
  }) => {
    await page.goto("/dashboard");
    // Server-side redirect is instant — no 500ms client-side wait
    await page.waitForURL(/\/family/, { timeout: 4_000 });
    expect(page.url()).toContain("/family");
  });
});

test.describe("settings", () => {
  test("/settings page loads", async ({ caregiverPage: page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /profile/i })).toBeVisible();
  });

  test("/settings has exactly one main element", async ({ caregiverPage: page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    const mains = await page.locator("main").count();
    expect(mains).toBe(1);
  });
});
