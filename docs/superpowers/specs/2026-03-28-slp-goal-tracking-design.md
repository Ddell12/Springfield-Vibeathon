# Subsystem 3: IEP Goal Tracking & Progress Measurement — Design Spec

**Date:** 2026-03-28
**Status:** Approved design
**Depends on:** Subsystem 1 (patients, activityLog), Subsystem 2 (sessionNotes sign mutation)
**Master roadmap:** `docs/superpowers/specs/2026-03-28-slp-platform-master-roadmap.md`

---

## Overview

SLPs write IEP goals like "Alex will produce /r/ in the initial position of words with 80% accuracy across 3 consecutive sessions." Tracking progress toward these goals today involves spreadsheets and memory. Progress reports for IEP meetings are assembled manually from weeks of session data.

This subsystem adds structured goal tracking with measurable criteria, automatic progress calculation from session note data, and AI-synthesized progress reports.

---

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Progress data creation trigger | On session note **sign** (not save) | Only finalized, reviewed data feeds progress tracking — draft data with incomplete trials shouldn't move the needle. IEP compliance. |
| Goal bank storage | Static TypeScript data (`goal-bank-data.ts`) | UI convenience feature; no DB overhead. RAG integration deferred to subsystem 5. |
| Progress chart visualization | Accuracy line + prompt-level color-coded dots | Prompt level is clinically significant. Single chart, two dimensions. Data table below for full detail. |
| "Goal met" detection | Banner notification on goal detail, SLP confirms | IEP goals are legal documents. Auto-transition is too risky. Banner is low-friction but keeps SLP in control. |
| Progress report export | Browser print (CSS print stylesheet) | Zero dependencies. SLPs are familiar with Print-to-PDF from EHR systems. Clean `@media print` stylesheet. |
| Progress report sign workflow | Full sign workflow (draft → reviewed → signed) | IEP progress reports carry legal weight — submitted to school districts. Mirrors session notes pattern. |

---

## Implementation Phases

### Phase 1: Goals CRUD + Goal Bank Picker
- Schema: `goals` table
- Convex functions: `goals.ts` (list, listActive, get, create, update, remove)
- UI: goals-list widget on patient detail, goal-form dialog, goal-bank-picker, goal-detail page
- Route: `/patients/[id]/goals/[goalId]`

### Phase 2: Progress Data Pipeline
- Schema: `progressData` table
- Convex functions: `progressData.ts` (listByGoal, listByPatient, createManual)
- Convex helpers: `lib/progress.ts` (calculateStreak, detectTrend, checkGoalMet, insertProgressFromTargets)
- Modify `sessionNotes.sign` to auto-create progressData rows
- Modify `structured-data-form.tsx` to add goal picker on target rows
- UI: progress-chart, progress-data-table, goal-met-banner

### Phase 3: AI Progress Reports
- Schema: `progressReports` table
- Convex functions: `progressReports.ts` (list, get, create, updateNarrative, markReviewed, sign, unsign)
- API route: `/api/generate-report` (SSE streaming, same pattern as `/api/generate-soap`)
- UI: progress-report-generator, progress-report-viewer with sign workflow + print export

---

## Data Model

### `goals` table

```ts
goals: defineTable({
  patientId: v.id("patients"),
  slpUserId: v.string(),
  domain: v.union(
    v.literal("articulation"),
    v.literal("language-receptive"),
    v.literal("language-expressive"),
    v.literal("fluency"),
    v.literal("voice"),
    v.literal("pragmatic-social"),
    v.literal("aac"),
    v.literal("feeding")
  ),
  shortDescription: v.string(),       // e.g., "Produce /r/ in initial position"
  fullGoalText: v.string(),           // Complete IEP goal with measurable criteria
  targetAccuracy: v.number(),          // e.g., 80 (percent)
  targetConsecutiveSessions: v.number(), // e.g., 3
  status: v.union(
    v.literal("active"),
    v.literal("met"),
    v.literal("discontinued"),
    v.literal("modified")
  ),
  startDate: v.string(),              // ISO date
  targetDate: v.optional(v.string()), // IEP review date
  notes: v.optional(v.string()),
})
  .index("by_patientId", ["patientId"])
  .index("by_patientId_status", ["patientId", "status"])
```

### `progressData` table

