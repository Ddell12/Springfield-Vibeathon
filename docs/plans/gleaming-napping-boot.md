# UX Polish & Last-Mile Bug Fixes

## Context

The app has three user-reported bugs (home button routes to landing page, template click doesn't wire to builder properly, flashcard messages leak into builder chat) plus ~15 additional UX gaps discovered through codebase exploration. These are classic "last mile" issues — the features work in isolation but the user journey has gaps, dead ends, and inconsistencies that erode trust.

---

## Fix 1: Home Button Routes to Landing Page Instead of Dashboard

**Problem:** Every "Home" link in the app shell (`/`) navigates to the marketing landing page instead of the dashboard. Affects sidebar, builder back button, settings back link, mobile nav, logo.

**Files to modify:**
- `src/shared/lib/navigation.ts:2` — Change `href: "/"` → `href: "/dashboard"`
- `src/features/builder/components/builder-toolbar.tsx:65` — Change `href="/"` → `href="/dashboard"`
- `src/features/settings/components/settings-sidebar.tsx:27` — Change `href="/"` → `href="/dashboard"`
- `src/features/dashboard/components/dashboard-sidebar.tsx:21` — Logo link `href="/"` → `href="/dashboard"`
- `src/features/dashboard/components/mobile-top-bar.tsx` — Logo link `href` → `/dashboard`

**Also update** `isNavActive()` in `navigation.ts:14-16` to match `/dashboard` instead of `/`.

---

## Fix 2: Template "Use Template" Button Doesn't Pass Template Data

**Problem:** The `ToolCard` component's template variant (line 78-83) links to `/builder` without passing the template prompt. The actual templates page (`templates-page.tsx`) uses its own Link with `?prompt=` param and works correctly — but `ToolCard` is a shared component that may be reused.

**Files to modify:**
- `src/shared/components/tool-card.tsx:78-83` — Add `prompt` prop to `ToolCardProps`, pass it in the Link href: `/builder?prompt=${encodeURIComponent(prompt)}`

**Note:** Currently `ToolCard` is only used in tests, not in production templates rendering. The templates page itself (`templates-page.tsx`) correctly passes the prompt. This is a preventive fix for when `ToolCard` gets used for templates elsewhere.

---

## Fix 3: Flashcard Messages Leaking into Builder Chat

**Problem:** Both builder and flashcard features create sessions via the same `/api/generate` endpoint but never set the `type` field on the session. If a user navigates between features, the same session could accumulate messages from both contexts.

**Root cause:** `convex/schema.ts` defines `type: v.optional(v.union(v.literal("builder"), v.literal("flashcards")))` but `sessions.create` never receives or stores this value.

**Files to modify:**
- `convex/sessions.ts` — Accept `type` arg in `create` mutation, store it on the session
- `src/app/api/generate/route.ts` — Pass `mode` as `type` when creating sessions
- `src/features/flashcards/hooks/use-flashcard-streaming.ts` — Already sends `mode: "flashcards"` (no change needed)

---

## Fix 4: Hardcoded Profile Data

**Problem:** Profile section has hardcoded `"Desha"`, `"ABA Therapist"`, and `"user@bridges.ai"`. Mobile nav drawer has hardcoded `"D"`, `"Desha"`, `"desha@email.com"`. These should come from Clerk user data.

**Files to modify:**
- `src/features/settings/components/profile-section.tsx:11-12,67` — Use `useUser()` from Clerk to populate displayName and email
- `src/shared/components/mobile-nav-drawer.tsx:62-70` — Use `useUser()` for avatar initial, name, and email

---

## Fix 5: Profile Save is Fake (No Backend Persistence)

**Problem:** The "Save changes" button in profile settings just toggles a local `saved` state for 2 seconds. No Convex mutation exists to persist profile data.

**Files to modify:**
- `src/features/settings/components/profile-section.tsx:15-18` — Replace fake save with actual Clerk `user.update()` call for displayName. Role can be stored as Clerk `publicMetadata` or as a Convex user record.

---

## Fix 6: "Change Avatar" Button is Unwired

**Problem:** Button at `profile-section.tsx:32` renders but has no `onClick` handler.

**Fix:** Remove the button entirely. Clerk's `<UserButton>` already handles avatar management. Adding a custom avatar flow is unnecessary complexity.

**File:** `src/features/settings/components/profile-section.tsx:28-34` — Remove the avatar change button.

---

## Fix 7: Settings Page is Unreachable

**Problem:** `/settings` exists but no navigation item links to it. Users must type the URL manually.

**Fix option:** Clerk's `<UserButton>` already provides account management. Either:
- (A) Add a settings gear icon to the sidebar nav (add to `NAV_ITEMS`)
- (B) Remove the custom settings page and rely on Clerk's built-in user management

**Recommended:** Option A — add to `NAV_ITEMS` in `src/shared/lib/navigation.ts`.

---

## Fix 8: `window.confirm()` Instead of App Dialog

**Problem:** `tool-card.tsx:27` uses browser-native `window.confirm()` for delete confirmation, while the rest of the app uses `DeleteConfirmationDialog`.

**File to modify:**
- `src/shared/components/tool-card.tsx` — Replace `window.confirm()` with the app's `DeleteConfirmationDialog` component (used in `dashboard-view.tsx` and `flashcard-page.tsx`).

---

## Fix 9: Hardcoded Data in Mobile Nav Drawer

**Problem:** Mobile nav drawer hardcodes user avatar initial "D", name "Desha", and email "desha@email.com" instead of pulling from Clerk.

**File:** `src/shared/components/mobile-nav-drawer.tsx:61-72` — Use `useUser()` hook from `@clerk/nextjs`.

**(Covered by Fix 4 above — listed for traceability.)**

---

## Fix 10: Delete Account Button Misleads Users

**Problem:** Delete account button in `account-section.tsx:32-38` is permanently disabled with no explanation of when it will be available.

**Fix:** Add helper text explaining the feature is coming soon, or remove the entire "Danger Zone" section until implemented.

**File:** `src/features/settings/components/account-section.tsx`

---

## Fix 11: Console Cleanup in Production Paths

**Problem:** Multiple `console.log`/`console.error` statements in production code paths that should use proper error reporting or be removed.

**Key files:**
- `src/app/api/generate/route.ts` — Replace debug console.log with conditional dev-only logging
- `src/features/builder/lib/template-files.ts` — Remove `console.warn` for missing WAB scaffold

---

## Fix 12: Marketing Header Missing Flashcards Link

**Problem:** Marketing header nav only includes Builder, Templates, My Apps — missing Flashcards. Inconsistent with sidebar nav.

**File:** `src/shared/components/marketing-header.tsx` — Add Flashcards to `navLinks` array.

---

## Implementation Order

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| P0 | Fix 1: Home → Dashboard | 10 min | High — every user hits this |
| P0 | Fix 3: Message leakage | 20 min | High — data integrity |
| P1 | Fix 4+9: Hardcoded profile data | 15 min | Medium — looks broken |
| P1 | Fix 5: Fake profile save | 15 min | Medium — trust-breaking |
| P1 | Fix 8: window.confirm → Dialog | 10 min | Medium — consistency |
| P2 | Fix 6: Remove unwired avatar button | 5 min | Low — dead UI |
| P2 | Fix 7: Settings nav link | 5 min | Low — discoverability |
| P2 | Fix 10: Delete account messaging | 5 min | Low — misleading |
| P2 | Fix 11: Console cleanup | 10 min | Low — professionalism |
| P2 | Fix 12: Marketing header flashcards | 5 min | Low — consistency |
| Skip | Fix 2: ToolCard template href | — | Not used in production |

---

## Verification

After all fixes:
1. **Navigation:** Click Home in sidebar → lands on `/dashboard`, not landing page
2. **Builder back:** Click back arrow in builder toolbar → lands on `/dashboard`
3. **Templates:** Click any template → builder opens with prompt pre-filled and auto-generates
4. **Flashcards isolation:** Create flashcards → go to builder → builder chat is clean (no flashcard messages)
5. **Profile:** Settings shows real Clerk user data (name, email), save persists across refresh
6. **Delete dialog:** Delete an app from My Tools → styled dialog appears (not browser confirm)
7. **Mobile nav:** Open drawer → shows real user name/email from Clerk
8. **Run tests:** `npm test` passes, `npx playwright test` passes
