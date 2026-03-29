# Technical Debt Cleanup Plan

## Context

A comprehensive technical debt audit of the Bridges codebase identified issues across type safety, query performance, error handling, environment configuration, dead code, and test coverage. This plan addresses all findings **except** API key revocation and lockfile consolidation (handled separately).

Key corrections from verification:
- Auth TODO (`convex/lib/auth.ts`) is **already fixed** — legacy sessions are rejected
- `ErrorDisplay` is **NOT unused** — 7 error boundary pages import it
- `@google/genai` and `radix-ui` are **actively used** — do NOT remove
- Only **2 of 7** `api as any` files remain unfixed
- `billing`, `my-tools`, `templates`, `shared-tool` features **already have tests**
- All 11 Convex function files **already have test files**
- `calculateAge` has **no duplicate** — false alarm

---

## Phase 1: Type Safety & Query Performance (HIGH priority)

### Step 1.1 — Remove `api as any` casts (2 files)

The Convex generated types already include `homePrograms` and `goals`. No codegen needed.

**`src/features/patients/components/home-programs-widget.tsx`**
- Delete line 13: `const extendedApi = api as any;`
- Line 37: `extendedApi.homePrograms.listByPatient` → `api.homePrograms.listByPatient`

**`src/features/family/components/family-dashboard.tsx`**
- Delete line 30: `const extendedApi = api as any;`
- Line 32: `extendedApi.goals.listByPatient` → `api.goals.listByPatient`

### Step 1.2 — Use composite index instead of .filter() (3 files)

The composite index `by_caregiverUserId_patientId` already exists in schema. These queries use the single-field index `by_caregiverUserId` then `.filter()` on `patientId` — wasteful.

**In each of these 3 locations**, change:
```typescript
.withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
.filter((q) => q.eq(q.field("patientId"), args.patientId))
.filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
```
To:
```typescript
.withIndex("by_caregiverUserId_patientId", (q) =>
  q.eq("caregiverUserId", userId).eq("patientId", args.patientId)
)
.filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
```

Files:
- `convex/caregivers.ts` lines 152-157
- `convex/patientMaterials.ts` lines 64-69
- `convex/patients.ts` lines 96-101

Note: `convex/caregivers.ts` line 177 (`listByCaregiver`) only filters on `inviteStatus` — already optimal, no change needed. `convex/lib/auth.ts` functions already use the composite index correctly.

---

## Phase 2: Error Handling (HIGH priority)

### Step 2.1 — Fix silent catch in auto-save

**`src/features/builder/components/builder-page.tsx` line 217**

Change `.catch(() => {})` to:
```typescript
.catch((err) => {
  console.warn("[builder] Auto-save failed:", err);
})
```

### Step 2.2 — Add error logging to invite-landing

**`src/features/patients/components/invite-landing.tsx` lines 35-38**

Replace generic catch:
```typescript
.catch((err) => {
  console.error("[invite] Failed to accept:", err);
  toast.error("Failed to accept invite. Please try again.");
  setIsAccepting(false);
})
```

### Step 2.3 — Protect JSON.parse in SSE hooks (2 files)

Both hooks have identical unprotected `JSON.parse` on SSE data.

**`src/features/session-notes/hooks/use-soap-generation.ts` line 104**
**`src/features/goals/hooks/use-report-generation.ts` line 80**

In both files, wrap the parse:
```typescript
let data;
try {
  data = JSON.parse(lines[i + 1].slice(6));
} catch {
  console.warn("[sse] Malformed event data, skipping");
  i++;
  continue;
}
i++;
```

### Step 2.4 — Fix interview controller race condition

**`src/features/builder/components/interview/interview-controller.tsx`**

1. Add `if (cancelled) return;` after `const data = await res.json();` (before using data)
2. Add basic response validation:
   ```typescript
   const followUps = Array.isArray(data.followUps) ? data.followUps : [];
   const draftBlueprint = data.blueprint != null && typeof data.blueprint === "object"
     ? data.blueprint : null;
   ```
