# QA Verification Report — SP1–SP5 Full Sweep

**Date:** March 31, 2026
**Method:** Live E2E browser testing (agent-browser, local dev server) + deep code analysis
**Tester:** Claude Code (automated)
**Branch:** main
**App URL:** http://localhost:3001 (dev) / https://bridgeai-iota.vercel.app (prod)
**Sessions:** Caregiver (`e2e+clerk_test+caregiver@bridges.ai`) + SLP (`e2e+clerk_test+slp@bridges.ai`)

---

## Overall Health Score: **61 / 100**

| Category | Score | Notes |
|----------|-------|-------|
| Functional | 50/100 | 2 hard crashes, multiple incomplete clinical UIs |
| Security | 40/100 | 2 auth gaps, 1 unpatched spec requirement |
| Design/UX | 72/100 | Solid foundation, sidebar nav and sign-in button issues |
| Content | 80/100 | Legal text is real, placeholder in practice profile |
| Accessibility | 70/100 | ARIA labels present, icon-only sidebar risky |
| Performance | 85/100 | Fast local dev, no measured regressions |

---

## Critical Bugs (Blocking)

### BUG-001 — SP5: Data Collection Page Crashes on Load
**Severity:** Critical
**Route:** `/patients/[id]/collect`
**Repro:** Navigate to any patient's `/collect` route while signed in as SLP.
**Result:** Full error boundary — "Something went wrong. Please try again or return home."
**Root Cause:** `useDataCollection` hook calls `api.sessionTrials.getActiveForPatient`. The `DataCollectionScreen` component also calls `useActiveGoals(patientId)` which queries `api.goals.listActive`. Either the Convex query throws or a downstream component fails to handle an empty/null result. The "1 Issue" badge in the bottom-left corner confirms a React error was caught.
**Screenshot:** `ab-20-data-collection.png`
**Impact:** The entire SP5 data collection feature is inaccessible. SLPs cannot collect trial data during sessions.

---

### BUG-002 — SP5: Add Goal Crashes Patient Detail Page
**Severity:** Critical
**Route:** `/patients/[id]` → click "Add Goal"
**Repro:** On any patient detail page, click "Add Goal" button.
**Result:** Full error boundary on the patient page — "Something went wrong."
**Root Cause:** "Add Goal" opens `GoalForm` which renders `GoalBankPicker`. `GoalBankPicker` calls `api.goalBank.search`. The `goalBank.search` handler uses `slpQuery` which sets `ctx.slpUserId = null` when the caller's role is not `"slp"`. The handler then throws `ConvexError("Not authorized")`. This Convex error propagates through `useQuery` and crashes the React component tree.

The E2E SLP account (`e2e+clerk_test+slp@bridges.ai`) likely has `role: "caregiver"` in Clerk `publicMetadata` instead of `"slp"`, or the Clerk JWT template doesn't include `public_metadata`. This means `getAuthRole()` returns `"caregiver"`, which triggers `slpUserId: null` in the `slpQuery` wrapper, which causes the throw.

**Why the billing dashboard didn't crash:** The billing dashboard loaded before the SLP role auth issue was confirmed — it may have loaded with a cached auth state or the query returned empty results before throwing.

**Screenshot:** `ab-24-add-goal-crash.png`
**Impact:** SLPs cannot add any goals to patients. This blocks SP2 (Plan of Care), SP4 (session note targets), and SP5 (data collection). The entire goals workflow is broken.

**Fix direction:** Confirm the E2E SLP Clerk account has `publicMetadata: { role: "slp" }` in the Clerk dashboard. Then verify the JWT template at `convex/auth.config.ts` includes `public_metadata` in the claims.

---

### BUG-003 — SP1: LiveKit Token Route Missing Authorization Checks
**Severity:** Critical (Security)
**File:** `src/app/api/livekit/token/route.ts`
**Spec Requirement:** 3 checks — (1) appointment status, (2) SLP ownership, (3) caregiver link
**Implemented:** Only check 1 (status gate: `JOINABLE_STATUSES`).
**Missing:**
- No check that `userId === appointment.slpId` (SLP ownership)
- No check that the user has an accepted `caregiverLinks` record for `appointment.patientId`

