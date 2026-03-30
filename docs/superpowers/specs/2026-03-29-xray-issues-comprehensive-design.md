# X-Ray Issues Comprehensive Fix — Design Spec

> Generated 2026-03-29 | Health Score target: 72 → 85+
> Scope: ARCH-1, CHURN-1, TEST-3/4/5, SCHEMA-1, SLICE-1, SLICE-2

---

## Overview

Address all remaining open issues from the X-Ray report: cross-slice architecture violations, route handler decomposition, test coverage gaps, schema hygiene, full production billing, and stub slice expansion.

### Execution Strategy: Staged Worktrees

- **Worktree 1 (parallel):** ARCH-1 (cross-slice → shared clinical layer)
- **Worktree 2 (parallel):** CHURN-1 (route.ts decomposition)
- **After ARCH-1 merges:** Worktree 3: TEST-3/4/5 (test expansion — depends on ARCH-1 import paths)
- **Sequential after all merge:** SCHEMA-1 → SLICE-1 → SLICE-2

> **Note:** TEST-3/4/5 depends on ARCH-1 because tests for `session-note-editor` and `structured-data-form` must import hooks from their new `src/shared/clinical/` locations. Running tests in parallel with ARCH-1 would produce guaranteed merge conflicts.

### Import Layer Rules

| Layer | May Import From | Examples |
|---|---|---|
| `src/core/` | External packages only | Providers, utils |
| `src/shared/` | `src/core/`, external packages | Clinical hooks, UI primitives |
| `src/features/{name}/` | `src/shared/`, `src/core/`, own directory | Feature-specific components |
| `src/app/` (pages) | Any feature, `src/shared/`, `src/core/` | Route-level composition |
| `src/app/api/` (routes) | Any feature, `src/shared/`, `src/core/` | API-level composition |

> `src/app/` and `src/app/api/` are **composition layers** — they are allowed to import from multiple feature slices to wire them together. This is by design, not a violation.

---

## ARCH-1: Cross-Slice Coupling Fix

### Problem

Four cross-slice import violations between patients, session-notes, and goals:

| Source | Imports From | What |
|---|---|---|
| `session-notes/structured-data-form.tsx` | `goals/hooks/use-goals` | `useActiveGoals` |
| `session-notes/structured-data-form.tsx` | `patients/lib/patient-utils` | `formatAge` |
| `session-notes/session-note-editor.tsx` | `patients/hooks/use-patients` | `usePatient` |
| `patients/patient-detail-page.tsx` | `session-notes`, `goals` | `SessionNotesList`, `GoalsList` |
| `builder/builder-page.tsx` | `sharing/share-dialog` | `ShareDialog` |

### Solution: Shared Clinical Layer + Route-Level Composition

**Create `src/shared/clinical/`:**

| File | Contents | Moved From |
|---|---|---|
| `use-patient.ts` | `usePatient` hook | `patients/hooks/use-patients` |
| `use-active-goals.ts` | `useActiveGoals` hook | `goals/hooks/use-goals` |
| `patient-utils.ts` | `formatAge` and shared formatters | `patients/lib/patient-utils` |
| `types.ts` | Shared clinical types (Patient, Goal) | Extracted from both slices |

**Route-level composition for patient-detail:**

- `src/app/(app)/patients/[id]/page.tsx` becomes the composer
- It imports `SessionNotesList` and `GoalsList` directly (route layer, not feature slice)
- `patient-detail-page.tsx` receives these as render props or children
- Eliminates cross-slice imports from the patients feature

**Move `ShareDialog` to `src/shared/components/share-dialog.tsx`** — used by both builder and sharing routes.

### Post-Fix Import Rules

- Feature slices import only from `src/shared/`, `src/core/`, or their own directory
- Route pages (`src/app/`) compose slices together — this is their job
- No feature-to-feature imports

---

## CHURN-1: generate/route.ts Decomposition

### Problem

369-line POST handler with 16 distinct phases. Highest churn file (51 changes in 30 days). Changes to bundling risk breaking auth; changes to tools risk breaking rate limiting.

### Current Extractions (Already Done)

`agent-prompt`, `agent-tools`, `patient-context`, `schemas/generate`, `flashcard-prompt`, `flashcard-tools`, `build-limiter`, `run-bundle-worker`, `sse`

### New Extractions

