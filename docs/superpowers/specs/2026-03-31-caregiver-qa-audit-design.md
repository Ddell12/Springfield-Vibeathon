# Group D: Caregiver QA Audit

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Screenshot all caregiver-facing screen flows, identify gaps and broken states, produce a structured report

---

## Goal

Produce a visual audit of every caregiver-accessible screen so missing features, broken UI, and incomplete flows are visible and prioritized before the next development cycle.

---

## Execution Method

Run `/qa-only` (gstack headless browser, report-only mode — no fixes) signed in as the caregiver E2E test account.

**Test account:** `e2e+clerk_test+caregiver@bridges.ai` / password from `E2E_CAREGIVER_PASSWORD` env var.
**Sign-in method:** Clerk email code fallback — enter email → "Use another method" → "Email code" → code `424242`.

---

## Caregiver Routes to Cover

All routes below must be visited, screenshotted, and evaluated. Annotate each with: ✅ Complete | ⚠️ Partial | ❌ Broken | 🔲 Missing.

### Authentication flow
| Screen | Route |
|--------|-------|
| Sign-in page | `/sign-in` |
| Sign-up page | `/sign-up` |
| Invite landing (accept caregiver invite) | `/invite/[token]` |

### Family dashboard
| Screen | Route |
|--------|-------|
| Family home (list of children) | `/family` |
| Child detail page | `/family/[patientId]` |
| Messages with SLP | `/family/[patientId]/messages` |
| Speech coach (caregiver view) | `/family/[patientId]/speech-coach` |

### Play (therapy apps)
| Screen | Route |
|--------|-------|
| App gallery (all assigned apps) | `/family/[patientId]/play` |
| Play a specific app (iframe fullscreen) | `/family/[patientId]/play/[appId]` |

### Sessions
| Screen | Route |
|--------|-------|
| Sessions calendar (caregiver view) | `/sessions` |
| Book a session | `/sessions/book/[slpId]` |
| Session detail | `/sessions/[id]` |
| Video call room | `/sessions/[id]/call` |

### Speech coach
| Screen | Route |
|--------|-------|
| Speech coach (top-level) | `/speech-coach` |

### Settings
| Screen | Route |
|--------|-------|
| Settings page | `/settings` |

---

## Report Output Format

Save report to `docs/qa/2026-03-31-caregiver-qa-report.md` with this structure:

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

### /family
**Status:** ✅ / ⚠️ / ❌ / 🔲
**Screenshot:** [path to screenshot]
**Issues:**
- [issue 1]
- [issue 2]

[repeat for each screen]

## Priority Issues (fix before next release)

1. [Critical issue]
2. ...

## Missing Features (not yet built)

1. [Feature]
2. ...
```

Screenshots saved to `docs/qa/screenshots/caregiver/` with filenames matching the route slug (e.g., `family-home.png`, `child-detail.png`).

---

## What to Look For Per Screen

- **Blank/empty states:** Does the screen show useful empty state copy or just a blank page?
- **Missing navigation:** Can the user get back where they came from?
- **Broken layouts:** Overflow, clipped text, misaligned elements especially on mobile (375px viewport)
- **Missing features:** Buttons that do nothing, forms that don't submit, modals that don't open
- **Wrong role content:** Any SLP-only content visible to caregiver
- **Auth gaps:** Any screen accessible without sign-in
- **Mobile responsiveness:** Test at both 375px (mobile) and 1280px (desktop)

---

## Out of Scope

- Fixing any issues found — this is report-only
- SLP flows (separate audit if needed)
- Marketing/landing pages
