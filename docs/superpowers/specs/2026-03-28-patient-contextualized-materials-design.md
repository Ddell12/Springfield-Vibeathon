# Subsystem 5: AI Material Generation (Patient-Contextualized) — Design Spec

**Date:** 2026-03-28
**Status:** Approved
**Depends on:** Subsystem 1 (patients), Subsystem 3 (goals)
**Master roadmap:** `docs/superpowers/specs/2026-03-28-slp-platform-master-roadmap.md`

---

## Problem

The existing builder generates therapy materials without patient context. An SLP building an AAC board for Alex has to manually describe that Alex likes dinosaurs, is working on /r/ sounds, and communicates in single words. This context already exists in the patient profile and IEP goals.

## Solution

**Patient-contextualized generation via the existing builder pipeline.** When an SLP navigates to the builder from a patient's detail page, Claude's system prompt is automatically enriched with the patient's diagnosis, communication level, interests, sensory notes, and active goals. The SLP just describes what they want — the AI already knows who the child is.

### Scope (this spec)

- Patient-level context injection from patient detail page → builder
- Rich context card in builder UI showing patient info and active goals
- Post-generation prompt-to-assign flow
- HIPAA-forward data handling (PII allowlist, no name in generated apps)

### Deferred (future spec)

- Goal-driven generation (builder entry from specific goal → `/builder?patientId=X&goalId=Y`)
- Optional patient picker in standalone builder
- In-app usage data flowing back to `progressData`

---

## Design Principles

- **Additive, not disruptive** — The standalone builder (`/builder`) works exactly as today. Patient context is purely additive when `patientId` is in the URL.
- **HIPAA-forward** — Design for future compliance now. PII is allowlisted, not blocklisted. Patient data lives in server memory during generation, never persisted on the session document beyond a foreign key.
- **Minimum Necessary** — Only send Claude the data it needs to personalize materials. No last names, birthdates, or contact info.

---

## Data Model Changes

### `sessions` table — add optional field

```typescript
patientId: v.optional(v.id("patients"))
```

Non-breaking. All existing sessions have `undefined`. No migration needed.

### `patientMaterials` table — add optional field

```typescript
goalId: v.optional(v.id("goals"))
```

Future-proofing for goal-driven generation. Not used in this spec but added now to avoid a second schema change.

### No new tables

No new indexes needed. Patient-linked sessions are queried via `patientMaterials.by_patientId`.

---

## Patient Context Injection Pipeline

### Data Flow

```
SLP clicks "Create Material" on patient detail page
  → Navigates to /builder?patientId=abc123
  → BuilderPage reads patientId from URL search params
  → useStreaming.generate() sends patientId in request body
  → /api/generate route receives patientId
  → Server-side fetch: patients.getForContext(patientId) + goals.listActive(patientId)
  → Auth check: requesting user's Clerk ID === patient's slpUserId
  → sanitizePatientContext() builds allowlisted context object
  → buildPatientContextBlock() formats the prompt block
  → Block appended to system prompt as ## Patient Context
  → Claude generates with full awareness of the child
  → Session created with patientId field
  → On completion, prompt-to-assign toast appears
```

### `sanitizePatientContext(patient, goals)` — Allowlist Function

Located in: `src/features/builder/lib/patient-context.ts`

**Allowlisted fields (patient):**
- `firstName`
- `diagnosis`
- `communicationLevel`
- `interests[]`
- `sensoryNotes`
- `behavioralNotes`

**Excluded fields (never sent to Claude):**
- `lastName`
- `dateOfBirth`
- `parentEmail`
- `slpUserId`
- `_id`
- `_creationTime`
- Any field not explicitly allowlisted

**Allowlisted fields (goals):**
- `shortDescription`
- `domain`
- `targetAccuracy`

The allowlist pattern means new patient fields added in the future are blocked by default. A developer must explicitly opt in a field to send it to the AI.

### `buildPatientContextBlock(sanitizedPatient, sanitizedGoals)` — Prompt Formatter

Returns a string appended to the system prompt:

```
## Patient Context
You are building a therapy tool for {firstName}.
- Diagnosis: {diagnosis}
- Communication level: {communicationLevel}
- Interests: {interests joined with ", "}
- Sensory notes: {sensoryNotes or "None noted"}
- Behavioral notes: {behavioralNotes or "None noted"}

Active therapy goals:
1. [{domain}] {shortDescription} (target: {targetAccuracy}%)
2. ...

Use this context to personalize the activity. Reference the child's interests
in themes and visuals. Match complexity to their communication level.
Do not include the child's name in the app title or any visible text
unless the therapist explicitly asks for it.
```

### `patients.getForContext` — Public Query (Auth-Enforced)

New `query` in `convex/patients.ts`. Returns only allowlisted fields so sanitization happens at the data layer, not just the route. Even if someone passes a raw patient object, sensitive fields were never fetched.