**Impact:** Any authenticated user who knows a valid in-progress appointment ID can obtain a LiveKit room token and join the video session. This is a HIPAA violation risk.

---

### BUG-004 — SP3: `/billing` Route Not in Clerk Middleware
**Severity:** High (Security)
**File:** `src/proxy.ts`
**Evidence:** `curl http://localhost:3001/billing` returns HTTP 200 without any auth cookie.
**Detail:** The `isProtectedRoute` matcher in proxy.ts includes `/dashboard`, `/patients`, `/sessions`, `/family`, `/settings`, `/my-tools` — but NOT `/billing` or `/speech-coach`. An unauthenticated user who navigates directly to `/billing` receives the server-rendered billing page HTML before any client-side Clerk redirect occurs.

The client-side component does redirect caregivers away (confirmed: navigating to `/billing` as caregiver redirected to family dashboard). But server-side HTML is still returned before JS executes, and true unauthenticated access is unrestricted at the server level.

**Fix:** Add `/billing(.*)` and `/speech-coach(.*)` to `isProtectedRoute` in `src/proxy.ts`.

---

## High Severity Issues

### ISSUE-001 — SP2: Evaluation Editor Missing Two Critical Sections
**Severity:** High
**Route:** `/patients/[id]/evaluations/new`
**Confirmed by:** Live E2E test (screenshot `ab-16-evaluation-editor.png`)

The spec requires:
1. Assessment Tools — dynamic list of standardized tests (GFTA, PPVT, etc.) with score fields (raw, standard, percentile)
2. Domain Findings — per-domain narrative + scores for 8 domains (articulation, language-receptive, language-expressive, fluency, voice, pragmatics, AAC, feeding)

**What exists:** Evaluation Date, Referral Source, Background History, Behavioral Observations, ICD-10 picker, Prognosis (4 buttons), Clinical Interpretation (AI-assisted), Recommendations, Save, Sign.

**Missing:** The two most clinically important sections — assessment tools and domain findings — which are the primary data entry points for a formal evaluation. SLPs cannot document what tests they administered or what they found in each domain.

**Impact:** Evaluations are incomplete clinical documents. Cannot generate a compliant evaluation report or feed accurate data to AI interpretation.

---

### ISSUE-002 — SP2: Plan of Care Missing Goals Linking and Diagnosis UI
**Severity:** High
**File:** `src/features/plan-of-care/components/poc-editor.tsx`

The POC editor has frequency, duration, discharge criteria, and physician signature fields — but:
- `diagnosisCodes` is hardcoded as `[]` (no UI to add diagnosis codes)
- `longTermGoals` and `shortTermGoals` are hardcoded as `[]` (no UI to link patient goals)
- Amendment workflow creates a copy but doesn't record a change log

SLPs cannot produce a compliant Plan of Care that references the patient's goals.

---

### ISSUE-003 — SP2: Discharge Summary Missing Goals Outcome Selection
**Severity:** High
**File:** `src/features/discharge/components/discharge-form.tsx`

`goalsAchieved` and `goalsNotMet` arrays are hardcoded as `[]`. The UI has no mechanism for the SLP to select which goals were met and at what accuracy. Without this, the AI narrative has no goal outcome data to summarize, and the discharge summary cannot be a complete clinical document.

---

### ISSUE-004 — SP2: Goal Amendment History Not Surfaced in UI
**Severity:** High

The `goals` table has `amendmentLog` in the schema and `convex/goals.ts` snapshots state before edits. But:
- `src/features/goals/components/goal-form.tsx` has no "Reason for change" field (only a generic "Notes" field)
- `src/features/goals/` has no component that renders the amendment history timeline

SLPs have no way to see or document why a goal was changed, which is a compliance requirement.

---

