# Fix Speech Coach Bugs + Move SLP Config to Patient Route

## Context

QA testing revealed 3 bugs in the speech coach template system and an architectural
misalignment: Coach Setup and Template assignment tabs live on the caregiver family route
(`/family/[patientId]/speech-coach`) when they should belong to the SLP-facing patient
workflow (`/patients/[id]/speech-coach`). Caregivers should only see "New Session" and
"History". SLPs configure the coach; caregivers run sessions.

---

## Bug Diagnoses

### Bug 1 — Invisible text (skeleton appearance)

**Root cause:** `--color-muted` in `globals.css` is defined as `oklch(0.511 0.011 62)` (a
dark brownish-gray, ~#6B6560), which is a text token misused as a background. And
`--color-muted-foreground` is **the same value**. So `bg-muted text-muted-foreground`
= dark background + same-dark text = completely invisible. All unselected buttons appear
as solid gray rectangles.

**Fix:** Replace `bg-muted text-muted-foreground hover:bg-muted/80` with
`bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest`
on every unselected button in the template editor and assignment card.
- `bg-surface-container-high` = `oklch(0.938...)` = #EDEAE4 (light, readable bg)
- `text-on-surface-variant` = `oklch(0.511...)` = #6B6560 (same brownish-gray — now
  readable ON the light bg)

### Bug 2 — No edit flow from template library

**Root cause:** `TemplateLibraryPage` only shows "Preview session" links. The backend
`api.speechCoachTemplates.update` mutation exists and the `TemplateEditor` already accepts
`initialTemplate` for edit mode — it just isn't wired up.

### Bug 3 — Unnamed template card

**Root cause:** A template in the DB has an empty `name` field. Needs a fallback in the
render.

---

## Implementation Plan

### Step 1 — Fix Button Contrast (Bug 1)

**Files to change:**
- `src/features/speech-coach/components/template-editor.tsx`
- `src/features/speech-coach/components/template-assignment-card.tsx`

In `template-editor.tsx`, replace the unselected class string on:
- Age range radio buttons (line ~150)
- Duration radio buttons (line ~170)
- Tool toggle buttons (line ~207)
- Skill toggle buttons (line ~244)

From: `"bg-muted text-muted-foreground hover:bg-muted/80"`
To:   `"bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"`

Do the same in `template-assignment-card.tsx` for the unselected template selector buttons
(line ~63).

No logic changes — CSS class swap only.

---

### Step 2 — Add Edit Flow to Template Library (Bug 2 + Bug 3)

**File to change:**
- `src/features/speech-coach/components/template-library-page.tsx`

Changes:
1. Add `editing` state: `useState<Id<"speechCoachTemplates"> | null>(null)`
2. Add `updateTemplate = useMutation(api.speechCoachTemplates.update)`
3. Add `handleUpdate(template: SpeechCoachTemplateForm)` — calls `updateTemplate`, clears
   `editing` on success
4. In the template card row, add an "Edit" `<Button variant="ghost" size="sm">` next to
   "Preview session"
5. When `editing === t._id`, render `<TemplateEditor initialTemplate={...} onSave={handleUpdate} />`
   in-line below the card (same collapsed panel pattern as the "New template" form)
6. Add a "Cancel" button to exit edit mode
7. Fallback name: render `{t.name || "Untitled template"}` to fix Bug 3

`initialTemplate` must be shaped as `SpeechCoachTemplateForm`. The `Doc` from Convex
already matches the shape — spread it directly. Preserve `version` from the existing doc.

**Test file to update:**
- `src/features/speech-coach/components/__tests__/template-library-page.test.tsx`
  - Add: test that "Edit" button renders for each template card
  - Add: test that clicking Edit shows the editor pre-filled
  - Existing "Preview session" tests remain unchanged

---

### Step 3 — Create SLP Speech Coach Route + Component

**New files:**
- `src/features/speech-coach/components/slp-speech-coach-page.tsx`
- `src/app/(app)/patients/[id]/speech-coach/page.tsx`

#### `slp-speech-coach-page.tsx`

Props: `{ patientId: Id<"patients">; homeProgramId: Id<"homePrograms"> }`

- Two tabs: "Coach Setup" and "Template"
- Move `TemplateAssignmentPanel` (currently defined locally in `speech-coach-page.tsx`
  lines 32-103) into this new file
- Reuse `CoachSetupTab` (import from `./coach-setup-tab`)
- Use same tab pill UI pattern as `speech-coach-page.tsx` (lines 234-249)
- Fetch program via `api.homePrograms.listByPatient` (same as `speech-coach-page.tsx`)
- Wire `handleSaveCoachSetup` using `api.homePrograms.update` (same as existing)
- Page header: "Speech Coach Setup" with subtitle "Configure the AI coach for this child."

#### `src/app/(app)/patients/[id]/speech-coach/page.tsx`