```ts
progressData: defineTable({
  goalId: v.id("goals"),
  patientId: v.id("patients"),         // Denormalized for efficient queries
  source: v.union(
    v.literal("session-note"),
    v.literal("in-app-auto"),
    v.literal("manual-entry")
  ),
  sourceId: v.optional(v.string()),    // Intentionally v.string() (not v.id) — holds IDs from multiple tables (sessionNotes, future app interactions)
  date: v.string(),                    // ISO date
  trials: v.optional(v.number()),
  correct: v.optional(v.number()),
  accuracy: v.number(),               // Calculated percentage
  promptLevel: v.optional(v.union(
    v.literal("independent"),
    v.literal("verbal-cue"),
    v.literal("model"),
    v.literal("physical")
  )),
  notes: v.optional(v.string()),
  timestamp: v.number(),
})
  .index("by_goalId", ["goalId"])
  .index("by_goalId_date", ["goalId", "date"])
  .index("by_patientId_date", ["patientId", "date"])
```

### `progressReports` table

```ts
progressReports: defineTable({
  patientId: v.id("patients"),
  slpUserId: v.string(),
  reportType: v.union(
    v.literal("weekly-summary"),
    v.literal("monthly-summary"),
    v.literal("iep-progress-report")
  ),
  periodStart: v.string(),
  periodEnd: v.string(),
  goalSummaries: v.array(v.object({
    goalId: v.string(),               // Stored as string (not v.id) since report is a snapshot — goal may be modified/deleted after report is signed
    shortDescription: v.string(),
    domain: v.union(
      v.literal("articulation"),
      v.literal("language-receptive"),
      v.literal("language-expressive"),
      v.literal("fluency"),
      v.literal("voice"),
      v.literal("pragmatic-social"),
      v.literal("aac"),
      v.literal("feeding")
    ),
    accuracyTrend: v.union(
      v.literal("improving"),
      v.literal("stable"),
      v.literal("declining")
    ),
    averageAccuracy: v.number(),
    sessionsCount: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("met"),
      v.literal("discontinued"),
      v.literal("modified")
    ),
    narrative: v.string(),            // AI-generated per-goal summary
  })),
  overallNarrative: v.string(),       // AI-generated summary across all goals
  status: v.union(
    v.literal("draft"),
    v.literal("reviewed"),
    v.literal("signed")
  ),
  signedAt: v.optional(v.number()),
})
  .index("by_patientId", ["patientId"])
  .index("by_patientId_reportType", ["patientId", "reportType"])
```

### Modifications to existing tables

**`activityLog.action` validator** — Add four new literals:
- `"goal-created"`, `"goal-met"`, `"goal-modified"`, `"report-generated"`

**`sessionNotes.sign` mutation** — After signing, iterate `structuredData.targetsWorkedOn` entries that have a `goalId`, verify the goal exists and belongs to this patient, calculate accuracy (`correct / trials * 100`), and insert a `progressData` row with `source: "session-note"` and `sourceId: noteId`. Skip targets where both `trials` and `correct` are missing (no meaningful data point).

**Important precondition:** The existing `sign` mutation only accepts notes with `status === "complete"`. Progress data is only created from finalized, complete notes — never from drafts or in-progress notes.

**Convex constraint:** Mutations cannot call `ctx.runMutation()` — that API is only available in actions. The progress data inserts are done inline via `ctx.db.insert("progressData", ...)` directly in the `sign` mutation. Extract the insert logic into a shared helper function (`convex/lib/progress.ts`: `insertProgressFromTargets(ctx.db, targets, noteId, patientId, sessionDate)`) for testability, but it runs within the sign mutation's transaction.

**Existing code change:** The `TargetData` interface in `src/features/session-notes/components/target-entry.tsx` must be extended to include the `goalId` field, which already exists in the schema validator but is missing from the client-side TypeScript interface.

**Design note:** `progressData` intentionally omits `slpUserId`. Progress data is always accessed through goal or patient context, both of which carry `slpUserId`. Adding it would be denormalization without a query need.

---

## Convex Functions

### `convex/goals.ts`

**Queries:**

- **`list`** — By `patientId`, returns all goals ordered by creation time. SLP ownership check via patient.
- **`listActive`** — Filtered to `status: "active"` using `by_patientId_status` index. Used by the goal picker in session notes and the patient detail widget.
- **`get`** — Single goal by ID with SLP auth check.
- **`getWithProgress`** — Single goal + its `progressData` entries (last 20 by date). Powers the goal detail view.

