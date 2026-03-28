# SLP AI Session Notes & Documentation — Design Spec

**Date:** 2026-03-28
**Status:** Draft
**Subsystem:** 2 of 5 (AI Session Notes & Documentation)
**Depends on:** Subsystem 1 (patients table, auth helpers)

## Overview

Add AI-powered session documentation to Bridges. SLPs capture structured session data via a quick-entry form, then generate SOAP notes with one click using Claude. This eliminates the 30-60 minute documentation burden per session — the #1 burnout driver for SLPs.

### Approach

**Dual-mode documentation:** Structured quick-entry for in-session data capture (< 2 minutes), and AI-powered SOAP note generation from that structured data (one click). The structured form captures what happened; the AI writes the clinical documentation.

### Target User

Solo SLPs in private practice who document therapy sessions for insurance billing, IEP compliance, and clinical record-keeping.

### Scope Boundaries

**In scope:**
- Session note CRUD with structured data capture
- AI SOAP note generation via dedicated streaming API route
- Manual trigger model (SLP clicks "Generate SOAP Note")
- Split-view editor (form + SOAP preview)
- Soft-lock signing with audit trail (sign/unsign)
- Auto-save on blur with draft → in-progress auto-transition
- Per-patient session notes list widget on patient detail page
- Goal-ready schema (optional `goalId` on targets for Subsystem 3)
- Patient context + previous SOAP note as AI context
- Activity log integration
- Mobile responsiveness (stacked layout on < lg breakpoint)
- Full test coverage (unit, component, E2E)

**Out of scope (future subsystems/enhancements):**
- Real-time SOAP regeneration as fields change
- Standalone `/sessions` route or batch documentation mode
- Hard immutability / addendum system
- Caregiver access to session notes
- CPT code auto-selection
- PDF export of session notes
- Voice-to-text session capture
- Goal-based target suggestions (Subsystem 3 provides this)

---

## Data Model

One new Convex table in `convex/schema.ts`.

### `sessionNotes`

| Field | Type | Required | Notes |
|---|---|---|---|
| `patientId` | `v.id("patients")` | yes | Which child |
| `slpUserId` | `v.string()` | yes | Documenting SLP (Clerk user ID) |
| `sessionDate` | `v.string()` | yes | ISO date of the therapy session |
| `sessionDuration` | `v.number()` | yes | Minutes (common values: 30, 45, 60) |
| `sessionType` | `v.union(v.literal("in-person"), v.literal("teletherapy"), v.literal("parent-consultation"))` | yes | |
| `status` | `v.union(v.literal("draft"), v.literal("in-progress"), v.literal("complete"), v.literal("signed"))` | yes | Soft-lock: signed can be unsigned with audit trail |
| `structuredData` | `v.object({...})` | yes | See Structured Data Schema below |
| `soapNote` | `v.optional(v.object({...}))` | no | AI-generated SOAP, editable by SLP |
| `aiGenerated` | `v.boolean()` | yes | Whether the current SOAP was AI-generated (audit trail) |
| `signedAt` | `v.optional(v.number())` | no | Timestamp when signed. Cleared on unsign. |

**Indexes:** `by_patientId_sessionDate` on `["patientId", "sessionDate"]` (compound — enables efficient sorted range scan per patient for `list` and `getLatestSoap`), `by_slpUserId` on `["slpUserId"]`

### Structured Data Schema (embedded object)

```ts
structuredData: v.object({
  targetsWorkedOn: v.array(v.object({
    target: v.string(),                    // e.g., "/r/ in initial position"
    goalId: v.optional(v.string()),          // Will become v.id("goals") when Subsystem 3 adds the goals table
    trials: v.optional(v.number()),        // e.g., 20
    correct: v.optional(v.number()),       // e.g., 14
    promptLevel: v.optional(v.union(
      v.literal("independent"),
      v.literal("verbal-cue"),
      v.literal("model"),
      v.literal("physical")
    )),
    notes: v.optional(v.string()),
  })),
  behaviorNotes: v.optional(v.string()),
  parentFeedback: v.optional(v.string()),
  homeworkAssigned: v.optional(v.string()),
  nextSessionFocus: v.optional(v.string()),
})
```

The `goalId` field on each target is the bridge to Subsystem 3 (Goal Tracking). It uses `v.string()` temporarily because Convex requires the referenced table to exist for `v.id("goals")` — the `goals` table doesn't exist until Subsystem 3. When Subsystem 3 lands, this field will be tightened to `v.id("goals")` and the form will gain goal-based target suggestions.