| New Module | Responsibility | ~Lines |
|---|---|---|
| `src/app/api/generate/lib/auth.ts` | Clerk auth check, demo mode fallback | 20 |
| `src/app/api/generate/lib/patient-context-loader.ts` | Fetch patient + goals from Convex, build context block | 25 |
| `src/app/api/generate/lib/stream-handler.ts` | Tool runner loop, LLM streaming, message accumulation | 80 |
| `src/app/api/generate/lib/bundle-and-persist.ts` | esbuild bundling with retry, file batch persistence to Convex | 80 |
| `src/app/api/generate/lib/session-lifecycle.ts` | Session creation/recovery, state transitions | 30 |

### route.ts After (~80-100 lines)

```
POST → authenticate → validate → rateLimit → loadPatientContext
     → createSession → streamToClient(handler) → bundleAndPersist
     → transitionSession → done
```

**Stays in route.ts:**
- `POST` export (Next.js requires it)
- `ReadableStream` construction (framework-coupled SSE plumbing)
- Top-level try/catch orchestration

> **Note on imports:** `stream-handler.ts` and other modules in `src/app/api/generate/lib/` sit in the API composition layer. They are allowed to import from feature slices (`@/features/builder/lib/agent-tools`, `@/features/flashcards/lib/flashcard-tools`, etc.) — the same way route pages import from features. The ARCH-1 "no cross-feature imports" rule applies to feature slices importing from *each other*, not to composition layers importing from features.

---

## TEST-3/4/5: Test Coverage Expansion

### Approach

- Reuse Convex mock patterns from patients/flashcards test commit (`c021467`)
- Mock Clerk auth via `vi.mock("@clerk/nextjs")`
- Focus on render + interaction tests, not snapshots
- Colocate in `__tests__/` within each feature

### TEST-3: Session-Notes (2 → ~9 tests)

| Test File | Covers | Priority |
|---|---|---|
| `structured-data-form.test.tsx` | Target entry, trial data input, prompt level selection | High |
| `session-note-editor.test.tsx` | Editor layout, patient context display, form submission | High |
| `soap-preview.test.tsx` | SOAP section rendering, sign-off button state, signature | High |
| `session-note-card.test.tsx` | Card rendering, status badges, click-to-expand | Medium |
| `session-notes-list.test.tsx` | List filtering, empty state, loading state | Medium |
| `use-session-notes.test.ts` | Hook query behavior, filtering logic | Medium |
| `use-soap-generation.test.ts` | AI generation trigger, streaming state, error handling | Medium |

### TEST-4: Goals (3 → ~8 tests)

| Test File | Covers | Priority |
|---|---|---|
| `goal-form.test.tsx` | SMART goal validation, domain picker, target baseline | High |
| `goals-list.test.tsx` | List rendering, status filtering, empty state | High |
| `progress-entry-form.test.tsx` | Data entry, accuracy calculation, trial counting | High |
| `progress-chart.test.tsx` | Trend visualization, data point display | Medium |
| `progress-report-generator.test.tsx` | Report generation trigger, streaming, output | Medium |

### TEST-5: Family (5 → ~8 tests)

| Test File | Covers | Priority |
|---|---|---|
| `messaging-thread.test.tsx` | Message list, send message, empty state | Medium |
| `weekly-progress-chart.test.tsx` | Chart rendering, week boundaries, aggregation | Medium |
| `celebration-cards.test.tsx` | Achievement display, animation triggers | Low |

---

## SCHEMA-1: Session State Tightening

### Problem

`state: v.string()` accepts any string including typos. Legacy pipeline documents have old state values.

### Solution

```typescript
// convex/schema.ts
state: v.union(
  // Active states
  v.literal("idle"),
  v.literal("generating"),
  v.literal("live"),
  v.literal("failed"),
  // Legacy (kept for existing documents, not created by new code)
  v.literal("blueprinting"),
  v.literal("planning"),
  v.literal("phase_implementing"),
),
```

```typescript
// Shared type for code that writes state
export type SessionState = "idle" | "generating" | "live" | "failed";
```

- Code that writes state uses `SessionState` type only
- Schema union includes legacy literals for existing document validation
- No data migration needed

---

## SLICE-1: Full Production Billing

### Current State

- `billing-section.tsx` (104 lines) — checkout redirect + portal link
- `upgrade-prompt.tsx` (51 lines) — upgrade CTA
- `convex/lib/billing.ts` (36 lines) — Stripe helpers

### New Frontend Components

