# Caregiver UX Fixes & E2E Coverage — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Fix caregiver routing, nav, two confirmed bugs, and add complete Playwright E2E coverage for the caregiver role.

---

## Context

A live browser audit of the local dev server (signed in as `e2e+clerk_test+caregiver@bridges.ai`) confirmed that most caregiver routes are implemented and working. The QA report's 404s were against a stale production deployment. The remaining gaps are:

1. Caregivers briefly see the SLP builder after sign-in (~500ms flash) before client-side redirect fires
2. Sidebar `useEffect` incorrectly redirects caregivers away from `/builder` and `/flashcards`, which they should be allowed to use
3. Caregiver nav has no entry point for builder tools
4. Settings page has two `<main>` elements (ARIA violation)
5. Mobile top bar uses SLP nav context for all users
6. Zero Playwright E2E tests exist for any caregiver flow

---

## 1. Role-Aware Server-Side Routing

### Problem

`NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/builder` sends all users to `/builder` after sign-in. The sidebar's `useEffect` then client-side redirects caregivers to `/family`. This causes a visible flash of the SLP builder for ~500ms.

### Fix

Add a role check to `src/proxy.ts`. Clerk's `auth()` in middleware decodes the JWT and provides `sessionClaims.publicMetadata.role` with no extra DB call.

```ts
// src/proxy.ts — add before auth.protect()
const { sessionClaims } = await auth();
const role = (sessionClaims?.publicMetadata as { role?: string })?.role;

if (role === "caregiver" && req.nextUrl.pathname === "/dashboard") {
  return NextResponse.redirect(new URL("/family", req.url));
}
```

This catches any caregiver who lands on `/dashboard` directly and redirects server-side before the page renders. The `/builder` fallback URL is fine to keep — caregivers are allowed on the builder and will not be redirected away.

### Sidebar `useEffect` update

The current allowed-routes list in `DashboardSidebar` must be expanded so caregivers are not bounced from tool routes:

**Current (too restrictive):**
```ts
if (isCaregiver && !pathname.startsWith("/family") &&
    !pathname.startsWith("/settings") &&
    !pathname.startsWith("/speech-coach") &&
    !pathname.startsWith("/sessions")) {
  router.replace("/family");
}
```

**Updated:**
```ts
const CAREGIVER_ALLOWED_PREFIXES = [
  "/family", "/settings", "/speech-coach", "/sessions",
  "/builder", "/flashcards", "/my-tools", "/templates",
];

if (isCaregiver && !CAREGIVER_ALLOWED_PREFIXES.some(p => pathname.startsWith(p))) {
  router.replace("/family");
}
```

**Files changed:**
- `src/proxy.ts`
- `src/features/dashboard/components/dashboard-sidebar.tsx`

---

## 2. Caregiver Nav — "Tools" Entry

### Change

Add a fifth nav item to `CAREGIVER_NAV_ITEMS` linking to the builder, using the same icon the SLP nav uses.

```ts
export const CAREGIVER_NAV_ITEMS = [
  { icon: "home",              label: "Home",         href: ROUTES.FAMILY },
  { icon: "video_call",        label: "Sessions",     href: ROUTES.SESSIONS },
  { icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "auto_awesome",      label: "Tools",        href: ROUTES.BUILDER },
  { icon: "settings",          label: "Settings",     href: ROUTES.SETTINGS },
] as const;
```

`isNavActive` must mark "Tools" as active when pathname starts with `/builder`, `/flashcards`, `/my-tools`, or `/templates`:

```ts
if (href === ROUTES.BUILDER) {
  return pathname.startsWith("/builder") ||
         pathname.startsWith("/flashcards") ||
         pathname.startsWith("/my-tools") ||
         pathname.startsWith("/templates");
}
```

**Files changed:**
- `src/shared/lib/navigation.ts`

---

## 3. Bug Fixes

### 3a. Settings double `<main>` (ARIA violation)

The `(app)` layout renders a `<main id="main-content">`. The settings feature component renders its own `<main>` inside it, creating two landmark regions — an ARIA violation and a known accessibility issue.

**Fix:** Replace the outer wrapper element in the settings page component with `<div>`.

**File:** `src/features/settings/components/settings-page.tsx` (or whichever component owns the outer `<main>`)

**Verification:** `document.querySelectorAll('main').length === 1` after fix.

### 3b. Mobile top bar — SLP nav context shown to caregivers

The mobile top bar currently renders without role awareness. Caregivers on mobile see SLP navigation context.

**Fix:** Pass `isCaregiver` into `MobileTopBar` (or read role directly inside it with `useUser`) and use `CAREGIVER_NAV_ITEMS` when the user is a caregiver.

**File:** `src/features/dashboard/components/mobile-top-bar.tsx`

---

## 4. Playwright E2E Tests

### New file: `tests/e2e/caregiver.spec.ts`

Uses the existing `caregiverPage` fixture from `tests/e2e/fixtures.ts` (authenticated as the caregiver test account).

#### Test suite structure

```
caregiver sign-in redirect
  - lands on /family/{patientId} after sign-in (not /builder or /dashboard)

caregiver nav
  - sidebar shows: Home, Sessions, Speech Coach, Tools, Settings
  - sidebar does NOT show: Patients, Billing

family dashboard
  - /family auto-redirects to /family/{patientId} when one child exists
  - child name visible, speech coach program visible, message link visible

family sub-routes
  - /family/{patientId}/messages: empty state + compose box render
  - /family/{patientId}/speech-coach: shows "No program selected" message without ?program= param
  - /family/{patientId}/speech-coach?program=…: config form renders
  - /family/{patientId}/play: empty state or app grid renders

sessions
  - /sessions: shows "Upcoming sessions for your family" subtitle
  - /sessions: no "Availability" button (SLP-only)
  - /sessions/book/{slpId}: booking page loads

tools (caregiver access allowed)
  - /builder: builder UI loads, no redirect
  - /flashcards: flashcard creator loads, no redirect

slp-only route guards
  - /patients: redirects to /family
  - /billing: redirects to /family
  - /dashboard: redirects to /family (server-side)

settings
  - /settings: page loads
  - /settings: exactly one <main> element in DOM
```

**~200 lines. No new test infrastructure required** — uses the existing `caregiverPage` fixture and Playwright helpers already in `tests/e2e/helpers.ts`.

---

## File Change Summary

| File | Action |
|------|--------|
| `src/proxy.ts` | Add role-aware `/dashboard` → `/family` redirect |
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Expand caregiver allowed routes list |
| `src/shared/lib/navigation.ts` | Add Tools to `CAREGIVER_NAV_ITEMS`, update `isNavActive` |
| `src/features/settings/components/settings-page.tsx` | Replace outer `<main>` with `<div>` |
| `src/features/dashboard/components/mobile-top-bar.tsx` | Role-aware nav items |
| `tests/e2e/caregiver.spec.ts` | New — full caregiver E2E suite |

---

## Out of Scope

- Group A app shell overhaul (collapsible sidebar, `/library` route) — separate plan
- Invite flow (`/invite/[token]`) — separate plan
- Caregiver-specific settings (notification preferences, child profiles) — future
- Play gallery with real app assignments — requires SLP to assign apps first (data dependency, not a code gap)