### SOAP Note Schema (embedded object)

```ts
soapNote: v.optional(v.object({
  subjective: v.string(),   // Parent/client reports, observations
  objective: v.string(),    // Measurable data, trial results
  assessment: v.string(),   // Clinical interpretation
  plan: v.string(),         // Next steps, homework, referrals
}))
```

### Activity Log Extension

Add three new action types to the `activityLog.action` union in `convex/schema.ts`:
- `"session-documented"` — logged on session note creation
- `"session-signed"` — logged when SLP signs a note
- `"session-unsigned"` — logged when SLP unsigns a note for edits

---

## Auth & Access Control

All session note functions are **SLP-only**. No caregiver access in v1 — clinical documentation is sensitive.

### Ownership model

- Every `sessionNotes` row has `slpUserId` matching the creating SLP's Clerk user ID
- All queries and mutations verify `sessionNote.slpUserId === currentUserId` via the existing `assertSLP(ctx)` helper from Subsystem 1
- No new auth helpers needed — reuses `assertSLP` and the SLP ownership check pattern from `convex/patients.ts`

### Route protection

The session note routes are nested under `/patients/[id]/sessions/...` which is already protected by the `/patients(.*)` entry in `proxy.ts` from Subsystem 1.

The `/api/generate-soap` route requires Clerk authentication — add to the protected API routes list. Unlike `/api/generate` which allows unauthenticated builder access, SOAP generation always accesses patient data.

---

## Convex Functions

### `convex/sessionNotes.ts`

| Function | Type | Args | Purpose |
|---|---|---|---|
| `list` | `query` | `{ patientId: Id<"patients">, limit?: number }` | Returns session notes for a patient, ordered by `sessionDate` descending. Asserts SLP ownership of patient. Defaults to 20 entries. |
| `get` | `query` | `{ sessionNoteId: Id<"sessionNotes"> }` | Single note. Asserts SLP ownership. |
| `getLatestSoap` | `query` | `{ patientId: Id<"patients"> }` | Returns the most recent signed or complete session note with a SOAP note for this patient. Used by the AI generation route for continuity context. |
| `create` | `mutation` | `{ patientId, sessionDate, sessionDuration, sessionType, structuredData }` | Creates a new session note in `draft` status with `aiGenerated: false`. Asserts SLP. Logs `session-documented`. |
| `update` | `mutation` | `{ sessionNoteId, sessionDate?, sessionDuration?, sessionType?, structuredData? }` | Partial update of session metadata and structured data. Asserts SLP ownership. Rejects if status is `signed` (must unsign first). |
| `updateSoap` | `mutation` | `{ sessionNoteId, soapNote: { subjective, objective, assessment, plan } }` | Writes or overwrites the SOAP note. Sets `aiGenerated: false` (manual edit). Rejects if `signed`. |
| `saveSoapFromAI` | `mutation` | `{ sessionNoteId, soapNote: { subjective, objective, assessment, plan } }` | Called by the `/api/generate-soap` route after streaming completes. Sets `aiGenerated: true`. Rejects if `signed`. |
| `sign` | `mutation` | `{ sessionNoteId }` | Sets status to `signed`, sets `signedAt` to now. Requires status `complete` and SOAP note to exist. Logs `session-signed`. |
| `unsign` | `mutation` | `{ sessionNoteId }` | Sets status back to `complete`, clears `signedAt`. Logs `session-unsigned`. Asserts SLP ownership. |
| `updateStatus` | `mutation` | `{ sessionNoteId, status }` | Transitions between `draft`, `in-progress`, `complete`. Cannot transition to/from `signed` (use `sign`/`unsign`). |
| `delete` | `mutation` | `{ sessionNoteId }` | Deletes a session note. Rejects if `signed` (must unsign first). Asserts SLP ownership. |

---

## API Route: `/api/generate-soap`

A lightweight SSE streaming endpoint at `src/app/api/generate-soap/route.ts`. ~80 lines.

### Request

POST with JSON body:
```ts
{
  sessionNoteId: string  // Convex ID — route fetches all context server-side
}
```

### Flow

1. Authenticate via Clerk `auth()` — reject if unauthenticated
2. Fetch from Convex using `ConvexHttpClient`: the session note, the patient profile, and the latest previous SOAP note (via `getLatestSoap`)
3. Reject if session note is `signed`
4. Build the system prompt with clinical context
5. Call Claude (`claude-sonnet-4-6`) with the prompt, stream the response via SSE
6. Parse the streamed response into the 4 SOAP sections (delimited by `SUBJECTIVE:`, `OBJECTIVE:`, `ASSESSMENT:`, `PLAN:` headers)
7. On stream completion, call `saveSoapFromAI` mutation to persist the result
8. SSE events: `soap-chunk` (partial text), `soap-complete` (final parsed SOAP object), `error`