**Mutations:**

- **`create`** — Validates: shortDescription 1-200 chars, fullGoalText 1-2000 chars, targetAccuracy 1-100, targetConsecutiveSessions 1-10, startDate valid ISO. Inserts goal + `activityLog` entry with `goal-created`.
- **`update`** — Patch fields on non-met goals. If status changes to `met`, logs `goal-met`. If status changes to `modified`, logs `goal-modified`. Cannot edit a `met` goal (must change status to `modified` first to reopen it).
- **`remove`** — Soft-delete by setting status to `discontinued`. Keeps data for historical reports. Logs `goal-modified`.

### `convex/progressData.ts`

**Queries:**

- **`listByGoal`** — All data points for a goal, ordered by date desc. Powers the progress chart.
- **`listByPatient`** — All data points for a patient within a date range. Uses `by_patientId_date` index with range operators. ISO date strings compare correctly as strings (`"2026-03-01" < "2026-03-28"`). Powers the report generator.

**Mutations:**

- **`createFromSessionNote`** — **Not a separate mutation.** The progress data inserts are done inline in the `sessionNotes.sign` mutation via a shared helper function (`convex/lib/progress.ts`: `insertProgressFromTargets`). This helper takes `ctx.db` and the target data, and calls `ctx.db.insert("progressData", ...)` for each target. Convex mutations cannot call other mutations — everything runs in one transaction.
- **`createManual`** — SLP manually adds a data point for a goal (for data collected outside the app). Validates accuracy 0-100, trials/correct consistency.

### `convex/lib/progress.ts`

**Helpers:**

- **`calculateStreak(dataPoints, targetAccuracy)`** — Returns the current consecutive-sessions-at-target count. Iterates from most recent backward, counting entries where `accuracy >= targetAccuracy`. Stops at first entry below target.
- **`detectTrend(dataPoints)`** — Returns `"improving" | "stable" | "declining"` based on linear regression slope over the last 5+ data points. Fewer than 5 points returns `"stable"` (insufficient data).
- **`checkGoalMet(goal, dataPoints)`** — Returns `boolean` — whether the streak from `calculateStreak` meets or exceeds `goal.targetConsecutiveSessions`.

### `convex/progressReports.ts`

**Queries:**

- **`list`** — By `patientId`, ordered by `periodEnd` desc.
- **`get`** — Single report by ID with SLP auth check.

**Mutations:**

- **`create`** — Creates a draft report with AI-generated content. Called by the API route after generation.
- **`updateNarrative`** — SLP edits the overall narrative or per-goal narratives. Only on `draft` or `reviewed` status.
- **`markReviewed`** — Transitions `draft → reviewed`.
- **`sign`** — Transitions `reviewed → signed`, sets `signedAt`. Requires all goal summaries present. Logs `report-generated` to activity log.
- **`unsign`** — Transitions `signed → reviewed`, clears `signedAt`.

---

## API Route: `/api/generate-report`

SSE streaming endpoint following the same pattern as `/api/generate-soap`.

**Request body:**
```ts
{
  patientId: string,
  reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report",
  periodStart: string,  // ISO date
  periodEnd: string,    // ISO date
}
```

**Flow:**
1. Auth check (Clerk JWT)
2. Fetch in parallel: patient profile, active goals for patient, all `progressData` within date range, session notes within date range (for context)
3. Build system prompt with patient context, per-goal data (definition, data points, trend, streak), and report type instructions
4. Stream Claude response via SSE (`report-chunk` events)
5. Parse structured response (per-goal summaries + overall narrative)
6. Create `progressReports` row via Convex mutation with status `draft`
7. Send `report-complete` event with the report ID

**System prompt** (in `src/features/goals/lib/progress-prompt.ts`):
- Role: clinical documentation specialist familiar with ASHA standards and IEP compliance
- IEP reports: formal educational language, reference measurable criteria, note progress toward benchmarks
- Weekly/monthly: conversational but professional, highlight wins, flag concerns
- Include previous report's narrative (if one exists) for continuity

