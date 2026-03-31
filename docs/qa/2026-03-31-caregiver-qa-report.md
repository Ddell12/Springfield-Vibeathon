# Caregiver QA Report — 2026-03-31

## Health Score: 12/100

> **Summary verdict:** The caregiver experience is essentially unbuilt. After sign-in, caregivers land on the SLP/builder dashboard and see SLP navigation (Builder, Flashcards, Templates, My Apps). Every caregiver-specific route (`/family`, `/sessions`, `/speech-coach`) returns a 404. The role-based routing layer for caregivers does not exist in production.

---

## Summary

- **15 screens audited** (including variants and SLP-route checks)
- **2 complete** ✅ — Auth pages (sign-in, sign-up)
- **1 partial** ⚠️ — Settings (works but shows wrong nav context)
- **9 broken/missing** ❌ — All caregiver-specific routes return 404
- **3 wrong-role exposed** ⚠️🔓 — Caregiver can access Builder, Flashcards, My Apps (SLP features)

---

## Screen-by-Screen Findings

### /sign-in
**Status:** ✅ Complete
**Screenshot:** docs/qa/screenshots/caregiver/auth-sign-in.png
**Issues:**
- None. Clerk sign-in UI renders correctly, brand logo visible.
- Email code fallback works (code `424242` accepted).
- After sign-in, redirects to `/dashboard` — but `/dashboard` shows the SLP builder, not a caregiver home (see dashboard finding).

---

### /sign-up
**Status:** ✅ Complete
**Screenshot:** docs/qa/screenshots/caregiver/auth-sign-up.png
**Issues:**
- None found. Clerk sign-up UI renders correctly.
- Note: New caregivers created via this flow will have no role set — the invite flow (`/invite/[token]`) is needed to set `role: caregiver` in Clerk publicMetadata.

---

### /invite/[token]
**Status:** 🔲 Not tested (requires a live invite token)
**Screenshot:** N/A
**Issues:**
- Not audited — would require a valid token from an SLP account.
- Known bug from prior session: SLP visiting `/invite/[token]` had role overwritten to caregiver. Not re-verified here.

---

### /dashboard (post sign-in landing)
**Status:** ❌ Wrong role content
**Screenshot (desktop):** docs/qa/screenshots/caregiver/dashboard-desktop.png
**Screenshot (mobile):** docs/qa/screenshots/caregiver/dashboard-mobile.png
**Issues:**
- Caregiver lands on the SLP/builder dashboard after sign-in. No caregiver redirect.
- Navigation shows: Home, Builder, Flashcards, Templates, My Apps, Settings — these are all SLP/builder features.
- No caregiver-specific nav items (Family, Sessions, Speech Coach) exist at all.
- The prompt box ("Describe a therapy tool") and template buttons are visible and interactive for caregivers.
- "Create Your First App" CTA is shown — inappropriate for caregiver role.
- Redirect after sign-in should go to `/family` (caregiver home), not `/dashboard`.

---

### /family
**Status:** ❌ Broken — 404
**Screenshot:** docs/qa/screenshots/caregiver/family-home-desktop.png
**Issues:**
- Returns the generic "Page not found" 404 screen.
- This is the primary caregiver hub and it does not exist in production.
- The route has not been built.

---

### /family/[patientId]
**Status:** ❌ Broken — 404 (implied, parent route is 404)
**Screenshot:** N/A
**Issues:**
- Cannot navigate to child detail because `/family` itself is 404.
- Child detail page not built.

---

### /family/[patientId]/messages
**Status:** ❌ Missing — not built
**Screenshot:** N/A
**Issues:**
- SLP↔caregiver messaging feature not present in any form.

---

### /family/[patientId]/speech-coach
**Status:** ❌ Missing — not built
**Screenshot:** N/A

---

### /family/[patientId]/play
**Status:** ❌ Missing — not built
**Screenshot:** N/A
**Issues:**
- App gallery for assigned therapy apps not accessible to caregivers.

---

### /family/[patientId]/play/[appId]
**Status:** ❌ Missing — not built
**Screenshot:** N/A

---

### /sessions (caregiver view)
**Status:** ❌ Broken — 404
**Screenshot (desktop):** docs/qa/screenshots/caregiver/sessions-desktop.png
**Screenshot (mobile):** docs/qa/screenshots/caregiver/sessions-mobile.png
**Issues:**
- Returns the generic "Page not found" 404 screen.
- Sessions were reportedly shipped for SLP view (2026-03-30), but the caregiver-facing sessions route does not exist.
- Caregiver has no way to view, book, or join sessions.

---

### /sessions/book/[slpId]
**Status:** ❌ Missing — not built
**Screenshot:** N/A

---

### /sessions/[id]
**Status:** ❌ Missing — not tested
**Screenshot:** N/A
**Issues:**
- No accessible sessions exist for the caregiver account to navigate to.

---

### /sessions/[id]/call
**Status:** ❌ Missing — not tested
**Screenshot:** N/A

---

### /speech-coach
**Status:** ❌ Broken — 404
**Screenshot:** docs/qa/screenshots/caregiver/speech-coach.png
**Issues:**
- Returns the generic "Page not found" 404 screen.
- ElevenLabs speech coach feature not accessible to caregivers.