**Why public query, not internalQuery:** The `/api/generate` route uses `ConvexHttpClient`, which can only call public functions (`api.*`), not internal ones (`internal.*`). Auth enforcement inside the handler ensures only the owning SLP can call it. This is acceptable because the SLP already has full access to this patient data on the patient detail page — no new data exposure.

```typescript
export const getForContext = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const patient = await ctx.db.get(patientId);
    if (!patient) return null;
    if (patient.slpUserId !== identity.subject) return null; // auth boundary
    return {
      firstName: patient.firstName,
      diagnosis: patient.diagnosis,
      communicationLevel: patient.communicationLevel,
      interests: patient.interests,
      sensoryNotes: patient.sensoryNotes,
      behavioralNotes: patient.behavioralNotes,
    };
  },
});
```

Note: `slpUserId` is used for the auth check inside the handler but is NOT returned in the result or passed to `sanitizePatientContext()`.

---

## Route Changes: `/api/generate`

**File:** `src/app/api/generate/route.ts`

### Request Schema Update

`GenerateInputSchema` in `src/features/builder/lib/schemas/generate.ts`:

```typescript
patientId: z.string().optional()
```

### Route Handler Logic (when patientId present)

1. **Validate** — confirm patientId is a non-empty string (Convex ID format)
2. **Fetch** — server-side calls to `patients.getForContext(patientId)` and `goals.listActive(patientId)` via `ConvexHttpClient` (public queries)
3. **Auth check** — `getForContext` enforces auth internally (returns null for non-owning SLPs). Route handler treats null return as "patient not found" → graceful degradation
4. **Sanitize** — `sanitizePatientContext(patient, goals)` produces the allowlisted object
5. **Inject** — `buildPatientContextBlock()` returns the prompt string, appended to system prompt
6. **Persist** — pass `patientId` to session create/update mutation

### Error Handling

| Scenario | Behavior |
|---|---|
| Invalid/missing patient | Ignore patientId, generate without context (graceful degradation) |
| Auth mismatch | 403 with generic "Not authorized" — no patient details in response |
| Convex fetch failure | Log error without PII, proceed without context |
| Goals fetch failure | Proceed with patient context but no goals listed |

Principle: never break the builder because of patient context issues. Degrade gracefully.

---

## Builder UI Changes

### Patient Context Card

**New component:** `src/features/builder/components/patient-context-card.tsx`

Appears at the top of the builder when `patientId` is in the URL, above the chat panel.

```
┌─────────────────────────────────────────────────┐
│  Building for Alex                    [Collapse] │
│  Articulation · Single words                     │
│  Interests: dinosaurs, trains, Bluey             │
│                                                  │
│  Active Goals (3)                                │
│  • [Articulation] Produce /r/ initial — 80%      │
│  • [Language] Follow 2-step directions — 90%     │
│  • [Pragmatic] Greetings with peers — 85%        │
└─────────────────────────────────────────────────┘
```

**Behaviors:**
- **Collapsible** — defaults expanded on first visit, remembers collapsed state in React state (session-scoped)
- **Non-dismissible** — can collapse but not remove. Context is always active in the prompt, card should reflect that.
- **Responsive** — on mobile, starts collapsed showing only "Building for Alex · 3 goals"
- **Styled** — tonal background shift (`bg-muted`), no 1px borders (per design system). Domain badges use existing diagnosis color mapping.

**Data source:** Fetches patient and goals client-side via `useQuery(api.patients.get)` and `useQuery(api.goals.listActive)`. This data is already visible to the SLP on the patient detail page, so no new client-side data exposure.

### Builder Page Changes

**File:** `src/features/builder/components/builder-page.tsx`

- Read `patientId` from `useSearchParams()`
- Pass `patientId` to `PatientContextCard` component
- Pass `patientId` to `useStreaming` hook

### Streaming Hook Changes

**File:** `src/features/builder/hooks/use-streaming.ts`

- `generate()` accepts optional `patientId`, includes in fetch body
- Watch for session state → `"live"` when `patientId` present → trigger assignment toast

### No Changes To

- Preview panel — unchanged
- Code drawer — unchanged
- Builder toolbar — unchanged
- Chat panel input — unchanged
- Existing builder sessions — unaffected

---

## Post-Generation Assignment Flow

When generation completes (session state → `"live"`) and the session has a `patientId`:

### Toast Notification

```
┌─────────────────────────────────────────────┐
│  App ready · Assign to Alex's materials?    │
│                          [Skip]  [Assign]   │
└─────────────────────────────────────────────┘
```

Uses existing `sonner` toast system.

### Behaviors

| Action | Result |
|---|---|
| **"Assign"** | Calls `patientMaterials.assign({ patientId, sessionId })` → success toast "Added to Alex's materials" |
| **"Skip"** | Dismisses toast, no record created. SLP can assign manually later. |
| **Auto-dismiss** | 15 seconds, defaults to skip behavior (non-blocking) |

