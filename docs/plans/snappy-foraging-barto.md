# Comprehensive E2E Test Suite — All User Journeys

## Context

Bridges currently has ~10 active E2E tests across 6 spec files, with 9 more marked `test.fixme`. The app has 11 routes and 12+ distinct user journeys that are mostly untested. This plan creates a complete Playwright E2E test suite covering every user-facing feature: landing page, auth, dashboard, builder, templates, flashcards, my-tools, shared tools, settings, navigation, and mobile responsiveness.

**Current state:** 10 active tests, 9 fixme
**Target state:** ~68 tests across 12 spec files, with reusable auth fixtures

---

## Phase 1: Test Infrastructure

### 1a. Create `tests/e2e/fixtures.ts` — Auth fixture

Custom `test` export extending Playwright's base with an `authedPage` fixture that encapsulates the full Clerk sign-in ceremony. Tests needing auth destructure `{ authedPage }` instead of `{ page }`.

```ts
// Key pattern:
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    // goto("/"), waitForLoadState, waitForSelector("[data-clerk-component], a[href='/sign-in']")
    // clerk.signIn({ page, signInParams: { strategy: "password", identifier, password } })
    // waitForLoadState("networkidle")
    await use(page);
  },
});
export { expect } from "@playwright/test";
```

### 1b. Create `tests/e2e/helpers.ts` — Shared constants

```ts
export const TIMEOUTS = {
  CLERK_INIT: 10_000,
  CONVEX_QUERY: 15_000,
  SSE_GENERATION: 120_000,
};
export const MOBILE_VIEWPORT = { width: 390, height: 844 };
```

### 1c. Update `playwright.config.ts`

- Add `mobile-chrome` project using `devices["Pixel 7"]`, scoped to `mobile.spec.ts`
- Add global `timeout: 30_000` and `expect: { timeout: 10_000 }`
- Keep existing setup/chromium/webkit projects unchanged

**File:** `playwright.config.ts` (lines 3-35)

---

## Phase 2: Unauthenticated Tests (no Clerk creds needed)

### 2a. Expand `tests/e2e/landing.spec.ts` (7 tests)

Replace existing 3 tests + smoke test with comprehensive landing page coverage.

| # | Test | Selector Strategy |
|---|------|-------------------|
| 1 | hero heading mentions therapy apps | `getByRole("heading").filter({ hasText: /therapy apps/i })` |
| 2 | "Start Building" CTA links to /builder | `getByRole("link", { name: /start building/i })` → check href |
| 3 | "View Templates" CTA links to /templates | `getByRole("link", { name: /view templates/i })` → check href |
| 4 | header shows Bridges brand | `getByRole("link", { name: /bridges/i })` |
| 5 | how-it-works section renders | Look for section content text |
| 6 | testimonials section renders | Check testimonials area visible |
| 7 | footer renders | `locator("footer")` visible |

**Source refs:** `src/features/landing/components/hero-section.tsx` (CTAs at lines 27-43)

### 2b. Create `tests/e2e/auth.spec.ts` (4 tests)

| # | Test | Notes |
|---|------|-------|
| 1 | /sign-in renders Clerk sign-in component | `waitForSelector("[data-clerk-component]")` |
| 2 | sign-in page has link to sign-up | Check for "sign up" text/link |
| 3 | /sign-up renders Clerk sign-up component | Same pattern |
| 4 | sign-up page has link to sign-in | Check for "sign in" text/link |

**Source refs:** `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`

### 2c. Replace `tests/e2e/templates.spec.ts` (5 tests)

Templates use static `THERAPY_SEED_PROMPTS` import — no Convex needed.

| # | Test | Selector Strategy |
|---|------|-------------------|
| 1 | heading "Start with a Template" visible | `getByRole("heading", { name: /start with a template/i })` |
| 2 | template cards render with builder links | `locator("a[href^='/builder?prompt=']")` count >= 1 |
| 3 | each card has "Click to build" text | `getByText(/click to build/i)` count >= 1 |
| 4 | clicking template navigates to /builder?prompt= | Click first template link, verify URL |
| 5 | CTA "Build a Custom App" links to /builder | `getByRole("link", { name: /build a custom app/i })` |

**Source refs:** `src/features/templates/components/templates-page.tsx` (lines 19-95)

### 2d. Create `tests/e2e/shared-tool.spec.ts` (4 tests)

| # | Test | Notes |
|---|------|-------|
| 1 | invalid slug shows "doesn't exist" | `goto("/tool/nonexistent-xyz")` → `getByText(/doesn't exist/i)` |
| 2 | error page has "Build Your Own" CTA | `getByRole("link", { name: /build your own/i })` → href="/builder" |
| 3 | `test.fixme`: valid slug renders iframe | Needs `TEST_SHARE_SLUG` env + seeded data |
| 4 | `test.fixme`: shared tool footer has "Create Tool" CTA | Needs valid tool loaded |