---

### /settings
**Status:** ⚠️ Partial
**Screenshot (desktop):** docs/qa/screenshots/caregiver/settings.png
**Screenshot (mobile):** docs/qa/screenshots/caregiver/settings-mobile.png
**Issues:**
- Settings page loads and shows Profile section (Display name, Email).
- However, the page has **two nested `<main>` elements** detected by the accessibility tree — layout issue.
- Settings shows within the SLP navigation context, which is confusing for caregivers.
- No caregiver-specific settings (e.g., notification preferences, child profiles) visible.

---

## SLP-Only Route Access Checks

### /patients
**Status:** 🔲 Blocked (shows 404, not redirect)
**Screenshot:** docs/qa/screenshots/caregiver/patients-unauthorized.png
**Notes:**
- Returns 404 "Page not found" rather than redirecting to caregiver home.
- Not accessible (good), but UX is confusing — should redirect cleanly.

### /billing
**Status:** 🔲 Blocked (shows 404, not redirect)
**Screenshot:** docs/qa/screenshots/caregiver/billing-caregiver.png
**Notes:**
- Returns 404 "Page not found" rather than redirecting.
- Prior audit found billing route unprotected — this appears to now be 404 in production. May have been removed from navigation but route status is unclear.

### /builder
**Status:** ⚠️🔓 EXPOSED — caregiver can access
**Screenshot:** docs/qa/screenshots/caregiver/builder-caregiver-detail.png
**Issues:**
- The full SLP builder is accessible to caregivers.
- Navigation shows Builder link and it works — caregivers can prompt for and generate therapy apps.
- This may be intentional (allowing caregivers to build too), but is undocumented and untested.
- If caregivers should not build apps, this is a role-gate gap.

### /flashcards
**Status:** ⚠️🔓 EXPOSED — caregiver can access
**Screenshot:** docs/qa/screenshots/caregiver/flashcards-caregiver.png
**Notes:**
- Flashcard creator is fully accessible. Likely unintentional — no caregiver-specific UI/copy.

---

## Priority Issues (fix before next release)

1. **[CRITICAL] `/family` does not exist — caregiver home is 404.** The entire caregiver navigation tree (family dashboard, child detail, messages, play, speech coach) is absent. This is the most fundamental gap: caregivers have no destination after sign-in.

2. **[CRITICAL] Post-sign-in redirect lands caregivers on the SLP builder dashboard (`/dashboard`).** Caregivers see "Describe a therapy tool" and SLP-targeted templates — wrong role context entirely. The `signInFallbackRedirectUrl` in Clerk is set to `/dashboard` for all roles.

3. **[CRITICAL] `/sessions` returns 404 for caregivers.** Sessions teletherapy was shipped for SLP view but caregiver session access (booking, joining calls, session history) is completely absent.

4. **[HIGH] Navigation shows SLP links (Builder, Flashcards, My Apps) to caregivers.** No role-based nav switching is implemented. Caregivers should see: Family, Sessions, Speech Coach, Settings — not builder tools.

5. **[HIGH] `/builder` is fully accessible to caregivers.** If this is unintentional, it needs a role guard. If intentional, it needs caregiver-appropriate copy and onboarding.

6. **[MEDIUM] `/speech-coach` returns 404.** The ElevenLabs speech coach agent is not routed to caregivers, even though it was built.

7. **[MEDIUM] Blocked SLP routes show 404 instead of clean redirect.** `/patients` and `/billing` return raw 404s — should redirect to appropriate caregiver page (or `/dashboard` with a toast).

8. **[LOW] Settings has double `<main>` element.** Two `<main>` tags detected in the accessibility tree — violates ARIA landmark uniqueness.

---

## Missing Features (not yet built)

1. **Caregiver home dashboard** (`/family`) — list of children/patients in care
2. **Child detail page** (`/family/[patientId]`) — progress, assigned apps, upcoming sessions
3. **Caregiver sessions view** (`/sessions`) — calendar, booking flow, session history
4. **Session booking** (`/sessions/book/[slpId]`) — schedule with therapist
5. **SLP↔Caregiver messaging** (`/family/[patientId]/messages`) — async communication channel
6. **Caregiver play gallery** (`/family/[patientId]/play`) — browse and launch assigned therapy apps
7. **Caregiver speech coach** (`/family/[patientId]/speech-coach`) — child-context ElevenLabs agent
8. **Role-based navigation** — sidebar/nav should switch based on `role: caregiver` vs `role: slp`
9. **Role-based redirect after sign-in** — caregivers should go to `/family`, not `/dashboard`

---

## Design Notes

- Font in HTML source: `Manrope` + `Inter` (Google Fonts). DESIGN.md specifies **Fraunces** (display) + **Instrument Sans** (body). This discrepancy exists across all screens — appears to be a known design debt issue.
- Material Symbols Outlined icon font is loaded — DESIGN.md may specify a different icon set. Verify.
- The 404 "Page not found" screen is minimal but on-brand (correct colors, no broken layout).
- Settings page loads cleanly at both 375px and 1280px viewports.
