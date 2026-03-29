# Bridges X-Ray Issues Report

> Generated 2026-03-29 from Project X-Ray analysis
> Health Score: **72 / 100** | 36,231 LOC | 14 slices | 22 tables | 127 test files

---

## Critical Bugs

### BUG-1: Dual-role overwrite locks SLPs out of the platform
- **Severity:** CRITICAL
- **Status:** Open (known)
- **Location:** `convex/caregivers.ts` (acceptInvite), `convex/clerkActions.ts` (setCaregiverRole)
- **Symptom:** An SLP who visits `/invite/[token]` while signed in gets their Clerk `publicMetadata.role` permanently overwritten to `"caregiver"`, locking them out of all SLP routes (dashboard, patients, builder, my-tools, flashcards). All routes redirect to `/family`. Even `/sign-in` becomes inaccessible.
- **Root cause:** `acceptInvite` doesn't check if the current user is already an SLP. `setCaregiverRole` overwrites the role instead of supporting dual roles. The sidebar (`dashboard-sidebar.tsx:19-20`) reads `user.publicMetadata.role` and hides all SLP nav when it equals `"caregiver"`.
- **Fix required:**
  1. Block auto-accept for signed-in users with SLP role — show a warning or confirmation
  2. Support dual roles by checking both SLP ownership and caregiver links
  3. Add a "Sign Out" fallback to Settings > Account since `UserButton` may not render in all contexts

---

## High Priority Issues

### ARCH-1: Cross-slice import violations (4 violations)
- **Category:** VSA architecture violation
- **Effort:** Moderate
- **Owner:** Agent

The three clinical slices (patients, session-notes, goals) have developed tight bidirectional coupling that violates the Vertical Slice Architecture pattern:

| Source File | Imports From | Severity |
|---|---|---|
| `session-notes/structured-data-form.tsx` | `goals/hooks/use-goals` | Moderate |
| `session-notes/session-note-editor.tsx` | `patients/hooks/use-patients` | Moderate |
| `patients/patient-detail-page.tsx` | `session-notes`, `goals` | Moderate |
| `builder/builder-page.tsx` | `sharing/share-dialog` | Low |

**Fix:** Extract shared clinical components and hooks (`SessionNotesList`, `GoalsList`, `usePatient`, `useActiveGoals`) to `src/shared/` or create a composition layer in the `src/app/(app)/patients/` route that passes data down as props instead of letting slices import each other directly.

---

### TEST-1: Zero test coverage — patients slice (19 files, 1,780 LOC)
- **Category:** Test gap
- **Effort:** Moderate
- **Owner:** Agent
- **Risk:** HIGH — manages critical clinical data (patient profiles, caregiver invites, material assignments)

**Files needing tests:**
- `src/features/patients/components/patient-detail-page.tsx` — composite detail view
- `src/features/patients/components/patients-page.tsx` — patient list with search/filter
- `src/features/patients/components/add-patient-form.tsx` — new patient form validation
- Caregiver invite flow components
- Home programs widget (newly added `418858f`)

**Backend convex tests exist but all frontend UI components are untested.**

---

### TEST-2: Zero test coverage — flashcards slice (14 files, 1,585 LOC)
- **Category:** Test gap
- **Effort:** Moderate
- **Owner:** Agent
- **Risk:** HIGH — significant business logic with swipe gestures, TTS integration, deck navigation

**Files needing tests:**
- Deck navigation hook (swipe/drag logic)
- Card rendering (image + label + audio button)
- Swipe gesture handling
- TTS pronunciation trigger
- Deck creation/management

---

## Medium Priority Issues

### TEST-3: Low test coverage — session-notes (2 tests for 2,142 LOC)
- **Category:** Test gap
- **Effort:** Moderate
- **Owner:** Agent
- **Risk:** MEDIUM — SOAP note generation and sign-off workflow are critical clinical features

**Priority test targets:**
- Structured data form validation (targets, trials, prompt levels)
- SOAP note AI generation flow
- Digital signature/sign-off workflow
- Session note card rendering

---

### CHURN-1: Hot file — `api/generate/route.ts` (51 changes in 30 days)
- **Category:** Complexity hotspot
- **Effort:** Complex
- **Owner:** Agent
- **Risk:** MEDIUM — highest churn file in the project, averaging ~1.7 changes/day