**Source refs:** `src/features/shared-tool/components/shared-tool-page.tsx` (lines 36-53 for error state, 93-104 for footer)

---

## Phase 3: Authenticated Tests (need E2E_CLERK_USER_EMAIL/PASSWORD)

All files import `{ test, expect }` from `"./fixtures"` and use `authedPage`.

### 3a. Create `tests/e2e/dashboard.spec.ts` (8 tests)

| # | Test | Selector Strategy |
|---|------|-------------------|
| 1 | "What would you like to build?" heading | `getByRole("heading", { name: /what would you like to build/i })` |
| 2 | prompt input visible | `MainPromptInput` renders an input element |
| 3 | template chips render (Token Board, etc.) | `getByText("Token Board")`, `getByText("Visual Schedule")` etc. |
| 4 | all 4 tabs render | `getByRole("tab", { name: /recently viewed/i })` for each |
| 5 | clicking "My Apps" tab updates URL | Click tab → expect URL `?tab=my-projects` |
| 6 | clicking "Templates" tab updates URL | Click tab → expect URL `?tab=templates` |
| 7 | empty state or project cards visible | `.or()` pattern: cards or "No apps yet" text |
| 8 | "Create New" link in desktop header | `getByRole("link", { name: /create new/i })` → href="/builder" |

**Source refs:** `src/features/dashboard/components/dashboard-view.tsx` (tabs at lines 123-148, chips at lines 108-118, empty state at lines 170-179)

### 3b. Create `tests/e2e/builder.spec.ts` (9 tests)

| # | Test | Notes |
|---|------|-------|
| 1 | prompt screen shows heading + input | `goto("/builder?new=1")`, check heading + `getByPlaceholder(/describe the therapy tool/i)` |
| 2 | suggestion chips render | Check for at least one THERAPY_SUGGESTIONS text |
| 3 | `test.fixme`: continue card appears if recent session | Needs backend data |
| 4 | prompt input accepts text | Fill input, verify value |
| 5 | **Generation: type prompt, submit, status appears** | `test.setTimeout(120_000)`, fill + Enter, expect /thinking|understanding/i |
| 6 | **Generation: completes with preview iframe** | Wait for "app is live and ready", verify `iframe[title='App preview']` |
| 7 | `test.fixme`: view toggle has Preview/Code tabs | Needs active session |
| 8 | `test.fixme`: device selector has Mobile/Desktop | Needs active session |
| 9 | `test.fixme`: Share button in toolbar | Needs active session |

**Source refs:** `src/features/builder/components/builder-page.tsx` (lines 36-68), `src/features/builder/lib/constants.ts`

### 3c. Create `tests/e2e/my-tools.spec.ts` (5 tests)

| # | Test | Notes |
|---|------|-------|
| 1 | page loads (heading or empty state) | `getByText(/my apps/i).or(getByText(/no apps yet/i))` |
| 2 | empty state has "Start Building" link | `getByRole("link", { name: /start building/i })` → href="/builder" |
| 3 | "Need a custom app?" CTA section | `getByText(/need a custom app/i)` |
| 4 | `test.fixme`: tool cards with title + Open link | Needs seeded sessions |
| 5 | `test.fixme`: clicking Open navigates to /builder/[id] | Needs seeded sessions |

**Source refs:** `src/features/my-tools/components/my-tools-page.tsx` (empty state lines 29-49, CTA lines 102-132)

### 3d. Create `tests/e2e/flashcards.spec.ts` (6 tests)

| # | Test | Notes |
|---|------|-------|
| 1 | prompt screen heading visible | Check for flashcard-related heading |
| 2 | suggestion chips render | Check for "basic colors" or other FLASHCARD_SUGGESTIONS text |
| 3 | prompt input accepts text | Fill input, verify |
| 4 | `test.fixme`: submitting prompt starts generation | Needs AI backend |
| 5 | `test.fixme`: generated deck appears in preview | Needs completed generation |
| 6 | `test.fixme`: deck sheet opens listing decks | Needs generated decks |

**Source refs:** `src/features/flashcards/components/flashcard-page.tsx`, `src/features/flashcards/lib/constants.ts`

### 3e. Create `tests/e2e/settings.spec.ts` (4 tests)

| # | Test | Selector Strategy |
|---|------|-------------------|
| 1 | page loads with Profile section | `getByText(/profile/i)` visible |
| 2 | Account section exists | Look for "Account" in sidebar/picker |
| 3 | Appearance section exists | Look for "Appearance" in sidebar/picker |
| 4 | back link to dashboard | `getByLabel("Back to dashboard")` → href="/" |

**Source refs:** `src/features/settings/components/settings-page.tsx` (sections at lines 16-19, back link at lines 50-56)