| Component | Purpose |
|---|---|
| `plan-comparison-card.tsx` | Side-by-side Free vs Premium features, current plan highlighted |
| `usage-meter.tsx` | Visual bar: apps built / limit, generation count |
| `billing-history.tsx` | Invoice list with date, amount, status, PDF link |
| `upgrade-confirmation-dialog.tsx` | Confirm plan change with price preview, proration |
| `downgrade-warning-dialog.tsx` | Warn about feature loss, confirm downgrade |

### Backend Additions

**New table in `convex/schema.ts`:**
```typescript
usage: defineTable({
  userId: v.string(),
  periodStart: v.number(), // timestamp of billing period start
  generationCount: v.number(),
  appCount: v.number(),
}).index("by_userId", ["userId"])
  .index("by_userId_period", ["userId", "periodStart"]),
```

**New file `convex/usage.ts`:**
- `getUsage` query — current period usage for a user
- `checkQuota` query — returns { allowed: boolean, reason?: string }
- `incrementUsage` mutation — called after successful generation

**Enhanced `convex/billing.ts`:**
- `getInvoices` action — fetch from Stripe API
- `getCurrentPlan` query — user's active plan
- Webhook handlers for `payment_intent.payment_failed`, `invoice.payment_failed`

### Quota Enforcement

- `checkQuota` called at top of `api/generate/route.ts` before streaming
- Free tier: 5 apps, 20 generations/month
- Premium: unlimited
- Soft limit — show upgrade prompt, don't hard-block mid-generation

### Webhook Failure Handling

- On `payment_failed`: set user plan to `"past_due"` (not immediate downgrade)
- Show banner: "Payment failed — update your card"
- After 3 days past_due → downgrade to free

### Tests

Each new component gets a colocated test file testing rendering, state transitions, and edge cases.

---

## SLICE-2: Templates & My-Tools Expansion

### Templates (95 → ~350 LOC)

| Addition | Description |
|---|---|
| Category filter bar | Horizontal pill tabs using existing `category` field: All, Communication, Social Skills, Daily Living, Academic, Sensory |
| Search input | Debounced text search over template name + description |
| Template preview card | Hover/click to see screenshot + description |
| Sort options | Popular (usage count), Newest, Alphabetical |

**Backend:** Leverage existing `category: v.string()` field and `by_category` index on `therapyTemplates` table. Add `usageCount: v.optional(v.number())` field for popularity sort. Add `incrementTemplateUsage` mutation called when a user starts a session from a template.

### My-Tools (140 → ~400 LOC)

| Addition | Description |
|---|---|
| Search bar | Filter by app name |
| Sort dropdown | Last edited, Alphabetical, Most shared |
| Edit action | Rename app inline |
| Delete action | Confirmation dialog → soft delete (`archived: true`) |
| Duplicate action | Clone app to new session |
| Empty state | Friendly illustration + CTA to builder |

**Backend:** Add `archived: v.optional(v.boolean())` to sessions table. Add `duplicateSession` mutation.

**Existing session queries that need `archived !== true` guards:**
- `convex/sessions.ts` — `listByUser`, `getByUser`, any query returning user-visible session lists
- `src/features/my-tools/` — the my-tools page query
- `src/features/builder/` — session recovery/resume logic (should still find archived sessions if accessed by direct ID, but not list them)

> Queries that look up a single session by ID (`get`, `getBySessionId`) do NOT need the guard — archived sessions should remain accessible via direct link, just hidden from lists.

### Sharing & Shared-Tool

No changes — current implementations are functional and sufficient.

### Tests

Each new component gets a colocated test file covering filter state, search debounce, empty results, delete confirmation, duplicate trigger, and sort order.

---

## Execution Order

1. **Parallel worktrees:** ARCH-1, CHURN-1
2. **After ARCH-1 merges:** TEST-3/4/5 (depends on new import paths)
3. **Sequential:** SCHEMA-1 (quick, after merges)
4. **Sequential:** SLICE-1 (billing — new features)
5. **Sequential:** SLICE-2 (templates + my-tools — new features)

## Success Criteria

- Zero cross-slice import violations (enforceable via ESLint rule)
- `route.ts` under 100 lines
- Test count increases by ~20 files across session-notes, goals, family
- Session state field is strongly typed
- Billing has plan comparison, usage tracking, invoice history, webhook failure handling
- Templates has category filter + search + sort
- My-Tools has search + sort + edit/delete/duplicate actions
- All existing tests still pass
