# SLP Platform — Master Subsystem Roadmap

**Date:** 2026-03-28
**Status:** Approved architectural blueprint
**Purpose:** Capture all 5 subsystems, their interdependencies, data model evolution, and key decisions so any future session can jump into a detailed spec for any subsystem with full context.

---

## Platform Vision

Bridges evolves from an AI therapy app builder into a full SLP patient management platform connecting therapists, parents, and children. The platform:

- Lets SLPs manage their caseload, document sessions, track IEP goals, and generate AI-powered therapy materials personalized to each child
- Lets parents see a simplified view of their child's progress and practice assigned activities at home
- Uses AI to reduce the documentation burden (the #1 pain point for SLPs) and generate clinically-informed therapy content

The market has no end-to-end solution combining AI-generated therapy content + SLP dashboard + parent portal + progress tracking. This is the gap we fill.

---

## Subsystem Overview

| # | Subsystem | Primary User | Status | Dependencies |
|---|---|---|---|---|
| 1 | Patient/Caseload Management | SLP | **Specced + Planned** | None (foundation) |
| 2 | AI Session Notes & Documentation | SLP | Blueprint ready | Subsystem 1 |
| 3 | IEP Goal Tracking & Progress | SLP + Parent | Blueprint ready | Subsystems 1, 2 |
| 4 | Caregiver Portal & Home Programs | Parent | Blueprint ready | Subsystems 1, 3, 5 |
| 5 | AI Material Generation (Patient-Contextualized) | SLP | Blueprint ready | Subsystems 1, 3 |

```
Build order (dependencies flow left to right):

[1. Patients] → [2. Session Notes] → [3. Goal Tracking] → [5. Materials] → [4. Caregiver Portal]
                                              ↓                    ↑
                                              └────────────────────┘
```

**Subsystem 4 (Caregiver Portal) is last** because it consumes data from all other subsystems — goals, progress, materials, notes. Building it last means it has the richest data to display.

**Subsystem 5 (Materials) comes before 4** because parents need assigned materials to practice with at home.

---

## Cross-Cutting Decisions

These decisions were made during brainstorming and apply across all subsystems:

| Decision | Choice | Rationale |
|---|---|---|
| Target user | Solo SLP, designed for future org/team | Covers majority of private practice market; Clerk Organizations added later |
| Parent connection | Invite link flow | Low friction, full participation, no email deliverability issues |
| Session notes format | SOAP + structured quick-entry templates, AI converts structured → SOAP | Fast in-session capture + formal documentation compliance |
| Caregiver portal visibility | Simplified (Duolingo-style) | No clinical jargon, encouraging metrics, streak-based engagement |
| Material personalization | Auto-personalization from patient profile + goal-driven generation | AI knows who the child is AND what they're working on |
| Progress data capture | Manual SLP entry + automated in-app capture, AI synthesis | Both data streams unified into progress reports |
| Auth model | Clerk `publicMetadata` roles (`slp`, `caregiver`) | JWT claims for Convex-side checks, future org support via Organizations |
| Architecture | Vertical Slice Architecture, new feature slices per subsystem | Independent deployability, clean separation |

---

## Subsystem 1: Patient/Caseload Management

**Status:** Spec complete, implementation plan complete.
**Files:** `docs/superpowers/specs/2026-03-28-slp-patient-management-design.md`, `docs/superpowers/plans/2026-03-28-slp-patient-management.md`

### Summary

Foundation subsystem. Adds `patients`, `caregiverLinks`, `patientMaterials`, `activityLog` tables to Convex. Role-based auth via Clerk `publicMetadata`. Caseload list with expandable rows, widget-based patient detail page, two-step intake form, caregiver invite link flow.

### Data Model (4 new tables)

- `patients` — slpUserId, firstName, lastName, dateOfBirth, diagnosis, status, interests, communicationLevel, notes
- `caregiverLinks` — patientId, caregiverUserId, email, inviteToken, inviteStatus, relationship
- `patientMaterials` — patientId, sessionId?, appId?, assignedBy, assignedAt, notes
- `activityLog` — patientId, actorUserId, action, details, timestamp

### Key Routes

- `/patients` — Caseload list
- `/patients/[id]` — Patient detail (widget dashboard)
- `/patients/new` — Intake form
- `/invite/[token]` — Caregiver invite landing

---

## Subsystem 2: AI Session Notes & Documentation

**Status:** Blueprint ready. Needs full spec before implementation.
**Depends on:** Subsystem 1 (patients table, auth helpers)

### Problem

SLPs spend 30-60 minutes documenting every therapy session. Documentation includes SOAP notes, data collection, and progress summaries. This is the #1 burnout driver — SLPs spend more time writing about therapy than doing therapy.

### Solution

Dual-mode documentation: structured quick-entry for in-session data capture (takes <2 minutes), and AI-powered SOAP note generation from that structured data (takes 0 minutes — it's automatic).

### Core Entities

**`sessionNotes`** — One per therapy session

| Field | Type | Notes |
|---|---|---|
| `patientId` | `v.id("patients")` | Which child |
| `slpUserId` | `v.string()` | Documenting SLP |
| `sessionDate` | `v.string()` | ISO date of the therapy session |
| `sessionDuration` | `v.number()` | Minutes |
| `sessionType` | union literal | `in-person`, `teletherapy`, `parent-consultation` |
| `status` | union literal | `draft`, `in-progress`, `complete`, `signed` |
| `structuredData` | `v.object(...)` | See Structured Data Schema below |
| `soapNote` | `v.optional(v.object(...))` | AI-generated SOAP, editable by SLP |
| `aiGenerated` | `v.boolean()` | Whether SOAP was AI-generated (for audit trail) |

**Structured Data Schema** (embedded object in `sessionNotes`):

```ts
{
  targetsWorkedOn: v.array(v.object({
    target: v.string(),          // e.g., "/r/ in initial position"
    trials: v.optional(v.number()),     // e.g., 20
    correct: v.optional(v.number()),    // e.g., 14
    promptLevel: v.optional(v.string()), // "independent", "verbal-cue", "model", "physical"
    notes: v.optional(v.string()),
  })),
  behaviorNotes: v.optional(v.string()),
  parentFeedback: v.optional(v.string()),  // What parent reported
  homeworkAssigned: v.optional(v.string()), // What to practice at home
  nextSessionFocus: v.optional(v.string()),
}
```

**SOAP Note Schema** (embedded object):

```ts
{
  subjective: v.string(),   // Parent/client reports, observations
  objective: v.string(),    // Measurable data, trial results
  assessment: v.string(),   // Clinical interpretation
  plan: v.string(),         // Next steps, homework, referrals
}
```

### AI SOAP Generation Flow

```
SLP fills structured quick-entry form during/after session
  → Clicks "Generate SOAP Note"
  → System pulls: structured data + patient profile (diagnosis, goals, communication level)
    + previous session's SOAP note (for continuity)
  → Claude generates SOAP note with clinical language, CPT-code-aware phrasing
  → SLP reviews, edits if needed, clicks "Sign"
  → Status flips to "signed", becomes immutable (audit trail)
```

### Key UI

- **Session note editor** — Split view: structured form on left, SOAP preview on right. Real-time SOAP regeneration as structured fields change.
- **Session list** — Per-patient tab on the patient detail page. Chronological list with status chips (draft/complete/signed). Quick "New Session" button.
- **AI generation** — Uses existing Claude streaming pipeline via a new API route (`/api/generate-soap`). System prompt includes ASHA documentation standards, CPT code awareness, and the patient's clinical context.

### Data Model Additions

- `sessionNotes` table with indexes: `by_patientId`, `by_slpUserId`, `by_sessionDate`

### Feature Slice

```
src/features/session-notes/
  components/
    session-note-editor.tsx      — Split view editor
    structured-data-form.tsx     — Quick-entry form
    soap-preview.tsx             — AI-generated SOAP display
    session-notes-list.tsx       — Per-patient session list
    session-note-card.tsx        — Single session summary card
  hooks/
    use-session-notes.ts         — Query hooks
    use-soap-generation.ts       — AI generation state
  lib/
    soap-prompt.ts               — System prompt for SOAP generation
    session-utils.ts             — Duration formatting, accuracy calculation
```

### Integration Points

- Patient detail page: new "Session Notes" widget showing recent sessions
- Activity log: `session-documented` action type added
- Goal tracking (subsystem 3): session data feeds into goal progress calculations

---

## Subsystem 3: IEP Goal Tracking & Progress Measurement

**Status:** Blueprint ready. Needs full spec before implementation.
**Depends on:** Subsystem 1 (patients), Subsystem 2 (session notes for manual data)

### Problem

SLPs write IEP goals like "Alex will produce /r/ in the initial position of words with 80% accuracy across 3 consecutive sessions." Tracking progress toward these goals today involves spreadsheets and memory. Progress reports for IEP meetings are assembled manually from weeks of session data.

### Solution

Structured goal bank with measurable criteria, automatic progress calculation from session data (manual entry) and in-app usage data (automated capture), AI-synthesized progress reports.

### Core Entities

**`goals`** — IEP goals per patient

| Field | Type | Notes |
|---|---|---|
| `patientId` | `v.id("patients")` | |
| `slpUserId` | `v.string()` | |
| `domain` | union literal | `articulation`, `language-receptive`, `language-expressive`, `fluency`, `voice`, `pragmatic-social`, `aac`, `feeding` |
| `shortDescription` | `v.string()` | e.g., "Produce /r/ in initial position" |
| `fullGoalText` | `v.string()` | Complete IEP goal language with measurable criteria |
| `targetAccuracy` | `v.number()` | e.g., 80 (percent) |
| `targetConsecutiveSessions` | `v.number()` | e.g., 3 |
| `status` | union literal | `active`, `met`, `discontinued`, `modified` |
| `startDate` | `v.string()` | ISO date |
| `targetDate` | `v.optional(v.string())` | IEP review date |
| `notes` | `v.optional(v.string())` | |

**`progressData`** — Individual data points (from both manual and automated sources)

| Field | Type | Notes |
|---|---|---|
| `goalId` | `v.id("goals")` | |
| `patientId` | `v.id("patients")` | Denormalized for efficient queries |
| `source` | union literal | `session-note`, `in-app-auto`, `manual-entry` |
| `sourceId` | `v.optional(v.string())` | Links to sessionNote ID or app interaction ID |
| `date` | `v.string()` | ISO date |
| `trials` | `v.optional(v.number())` | |
| `correct` | `v.optional(v.number())` | |
| `accuracy` | `v.number()` | Calculated percentage |
| `promptLevel` | `v.optional(v.string())` | |
| `notes` | `v.optional(v.string())` | |
| `timestamp` | `v.number()` | |

**`progressReports`** — AI-generated periodic summaries

| Field | Type | Notes |
|---|---|---|
| `patientId` | `v.id("patients")` | |
| `slpUserId` | `v.string()` | |
| `reportType` | union literal | `weekly-summary`, `monthly-summary`, `iep-progress-report` |
| `periodStart` | `v.string()` | |
| `periodEnd` | `v.string()` | |
| `goalSummaries` | `v.array(v.object({...}))` | Per-goal: accuracy trend, sessions count, status, narrative |
| `overallNarrative` | `v.string()` | AI-generated narrative covering all goals |
| `status` | union literal | `draft`, `reviewed`, `signed` |

### Progress Calculation

```
Goal: "Produce /r/ in initial position with 80% accuracy across 3 consecutive sessions"

Data points flow in from two streams:
  1. Session notes (manual): SLP enters trials=20, correct=16 → accuracy=80%
  2. In-app capture (auto): Child does flashcard drill, taps 15/20 /r/ cards correctly → accuracy=75%

System computes:
  - Rolling accuracy per session (or per day for auto data)
  - Consecutive sessions at or above target (80%)
  - Current streak toward target (3 consecutive)
  - Trend: improving / stable / declining

Goal status auto-suggests "met" when criteria are satisfied (SLP confirms).
```

### AI Progress Report Flow

```
SLP clicks "Generate Progress Report" on patient detail
  → Selects report type (weekly/monthly/IEP) and date range
  → System pulls: all progressData for that period, goal definitions, session notes
  → Claude generates per-goal summaries + overall narrative
  → SLP reviews, edits, signs
  → Can export as PDF for IEP meetings
```

### Key UI

- **Goals tab** — On patient detail page. List of active goals with progress sparklines (mini charts showing accuracy over time). "Add Goal" button with goal bank suggestions.
- **Goal detail view** — Full goal text, progress chart (Recharts line chart), data point table, "Generate Report" CTA.
- **Goal bank** — Pre-populated library of common IEP goals by domain. SLP picks one and customizes the numbers. Seeded into `knowledgeBase` RAG for AI to reference.
- **Progress report viewer** — Read/edit/sign flow, PDF export via browser print or html-to-pdf.

### Data Model Additions

- `goals` table with indexes: `by_patientId`, `by_status`
- `progressData` table with indexes: `by_goalId`, `by_patientId_date` (compound)
- `progressReports` table with indexes: `by_patientId`, `by_reportType`

### Feature Slice

```
src/features/goals/
  components/
    goals-list.tsx               — Per-patient goal list with sparklines
    goal-detail.tsx              — Full goal view with progress chart
    goal-form.tsx                — Add/edit goal form
    goal-bank-picker.tsx         — Pre-populated goal suggestions
    progress-chart.tsx           — Recharts line chart component
    progress-report-viewer.tsx   — AI report review/edit/sign
  hooks/
    use-goals.ts                 — Goal query hooks
    use-progress.ts              — Progress data hooks
  lib/
    goal-utils.ts                — Accuracy calculation, streak detection
    progress-prompt.ts           — AI prompt for report generation
    goal-bank-data.ts            — Seed data for common IEP goals
```

### Integration Points

- Patient detail page: new "Goals" widget with sparklines
- Session notes (subsystem 2): when SLP enters target data, it auto-creates `progressData` entries linked to the relevant goal
- Materials (subsystem 5): goal selection drives AI material generation
- Caregiver portal (subsystem 4): progress data feeds the simplified parent view
- Activity log: `goal-created`, `goal-met`, `report-generated` action types

---

## Subsystem 4: Caregiver Portal & Home Programs

**Status:** Blueprint ready. Needs full spec before implementation.
**Depends on:** Subsystem 1 (caregiver auth + links), Subsystem 3 (progress data for display), Subsystem 5 (assigned materials)

### Problem

Parents want to help but don't know how. SLPs assign homework ("practice /r/ sounds 10 times") but have no way to track if it happened. Parents feel disconnected from the therapy process. Communication is fragmented across texts, emails, and paper handouts.

### Solution

Simplified caregiver dashboard — Duolingo-style engagement metrics, today's assigned activities, practice logging, and encouraging feedback. No clinical jargon. SLPs see when parents are engaged and what was practiced.

### Design Principle

**"Make the parent feel competent, not clinical."** Every screen answers: "What should I do today?" and "Is my child making progress?" — never "What does this medical term mean?"

### Core Entities

**`homePrograms`** — SLP-defined practice activities for home

| Field | Type | Notes |
|---|---|---|
| `patientId` | `v.id("patients")` | |
| `slpUserId` | `v.string()` | |
| `title` | `v.string()` | e.g., "Practice /r/ sounds with dinosaur cards" |
| `instructions` | `v.string()` | Parent-friendly directions (no jargon) |
| `materialId` | `v.optional(v.id("patientMaterials"))` | Linked material to practice with |
| `goalId` | `v.optional(v.id("goals"))` | Which IEP goal this supports |
| `frequency` | union literal | `daily`, `3x-week`, `weekly`, `as-needed` |
| `status` | union literal | `active`, `paused`, `completed` |
| `startDate` | `v.string()` | |
| `endDate` | `v.optional(v.string())` | |

**`practiceLog`** — Parent-reported practice sessions

| Field | Type | Notes |
|---|---|---|
| `homeProgramId` | `v.id("homePrograms")` | |
| `patientId` | `v.id("patients")` | Denormalized |
| `caregiverUserId` | `v.string()` | |
| `date` | `v.string()` | ISO date |
| `duration` | `v.optional(v.number())` | Minutes practiced |
| `confidence` | `v.optional(v.number())` | 1-5 parent rating: "How did it go?" |
| `notes` | `v.optional(v.string())` | Parent observations |
| `timestamp` | `v.number()` | |

**`messages`** (extend existing or new table) — SLP ↔ Parent messaging

| Field | Type | Notes |
|---|---|---|
| `patientId` | `v.id("patients")` | Scoped to a child (not general chat) |
| `senderUserId` | `v.string()` | |
| `senderRole` | union literal | `slp`, `caregiver` |
| `content` | `v.string()` | |
| `timestamp` | `v.number()` | |
| `readAt` | `v.optional(v.number())` | |

Note: This is a new `patientMessages` table, separate from the existing `messages` table (which stores AI chat history for the builder).

### Caregiver Dashboard (`/family`)

```
┌─────────────────────────────────────────────┐
│  🌟 Alex's Speech Practice                  │
│  4-day streak!  ████░░░  (4/7 this week)   │
├─────────────────────────────────────────────┤
│  Today's Activities                          │
│  ┌──────────────────────────────────┐       │
│  │ 🦖 Dinosaur Sound Cards          │       │
│  │ Practice /r/ sounds - 10 minutes  │       │
│  │ [Start Practice]                  │       │
│  └──────────────────────────────────┘       │
│  ┌──────────────────────────────────┐       │
│  │ 📖 Going to the Doctor Story     │       │
│  │ Read together - 5 minutes         │       │
│  │ [Open Story]                      │       │
│  └──────────────────────────────────┘       │
├─────────────────────────────────────────────┤
│  This Week's Progress                        │
│  ✅ Practiced 4 days                         │
│  ⭐ Best session: Tuesday (parent rated 5/5)│
│  💬 Message from Dr. Smith: "Great work..."  │
├─────────────────────────────────────────────┤
│  [Log Practice]  [Message Therapist]         │
└─────────────────────────────────────────────┘
```

### Key UI

- **Family dashboard** (`/family`) — Today's activities, streak, weekly progress, recent SLP messages
- **Practice activity view** — Opens the assigned material (AAC board, flashcard deck, etc.) with a "Done" button that creates a practiceLog entry
- **Practice logging** — Quick form: "How long?" (slider), "How did it go?" (1-5 stars), optional notes
- **Messages** — Simple thread per child between SLP and parent. Convex real-time for instant delivery.
- **Celebration moments** — When a streak milestone is hit or the SLP marks a goal as met, show a celebration animation

### SLP-Side Integration

- Patient detail page: new "Home Program" widget showing assigned activities and parent engagement
- Session notes: "Parent reported" field auto-populated from recent practiceLog entries
- Activity log: `practice-logged`, `message-sent` action types
- Engagement alerts: "Marcus's parent hasn't logged practice in 5 days" (future enhancement)

### Data Model Additions

- `homePrograms` table with indexes: `by_patientId`, `by_status`
- `practiceLog` table with indexes: `by_homeProgramId`, `by_patientId_date` (compound)
- `patientMessages` table with indexes: `by_patientId_timestamp` (compound)

### Feature Slice

```
src/features/family/
  components/
    family-dashboard.tsx         — Main caregiver dashboard
    today-activities.tsx         — Today's assigned practices
    practice-activity.tsx        — Single activity with material link
    practice-log-form.tsx        — Quick logging form (duration, rating, notes)
    streak-tracker.tsx           — Visual streak display
    weekly-progress.tsx          — Simple weekly summary
    message-thread.tsx           — SLP ↔ parent messaging
  hooks/
    use-family.ts                — Caregiver-scoped query hooks
    use-practice-log.ts          — Practice logging mutations
  lib/
    streak-utils.ts              — Streak calculation from practiceLog
    encouragement.ts             — Encouraging message templates
```

---

## Subsystem 5: AI Material Generation (Patient-Contextualized)

**Status:** Blueprint ready. Needs full spec before implementation.
**Depends on:** Subsystem 1 (patient profiles), Subsystem 3 (goals for goal-driven generation)

### Problem

The existing builder generates therapy materials but without patient context. An SLP building an AAC board for Alex has to manually describe that Alex likes dinosaurs, is working on /r/ sounds, and communicates in single words. This context already exists in the patient profile and IEP goals.

### Solution

Two entry points for patient-contextualized generation:

1. **Auto-personalization** — SLP clicks "Create Material" from a patient's detail page. Claude's system prompt is automatically enriched with the patient's diagnosis, communication level, interests, and sensory notes. The SLP just describes what they want.

2. **Goal-driven generation** — SLP selects a specific IEP goal from the patient's goal list. The AI generates materials specifically targeting that goal, linked to both patient and goal for progress tracking.

### How It Works

```
Patient-contextualized flow:
  SLP on /patients/[id] clicks "Create Material"
    → Navigates to /builder?patientId=[id]
    → Builder loads patient context (profile + active goals)
    → System prompt is enriched:
        "You are building a therapy tool for Alex, age 4.
         Diagnosis: articulation disorder.
         Communication level: single words.
         Interests: dinosaurs, trains, Bluey.
         Active goals:
           - Produce /r/ in initial position (target: 80%)
           - Follow 2-step directions (target: 90%)
         Sensory notes: Sensitive to loud sounds."
    → SLP describes what they want (or selects a goal to target)
    → Claude generates personalized material
    → Material auto-linked to patient via patientMaterials

Goal-driven flow:
  SLP on /patients/[id] → Goals tab → clicks goal → "Generate Practice Material"
    → Same builder flow but additionally focused on the specific goal
    → System prompt emphasizes the target sound/skill/criteria
    → Material linked to both patient AND goal
    → In-app usage data flows back into progressData for that goal
```

### Changes to Existing Builder

This subsystem modifies the existing builder, unlike subsystems 1-4 which are pure additions:

- **`src/app/api/generate/route.ts`** — Accept optional `patientId` query param. If present, fetch patient profile and active goals from Convex, inject into the system prompt context.
- **`src/features/builder/lib/agent-prompt.ts`** — Add a `buildPatientContext(patient, goals)` function that generates the context block. Append to the existing system prompt when a patient is selected.
- **`src/features/builder/components/`** — Add a patient context card at the top of the builder when `patientId` is in the URL. Shows patient name, key info, and active goals. Dismissible.
- **Post-generation** — After build completes, auto-create a `patientMaterials` row linking the new session to the patient.

### No New Tables

This subsystem doesn't add new Convex tables. It adds:
- An optional `patientId` field to the existing `sessions` table (non-breaking: all existing sessions have `undefined`)
- An optional `goalId` field to the `patientMaterials` table (links material to a specific goal)

### Feature Changes (not a new feature slice)

```
Modified files:
  src/app/api/generate/route.ts             — Patient context injection
  src/features/builder/lib/agent-prompt.ts   — buildPatientContext() helper
  src/features/builder/lib/agent-tools.ts    — Post-build patient linking

New files:
  src/features/builder/components/patient-context-card.tsx  — Context display in builder
  src/features/builder/lib/patient-context.ts               — Patient context fetching
```

### Integration Points

- Patient detail page: "Create Material" CTA navigates to `/builder?patientId=[id]`
- Goal detail: "Generate Practice Material" CTA navigates to `/builder?patientId=[id]&goalId=[goalId]`
- Caregiver portal: personalized materials show up in "Today's Activities"
- Progress tracking: in-app usage of goal-linked materials feeds `progressData`

---

## Data Model Evolution Summary

Shows how the Convex schema grows across all 5 subsystems:

### Subsystem 1 (Patient Management) — 4 new tables
- `patients`
- `caregiverLinks`
- `patientMaterials`
- `activityLog`

### Subsystem 2 (Session Notes) — 1 new table
- `sessionNotes`

### Subsystem 3 (Goal Tracking) — 3 new tables
- `goals`
- `progressData`
- `progressReports`

### Subsystem 4 (Caregiver Portal) — 3 new tables
- `homePrograms`
- `practiceLog`
- `patientMessages`

### Subsystem 5 (Patient-Contextualized Materials) — 0 new tables
- Modifies `sessions` (add optional `patientId`)
- Modifies `patientMaterials` (add optional `goalId`)

**Total new tables across all subsystems: 11**
**Total modified tables: 2**

### Activity Log Action Types (cumulative)

| Subsystem | New Actions |
|---|---|
| 1 | `patient-created`, `profile-updated`, `material-assigned`, `invite-sent`, `invite-accepted`, `status-changed` |
| 2 | `session-documented` |
| 3 | `goal-created`, `goal-met`, `goal-modified`, `report-generated` |
| 4 | `practice-logged`, `message-sent`, `home-program-assigned` |
| 5 | `material-generated-for-patient` |

---

## Knowledge Base Expansion

The existing `knowledgeBase` RAG table has 5 categories. Each subsystem expands it:

| Subsystem | New KB Categories | Content |
|---|---|---|
| 2 | `soap-documentation`, `cpt-codes` | ASHA documentation standards, CPT billing codes for SLP services, SOAP writing examples |
| 3 | `iep-goal-bank`, `articulation-norms` | Common IEP goals by domain, age-based articulation norms, phonological process elimination timelines |
| 5 | (uses existing + subsystem 2 & 3 categories) | Patient context is dynamic, not KB — but the AI references KB for clinical accuracy |

---

## API Routes (cumulative)

| Route | Subsystem | Purpose |
|---|---|---|
| `/api/generate` (existing) | 5 | Modified to accept patientId context |
| `/api/generate-soap` | 2 | SOAP note generation from structured data |
| `/api/generate-report` | 3 | Progress report generation from goal data |

All AI routes follow the existing SSE streaming pattern from `src/app/api/generate/route.ts`.

---

## How to Use This Document

When starting work on any subsystem:

1. Read this master roadmap for full cross-subsystem context
2. Read the subsystem 1 spec (`docs/superpowers/specs/2026-03-28-slp-patient-management-design.md`) for the detailed spec format to follow
3. Run the brainstorming skill to turn the blueprint section into a full spec — the key decisions and entity designs here are the starting point, not the final word
4. The spec session can focus on UI details, edge cases, and validation rather than re-debating architectural choices

### What's Locked (don't re-debate)
- Build order: 1 → 2 → 3 → 5 → 4
- Auth model: Clerk publicMetadata roles
- Data model: tables and fields listed above (may gain fields, won't lose them)
- Cross-cutting decisions table above

### What's Open (refine during spec session)
- Exact UI layouts and component decomposition
- Specific validation rules per field
- Error handling details
- Mobile-specific patterns
- Test coverage scope
- AI prompt engineering details