### 3f. Create `tests/e2e/navigation.spec.ts` (6 tests)

| # | Test | Selector Strategy |
|---|------|-------------------|
| 1 | sidebar visible on desktop | `locator("aside")` visible |
| 2 | sidebar has all 5 nav items | Check links: Home(/), Builder(/builder), Flashcards(/flashcards), Templates(/templates), My Apps(/my-tools) |
| 3 | clicking Builder link navigates | Click, expect URL /builder |
| 4 | clicking Templates link navigates | Click, expect URL /templates |
| 5 | active nav item styled differently | On /templates, verify Templates link has active class |
| 6 | UserButton or Sign In link visible | `locator("[data-clerk-component], a[href='/sign-in']")` |

**Source refs:** `src/shared/lib/navigation.ts` (NAV_ITEMS), `src/features/dashboard/components/dashboard-sidebar.tsx`

### 3g. Create `tests/e2e/mobile.spec.ts` (7 tests)

All tests use `test.use({ viewport: { width: 390, height: 844 } })`.

| # | Test | Selector Strategy |
|---|------|-------------------|
| 1 | sidebar hidden on mobile | `locator("aside")` hidden |
| 2 | mobile top bar visible with hamburger | `getByLabel("Open navigation menu")` visible |
| 3 | hamburger opens mobile nav drawer | Click hamburger → drawer content visible |
| 4 | drawer has all nav items | Home, Builder, Flashcards, Templates, My Apps links |
| 5 | drawer has "New Project" button | `getByRole("link", { name: /new project/i })` |
| 6 | closing drawer hides it | `getByLabel("Close navigation")` → click → drawer hidden |
| 7 | "Bridges" branding in drawer | `getByText("Bridges")` inside sheet content |

**Source refs:** `src/shared/components/mobile-nav-drawer.tsx` (hamburger label at line 62, close at line 53, nav at lines 76-100)
**Note:** The hamburger `aria-label="Open navigation menu"` is in `src/features/dashboard/components/dashboard-view.tsx:62`, not in MobileTopBar. MobileTopBar only has "B" logo + UserButton.

---

## Phase 4: Cleanup

### Delete superseded files:
- `tests/e2e/smoke.spec.ts` — absorbed into `landing.spec.ts`
- `tests/e2e/builder-flow.spec.ts` — split into `builder.spec.ts`, `my-tools.spec.ts`, `shared-tool.spec.ts`
- `tests/e2e/builder-preview.spec.ts` — merged into `builder.spec.ts`
- `tests/e2e/sharing.spec.ts` — merged into `shared-tool.spec.ts`

### Keep unchanged:
- `tests/e2e/global-setup.ts` — no changes needed

---

## File Summary

| File | Action | Auth | Tests |
|------|--------|------|-------|
| `tests/e2e/fixtures.ts` | CREATE | N/A | 0 (helper) |
| `tests/e2e/helpers.ts` | CREATE | N/A | 0 (helper) |
| `playwright.config.ts` | MODIFY | N/A | - |
| `tests/e2e/landing.spec.ts` | REPLACE | No | 7 |
| `tests/e2e/auth.spec.ts` | CREATE | No | 4 |
| `tests/e2e/templates.spec.ts` | REPLACE | No | 5 |
| `tests/e2e/shared-tool.spec.ts` | CREATE | No | 4 |
| `tests/e2e/dashboard.spec.ts` | CREATE | Yes | 8 |
| `tests/e2e/builder.spec.ts` | CREATE | Yes | 9 |
| `tests/e2e/my-tools.spec.ts` | CREATE | Yes | 5 |
| `tests/e2e/flashcards.spec.ts` | CREATE | Yes | 6 |
| `tests/e2e/settings.spec.ts` | CREATE | Yes | 4 |
| `tests/e2e/navigation.spec.ts` | CREATE | Yes | 6 |
| `tests/e2e/mobile.spec.ts` | CREATE | Yes | 7 |
| `tests/e2e/smoke.spec.ts` | DELETE | - | - |
| `tests/e2e/builder-flow.spec.ts` | DELETE | - | - |
| `tests/e2e/builder-preview.spec.ts` | DELETE | - | - |
| `tests/e2e/sharing.spec.ts` | DELETE | - | - |

**Total: ~65 tests** (vs current 10 active)

---

## Verification

### Run unauthenticated tests (no creds needed):
```bash
npx playwright test landing auth templates shared-tool --project=chromium
```

### Run authenticated tests:
```bash
npx playwright test --project=chromium
```

### Run mobile tests:
```bash
npx playwright test mobile --project=mobile-chrome
```

### Full suite:
```bash
npm run test:e2e
```

### Debug mode:
```bash
npx playwright test --ui
```

All screenshots on failure write to `test-results/` (gitignored). Use `npx playwright show-report` to view HTML report after runs.