### AI Configuration

- **Model:** `claude-sonnet-4-6` — fast, capable for clinical text
- **Max tokens:** 1024 — SOAP notes are 300-500 words
- **Temperature:** 0.3 — clinical documentation needs consistency, not creativity

### Context Window

The AI receives two layers of context:

1. **Patient context** — name, age, diagnosis, communication level, sensory notes, behavioral notes (from `patients` table)
2. **Previous session** — the most recent signed or complete SOAP note for continuity language (from `getLatestSoap`)

This is the "current + last session" model. Trend analysis across multiple sessions is handled by Subsystem 3 (Progress Reports), not SOAP notes.

### System Prompt

```
You are a clinical documentation assistant for speech-language pathologists.
You write SOAP notes following ASHA documentation standards.

PATIENT CONTEXT:
- Name: {firstName} {lastName}
- Age: {calculated age}
- Diagnosis: {diagnosis}
- Communication Level: {communicationLevel}
- Relevant Notes: {sensoryNotes, behavioralNotes}

PREVIOUS SESSION ({previousSessionDate}):
{previous SOAP note text, or "No previous session documented."}

CURRENT SESSION ({sessionDate}, {sessionDuration} min, {sessionType}):
Targets Worked On:
{for each target:}
  - {target}: {correct}/{trials} ({accuracy}%), prompt level: {promptLevel}
    {notes if present}

Behavior Notes: {behaviorNotes}
Parent Feedback: {parentFeedback}
Homework Assigned: {homeworkAssigned}
Next Session Focus: {nextSessionFocus}

INSTRUCTIONS:
Write a SOAP note with exactly four sections. Use clinical language appropriate
for insurance documentation. Reference specific data points from the session.
Include continuity language referencing the previous session when available.

Format your response exactly as:
SUBJECTIVE:
{content}

OBJECTIVE:
{content}

ASSESSMENT:
{content}

PLAN:
{content}
```

### Response Parsing

The route splits the streamed response on `SUBJECTIVE:`, `OBJECTIVE:`, `ASSESSMENT:`, `PLAN:` section headers using simple string splitting. No JSON schema or structured output needed — the 4-section format is reliable with the explicit formatting instructions.

---

## UI & Routes

### Feature Structure

```
src/features/session-notes/
  components/
    session-note-editor.tsx       — Split view: structured form + SOAP preview
    structured-data-form.tsx      — Quick-entry form for session data
    soap-preview.tsx              — SOAP note display with edit capability
    session-notes-list.tsx        — Per-patient session list
    session-note-card.tsx         — Single session summary in the list
    duration-preset-input.tsx     — Duration input with 30/45/60 presets
    target-entry.tsx              — Single target row (name, trials, correct, prompt level)
  hooks/
    use-session-notes.ts          — Query hooks wrapping Convex functions
    use-soap-generation.ts        — SSE streaming state (loading, chunks, complete, error)
  lib/
    soap-prompt.ts                — System prompt builder (exported for testing)
    session-utils.ts              — Duration formatting, accuracy calculation, date helpers
```

### Routes

| Route | Page Component | Layout |
|---|---|---|
| `/patients/[id]/sessions/new` | `session-note-editor.tsx` | `(app)` layout with sidebar |
| `/patients/[id]/sessions/[noteId]` | `session-note-editor.tsx` | `(app)` layout with sidebar |

All access through the patient — no standalone `/sessions` route.

### Patient Detail Integration

The existing `patient-detail-page.tsx` gets a new **"Session Notes" widget** in the left column:

- Shows the 5 most recent sessions as compact cards (date, duration, type, status chip)
- "View All" link expands the list inline on the detail page
- "+ New Session" primary CTA button at the top of the widget

### Caseload Page Integration

Add a "New Session" quick action to the expanded row in `patient-row-expanded.tsx`. Navigates to `/patients/[id]/sessions/new`.

### Session Note Editor

**Layout:** Single page. Side-by-side at `lg:` breakpoint and above. Stacked vertically below `lg:`.

**Left panel — Structured Data Form:**