3. Add `console.warn("[interview] Follow-up fetch failed:", err)` in the outer catch

### Step 2.5 — Log localStorage failures

**`src/features/family/components/celebration-card.tsx`**

Read catch (line ~81): Add `console.warn("[celebration] localStorage unavailable")` and change `return true` to `return false` (don't show cards in private browsing — avoids re-render loop).

Write catch (line ~90): Add `console.warn("[celebration] Could not persist dismissal")`.

---

## Phase 3: Environment Configuration (MEDIUM priority)

### Step 3.1 — Update `src/env.ts`

Add missing variables and fix FAL_KEY:

```typescript
export const env = createEnv({
  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
  server: {
    ANTHROPIC_API_KEY: z.string().min(1),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
    ELEVENLABS_API_KEY: z.string().min(1),
    FAL_KEY: z.string().optional(),  // was: .min(1) — empty in .env.local
    CONVEX_DEPLOYMENT: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string().url(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().optional(),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().optional(),
  },
  runtimeEnv: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    FAL_KEY: process.env.FAL_KEY,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  },
});
```

### Step 3.2 — Update `.env.example`

Rename `GOOGLE_API_KEY` → `GOOGLE_GENERATIVE_AI_API_KEY` and add all missing variables:

```
# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# AI - Claude
ANTHROPIC_API_KEY=

# AI - Google (Embeddings + Image Generation)
GOOGLE_GENERATIVE_AI_API_KEY=

# TTS - ElevenLabs
ELEVENLABS_API_KEY=

# Image Generation - fal.ai (optional)
FAL_KEY=

# Auth - Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

---

## Phase 4: Dead Code Cleanup (LOW priority)

### Step 4.1 — Remove unused function

**`src/features/patients/lib/patient-utils.ts`** — Delete `formatFullName()` (lines 34-36)
**`src/features/patients/lib/__tests__/patient-utils.test.ts`** — Delete corresponding tests

### Step 4.2 — Remove unused CSS classes

**`src/app/globals.css`** — Delete `glass-effect` (lines 141-148) and `safe-space-container` (lines 150-153)

### Step 4.3 — Remove unused shared components

Delete these files and their tests:
- `src/shared/components/animated-gradient.tsx` + `__tests__/animated-gradient.test.tsx`
- `src/shared/components/tool-card.tsx` + `__tests__/tool-card.test.tsx`
- `src/shared/components/type-badge.tsx` + `__tests__/type-badge.test.tsx`

**DO NOT delete `error-display.tsx`** — it's used by 7 error boundary pages.

### Step 4.4 — Remove unused dependency

```bash
npm uninstall use-sound
```

**DO NOT remove `@google/genai`** (used in `convex/image_generation.ts`) or **`radix-ui`** (used by all shadcn components).

### Step 4.5 — Fix npm audit vulnerability

```bash
npm audit fix
```

Fixes `brace-expansion` moderate severity in eslint toolchain.

---

## Phase 5: Test Coverage (MEDIUM priority, largest effort)

### Untested Areas

Only 2 features have significant gaps:
- **Patients**: 18 untested components/hooks (patient-utils.ts already tested)
- **Flashcards**: 14 untested components/hooks/utils

### Step 5.0 — Extract shared test fixtures

Create `src/test/fixtures/patient-fixtures.ts`:
- `createMockPatient(overrides?)` — returns `Doc<"patients">` with defaults
- `createMockHomeProgram(overrides?)`, `createMockActivity(overrides?)`, etc.

Create `src/test/fixtures/flashcard-fixtures.ts`:
- `createMockDeck(overrides?)`, `createMockCard(overrides?)`, etc.

### Step 5.1 — Wave 1: Pure utils and hooks (SIMPLE, ~1.5h)

All parallelizable, no DOM rendering:
- `flashcards/lib/constants.ts` — test non-empty array
- `flashcards/lib/flashcard-prompt.ts` — test function output contains key sections
- `flashcards/hooks/use-deck-navigation.ts` — `renderHook` + `act`, test bounds/keyboard
- `patients/hooks/use-patients.ts` — mock convex/react, verify args and "skip" logic
- `patients/hooks/use-invite.ts` — same pattern

### Step 5.2 — Wave 2: Simple presentational components (SIMPLE, ~3.5h)

All parallelizable, render + basic assertions:
- `patients/components/patient-row.tsx`
- `patients/components/create-material-button.tsx`
- `patients/components/activity-timeline.tsx`
- `patients/components/assigned-materials.tsx`
- `flashcards/components/flashcard-card.tsx`
- `flashcards/components/deck-card.tsx`
- `flashcards/components/rename-deck-dialog.tsx`

### Step 5.3 — Wave 3: Components with mutations (MEDIUM-COMPLEX, ~7h)

- `patients/components/quick-notes.tsx`
- `patients/components/caregiver-info.tsx` (COMPLEX — invite/revoke flows)
- `patients/components/patient-profile-widget.tsx`
- `patients/components/home-program-form.tsx` (COMPLEX — form validation)
- `patients/components/patient-intake-form.tsx` (COMPLEX — largest form)
- `flashcards/components/flashcard-toolbar.tsx`

### Step 5.4 — Wave 4: Query-driven composition (MEDIUM-COMPLEX, ~7.5h)

- `patients/components/patient-row-expanded.tsx`
- `patients/components/home-programs-widget.tsx`
- `patients/components/engagement-summary.tsx`
- `patients/components/invite-landing.tsx` (COMPLEX — React.use, auto-accept)
- `flashcards/components/deck-list.tsx`
- `flashcards/components/flashcard-preview-panel.tsx`
- `flashcards/components/flashcard-chat-panel.tsx` (COMPLEX)
- `flashcards/components/flashcard-swiper.tsx`

### Step 5.5 — Wave 5: Pages and streaming (COMPLEX, ~7.5h)

- `patients/components/patients-page.tsx`
- `patients/components/patient-detail-page.tsx`
- `flashcards/hooks/use-flashcard-streaming.ts` (COMPLEX — SSE mocking)
- `flashcards/components/flashcard-page.tsx` (COMPLEX — full page composition)
- `flashcards/lib/flashcard-tools.ts` (COMPLEX — Anthropic tools)

### Step 5.6 — Unskip Stripe test

**`convex/__tests__/subscriptions.test.ts`** — Refactor `convex/entitlements.ts` to delegate to `convex/lib/billing.ts:checkPremiumStatus()` which already wraps the Stripe component call in try/catch. Then unskip the test.

### If time-limited, prioritize these 8 files (highest risk):

1. `patient-intake-form.tsx` — form validation bugs lose patient data
2. `use-patients.ts` — auth-gated queries
3. `invite-landing.tsx` — auto-accept race conditions
4. `use-flashcard-streaming.ts` — SSE parsing
5. `caregiver-info.tsx` — invite/revoke mutations
6. `patients-page.tsx` — filter/search logic
7. `home-program-form.tsx` — form validation
8. `flashcard-tools.ts` — AI tool definitions

---

## Verification

After all changes:

1. **Type check**: `npx tsc --noEmit` — should pass with zero errors
2. **Build**: `npm run build` — verify env validation doesn't break
3. **Unit tests**: `npm test` — all 636+ tests pass, no new failures
4. **Convex deploy**: `npx convex dev` — verify index changes work
5. **Manual smoke test**: Sign in → patients page → view patient detail → check caregiver access still works (validates composite index change)
6. **Audit**: `npm audit` — should show 0 moderate+ vulnerabilities after fix

---

## Execution Order

Phases 1-4 can be done in a single session (~2-3 hours). Phase 5 is ~29 hours of test writing and should be done incrementally across multiple sessions.

Within Phases 1-4, all steps are independent of each other except:
- Step 3.1 (env.ts) should be tested with `npm run build` before committing
- Step 4.4 (npm uninstall) should be done before Step 4.5 (npm audit fix)