### ISSUE-005 — SP1: Practice Profile Not Linked in Intake Form Templates
**Severity:** High
**Confirmed by:** Live E2E (screenshot `ab-03-intake-form-bottom.png`)

HIPAA form contact section shows "Privacy Officer: Your Therapist SLP" — a placeholder. The `form-content.ts` accepts practice profile data as parameters, but either:
- The `practiceProfiles` query is not being called before rendering the intake form, OR
- The practice profile fields use schema column names (`address`, `phone`) that differ from what `practiceProfile.update` mutation accepts (`practiceAddress`, `practicePhone`)

This naming mismatch was confirmed in code analysis: the schema uses `address`/`phone` while `practiceProfile.ts` mutation args use `practiceAddress`/`practicePhone`.

**Impact:** Legal documents served to caregivers show placeholder contact info. Clinically and legally unacceptable.

---

## Medium Severity Issues

### ISSUE-006 — SP4: Late Signature Warning Not Visible in Session Note Card
**Severity:** Medium
**Confirmed by:** Code review (cannot test without signed session notes in dev data)

The `session-note-card.tsx` has `isLateSignature()` logic and `getSignatureDelayDays()` function, but the badge only renders if `isLate && delayDays > 0`. The badge text and styling are implemented, but with no signed session notes in the test environment this could not be verified live.

---

### ISSUE-007 — SP4: Progress Report Physician Signature Uses Stub Hook
**Severity:** Medium
**File:** `src/features/goals/components/progress-report-viewer.tsx`

`usePhysicianSignature()` returns `undefined` — a stub waiting for SP2's `plansOfCare` integration. The physician signature section renders as "Physician signature: Not on file" regardless of actual POC status. SP2 is shipped but this viewer isn't reading from it.

---

### ISSUE-008 — SP3: Billing Record Editor — GP Modifier Not Pre-Checked
**Severity:** Medium
**File:** `src/features/billing/components/billing-record-editor.tsx`

Spec: "GP pre-checked, 95 auto-checked for teletherapy." Implementation: modifiers are added/removed via `toggleModifier()` — GP is not pre-populated. SLPs will need to manually check GP on every billing record, and may forget it. GP is required on all SLP claims.

---

### ISSUE-009 — SP3: Billing Record Editor Missing Diagnosis Field
**Severity:** Medium
**File:** `src/features/billing/components/billing-record-editor.tsx`

`diagnosisCodes` is passed as an empty array with no UI to add or edit diagnosis codes in the billing record. Diagnosis codes are required on insurance claims. SLPs cannot add ICD-10 codes to their billing records through the UI.

---

### ISSUE-010 — E2E Auth: SLP Credentials Not in `.env.local`
**Severity:** Medium (Dev/QA process)

`E2E_SLP_EMAIL` and `E2E_SLP_PASSWORD` are referenced in `tests/e2e/fixtures.ts` but not present in `.env.local`. The only E2E credential in `.env.local` is a generic `E2E_CLERK_USER_EMAIL` (caregiver). Running E2E tests as SLP will fail until these are added.

Additionally, the demo accounts (`slp@bridges.ai`) are not registered in Clerk — they exist only in the Convex DB. New developers cannot sign in without knowing this.

---

### ISSUE-011 — SP5: Home Program Print Missing SLP Contact Info
**Severity:** Medium
**Confirmed by:** Live E2E (screenshot `ab-25-home-program-print.png`)

The printed home program shows: program name, frequency, status, start date, activities, target sounds, age range, session duration. It correctly hides navigation during print.

**Missing:** SLP name and contact information (phone/email). The spec states the printout should include "SLP name + contact info." Caregivers printing for school staff or grandparents need to know who to call. Practice profile data is available via `practiceProfiles` but is not queried in this component.

---

## Low Severity / Design Issues

### DESIGN-001 — Sidebar: Icon-Only Navigation Without Text Labels
**Severity:** Low/Medium
**Confirmed by:** Screenshots `ab-11b-slp-dashboard.png`, `ab-14-patients-list.png`, etc.