- **Header bar:** Patient name + age (read-only context), session date (date picker, defaults to today), duration (preset buttons for 30/45/60 + custom input), session type (radio: in-person / teletherapy / parent consultation)
- **Targets section:** Dynamic list of target entries. Each row: target name (text input), trials (number), correct (number), prompt level (select), notes (text). Accuracy auto-calculates and displays as a colored badge (green >=80%, yellow >=60%, red <60%) with text label for accessibility. "+ Add Target" button. Remove button per row (trash icon). Max 20 targets.
- **Additional fields:** Behavior notes (textarea), Parent feedback (textarea), Homework assigned (textarea), Next session focus (textarea)
- **Footer:** "Save Draft" (secondary), "Generate SOAP Note" (primary, disabled until at least one target exists)
- **Auto-save:** Saves to Convex on blur. Status auto-transitions `draft` -> `in-progress` on first edit.

**Right panel — SOAP Preview:**

- **Empty state:** Muted card: "Fill in session data and click Generate SOAP Note to create documentation"
- **Generating state:** Streaming text appears section by section with a subtle typing indicator
- **Interrupted state:** Partial SOAP text shown with warning banner: "Generation was interrupted. You can edit what's here or regenerate."
- **Generated state:** Four labeled sections (S/O/A/P) in readable card layout. Each section editable inline. "Regenerate" button at top. If SLP modifies any section, "(edited)" badge appears and `aiGenerated` flips to false on save.
- **Footer:** Status display (draft/in-progress/complete/signed). "Mark Complete" button. "Sign Note" button (only enabled when SOAP exists). If signed: "Unsign" button with muted styling.

### Session Notes List Widget

Compact card per session:
- Left: date (formatted "Mar 28, 2026"), duration badge ("30 min"), type icon
- Center: first target name as preview text, accuracy if available
- Right: status chip (draft = gray, in-progress = yellow, complete = blue, signed = green with checkmark)
- Click anywhere navigates to the editor for that note

---

## Validation

All validation enforced at the Convex mutation layer. Frontend shows inline errors from `ConvexError` responses.

| Field | Rules |
|---|---|
| `sessionDate` | Valid ISO date, not in the future, within 1 year in the past |
| `sessionDuration` | Positive integer, min 5, max 480 (8 hours) |
| `sessionType` | Strict union literal |
| `targetsWorkedOn` | At least 1 target required for `complete` or `signed` status. Max 20 targets per session. |
| `target.target` (name) | Non-empty, max 200 chars, trimmed |
| `target.trials` | Optional. If provided: positive integer, max 1000 |
| `target.correct` | Optional. If provided: non-negative integer, must be <= `trials` if both present |
| `target.promptLevel` | Strict union literal when provided |
| `soapNote` sections | Each section non-empty, max 5000 chars when provided |
| `sign` | Requires status `complete` and `soapNote` to exist |
| `unsign` | Requires status `signed` |
| `update` / `updateSoap` | Rejected if status is `signed` |
| `delete` | Rejected if status is `signed` |

---

## Error Handling

| Screen | Scenario | Handling |
|---|---|---|
| Session note editor | Auto-save fails (network) | Sonner toast "Changes not saved — retrying...", Convex reactive reconnect handles retry |
| Session note editor | SOAP generation fails (API error) | Error state in SOAP preview panel: "Generation failed. Check your data and try again." with retry button |
| Session note editor | SOAP streaming interrupted | Partial SOAP text shown with warning banner: "Generation was interrupted. You can edit what's here or regenerate." |
| Session note editor | Try to edit signed note | Form fields disabled. Toast: "Unsign this note to make changes." |
| Session note editor | Note not found / no access | Route segment `not-found.tsx` |
| Session notes list | Empty state (no sessions) | Illustrated empty state: "No sessions documented yet" with "Document First Session" CTA |
| Session notes list | Patient not found | Redirect to `/patients` |
| SOAP generation | Session has no targets | "Generate SOAP Note" button disabled with tooltip: "Add at least one target first" |
| SOAP generation | Patient has no previous SOAP | AI prompt receives "No previous session documented" — generates fine without continuity language |

---

## Mobile Responsiveness

| Screen | Desktop (lg+) | Tablet/Mobile (<lg) |
|---|---|---|
| Session note editor | Side-by-side: form left, SOAP right | Stacked: form on top, SOAP below. Sticky "Generate SOAP" button at bottom of viewport. |
| Session notes list | Compact card rows in widget | Same cards, full width |
| Target entry rows | Inline: name, trials, correct, prompt, notes in one row | Stacked within each target card. Swipe-to-delete on mobile. |
| Duration presets | Inline button group | Same, wraps naturally |

---

## Accessibility