The SSE streaming endpoint handles the entire Claude tool loop (write_file, generate_image, generate_speech) in a single file. This level of churn suggests ongoing instability or feature accumulation.

**Fix:** Extract tool handlers into separate modules:
- `lib/tools/write-file-handler.ts`
- `lib/tools/generate-image-handler.ts`
- `lib/tools/generate-speech-handler.ts`
- Keep `route.ts` as the thin SSE orchestrator

---

### CHURN-2: Hot file — `builder/builder-page.tsx` (50 changes in 30 days)
- **Category:** Complexity hotspot
- **Effort:** Complex
- **Owner:** Agent
- **Risk:** MEDIUM — large orchestrator component, second-highest churn

**Fix:** Decompose into focused sub-components:
- Panel management (chat vs. preview layout)
- Session state management
- Toolbar/action bar
- Blueprint display

---

### SLICE-1: billing slice is minimal (4 files, 271 LOC)
- **Category:** Feature completeness
- **Effort:** Moderate
- **Owner:** Agent/Human
- **Status:** Partial — checkout redirect and portal link only

Missing features for production-readiness:
- Usage tracking / quota enforcement
- Plan comparison UI
- Upgrade/downgrade confirmation flows
- Billing history display
- Webhook failure handling

---

## Low Priority Issues

### SLICE-2: Four stub slices need expansion
- **Category:** Feature completeness
- **Effort:** Varies
- **Owner:** Agent

| Slice | Files | LOC | Tests | Gap |
|---|---|---|---|---|
| `templates` | 3 | 240 | 2 | Thin wrapper — no filtering, no categories, no preview |
| `my-tools` | 2 | 270 | 1 | No edit/delete actions, no search, no sorting |
| `sharing` | 2 | 303 | 1 | Basic share dialog only — no analytics, no access controls |
| `shared-tool` | 2 | 212 | 1 | Read-only viewer — no usage tracking, no report-abuse |

These are functional but minimal. Expand when product requirements demand richer UX.

---

### TEST-4: goals slice has low test coverage (3 tests for 1,908 LOC)
- **Category:** Test gap
- **Effort:** Moderate
- **Owner:** Agent

Priority test targets:
- Goal creation form with SMART goal validation
- Progress data entry and accuracy calculation
- Goal bank template selection
- Progress trend visualization

---

### TEST-5: family slice is new and under-tested (5 tests for 1,791 LOC)
- **Category:** Test gap
- **Effort:** Low
- **Owner:** Agent
- **Note:** Tests were just added in commit `96af682` — streak tracker, practice log form, caregiver sidebar are now covered. Remaining gaps: messaging thread, weekly progress chart, celebration cards.

---

## Data Model Observations

### SCHEMA-1: Session state field is relaxed to `v.string()`
- **Category:** Schema hygiene
- **Note:** Documented as intentional due to legacy pipeline documents. Should be tightened to `v.union(v.literal(...))` once legacy data is migrated.

### SCHEMA-2: `homePrograms` is categorized under "Caching" domain
- **Category:** Schema organization
- **Note:** `homePrograms` is a clinical feature table, not a cache. The X-Ray domain grouping should be corrected in a future generation.

---

## Summary by Priority

| Priority | Count | Categories |
|---|---|---|
| **Critical** | 1 | Dual-role overwrite bug |
| **High** | 3 | Cross-slice coupling, 2 zero-test slices |
| **Medium** | 4 | Low test coverage, 2 high-churn files, minimal billing |
| **Low** | 4 | 4 stub slices, 2 under-tested slices, schema notes |
| **Total** | **12** | |

## Recommended Execution Order

1. **BUG-1** — Fix dual-role overwrite (blocks all SLPs who are also caregivers)
2. **TEST-1** — Add patients slice tests (critical clinical data, zero coverage)
3. **TEST-2** — Add flashcards slice tests (significant logic, zero coverage)
4. **ARCH-1** — Resolve cross-slice coupling (prevents architecture rot)
5. **CHURN-1** — Refactor generate/route.ts (reduces daily friction)
6. **TEST-3** — Expand session-notes tests
7. **CHURN-2** — Decompose builder-page.tsx
8. **SLICE-1** — Expand billing for production
9. Remaining low-priority items as product evolves