The SLP sidebar shows 10+ icon buttons with no text labels in the collapsed state. The icons are small (~24px) and not all are self-explanatory. SLPs — not developers — are the users. This fails basic discoverability standards for clinical software.

**Recommendation:** Add text labels below icons, or show a labeled expanded state by default.

---

### DESIGN-002 — Sign-In Page: Continue Button Uses Charcoal, Not Brand Teal
**Severity:** Low
**Confirmed by:** Screenshot `local-03-signin.png`

The Clerk sign-in component's "Continue" button renders in near-black charcoal. Per DESIGN.md: primary CTAs use `bg-gradient-to-br from-[#00595c] to-[#0d7377]`. The Clerk component appearance is not overriding the button color to match the design system.

---

### DESIGN-003 — Homepage Leads With Builder/Caregiver Copy, Not SLP Value Prop
**Severity:** Low
**Confirmed by:** Screenshot `local-01-homepage.png`

The homepage H1 reads "Build therapy apps for your child — just describe what you need." After the SLP platform pivot (SP1–SP5), the primary users are SLPs, not parents building apps. The homepage has not been updated to lead with the SLP value proposition.

---

### DESIGN-004 — Patient Tag Capitalization Bug
**Severity:** Low
**Confirmed by:** Screenshot `ab-15-patient-detail.png`

Patient "Test Child" has a tag labeled "single Words" — lowercase 's', uppercase 'W'. This is a data normalization bug in how skill levels are stored or displayed.

---

### DESIGN-005 — CDN Caching 404 for Dynamic Routes on Production
**Severity:** Low (Infrastructure)
**Confirmed by:** `curl -I https://bridgeai-iota.vercel.app/dashboard` returns HTTP 404 with `age: 27585` (Vercel CDN cache)

Protected routes that respond to authenticated browser requests with client-side redirects are being cached as 404 by the Vercel CDN when accessed by curl (no Clerk dev browser cookie). This is a Clerk dev mode behavior (`x-clerk-auth-reason: dev-browser-missing`) but means server-side rendered routes are serving stale cached responses.

---

## What's Working Well (Confirmed E2E)

| Feature | SP | Status |
|---------|----|--------|
| Intake form flow (4 steps, stepper, sign, progress) | SP1 | ✅ Works |
| Intake status widget (amber badge, real-time update) | SP1 | ✅ Works |
| Practice profile settings (all 8 fields) | SP1 | ✅ Works |
| Intake route outside (app) layout | SP1 | ✅ Works |
| Clinical billing dashboard (3 tabs, stats, empty state) | SP3 | ✅ Works |
| Billing auto-creation message on empty state | SP3 | ✅ Works |
| Session note editor (date, duration, targets, SOAP gen) | SP4 | ✅ Works |
| Group session mode toggle (CPT 92508, patient picker) | SP4 | ✅ Works |
| Home program print page (layout, print button) | SP5 | ✅ Works |
| Patient list (filters, search, status badges) | SP5 | ✅ Works |
| Caregiver family dashboard (streak, activities, Kid Mode) | SP1 | ✅ Works |
| Route protection (patients, sessions, family → sign-in) | SP1 | ✅ Works |
| Evaluation editor (date, ICD-10, prognosis, AI gen) | SP2 | ✅ Partial |
| Plan of Care editor (frequency, physician sig) | SP2 | ✅ Partial |

---

## Spec Completion Matrix

| Spec | Implemented in Code | Works in Browser | Quality |
|------|--------------------|--------------------|---------|
| **SP1: Security & Legal Compliance** | 7/7 items | 5/7 (LiveKit auth, form placeholder issues) | 71% |
| **SP2: Clinical Documents** | 12/12 tables/routes | 4/12 (missing sections in eval, POC, discharge, goals) | 33% |
| **SP3: Clinical Billing** | 6/6 items | 4/6 (missing diagnosis in editor, GP not pre-checked) | 67% |
| **SP4: Session Workflow Upgrades** | 8/8 items | 6/8 (physician sig stub, amendment log not visible) | 75% |
| **SP5: SLP-Native Experience** | 9/9 items | 3/9 (2 crashes block data collection + goal bank) | 33% |

