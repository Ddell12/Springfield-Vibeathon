# SP2: Clinical Documents — Design Spec

**Date:** March 30, 2026
**Sub-project:** SP2 of 5 (SLP Workflow Gap Analysis)
**Scope:** Evaluation report, Plan of Care, discharge summary, goal modification audit trail

---

## Overview

SP2 builds the clinical document lifecycle that every SLP practice requires: evaluation → plan of care → treatment → discharge. Each document type follows a shared pattern: structured data in → AI narrative generation → SLP review/edit → sign → printable output. This sub-project adds 3 new Convex tables, 3 new feature slices, 2 SSE streaming routes for AI generation, and extends the existing goals system with an amendment audit trail.

---

## Design Decisions

- **AI generation:** SSE streaming routes matching the existing `/api/generate-soap/route.ts` pattern. One route per document type (evaluation interpretation, discharge narrative). Plan of Care is structured data only — no AI narrative needed.
- **Storage:** One table per document type (`evaluations`, `plansOfCare`, `dischargeSummaries`) — each has distinct fields, and type-specific tables are easier to query and validate than a generic `documents` table.
- **Goal audit trail:** Amendment log stored as an array on the `goals` table, snapshotted before each edit.
- **PDF export:** Browser print CSS for all documents. Server-side PDF generation is a later enhancement.
- **Versioning:** Plan of Care documents are versioned — amendments create new rows linked to the original via `previousVersionId`.
- **ICD-10 codes:** A static lookup module with the ~50 most common SLP diagnosis codes. Not a full ICD-10 database — that's overkill for private practice SLP.

---

## Schema Changes

### New table: `evaluations`

| Field | Type | Description |
|-------|------|-------------|
| `patientId` | `Id<"patients">` | |
| `slpUserId` | `string` | |
| `evaluationDate` | `string` | ISO date of evaluation |
| `referralSource` | `optional string` | Who referred the patient |
| `backgroundHistory` | `string` | Developmental history, prior services, chief complaint |
| `assessmentTools` | `array<object>` | Each: `{ name: string, scoresRaw?: string, scoresStandard?: string, percentile?: string, notes?: string }` |
| `domainFindings` | `object` | `{ articulation?: { narrative, scores? }, languageReceptive?: { narrative, scores? }, languageExpressive?: { narrative, scores? }, fluency?: { narrative, scores? }, voice?: { narrative, scores? }, pragmatics?: { narrative, scores? }, aac?: { narrative, scores? } }` |
| `behavioralObservations` | `string` | Free-text clinical observations during eval |
| `clinicalInterpretation` | `string` | AI-assisted narrative interpreting scores and observations |
| `diagnosisCodes` | `array<{ code: string, description: string }>` | ICD-10 codes |
| `prognosis` | union literal | `"excellent" / "good" / "fair" / "guarded"` |
| `recommendations` | `string` | Services recommended, referrals, accommodations |
| `status` | union literal | `"draft" / "complete" / "signed"` |
| `signedAt` | `optional number` | |

**Indexes:**
- `by_patientId` — `[patientId]`
- `by_slpUserId` — `[slpUserId]`

### New table: `plansOfCare`

| Field | Type | Description |
|-------|------|-------------|
| `patientId` | `Id<"patients">` | |
| `slpUserId` | `string` | |
| `evaluationId` | `optional Id<"evaluations">` | Links to source evaluation |
| `diagnosisCodes` | `array<{ code: string, description: string }>` | Pulled from eval or manual entry |
| `longTermGoals` | `array<string>` | Goal IDs (stored as strings for flexibility) |
| `shortTermGoals` | `array<string>` | Goal IDs |
| `frequency` | `string` | e.g. "2x/week" |
| `sessionDuration` | `string` | e.g. "45 minutes" |
| `planDuration` | `string` | e.g. "12 weeks" |
| `projectedDischargeDate` | `optional string` | ISO date |
| `dischargeCriteria` | `string` | When patient is ready for discharge |
| `physicianName` | `optional string` | |
| `physicianNPI` | `optional string` | |
| `physicianSignatureOnFile` | `boolean` | Checkbox for now; full e-sig routing is later |
| `physicianSignatureDate` | `optional string` | |
| `status` | union literal | `"draft" / "active" / "amended" / "expired"` |
| `signedAt` | `optional number` | |
| `version` | `number` | Starts at 1, increments on amendment |
| `previousVersionId` | `optional Id<"plansOfCare">` | Links to prior version for amendment chain |

**Indexes:**
- `by_patientId` — `[patientId]`
- `by_patientId_status` — `[patientId, status]`

### New table: `dischargeSummaries`

