# Caregiver QA Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Screenshot every caregiver-accessible screen at mobile and desktop viewports, evaluate completeness and correctness, and produce a structured report with health score and priority issues.

**Architecture:** Run `/qa-only` (gstack headless browser) signed in as the caregiver E2E test account. No code changes — report only.

**Tech Stack:** gstack (`/browse`, `/qa-only`), Clerk email-code sign-in (`424242`)

---

## Task 1: Sign in as caregiver test account

- [ ] **Step 1: Open the app**

```
/browse https://bridgeai-iota.vercel.app/sign-in
```

- [ ] **Step 2: Sign in with email code**

Enter email: `e2e+clerk_test+caregiver@bridges.ai`
Click "Use another method" → "Email code"
Enter code: `424242`

- [ ] **Step 3: Verify signed in as caregiver**

After sign-in, confirm redirect lands on `/family` or `/sessions` (not `/builder`). Check that Patients and Billing nav items are NOT visible.

---

## Task 2: Screenshot authentication flows

- [ ] **Step 1: Sign-in page**

```
/browse https://bridgeai-iota.vercel.app/sign-in
```
Screenshot: `docs/qa/screenshots/caregiver/auth-sign-in.png`
Evaluate: Does it look polished? Is the Bridges brand visible?

- [ ] **Step 2: Sign-up page**

```
/browse https://bridgeai-iota.vercel.app/sign-up
```
Screenshot: `docs/qa/screenshots/caregiver/auth-sign-up.png`

---

## Task 3: Screenshot family dashboard flows

- [ ] **Step 1: Family home (signed in)**

```
/browse https://bridgeai-iota.vercel.app/family
```
Screenshot at 1280px: `docs/qa/screenshots/caregiver/family-home-desktop.png`
Screenshot at 375px: `docs/qa/screenshots/caregiver/family-home-mobile.png`
Evaluate: Are children listed? Is empty state helpful if no children?

- [ ] **Step 2: Child detail page**

Navigate to `/family/[patientId]` for the first child shown.
Screenshot: `docs/qa/screenshots/caregiver/child-detail.png`
Evaluate: What sections are shown? Are any sections empty/broken?

- [ ] **Step 3: Messages**

Navigate to `/family/[patientId]/messages`
Screenshot: `docs/qa/screenshots/caregiver/family-messages.png`
Evaluate: Is messaging functional? Empty state?

- [ ] **Step 4: Speech coach (child context)**

Navigate to `/family/[patientId]/speech-coach`
Screenshot: `docs/qa/screenshots/caregiver/family-speech-coach.png`

---

## Task 4: Screenshot play/apps flows

- [ ] **Step 1: App gallery**

Navigate to `/family/[patientId]/play`
Screenshot: `docs/qa/screenshots/caregiver/play-gallery.png`
Evaluate: Are assigned apps visible? Empty state?

- [ ] **Step 2: Play a specific app**

If any app exists, navigate to `/family/[patientId]/play/[appId]`
Screenshot: `docs/qa/screenshots/caregiver/play-app.png`
Evaluate: Does the iframe render? Are controls visible?

---

## Task 5: Screenshot sessions flows

- [ ] **Step 1: Sessions calendar (caregiver view)**

```
/browse https://bridgeai-iota.vercel.app/sessions
```
Screenshot at 375px: `docs/qa/screenshots/caregiver/sessions-mobile.png`
Screenshot at 1280px: `docs/qa/screenshots/caregiver/sessions-desktop.png`
Evaluate: Time overflow issue (should be fixed in Group C). Upcoming vs past sessions.

- [ ] **Step 2: Session booking page**

Navigate to `/sessions/book/[slpId]` (get slpId from an existing appointment or from the SLP account)
Screenshot: `docs/qa/screenshots/caregiver/sessions-book.png`
Evaluate: Can a caregiver actually book a session? Is the flow complete?

- [ ] **Step 3: Session detail**

Navigate to `/sessions/[id]` for an existing appointment
Screenshot: `docs/qa/screenshots/caregiver/session-detail.png`

- [ ] **Step 4: Video call room (pre-join)**

Navigate to `/sessions/[id]/call`
Screenshot: `docs/qa/screenshots/caregiver/session-call.png`
Evaluate: Camera permissions prompt? Lobby UI? Join button?

---

## Task 6: Screenshot speech coach and settings

- [ ] **Step 1: Speech coach top-level**

```
/browse https://bridgeai-iota.vercel.app/speech-coach
```
Screenshot: `docs/qa/screenshots/caregiver/speech-coach.png`
Evaluate: Does this differ from the family child speech coach? Is it caregiver-appropriate?

- [ ] **Step 2: Settings**

```
/browse https://bridgeai-iota.vercel.app/settings
```
Screenshot: `docs/qa/screenshots/caregiver/settings.png`
Evaluate: What settings are available to caregivers? Is anything SLP-only leaking through?

---

## Task 7: Check for unauthorized access

- [ ] **Step 1: Attempt to access SLP-only routes**

Try visiting as caregiver:
- `/patients` — should redirect, not show caseload
- `/billing` — should redirect (Group C fix)
- `/builder` — should redirect

```
/browse https://bridgeai-iota.vercel.app/patients
# Note: does it redirect or show content?

/browse https://bridgeai-iota.vercel.app/billing
# Note: does it redirect or show content?
```

Screenshot each and note the behavior.

---

## Task 8: Write the report

- [ ] **Step 1: Create output directory**

```bash
mkdir -p docs/qa/screenshots/caregiver
```

- [ ] **Step 2: Write the report**

Save to `docs/qa/2026-03-31-caregiver-qa-report.md` with this structure:

```markdown
# Caregiver QA Report — 2026-03-31

## Health Score: X/100

## Summary
- X screens audited
- X complete ✅
- X partial ⚠️
- X broken ❌
- X missing 🔲

## Screen-by-Screen Findings

### /sign-in
**Status:** ✅ / ⚠️ / ❌ / 🔲
**Screenshot:** docs/qa/screenshots/caregiver/auth-sign-in.png
**Issues:**
- (list any issues found)

### /family
**Status:** ...
...

(repeat for each screen)

## Priority Issues (fix before next release)
1. [Critical issue with route + description]
...

## Missing Features (not yet built)
1. [Feature description]
...
```

- [ ] **Step 3: Commit the report**

```bash
git add docs/qa/
git commit -m "docs: add caregiver QA audit report 2026-03-31"
```