- All form inputs paired with `<Label>` + `htmlFor`
- Target entry rows are a semantic list, keyboard navigable (Tab between fields, Enter to add new target)
- Status chips use `aria-label` with full status text
- SOAP preview sections use `<h3>` headings for screen reader navigation
- "Generate SOAP Note" button has `aria-disabled` with tooltip explanation when disabled
- Auto-save announcements via `aria-live="polite"` region
- Accuracy color badges include text label (not color-only): "80% check" vs "45% x"

---

## Testing

### Unit tests (Vitest + convex-test) — ~18 tests

**`convex/sessionNotes.ts`:**
- `create` validates required fields, sets correct `slpUserId`, logs activity
- `create` rejects future `sessionDate`, invalid `sessionDuration`
- `update` partial updates work, rejects if signed
- `updateSoap` writes SOAP, sets `aiGenerated: false`
- `saveSoapFromAI` writes SOAP, sets `aiGenerated: true`, rejects if signed
- `sign` requires SOAP to exist, sets `signedAt`, logs activity
- `sign` rejects if no SOAP note
- `unsign` reverts to complete, clears `signedAt`, logs activity
- `delete` works for draft/complete, rejects if signed
- `list` returns notes ordered by date, respects SLP ownership
- `getLatestSoap` returns most recent note with SOAP, skips drafts
- `get` asserts SLP ownership, rejects unauthorized

**`lib/soap-prompt.ts`:**
- Builds correct prompt with patient context
- Handles missing optional fields (no sensory notes, no previous SOAP)
- Includes previous SOAP when available

**`lib/session-utils.ts`:**
- Accuracy calculation (correct/trials)
- Duration formatting ("30 min", "1h 15min")
- Edge cases: zero trials, correct > trials guard

### Component tests (Vitest + RTL) — ~8 tests

- Structured data form: renders target entries, add/remove targets, accuracy badge colors
- SOAP preview: empty state, generating state with streaming text, generated state with edit capability
- Session note card: renders date, duration, status chip
- Duration preset input: preset buttons set value, custom input works
- Session notes list: empty state, renders cards, click navigates

### E2E (Playwright) — 2 flows

1. SLP signs in -> opens patient -> clicks "New Session" -> fills structured data (date, duration, 2 targets with trials) -> clicks "Generate SOAP" -> SOAP appears -> edits one section -> clicks "Mark Complete" -> clicks "Sign" -> note shows signed status -> returns to patient detail -> session visible in widget
2. SLP opens existing signed note -> fields are disabled -> clicks "Unsign" -> edits a target -> saves -> re-generates SOAP -> signs again

---

## Integration Points

### Subsystem 1 (Patient Management) — consumed
- Patient detail page: new "Session Notes" widget
- Caseload expanded row: new "New Session" quick action
- Activity log: new action types (`session-documented`, `session-signed`, `session-unsigned`)
- Auth helpers: reuses `assertSLP(ctx)` pattern

### Subsystem 3 (Goal Tracking) — prepared for
- `targetsWorkedOn[].goalId` optional field ready for goal linking
- When Subsystem 3 creates `progressData` entries, it can pull from session note targets that have a `goalId`
- The structured data form will gain goal-based target suggestions when goals exist

### Subsystem 5 (Patient-Contextualized Materials) — no direct dependency
- Session notes and material generation are independent subsystems that both reference patient context

---

## Key Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| SOAP generation trigger | Manual (click button) | SLPs want fast data entry during/after sessions, not a live AI show. One click after entry is clean and cost-effective. |
| Signed note behavior | Soft lock with audit trail | Solo private practice SLPs need to fix typos. Hard immutability (addendum system) is overkill for v1. Activity log tracks sign/unsign events. |
| Target entry model | Free-form with optional goalId | No setup required now, but schema is ready for Subsystem 3 to plug in goal suggestions. Avoids painful migration later. |
| Session timing | Date + duration in minutes | SLPs have fixed session lengths from insurance billing codes. No need for start/end time clock math. |
| AI context | Current session + previous SOAP | One prior note gives continuity language. Three+ sessions would bloat tokens for diminishing returns — trend analysis belongs in Subsystem 3 progress reports. |
| API architecture | Dedicated `/api/generate-soap` route | Clean VSA separation from builder pipeline. Simple ~80 line route vs. mixing into the 400+ line `/api/generate`. |
| Session note access | Patient-only (no standalone /sessions) | YAGNI. Caseload expanded rows provide batch entry shortcut. Standalone route adds complexity without proven need. |
