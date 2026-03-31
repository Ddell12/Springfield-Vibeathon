# SP4: Session Workflow Upgrades — Design Spec

**Date:** March 30, 2026
**Sub-project:** SP4 of 5 (SLP Workflow Gap Analysis)
**Scope:** Same-day signature warning, group session notes, multi-audience progress reports, physician signature field on POC

---

## Overview

SP4 improves four existing features with gaps identified in the SLP workflow gap analysis. These are incremental enhancements — no new tables, minimal new UI, focused on making existing features billing-compliant and multi-audience aware.

---

## 1. Same-Day Signature Warning

### Problem
Medicare and most commercial payers require session notes to be signed on the date of service. Notes signed days later can be flagged in audits. Currently no visibility into signing timeliness.

### Design
- **No blocking** — SLPs can still sign late (they get sick, technology fails)
- **Warning badge** — When a note's `signedAt` is more than 24 hours after `sessionDate`, display an amber badge: "Signed [X] days after session"
- **Dashboard metric** — On the session notes list, show a subtle indicator for late-signed notes

### Changes

**Modified: `src/features/session-notes/components/session-note-card.tsx`**
- After the existing status badge, add a conditional late-signature badge
- Logic: `signedAt && sessionDate && (signedAt - parseDate(sessionDate)) > 24 * 60 * 60 * 1000`

**Modified: `src/features/session-notes/components/session-note-editor.tsx`**
- When viewing a signed note that was signed late, show a small info banner at the top

No backend changes — the data (`signedAt` and `sessionDate`) already exists.

---

## 2. Group Session Notes (CPT 92508)

### Problem
Group therapy (2–6 patients, same time, same SLP) is billed under CPT 92508. Currently session notes are strictly 1:1 with a single patient.

### Design
- **Group session mode** — SLP selects "Group Session" when creating a note, then picks 2–6 patients
- **One note per patient** — System creates individual session note records (for individual patient records) but allows shared objective data to be entered once and distributed
- **Shared data** — Targets, behavioral notes, and homework can be marked as "shared across group" or "individual"
- **Group linkage** — A `groupSessionId` field links sibling notes so the system knows they're from the same session

### Schema Changes

**Extended table: `sessionNotes`**
- `groupSessionId: optional string` — UUID linking sibling group session notes
- `groupPatientIds: optional array<Id<"patients">>` — All patients in the group (stored on each note for easy lookup)

### Backend Changes

**New mutation: `convex/sessionNotes.ts` → `createGroup`**
- Args: `patientIds` (array, 2–6), `sessionDate`, `sessionDuration`, `sessionType`, shared `structuredData`
- Creates one `sessionNotes` record per patient with the same `groupSessionId`
- Shared structured data is copied to each note; individual fields can be edited per patient afterward

**Modified query: `convex/sessionNotes.ts` → `list`**
- Group notes are displayed as a single row with patient count badge, expandable to individual notes

### Frontend Changes

**Modified: `src/features/session-notes/components/session-note-editor.tsx`**
- Toggle between "Individual" and "Group" mode at the top
- In group mode: multi-patient picker replaces single patient selector
- Shared vs. individual field toggles on structured data sections

**New: `src/features/session-notes/components/group-patient-picker.tsx`**
- Multi-select patient list with 2–6 limit

**Modified: `src/features/session-notes/components/session-notes-list.tsx`**
- Group notes rendered as a single card with patient count, expandable

---

## 3. Multi-Audience Progress Reports

### Problem
The same progress data needs different framing for insurance (clinical), parents (plain language), and IEP teams (educational). Currently only one clinical format exists.

### Design
- **Audience selector** — Added to the progress report generator: Clinical, Parent, or IEP Team
- **Same data, different prompts** — The underlying goal data is identical; only the AI prompt changes
- **Audience stored** — The report's audience is stored so it can be displayed/filtered

### Schema Changes

**Extended table: `progressReports`**
- `audience: optional string` — `"clinical" / "parent" / "iep-team"`. Optional for backward compatibility with existing reports (default to "clinical").

### Backend Changes

**Modified: `src/app/api/generate-report/route.ts`**
- Accept `audience` parameter in the request body
- Three prompt variants:
  - **Clinical:** Formal language, standard scores, medical necessity justification, clinician credentials
  - **Parent:** Plain language, goal summaries in everyday terms, celebration of progress, next steps in accessible language, no jargon
  - **IEP Team:** Educational framing, IDEA-aligned language, impact on educational access, tied to classroom participation

### Frontend Changes

**Modified: `src/features/goals/components/progress-report-generator.tsx`**
- Add audience radio group before the "Generate" button: Clinical | Parent-Friendly | IEP Team
- Pass audience to the API route
- Show audience label on generated reports

**Modified: `src/features/goals/components/progress-report-viewer.tsx`**
- Display audience badge on the report header

---

## 4. Physician Signature Field on Progress Reports

### Problem
Medicare Part B requires a physician to sign the Plan of Care. Progress reports sent to physicians should indicate whether the POC signature is on file. Currently no mechanism to record this.

### Design
This is already addressed in SP2 (Plan of Care has `physicianSignatureOnFile`, `physicianName`, `physicianNPI`, `physicianSignatureDate`). SP4 adds the display of this information on progress reports.

### Frontend Changes

**Modified: `src/features/goals/components/progress-report-viewer.tsx`**
- If a Plan of Care exists for the patient and has `physicianSignatureOnFile === true`, show a "Physician signature on file" indicator with the physician name and date
- If no POC exists or physician sig is not on file, show "Physician signature: Not on file" in muted text

---

## What This Does NOT Include

- Hard-blocking late signatures (warning only)
- Separate CPT code assignment for group notes (handled by SP3 billing auto-creation)
- Full report template customization by SLPs
- Report export to PDF (browser print CSS — same approach as other documents)

---

## Dependencies

- **SP2:** Physician signature display on reports requires `plansOfCare` table
- **SP3:** Group session notes feed `billingRecords` with CPT 92508
- **Existing:** All changes extend existing `sessionNotes`, `progressReports` tables and features

---

*Sub-project 4 of 5 from the SLP Workflow Gap Analysis (March 30, 2026).*