| Field | Type | Description |
|-------|------|-------------|
| `patientId` | `Id<"patients">` | |
| `slpUserId` | `string` | |
| `serviceStartDate` | `string` | |
| `serviceEndDate` | `string` | |
| `presentingDiagnosis` | `string` | From evaluation or intake |
| `goalsAchieved` | `array<{ goalId: string, shortDescription: string, finalAccuracy: number }>` | |
| `goalsNotMet` | `array<{ goalId: string, shortDescription: string, finalAccuracy: number, reason: string }>` | |
| `dischargeReason` | union literal | `"goals-met" / "plateau" / "family-request" / "insurance-exhausted" / "transition" / "other"` |
| `dischargeReasonOther` | `optional string` | Free text when reason is "other" |
| `narrative` | `string` | AI-generated summary of treatment course |
| `recommendations` | `string` | Continued services, follow-up, home strategies |
| `returnCriteria` | `optional string` | When to return to therapy |
| `status` | union literal | `"draft" / "signed"` |
| `signedAt` | `optional number` | |

**Indexes:**
- `by_patientId` — `[patientId]`

### Extended table: `goals`

New field:
- `amendmentLog: optional array` — Each entry: `{ previousGoalText: string, previousTargetAccuracy: number, previousTargetConsecutiveSessions: number, previousStatus: string, changedAt: number, changedBy: string, reason?: string }`

---

## Backend — Convex Functions

### New file: `convex/evaluations.ts`

**Mutations:**
- `create` — SLP-only. Creates a new evaluation in draft status with structured data fields.
- `update` — SLP-only. Updates any field on a draft/complete evaluation. Rejects edits to signed evaluations.
- `sign` — SLP-only. Transitions status to "signed", sets `signedAt`. Propagates `diagnosisCodes` to the patient record (add ICD-10 field to patients table — see below).
- `unsign` — SLP-only. Reverts to "complete" status.

**Queries:**
- `getByPatient` — Returns all evaluations for a patient, sorted by date descending.
- `get` — Returns a single evaluation by ID with patient access check.

### New file: `convex/plansOfCare.ts`

**Mutations:**
- `generate` — SLP-only. Creates a new POC by pulling active goals and diagnosis from the latest evaluation. Pre-populates structured fields.
- `update` — SLP-only. Edits draft/active POC fields.
- `sign` — Transitions to "active", sets `signedAt`.
- `amend` — Creates a new version: copies current POC, sets old version to "amended", new version has incremented `version` and link to `previousVersionId`.

**Queries:**
- `getActiveByPatient` — Returns the current active POC for a patient.
- `getByPatient` — Returns all POC versions for a patient (for history view).
- `get` — Single POC by ID.

### New file: `convex/dischargeSummaries.ts`

**Mutations:**
- `generate` — SLP-only. Creates discharge summary by pulling: goal outcomes (met/not met with final accuracy), session count and date range from `sessionNotes`, diagnosis from evaluation. Auto-populates structured fields.
- `update` — Edits draft fields.
- `sign` — Transitions to "signed", sets `signedAt`.

**Queries:**
- `getByPatient` — Returns discharge summary for a patient (typically one, but supports multiple for re-admitted patients).
- `get` — Single by ID.

### Modified file: `convex/goals.ts`

- `update` mutation — Before applying the update, snapshot the current goal state into `amendmentLog` array. Include `changedAt` timestamp and `changedBy` user ID.

### Extended table: `patients`

New field:
- `icdCodes: optional array<{ code: string, description: string }>` — Set when an evaluation is signed. Used by billing (SP3) and POC generation.

---

## AI Generation Routes

### `src/app/api/generate-evaluation/route.ts`

SSE streaming endpoint. Input: evaluation ID. Pulls structured scores, domain findings, and behavioral observations. Generates two sections:
1. **Clinical interpretation** — narrative interpreting the assessment scores and observations
2. **Recommendations** — services recommended, referrals, accommodations

Prompt structure follows the same pattern as `/api/generate-soap/route.ts`: system prompt with SLP context, structured data as input, streaming response saved via Convex mutation.

### `src/app/api/generate-discharge/route.ts`

SSE streaming endpoint. Input: patient ID + discharge reason + goals data. Pulls full treatment history (session count, duration of services, goal outcomes, progress trends). Generates:
1. **Narrative** — summary of treatment course, progress made, and rationale for discharge
2. **Recommendations** — continued services, home strategies, follow-up timeline

---

## Frontend

### New feature: `src/features/evaluations/`