**Overall: 22/42 user journeys fully working (52%)**

---

## Prioritized Fix List

| Priority | Bug/Issue | Effort | Impact |
|----------|-----------|--------|--------|
| P0 | BUG-002: Fix E2E SLP Clerk account publicMetadata → unblocks goal bank + data collection | 30 min | Unlocks SP5 entirely |
| P0 | BUG-001: Debug data collection crash (likely same root cause as BUG-002) | 1h | Unlocks SP5 data collection |
| P0 | BUG-003: Add SLP + caregiver link checks to LiveKit token route | 2h | HIPAA compliance |
| P0 | BUG-004: Add `/billing` and `/speech-coach` to proxy.ts isProtectedRoute | 15 min | Security |
| P1 | ISSUE-001: Add Assessment Tools + Domain Findings sections to evaluation editor | 4h | SP2 clinical completeness |
| P1 | ISSUE-002: Add goals linking + diagnosis UI to POC editor | 3h | SP2 clinical completeness |
| P1 | ISSUE-003: Add goals outcome selection to discharge form | 2h | SP2 clinical completeness |
| P1 | ISSUE-004: Add amendment history view + "Reason for change" field | 2h | SP2 audit trail |
| P1 | ISSUE-005: Fix practiceProfile field name mismatch (address vs practiceAddress) | 1h | SP1 legal documents |
| P2 | ISSUE-008: Pre-check GP modifier in billing record editor | 30 min | SP3 billing accuracy |
| P2 | ISSUE-009: Add diagnosis field to billing record editor | 1h | SP3 claim completeness |
| P2 | ISSUE-011: Add SLP contact info to home program print | 30 min | SP5 caregiver UX |
| P3 | DESIGN-001: Add text labels to sidebar navigation | 2h | Discoverability |
| P3 | DESIGN-002: Override Clerk Continue button color to brand teal | 30 min | Design system |
| P3 | DESIGN-004: Normalize patient tag capitalization | 15 min | Data quality |

---

## Screenshots Reference

| File | Content |
|------|---------|
| `ab-01-family-dashboard.png` | Caregiver family dashboard |
| `ab-02-intake-flow.png` | SP1 intake form (HIPAA) |
| `ab-03-intake-form-bottom.png` | Placeholder contact info in HIPAA form |
| `ab-04-intake-ready-to-sign.png` | Signed name + checked box, teal button |
| `ab-05-after-signing-hipaa.png` | Post-sign: stepper advances, toast shown |
| `ab-07-billing-as-caregiver.png` | /billing redirects caregiver → family dashboard |
| `ab-08-speech-coach.png` | Speech Coach session setup |
| `ab-11b-slp-dashboard.png` | SLP builder dashboard (home) |
| `ab-12-settings.png` | Settings page with Practice tab |
| `ab-13-practice-profile.png` | SP1 practice profile with all 8 fields |
| `ab-14-patients-list.png` | Caseload list with status filters |
| `ab-15-patient-detail.png` | Patient detail + SP1 intake status widget |
| `ab-16-evaluation-editor.png` | SP2 evaluation editor (missing sections) |
| `ab-17-billing-dashboard.png` | SP3 billing dashboard |
| `ab-18-session-note-editor.png` | SP4 session note editor |
| `ab-19-group-session-mode.png` | SP4 group session mode active |
| `ab-20-data-collection.png` | SP5 data collection CRASH |
| `ab-24-add-goal-crash.png` | SP5 Add Goal CRASH |
| `ab-25-home-program-print.png` | SP5 home program print page |

---

*Report generated March 31, 2026. QA performed on local dev (Next.js 16 + Convex dev deployment). All browser tests used agent-browser against http://localhost:3001.*
