# SP5: SLP-Native Experience — Design Spec

**Date:** March 30, 2026
**Sub-project:** SP5 of 5 (SLP Workflow Gap Analysis)
**Scope:** Live in-session trial data collection, goal bank (200+ goals), home program PDF export

---

## Overview

SP5 removes the last paper workflows from an SLP's daily practice. Live data collection replaces the paper tally sheet SLPs use during sessions. The goal bank replaces browsing goal resources and typing goals from scratch. Home program export reaches caregivers who aren't app users. These are SLP-native features that differentiate Bridges from general EMRs.

---

## 1. Live In-Session Trial Data Collection

### Problem
SLPs collect trial-by-trial data during sessions (correct/incorrect per attempt, with cue level). Currently this is done on paper or a separate app, then manually entered into the session note afterward. Every SLP-native platform (Fusion, Ambiki, SLP Toolkit) has a live data collection interface.

### Design

A "Start Session" mode that launches a minimal, touch-optimized data collection screen. Designed for iPad/tablet use during therapy sessions — large tap targets, minimal cognitive load.

#### Schema Changes

**New table: `sessionTrials`**

| Field | Type | Description |
|-------|------|-------------|
| `sessionNoteId` | `optional Id<"sessionNotes">` | Linked after session ends |
| `patientId` | `Id<"patients">` | |
| `slpUserId` | `string` | |
| `goalId` | `Id<"goals">` | |
| `targetDescription` | `string` | Snapshot of goal short description at time of collection |
| `trials` | `array<object>` | Each: `{ correct: boolean, cueLevel: "independent" / "min-cue" / "mod-cue" / "max-cue", timestamp: number }` |
| `sessionDate` | `string` | ISO date |
| `startedAt` | `number` | When data collection began |
| `endedAt` | `optional number` | When data collection ended |

**Indexes:**
- `by_patientId_sessionDate` — `[patientId, sessionDate]`
- `by_sessionNoteId` — `[sessionNoteId]`
- `by_goalId` — `[goalId]`

#### Backend

**New file: `convex/sessionTrials.ts`**

**Mutations:**
- `start` — SLP-only. Creates a new `sessionTrials` record for a patient + goal. Returns the trial ID.
- `recordTrial` — SLP-only. Appends a trial (`{ correct, cueLevel, timestamp }`) to the `trials` array.
- `endCollection` — Sets `endedAt`, calculates final stats.
- `linkToSessionNote` — Called when creating/editing a session note. Links trial data to the note and auto-populates `structuredData.targetsWorkedOn`.

**Queries:**
- `getActiveForPatient` — Returns any in-progress trial collection for a patient (enables resume if accidentally navigated away).
- `listBySessionNote` — Returns trial data linked to a session note.
- `listByPatientDate` — Returns trial collections for a patient on a given date.

#### Frontend

**New feature: `src/features/data-collection/`**

```
src/features/data-collection/
├── components/
│   ├── data-collection-screen.tsx    — Full-screen touch-optimized interface
│   ├── trial-buttons.tsx             — Large + (correct) and − (error) buttons
│   ├── cue-level-toggle.tsx          — Independent / Min / Mod / Max toggle bar
│   ├── running-tally.tsx             — Live display: "14/20 — 70%"
│   ├── target-selector.tsx           — Swipe between active goals/targets
│   └── session-summary.tsx           — End-of-session summary with stats per target
├── hooks/
│   └── use-data-collection.ts
```

**Key UX details:**
- **Full-screen mode** — Hides navigation, maximizes tap area
- **Large buttons** — `+` and `−` buttons are at least 80px tall, thumb-reachable at bottom of screen
- **Cue level bar** — Horizontal toggle at top, persists across taps (defaults to "independent")
- **Running tally** — Always visible: `{correct}/{total} — {accuracy}%`
- **Multi-target** — Horizontal swipe or tab bar to switch between active goals for this patient
- **End session** — Summary screen showing accuracy per target, option to start session note (auto-populated)

**Routes:**
- `/patients/[id]/collect` — Data collection screen
- Accessed from patient detail page ("Start Session" button) or from the session notes page

**Integration with session notes:**
When a session note is created after data collection, the `linkToSessionNote` mutation auto-populates `structuredData.targetsWorkedOn` from the trial data: target name from goal, trials count, correct count, prompt level (most frequent cue level used).

---

## 2. Goal Bank (200+ Goals)

### Problem
Bridges has 20 hardcoded goal templates in `goal-bank-data.ts`. SLP-native platforms ship 200–400 curated, filterable goals organized by domain, age range, and skill level.

### Design

Move goals from a static TypeScript array to a Convex-backed database. Seed with 200+ goals at deploy time. Add filtering UI with domain, age range, skill level, and keyword search.

#### Schema Changes

**New table: `goalBank`**

