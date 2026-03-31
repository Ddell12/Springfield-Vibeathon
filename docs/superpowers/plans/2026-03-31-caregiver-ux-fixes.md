# Caregiver UX Fixes & E2E Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix caregiver routing, nav, and two confirmed bugs, then add a full Playwright E2E suite covering all caregiver user journeys.

**Architecture:** Four surgical changes to existing files (proxy.ts, navigation.ts, dashboard-sidebar.tsx, settings-page.tsx) plus one new E2E test file. No new components needed. TDD throughout — failing tests first, then implementation.

**Tech Stack:** Next.js 16 App Router, Clerk v7 (`clerkMiddleware`, `auth()`), Playwright, Vitest + React Testing Library

---

## Current State (verified by live browser audit)

- `CAREGIVER_NAV_ITEMS` has 2 items: Sessions, Speech Coach — missing Home and Tools
- Caregiver `useEffect` in sidebar blocks `/builder`, `/flashcards` — should allow them
- All users land on `/builder` after sign-in; sidebar `useEffect` redirects caregivers client-side (500ms flash)
- `settings-page.tsx:106` renders `<main>` inside the layout's `<main>` — ARIA violation confirmed (2 `<main>` elements in DOM)
- `mobile-top-bar.tsx` does not exist (deleted in Group A) — no fix needed
- Zero Playwright tests for caregiver role

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/shared/lib/navigation.ts` | Modify | Add Home + Tools to `CAREGIVER_NAV_ITEMS`; update `isNavActive` for Tools |
| `src/shared/lib/__tests__/navigation.test.ts` | Modify | Update caregiver nav length assertion (2 → 4); add Tools active tests |
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Modify | Expand caregiver allowed-routes list |
| `src/proxy.ts` | Modify | Add role-aware `/dashboard` → `/family` server-side redirect |
| `src/features/settings/components/settings-page.tsx` | Modify | Replace `<main>` at line 106 with `<div>` |
| `tests/e2e/caregiver.spec.ts` | Create | Full caregiver E2E suite |

---

## Task 1: Update CAREGIVER_NAV_ITEMS and isNavActive (TDD)

**Files:**
- Modify: `src/shared/lib/__tests__/navigation.test.ts`
- Modify: `src/shared/lib/navigation.ts`

- [ ] **Step 1: Write failing tests**

Replace the `caregiver nav has exactly 2 items` test and add new assertions. Full updated test file:

```ts
// src/shared/lib/__tests__/navigation.test.ts
import { describe, it, expect } from "vitest";
import { NAV_ITEMS, CAREGIVER_NAV_ITEMS, isNavActive } from "../navigation";

describe("NAV_ITEMS", () => {
  it("contains Builder as first item", () => {
    expect(NAV_ITEMS[0].label).toBe("Builder");
    expect(NAV_ITEMS[0].href).toBe("/builder");
  });
  it("contains Library", () => {
    expect(NAV_ITEMS.some((i) => i.label === "Library")).toBe(true);
  });
  it("does not contain Home, Flashcards, Templates, My Apps, Settings", () => {
    const labels = NAV_ITEMS.map((i) => i.label);
    expect(labels).not.toContain("Home");
    expect(labels).not.toContain("Flashcards");
    expect(labels).not.toContain("Templates");
    expect(labels).not.toContain("My Apps");
    expect(labels).not.toContain("Settings");
  });
  it("has exactly 6 SLP items", () => {
    expect(NAV_ITEMS).toHaveLength(6);
  });
});

describe("CAREGIVER_NAV_ITEMS", () => {
  it("has exactly 4 items", () => {
    expect(CAREGIVER_NAV_ITEMS).toHaveLength(4);
  });
  it("first item is Home linking to /family", () => {
    expect(CAREGIVER_NAV_ITEMS[0].label).toBe("Home");
    expect(CAREGIVER_NAV_ITEMS[0].href).toBe("/family");
  });
  it("contains Sessions, Speech Coach, Tools", () => {
    const labels = CAREGIVER_NAV_ITEMS.map((i) => i.label);
    expect(labels).toContain("Sessions");
    expect(labels).toContain("Speech Coach");
    expect(labels).toContain("Tools");
  });
  it("Tools links to /builder", () => {
    const tools = CAREGIVER_NAV_ITEMS.find((i) => i.label === "Tools");
    expect(tools?.href).toBe("/builder");
  });
  it("does not contain Patients or Billing", () => {
    const labels = CAREGIVER_NAV_ITEMS.map((i) => i.label);
    expect(labels).not.toContain("Patients");
    expect(labels).not.toContain("Billing");
  });
});