### Activity Log

When assigned, logs `material-generated-for-patient` action with session and patient IDs via existing `activityLog` mutation.

### Patient Detail Page

No changes needed. The existing "Assigned Materials" widget reads from `patientMaterials.by_patientId` — newly assigned materials appear automatically via Convex reactivity.

---

## Patient Detail Page: Entry Point

### "Create Material" Button

**New component:** `src/features/patients/components/create-material-button.tsx`

Added to the patient detail page, likely in the header area or as a prominent CTA in the materials widget.

```
[+ Create Material]
```

Navigates to `/builder?patientId={id}` using Next.js `<Link>`.

**Placement:** In the patient detail page header alongside existing action buttons, and/or as an empty-state CTA in the Assigned Materials widget ("No materials yet — Create one").

---

## File Changes Summary

### New Files (3)

| File | Purpose |
|---|---|
| `src/features/builder/lib/patient-context.ts` | `sanitizePatientContext()`, `buildPatientContextBlock()` |
| `src/features/builder/components/patient-context-card.tsx` | Collapsible context card UI |
| `src/features/patients/components/create-material-button.tsx` | CTA on patient detail page |

### Modified Files (10)

| File | Change |
|---|---|
| `convex/schema.ts` | Add optional `patientId` to sessions, `goalId` to patientMaterials, `material-generated-for-patient` to activityLog action union |
| `convex/patients.ts` | Add `getForContext` public query (auth-enforced, allowlisted fields) |
| `convex/sessions.ts` | Accept optional `patientId` in create/update |
| `convex/patientMaterials.ts` | Accept optional `goalId` in assign (future-proof) |
| `src/app/api/generate/route.ts` | Fetch patient context, inject into prompt, pass patientId to session |
| `src/features/builder/lib/schemas/generate.ts` | Add `patientId` to `GenerateInputSchema` |
| `src/features/builder/hooks/use-streaming.ts` | Pass patientId in request, post-generation assignment toast |
| `src/features/builder/components/builder-page.tsx` | Read patientId from URL, render context card |
| `src/features/builder/lib/agent-prompt.ts` | Accept optional patient context block, append to system prompt |
| `src/features/patients/components/patient-detail-page.tsx` | Add "Create Material" CTA |

---

## Test Coverage

### Unit Tests

| Test | What it verifies |
|---|---|
| `sanitizePatientContext()` | Allowlist strips PII; handles missing optional fields; never includes lastName, DOB, email |
| `buildPatientContextBlock()` | Correct prompt format; handles 0 goals, 1 goal, many goals; handles missing sensory/behavioral notes |
| `GenerateInputSchema` | Accepts valid patientId; accepts undefined patientId; rejects invalid types |

### Convex Backend Tests

| Test | What it verifies |
|---|---|
| `patients.getForContext` | Returns only allowlisted fields; returns null for invalid ID; returns null for non-owning SLP (auth boundary) |
| `sessions.create` with patientId | patientId persisted on session document |
| `patientMaterials.assign` with goalId | goalId persisted (future-proof field) |

### Integration Tests

| Test | What it verifies |
|---|---|
| `/api/generate` with patientId | Patient context appears in system prompt; session gets patientId |
| `/api/generate` with invalid patientId | Graceful degradation — generates without context |
| `/api/generate` with wrong SLP's patient | Returns 403, no patient data in response |

### E2E Tests

| Test | What it verifies |
|---|---|
| Patient detail → "Create Material" → builder | Context card renders with correct patient info and goals |
| Generate with patient context → assign toast | Toast appears, "Assign" creates patientMaterials row |
| Generate with patient context → skip toast | Toast dismisses, no patientMaterials row created |

---

## HIPAA Compliance Design Notes

These decisions are made now to minimize future rework when pursuing BAA coverage:

1. **Allowlist, not blocklist** — `sanitizePatientContext()` explicitly names every field sent to the AI. New fields are blocked by default.
2. **Data layer sanitization** — `patients.getForContext` returns only safe fields. The route handler never sees full patient records. Auth is enforced inside the handler (returns null for non-owning SLPs).
3. **No PII in generated output** — System prompt instructs Claude not to include the child's name in visible app text unless explicitly asked.
4. **No PII in logs** — Error handlers strip patient details before logging. Only `patientId` (an opaque Convex ID) appears in logs.
5. **No PII persisted on sessions** — Only the `patientId` foreign key is stored. Full context is fetched fresh at generation time and stays in server memory.
6. **Auth boundary** — Patient context only accessible to the owning SLP. Auth check inside `getForContext` compares Clerk identity to `patient.slpUserId`. Route handler also validates before proceeding.
7. **No new client exposure** — `getForContext` is a public query (required by `ConvexHttpClient`), but it returns the same subset of data the SLP already sees on the patient detail page. Auth enforcement prevents cross-SLP access.