| Field | Type | Description |
|-------|------|-------------|
| `domain` | union literal | Same 8 domains as `goals` table |
| `ageRange` | union literal | `"0-3" / "3-5" / "5-8" / "8-12" / "12-18" / "adult"` |
| `skillLevel` | `string` | Domain-specific level (e.g. for articulation: "isolation", "syllable", "word", "phrase", "sentence", "conversation") |
| `shortDescription` | `string` | Brief label |
| `fullGoalText` | `string` | Template with `{accuracy}` and `{sessions}` placeholders |
| `defaultTargetAccuracy` | `number` | e.g. 80 |
| `defaultConsecutiveSessions` | `number` | e.g. 3 |
| `exampleBaseline` | `optional string` | e.g. "Currently producing /s/ at word level with 40% accuracy" |
| `typicalCriterion` | `optional string` | e.g. "80% accuracy across 3 consecutive sessions" |
| `isCustom` | `boolean` | false for system goals, true for SLP-contributed |
| `createdBy` | `optional string` | SLP user ID for custom goals |

**Indexes:**
- `by_domain` — `[domain]`
- `by_domain_ageRange` — `[domain, ageRange]`
- `by_domain_skillLevel` — `[domain, skillLevel]`
- `by_createdBy` — `[createdBy]`

#### Backend

**New file: `convex/goalBank.ts`**

**Mutations:**
- `seed` — Internal mutation. Inserts the full set of pre-written goals. Idempotent (checks if already seeded).
- `addCustom` — SLP-only. Adds a goal to their personal bank with `isCustom: true`.
- `removeCustom` — SLP-only. Removes a custom goal they created.

**Queries:**
- `search` — Args: `domain?`, `ageRange?`, `skillLevel?`, `keyword?`, `includeCustom?`. Returns matching goals with pagination. Keyword search is a simple substring match on `shortDescription` + `fullGoalText`.
- `listDomainSkillLevels` — Returns the distinct skill levels for a given domain (for the filter dropdown).

#### Seed Data

**New file: `convex/lib/goalBankSeed.ts`**

200+ pre-written goals across all 8 domains and 6 age ranges. Organized by domain:

| Domain | Approximate Count | Skill Levels |
|--------|------------------|-------------|
| Articulation | 40 | isolation, syllable, word, phrase, sentence, conversation |
| Language — Receptive | 30 | single-step, multi-step, complex |
| Language — Expressive | 30 | single-word, phrase, sentence, narrative |
| Fluency | 15 | awareness, modification, transfer |
| Voice | 15 | awareness, production, carryover |
| Pragmatic/Social | 25 | basic, intermediate, advanced |
| AAC | 25 | symbol-recognition, single-symbol, multi-symbol, sentence-construction |
| Feeding | 20 | oral-motor, texture-acceptance, self-feeding |

Each goal follows the SMART format: "Given [context], [patient] will [behavior] with [accuracy]% accuracy across [sessions] consecutive sessions."

#### Frontend

**Modified: `src/features/goals/components/goal-bank-picker.tsx`**
Complete rewrite to replace the current 20-template static picker:

- **Filter bar:** Domain dropdown, age range dropdown, skill level dropdown (populated dynamically based on selected domain), keyword search input
- **Results grid:** Cards showing short description, domain badge, age range, skill level
- **"Add to Patient" button:** Opens the goal form pre-populated with the template
- **"My Goals" tab:** Shows SLP's custom goals with "Add New" button
- **Pagination:** Load more on scroll (Convex pagination)

**Modified: `src/features/goals/components/goal-form.tsx`**
- Accept pre-populated values from goal bank selection
- No structural changes, just better integration with the bank picker

---

## 3. Home Program PDF Export

### Problem
Not every caregiver uses the Bridges app. Grandparents, school aides, and sitters need printed handouts.

### Design
A print-friendly view of the home program with browser print CSS. Simple, no server-side PDF dependency.

#### Frontend Changes

**New: `src/features/patients/components/home-program-print.tsx`**
- Print-friendly layout: program title, target skill, 2–3 activities with instructions, frequency, SLP name + contact info
- Uses `@media print` CSS to hide navigation and format for paper
- "Print / Export PDF" button calls `window.print()`

**Modified: `src/features/patients/components/home-programs-widget.tsx`**
- Add "Print" icon button on each home program card

**Route:**
- `/patients/[id]/home-programs/[programId]/print` — Print-friendly view

---

## What This Does NOT Include

- Offline data collection (requires internet for Convex)
- Timer/stopwatch for session duration (can be added later)
- Video/audio recording during data collection
- AI-generated goal suggestions based on evaluation results (future enhancement)
- Server-side PDF generation for home programs (browser print for now)
- Import goals from external sources (CSV, other platforms)

---

## Dependencies

- **Existing:** Goals system (`goals` table, `progressData` table), session notes (`sessionNotes`), home programs (`homePrograms`)
- **SP1:** Practice profile for SLP contact info on home program printout
- **SP4:** Group session notes can use data collection for multiple patients

---

*Sub-project 5 of 5 from the SLP Workflow Gap Analysis (March 30, 2026).*
