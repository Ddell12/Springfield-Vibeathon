/**
 * Visual screenshot journeys for E2E testing report.
 * Captures key authenticated pages for both SLP and Caregiver roles.
 */
import fs from "fs";
import path from "path";

import { expect,test } from "./fixtures";

const SCREENSHOTS_DIR = path.join(process.cwd(), "e2e-screenshots");

function screenshotPath(...parts: string[]) {
  const dir = path.join(SCREENSHOTS_DIR, ...parts.slice(0, -1));
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, parts[parts.length - 1]);
}

// ── SLP Journeys ──────────────────────────────────────────────────────────────

test.describe("SLP authenticated pages", () => {
  test("builder landing page", async ({ slpPage: page }) => {
    await page.goto("/builder");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: screenshotPath("slp-builder", "01-builder-landing.png"), fullPage: false });
    await expect(page).toHaveURL(/\/builder/);
  });

  test("patients caseload list", async ({ slpPage: page }) => {
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: screenshotPath("patients", "01-caseload-list.png"), fullPage: false });
  });

  test("new patient form", async ({ slpPage: page }) => {
    await page.goto("/patients/new");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: screenshotPath("patients", "02-new-patient-form.png"), fullPage: false });
  });

  test("settings page as SLP", async ({ slpPage: page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: screenshotPath("settings", "01-settings-slp.png"), fullPage: false });
  });

  test("speech coach page", async ({ slpPage: page }) => {
    await page.goto("/speech-coach");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: screenshotPath("speech-coach", "01-speech-coach-slp.png"), fullPage: false });
  });

  test("library/templates page", async ({ slpPage: page }) => {
    await page.goto("/library");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: screenshotPath("slp-builder", "02-library.png"), fullPage: false });
  });

  test("billing page", async ({ slpPage: page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: screenshotPath("settings", "02-billing.png"), fullPage: false });
  });

  test("sessions / appointments page", async ({ slpPage: page }) => {
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: screenshotPath("patients", "03-sessions-list.png"), fullPage: false });
  });

  test("SLP cannot reach /family", async ({ slpPage: page }) => {
    await page.goto("/family");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: screenshotPath("slp-builder", "03-family-redirect.png"), fullPage: false });
    // SLP should be redirected away from /family
    await expect(page).not.toHaveURL("/family");
  });
});

// ── Caregiver Journeys ────────────────────────────────────────────────────────

test.describe("Caregiver authenticated pages", () => {
  test("family dashboard", async ({ caregiverPage: page }) => {
    await page.goto("/family");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: screenshotPath("caregiver", "01-family-dashboard.png"), fullPage: false });
  });

  test("settings page as caregiver", async ({ caregiverPage: page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: screenshotPath("settings", "03-settings-caregiver.png"), fullPage: false });
  });

  test("caregiver cannot reach /patients", async ({ caregiverPage: page }) => {
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: screenshotPath("caregiver", "02-patients-redirect.png"), fullPage: false });
    await expect(page).not.toHaveURL("/patients");
  });

  test("caregiver cannot reach /billing", async ({ caregiverPage: page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: screenshotPath("caregiver", "03-billing-redirect.png"), fullPage: false });
    await expect(page).not.toHaveURL("/billing");
  });
});