describe("isNavActive", () => {
  it("matches /library exactly", () => {
    expect(isNavActive("/library", "/library", null)).toBe(true);
    expect(isNavActive("/library", "/library?tab=my-apps", null)).toBe(false);
  });
  it("matches /builder prefix", () => {
    expect(isNavActive("/builder", "/builder/abc123", null)).toBe(true);
  });
  it("matches /builder when on /flashcards (Tools active state)", () => {
    expect(isNavActive("/builder", "/flashcards", null)).toBe(true);
    expect(isNavActive("/builder", "/my-tools", null)).toBe(true);
    expect(isNavActive("/builder", "/templates", null)).toBe(true);
  });
  it("matches /patients prefix", () => {
    expect(isNavActive("/patients", "/patients", null)).toBe(true);
    expect(isNavActive("/patients", "/patients/abc", null)).toBe(true);
    expect(isNavActive("/patients", "/sessions", null)).toBe(false);
  });
  it("matches /sessions prefix", () => {
    expect(isNavActive("/sessions", "/sessions", null)).toBe(true);
    expect(isNavActive("/sessions", "/sessions/abc/call", null)).toBe(true);
  });
  it("matches /billing prefix", () => {
    expect(isNavActive("/billing", "/billing", null)).toBe(true);
    expect(isNavActive("/billing", "/billing/upgrade", null)).toBe(true);
  });
  it("matches /speech-coach prefix", () => {
    expect(isNavActive("/speech-coach", "/speech-coach", null)).toBe(true);
    expect(isNavActive("/speech-coach", "/speech-coach/session", null)).toBe(true);
  });
  it("matches /family prefix", () => {
    expect(isNavActive("/family", "/family", null)).toBe(true);
    expect(isNavActive("/family", "/family/child/123", null)).toBe(true);
  });
  it("fallback: matches href exactly", () => {
    expect(isNavActive("/settings", "/settings", null)).toBe(true);
    expect(isNavActive("/settings", "/settings/profile", null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npm test -- src/shared/lib/__tests__/navigation.test.ts
```

Expected: FAIL — `has exactly 4 items` fails (currently 2), `first item is Home` fails, Tools tests fail, `/builder active on /flashcards` fails.

- [ ] **Step 3: Update navigation.ts**

```ts
// src/shared/lib/navigation.ts
import { ROUTES } from "@/core/routes";

export const NAV_ITEMS = [
  { icon: "auto_awesome",         label: "Builder",      href: ROUTES.BUILDER },
  { icon: "group",                label: "Patients",     href: ROUTES.PATIENTS },
  { icon: "video_call",           label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "receipt_long",         label: "Billing",      href: ROUTES.BILLING },
  { icon: "record_voice_over",    label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "collections_bookmark", label: "Library",      href: ROUTES.LIBRARY },
] as const;

// Caregiver nav: Messages is accessed from dashboard, not sidebar,
// because the href requires a patientId which varies by active child.
// Settings is in the user Popover for all roles — not a nav item.
export const CAREGIVER_NAV_ITEMS = [
  { icon: "home",              label: "Home",         href: ROUTES.FAMILY },
  { icon: "video_call",        label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "auto_awesome",      label: "Tools",        href: ROUTES.BUILDER },
] as const;

export function isNavActive(
  href: string,
  pathname: string,
  _tab: string | null
): boolean {
  if (href === "/builder")      return pathname.startsWith("/builder") ||
                                       pathname.startsWith("/flashcards") ||
                                       pathname.startsWith("/my-tools") ||
                                       pathname.startsWith("/templates");
  if (href === "/patients")     return pathname.startsWith("/patients");
  if (href === "/sessions")     return pathname.startsWith("/sessions");
  if (href === "/billing")      return pathname.startsWith("/billing");
  if (href === "/speech-coach") return pathname.startsWith("/speech-coach");
  if (href === "/family")       return pathname.startsWith("/family");
  if (href === "/library")      return pathname === "/library";
  return pathname === href;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npm test -- src/shared/lib/__tests__/navigation.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/navigation.ts src/shared/lib/__tests__/navigation.test.ts
git commit -m "feat(nav): add Home and Tools to caregiver nav, expand Tools active state"
```

---

## Task 2: Expand caregiver allowed-routes in sidebar

**Files:**
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
- Test: `src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx`

- [ ] **Step 1: Read the existing caregiver sidebar test**

```bash
cat src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx
```

Note which route-redirect behaviors are already tested so you don't break them.

- [ ] **Step 2: Write a failing test for the allowed routes**

Add these tests to `dashboard-sidebar-caregiver.test.tsx` (append — do not replace existing tests):

```tsx
it("does not redirect caregiver on /builder", async () => {
  mockPathname("/builder");
  mockCaregiver();
  render(<DashboardSidebar />);
  await waitFor(() => {
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

it("does not redirect caregiver on /flashcards", async () => {
  mockPathname("/flashcards");
  mockCaregiver();
  render(<DashboardSidebar />);
  await waitFor(() => {
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

it("does not redirect caregiver on /my-tools", async () => {
  mockPathname("/my-tools");
  mockCaregiver();
  render(<DashboardSidebar />);
  await waitFor(() => {
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the new tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npm test -- src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx
```

Expected: FAIL — `mockReplace` is called for `/builder`, `/flashcards`, `/my-tools`.

- [ ] **Step 4: Update the useEffect in dashboard-sidebar.tsx**

Find lines 43–53 in `src/features/dashboard/components/dashboard-sidebar.tsx`:

```ts
// Redirect caregivers away from SLP-only routes
useEffect(() => {
  if (
    isCaregiver &&
    !pathname.startsWith("/family") &&
    !pathname.startsWith("/settings") &&
    !pathname.startsWith("/speech-coach") &&
    !pathname.startsWith("/sessions")
  ) {
    router.replace("/family");
  }
}, [isCaregiver, pathname, router]);
```

Replace with:

```ts
// Redirect caregivers away from SLP-only routes.
// Caregivers are allowed on builder/flashcards/my-tools/templates (tool routes).
const CAREGIVER_ALLOWED_PREFIXES = [
  "/family",
  "/settings",
  "/speech-coach",
  "/sessions",
  "/builder",
  "/flashcards",
  "/my-tools",
  "/templates",
];

useEffect(() => {
  if (isCaregiver && !CAREGIVER_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
    router.replace("/family");
  }
}, [isCaregiver, pathname, router]);
```

Note: `CAREGIVER_ALLOWED_PREFIXES` is defined inside the component body, above the `useEffect`. This keeps it co-located with the logic that uses it.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npm test -- src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx
```

Expected: all PASS including the new tests.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/components/dashboard-sidebar.tsx src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx
git commit -m "fix(sidebar): allow caregivers on builder/flashcards/my-tools/templates"
```

---

## Task 3: Server-side caregiver redirect in proxy.ts

**Files:**
- Modify: `src/proxy.ts`

No unit tests are practical for Next.js middleware — this is covered by the E2E test in Task 5.

- [ ] **Step 1: Update proxy.ts**

```ts
// src/proxy.ts
import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/my-tools(.*)",
  "/settings(.*)",
  "/patients(.*)",
  "/family(.*)",
  "/sessions(.*)",
  "/billing(.*)",
  "/speech-coach(.*)",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/tool/(.*)",
  "/family/(.*)/play/manifest.json",
]);

export default clerkMiddleware(async (auth, req) => {
  // Public API routes bypass Clerk entirely (shared tool HTML serving)
  if (isPublicApiRoute(req)) return;

  // Server-side redirect: caregivers landing on /dashboard go straight to /family.
  // Avoids the client-side flash where the SLP builder briefly renders.
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
  if (role === "caregiver" && req.nextUrl.pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/family", req.url));
  }

  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|api/tool/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/tool/))(.*)",
    "/(trpc)(.*)",
  ],
};
```

- [ ] **Step 2: Verify the dev server still starts**

```bash
cd /Users/desha/Springfield-Vibeathon && npx next build 2>&1 | tail -5
```

Expected: build completes without errors (or check for TypeScript errors only, not runtime errors).

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "fix(auth): server-side redirect caregivers from /dashboard to /family"
```

---

## Task 4: Fix settings double-main (ARIA violation)

**Files:**
- Modify: `src/features/settings/components/settings-page.tsx`
- Test: `src/features/settings/components/__tests__/settings-page.test.tsx`

- [ ] **Step 1: Write a failing test**

Add this test to `src/features/settings/components/__tests__/settings-page.test.tsx` (append — do not replace existing tests):

```tsx
it("renders exactly one main element", () => {
  render(<SettingsPage />);
  const mains = document.querySelectorAll("main");
  expect(mains).toHaveLength(1);
});
```

(If no imports exist yet, add `import { SettingsPage } from "../settings-page";` and the needed React Testing Library imports, following the pattern of existing tests in the file.)

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/desha/Springfield-Vibeathon && npm test -- src/features/settings/components/__tests__/settings-page.test.tsx --reporter=verbose 2>&1 | grep -E "PASS|FAIL|main"
```

Expected: FAIL — `Expected: 1, Received: 2` (the layout mock may not add a `<main>`, but the component renders one internally).

- [ ] **Step 3: Fix settings-page.tsx**

In `src/features/settings/components/settings-page.tsx`, line 106, change:

```tsx
      <main className="flex-1 overflow-y-auto bg-surface-container-lowest min-h-screen">
```

to:

```tsx
      <div className="flex-1 overflow-y-auto bg-surface-container-lowest min-h-screen">
```

And close tag at line 114 from `</main>` to `</div>`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npm test -- src/features/settings/components/__tests__/settings-page.test.tsx
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/components/settings-page.tsx src/features/settings/components/__tests__/settings-page.test.tsx
git commit -m "fix(a11y): replace nested main with div in settings page"
```

---

## Task 5: Playwright E2E caregiver test suite

**Files:**
- Create: `tests/e2e/caregiver.spec.ts`

Uses the `caregiverPage` fixture from `tests/e2e/fixtures.ts`. The fixture signs in with `E2E_CAREGIVER_EMAIL` / `E2E_CAREGIVER_PASSWORD` using Clerk's `clerk.signIn` helper.

- [ ] **Step 1: Create the test file**

```ts
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
    // caregiverPage fixture already signed in and navigated to "/"
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
```

- [ ] **Step 2: Run the E2E tests (expect most to pass, some to fail — fixes applied in Tasks 1–4)**

```bash
cd /Users/desha/Springfield-Vibeathon && npx playwright test tests/e2e/caregiver.spec.ts --reporter=list 2>&1 | tail -30
```

Expected after Tasks 1–4 are applied:
- `sign-in redirect` — PASS (sidebar redirect to /family still works)
- `caregiver nav — Home/Tools visible` — PASS (Task 1 added them)
- `family dashboard` — PASS
- `sub-routes` — PASS
- `sessions` — PASS
- `/builder and /flashcards load without redirect` — PASS (Task 2 fixed allowed routes)
- `/patients, /billing, /dashboard redirect` — PASS (Task 3 fixed /dashboard server-side; /patients /billing handled by sidebar)
- `settings — one main` — PASS (Task 4 fixed)

If any tests fail, read the error output and fix before committing.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/caregiver.spec.ts
git commit -m "test(e2e): add full caregiver user journey test suite"
```

---

## Final Verification

- [ ] **Run all unit tests**

```bash
cd /Users/desha/Springfield-Vibeathon && npm test 2>&1 | tail -10
```

Expected: all existing tests still pass + new tests pass.

- [ ] **Run full E2E suite**

```bash
cd /Users/desha/Springfield-Vibeathon && npx playwright test tests/e2e/caregiver.spec.ts --reporter=list
```

Expected: all 15 tests PASS.

- [ ] **Smoke check: sign in as caregiver in browser**

```bash
agent-browser open http://localhost:3000/sign-in
# Sign in as e2e+clerk_test+caregiver@bridges.ai
# Verify: lands on /family/{patientId}, no /builder flash
# Verify: sidebar shows Home, Sessions, Speech Coach, Tools
# Verify: /builder navigates to builder with Tools highlighted
# Verify: /settings has no visible layout issues
```