**Error handling:**
- No goals found → 400 with message
- No progress data in range → generate report noting insufficient data (don't error)
- Patient not found / unauthorized → 401/404

---

## Feature Slice

### File structure

```
src/features/goals/
  components/
    goals-list.tsx               — Per-patient goal list with sparklines
    goal-detail.tsx              — Full goal view with chart + data table
    goal-form.tsx                — Add/edit goal form (dialog)
    goal-bank-picker.tsx         — Pre-populated goal template selector
    progress-chart.tsx           — Recharts line chart with prompt-level dots
    progress-data-table.tsx      — Tabular view of all data points
    goal-met-banner.tsx          — "Goal criteria met — confirm?" banner
    progress-report-viewer.tsx   — AI report review/edit/sign + print export
    progress-report-generator.tsx — Report type/date range picker + trigger
  hooks/
    use-goals.ts                 — Query hooks wrapping Convex goals functions
    use-progress.ts              — Progress data query hooks
    use-report-generation.ts     — SSE streaming state for report generation
  lib/
    goal-utils.ts                — Accuracy calculation, streak detection (client mirrors)
    progress-prompt.ts           — System prompt for AI report generation
    goal-bank-data.ts            — Static array of common IEP goal templates by domain
```

### New dependency

- **`recharts`** — Install via `npm install recharts`. Used for progress line charts and sparklines. No other new npm dependencies.

### Goal bank data shape (`goal-bank-data.ts`)

```ts
interface GoalTemplate {
  id: string;                          // Unique template ID, e.g., "artic-initial-r"
  domain: GoalDomain;                  // Matches the goals table domain union
  shortDescription: string;            // e.g., "Produce /r/ in initial position"
  fullGoalText: string;                // Template with placeholders: "...with {accuracy}% accuracy across {sessions} consecutive sessions"
  defaultTargetAccuracy: number;       // e.g., 80
  defaultConsecutiveSessions: number;  // e.g., 3
}
```

Templates are grouped by domain. The picker filters by selected domain, showing 5-15 templates per domain covering the most common IEP goals.

### Patient detail page integration

New **"Goals" widget** added to the patient detail page left column, above SessionNotesList:

```
┌─ Patient Profile (full width) ────────────────────┐
├─ Left Column ──────────────┬─ Right Column ─────────┤
│ ┌─ Goals ────────────────┐ │ ┌─ Assigned Materials ─┐│
│ │ ★ Produce /r/ initial  │ │ │                      ││
│ │   ▂▃▅▆▇ 72% → 80%     │ │ │                      ││
│ │ ★ Follow 2-step dirs   │ │ └──────────────────────┘│
│ │   ▁▂▃▃▅ 60% → 90%     │ │ ┌─ Caregiver Info ─────┐│
│ │ [+ Add Goal]           │ │ │                      ││
│ └────────────────────────┘ │ └──────────────────────┘│
│ ┌─ Session Notes ────────┐ │                         │
│ └────────────────────────┘ │                         │
│ ┌─ Activity Timeline ────┐ │                         │
│ └────────────────────────┘ │                         │
└────────────────────────────┴─────────────────────────┘
```

Each goal row: domain icon, short description, mini sparkline (last 10 data points), current accuracy → target accuracy. Clicking navigates to goal detail.

### Goals list (`goals-list.tsx`)

- Fetches active goals via `goals.listActive`
- Compact cards with sparklines (tiny inline SVG or Recharts `<Sparkline>`)
- "Add Goal" button opens dialog with `goal-form.tsx`
- Empty state: "No goals yet — add IEP goals to track progress"

### Goal form (`goal-form.tsx`)

Two entry modes:
1. **Goal bank** — Pick domain, see filtered templates from `goal-bank-data.ts`, select one. Pre-fills shortDescription, fullGoalText (with placeholder numbers), domain. SLP edits numbers.
2. **Freeform** — Write own goal text. Pick domain from dropdown, fill all fields manually.

Fields: domain (select), shortDescription (input), fullGoalText (textarea), targetAccuracy (number 1-100), targetConsecutiveSessions (number 1-10), startDate (date picker), targetDate (optional date picker), notes (optional textarea).

### Goal detail (`goal-detail.tsx`)

Full-page view at `/patients/[id]/goals/[goalId]`:

- **Header:** Short description, domain badge, status badge, target ("80% across 3 sessions")
- **Goal met banner** (conditional): When `checkGoalMet()` returns true and status is `active`
- **Progress chart:** Recharts `<LineChart>` — accuracy % line, horizontal dashed line at target, dots color-coded by prompt level (green=independent, yellow=verbal-cue, orange=model, red=physical). Legend below.
- **Data table:** Chronological list of `progressData` entries — date, source, accuracy, trials, prompt level, notes
- **Actions:** "Edit Goal", "Add Data Point", "Generate Report"

### Progress chart (`progress-chart.tsx`)

- Recharts `<ResponsiveContainer>` + `<LineChart>`
- Primary line: accuracy % (Y-axis 0-100)
- Horizontal `<ReferenceLine>` at `targetAccuracy`
- Custom dot renderer: fill color based on `promptLevel`
- Tooltip: date, accuracy, trials, prompt level
- Fewer than 2 data points: message instead of chart

### Progress report viewer (`progress-report-viewer.tsx`)

- Per-goal sections: short description, accuracy trend arrow (up/right/down), sessions count, narrative paragraph
- Overall narrative section
- Editable in `draft` and `reviewed` states (controlled `<Textarea>` components, not contentEditable)
- Status bar: "Mark Reviewed" → "Sign" (or "Unsign")
- "Print / Export PDF" triggers `window.print()` with `@media print` styles

### Session note integration

Existing `structured-data-form.tsx` gains a **goal picker** on each target row. Dropdown shows matching active goals for this patient. Selecting one sets the `goalId`. Optional — targets without `goalId` are valid but won't create progress data.

---

## Routing

- `/patients/[id]/goals/[goalId]` — Goal detail page (thin wrapper importing `goal-detail.tsx`)
- Goal form: dialog from goals list widget (not a route)
- Report generator/viewer: dialog/sheet from goal detail (not routes)

No standalone `/goals` route. Goals are always accessed through patient context.

---

## Testing Strategy

### Unit tests (Vitest + convex-test)

- `convex/goals.ts` — CRUD operations, validation (invalid accuracy, empty fields, future start date), auth checks
- `convex/progressData.ts` — Manual entry validation, `createFromSessionNote` batch insert
- `convex/progressReports.ts` — Sign/unsign state machine, status transition guards
- `convex/lib/progress.ts` — `calculateStreak` (no data, partial streak, exact match, exceeds target), `detectTrend` (improving/stable/declining), `checkGoalMet`
- `goal-utils.ts` — Client-side accuracy calculation, formatting helpers
- `goal-bank-data.ts` — All templates have required fields, no duplicate IDs
- `progress-prompt.ts` — Prompt includes patient context, handles missing data

### Integration test (convex-test)

- Full flow: create patient → create goal → create session note with goalId target → sign note → verify progressData created → verify streak calculation

### E2E tests (Playwright)

- Create goal from patient detail via goal bank picker
- Navigate to goal detail, verify empty state
- Add manual data point, verify chart renders
- Generate progress report, verify streaming UI, verify draft created

---

## Edge Cases

| Case | Handling |
|---|---|
| Session note signed with goalId pointing to discontinued goal | Skip progressData insert for that target. Don't error. GoalId becomes stale but session note data preserved. |
| SLP changes goal's targetAccuracy after data exists | Existing data stays. Chart redraws threshold line. Streak recalculates against new target. |
| Goal has 0 data points when report generated | AI report notes "Insufficient data for this goal." Goal still appears in report. |
| Target has trials but no correct count (or vice versa) | Skip accuracy calculation. No progressData entry created from sign flow (need both for meaningful data point). |
| Two session notes signed same day for same goal | Both create progressData entries. Separate data points. Chart shows both. Streak considers each independently. |
| SLP unsigns session note after progressData created | progressData rows NOT deleted. They have sourceId linking back. Prevents accidental data loss. Future cleanup could prune if needed. |

---

## Print Stylesheet (`@media print`)

Applied to `progress-report-viewer.tsx` and `goal-detail.tsx`:
- Hide sidebar, header, navigation, action buttons
- Full-width content area
- Chart renders at fixed 700px width for consistent PDF output
- Page breaks before each goal summary section
- Footer: patient name, report date, "Generated by Bridges"

---

## Integration Points (downstream subsystems)

- **Subsystem 4 (Caregiver Portal):** Progress data feeds the simplified parent view with Duolingo-style metrics
- **Subsystem 5 (Patient-Contextualized Materials):** Goal selection drives AI material generation. "Generate Practice Material" CTA on goal detail navigates to `/builder?patientId=[id]&goalId=[goalId]`
- **Activity log:** New action types `goal-created`, `goal-met`, `goal-modified`, `report-generated`