Thin wrapper — same pattern as the family route:
```tsx
"use client";
// read patientId from params, programId from ?program= query param
// if no programId: show "No program selected" message with link back to patient profile
// otherwise: <SlpSpeechCoachPage patientId=... homeProgramId=... />
```

---

### Step 4 — Simplify Caregiver Speech Coach Page

**File to change:**
- `src/features/speech-coach/components/speech-coach-page.tsx`

Remove SLP-only content:
1. Remove `isSLP` derivation (lines 112-113)
2. Remove `coach-setup` and `assigned-template` from `TABS` array (lines 205-206)
3. Remove `TemplateAssignmentPanel` inner component definition (lines 32-103) — it moves
   to `slp-speech-coach-page.tsx`
4. Remove `handleSaveCoachSetup` and `isSavingSetup` state (lines 111, 209-223)
5. Remove `CoachSetupTab` and `TemplateAssignmentPanel` render cases (lines 264-274)
6. Remove now-unused imports: `CoachSetupTab`, `TemplateAssignmentCard`, `useUser`,
   `useMutation` (if no longer needed), `SpeechCoachConfig`, `toast`

Result: `SpeechCoachPage` only renders "New Session" + "History" — clean caregiver view.

**Note:** The `TemplateAssignmentPanel` function currently also queries
`api.homePrograms.listByPatient` and `api.speechCoachTemplates.listMine` — move these
queries to `slp-speech-coach-page.tsx` intact.

---

### Step 5 — Add "Configure Coach" Navigation Entry Point

**File to change:**
- `src/features/patients/components/home-programs-widget.tsx`

For speech-coach type programs, add a "Configure Coach" icon button next to the existing
"Print" button (around line 105). Link to:
```
/patients/${patientId}/speech-coach?program=${program._id}
```

Use the same `<Button asChild variant="ghost" size="sm">` + `<Link>` pattern as the
existing print button. Icon: a settings/tune material icon or a microphone icon — use
`MaterialIcon icon="tune"` to match the existing icon pattern.

**Test file to update:**
- `src/features/patients/components/__tests__/home-programs-widget.test.tsx`
  - Add: test that a speech-coach type program renders a "Configure Coach" link with the
    correct href
  - Use `createMockHomeProgram({ type: "speech-coach", speechCoachConfig: { targetSounds: ["s"] } })`

---

## Critical Files

| File | Change |
|---|---|
| `src/features/speech-coach/components/template-editor.tsx` | CSS class fix (Step 1) |
| `src/features/speech-coach/components/template-assignment-card.tsx` | CSS class fix (Step 1) |
| `src/features/speech-coach/components/template-library-page.tsx` | Edit flow + name fallback (Step 2) |
| `src/features/speech-coach/components/speech-coach-page.tsx` | Remove SLP tabs (Step 4) |
| `src/features/speech-coach/components/slp-speech-coach-page.tsx` | **New** — SLP config tabs (Step 3) |
| `src/app/(app)/patients/[id]/speech-coach/page.tsx` | **New** — SLP route (Step 3) |
| `src/features/patients/components/home-programs-widget.tsx` | Add Configure Coach link (Step 5) |
| `src/features/speech-coach/components/__tests__/template-library-page.test.tsx` | Add edit tests (Step 2) |
| `src/features/patients/components/__tests__/home-programs-widget.test.tsx` | Add configure-coach test (Step 5) |

---

## Reuse References

- `TemplateAssignmentPanel` — move from `speech-coach-page.tsx:32-103` into
  `slp-speech-coach-page.tsx` (no logic changes)
- Tab pill UI pattern — copy from `speech-coach-page.tsx:234-249`
- `handleSaveCoachSetup` pattern — copy from `speech-coach-page.tsx:209-223`
- `TemplateEditor` — already supports `initialTemplate` for edit mode (line 54)
- `api.speechCoachTemplates.update` — already exists in `convex/speechCoachTemplates.ts:57`
- `api.homePrograms.assignSpeechCoachTemplate` — already exists, used by TemplateAssignmentPanel

---

## Verification

```bash
# 1. Run affected tests
npm test -- template-library-page template-editor template-assignment-card \
           home-programs-widget slp-speech-coach

# 2. Type-check
npx tsc --noEmit

# 3. Manual — as SLP:
#   a. /speech-coach/templates → all tool/skill buttons have readable text (Bug 1)
#   b. Click "Edit" on a template → editor opens pre-filled → save updates it (Bug 2)
#   c. Unnamed template shows "Untitled template" (Bug 3)
#   d. /patients/[id] → Home Programs → speech-coach program has "Configure Coach" link
#   e. Click "Configure Coach" → /patients/[id]/speech-coach?program=X → Coach Setup + Template tabs
#   f. Save coach setup → toast confirms → refresh → values persist

# 4. Manual — as Caregiver:
#   a. /family/[id]/speech-coach?program=X → ONLY "New Session" + "History" tabs visible
#   b. No Coach Setup, no Template tab
```