```
src/features/evaluations/
├── components/
│   ├── evaluation-editor.tsx        — Multi-section form with structured inputs
│   ├── evaluation-viewer.tsx        — Read-only view with print styling
│   ├── assessment-tools-form.tsx    — Dynamic list of assessment tools with score fields
│   ├── domain-findings-form.tsx     — Per-domain narrative + scores inputs
│   ├── icd10-picker.tsx             — Searchable dropdown with ~50 common SLP codes
│   └── evaluation-list.tsx          — Patient's evaluation history
├── hooks/
│   └── use-evaluations.ts
└── lib/
    ├── icd10-codes.ts               — Static lookup of ~50 common SLP ICD-10 codes
    └── evaluation-prompt.ts         — Prompt builder for AI generation
```

**Routes:**
- `/patients/[id]/evaluations/new` — New evaluation form
- `/patients/[id]/evaluations/[evalId]` — View/edit evaluation

**Integration:** "New Evaluation" button on patient detail page. Evaluation list visible in clinical widgets section.

### New feature: `src/features/plan-of-care/`

```
src/features/plan-of-care/
├── components/
│   ├── poc-generator.tsx            — Generate POC from goals + eval
│   ├── poc-viewer.tsx               — Read-only view with print styling
│   ├── poc-editor.tsx               — Edit frequency, duration, discharge criteria
│   ├── physician-signature.tsx      — Physician name/NPI/sig-on-file section
│   └── poc-history.tsx              — Version history for amendments
├── hooks/
│   └── use-plan-of-care.ts
```

**Routes:**
- Accessed from patient goals view — "Generate Plan of Care" button
- `/patients/[id]/plan-of-care` — View/edit active POC

**Integration:** "Generate Plan of Care" action on the patient goals page. POC status visible on patient profile.

### New feature: `src/features/discharge/`

```
src/features/discharge/
├── components/
│   ├── discharge-form.tsx           — Reason selector + editable fields
│   ├── discharge-viewer.tsx         — Read-only view with print styling
│   └── discharge-prompt-modal.tsx   — Triggered when patient status → "discharged"
├── hooks/
│   └── use-discharge-summary.ts
└── lib/
    └── discharge-prompt.ts          — Prompt builder for AI generation
```

**Routes:**
- No standalone route — triggered from patient detail page when status changes to "discharged"
- Discharge summary displayed prominently on the discharged patient profile

**Integration:** When SLP clicks "Discharge" on patient status, a modal prompts them to create the discharge summary. The summary is displayed as a prominent card on the discharged patient profile view.

### Modified feature: `src/features/goals/`

- Goal detail page gains a "History" expandable section showing the `amendmentLog` with timestamps and what changed.
- Goal edit form gains an optional "Reason for change" text field that is stored in the amendment log.

---

## ICD-10 Code Module

`src/features/evaluations/lib/icd10-codes.ts` — Static array of ~50 most common SLP diagnosis codes:

Key codes include:
- F80.0 — Phonological disorder
- F80.1 — Expressive language disorder
- F80.2 — Mixed receptive-expressive language disorder
- F80.81 — Childhood onset fluency disorder (stuttering)
- F80.89 — Other developmental disorders of speech and language
- R13.10 — Dysphagia, unspecified
- R47.1 — Dysarthria and anarthria
- R47.02 — Dysphasia
- R48.8 — Other symbolic dysfunctions (pragmatic language)
- J38.3 — Other diseases of vocal cords (voice disorders)
- F84.0 — Autistic disorder
- Q38.1 — Ankyloglossia (tongue-tie)

Each entry: `{ code: string, description: string, category: string }` where category maps to the 8 therapy domains for filtering.

---

## Document Lifecycle Flow

```
Patient intake
    ↓
Evaluation (assessment → AI interpretation → sign)
    ↓ ICD-10 codes propagate to patient record
Plan of Care (goals + frequency → sign → physician sig on file)
    ↓ Treatment begins
Session Notes (ongoing — already built)
    ↓ Goals modified → amendment log entries
Progress Reports (ongoing — already built, enhanced in SP4)
    ↓ Patient ready for discharge
Discharge Summary (auto-populate from history → AI narrative → sign)
```

---

## What This Does NOT Include

- Full ICD-10 database (50 common codes is sufficient for private practice SLP)
- Server-side PDF generation (browser print CSS for now)
- Electronic physician signature routing (checkbox + date for now)
- Standardized test scoring calculators (SLPs enter scores manually)
- IEP compliance tracking (excluded from gap analysis scope)

---

## Dependencies

- **SP1 (practiceProfiles):** Clinician signature blocks on all documents pull from `practiceProfiles` (name, credentials, license number).
- **SP3 (Clinical Billing):** Billing records reference evaluation ICD-10 codes and POC diagnosis.
- **Existing:** Goals system, session notes, progress reports are all data sources for these documents.

---

*Sub-project 2 of 5 from the SLP Workflow Gap Analysis (March 30, 2026).*
