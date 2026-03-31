# SP3: Clinical Billing — Design Spec

**Date:** March 30, 2026
**Sub-project:** SP3 of 5 (SLP Workflow Gap Analysis)
**Scope:** Billing records, CPT codes, modifiers, superbill generation, insurance fields, billing dashboard

---

## Overview

SP3 adds the infrastructure for SLPs to bill their patients and insurance companies for clinical services. This is distinct from Bridges' own Stripe subscription billing (already built). Without clinical billing, SLPs need a second tool just to get paid — this is the #1 blocker for private practice adoption.

The immediate scope is **superbill generation and session billing records** — this covers private-pay and out-of-network SLPs, which is the majority of private practice. Direct claim submission to clearinghouses (Change Healthcare, Availity) and ERA/EOB processing are excluded.

---

## Design Decisions

- **Auto-create billing record on note signing:** When a session note is signed, a billing record is auto-created with the most likely CPT code pre-populated based on session type and goals. The SLP reviews and finalizes.
- **CPT code selection:** A curated list of ~10 SLP-relevant codes (not a full CPT database). SLPs select from a dropdown, not free-text.
- **Modifier auto-application:** Modifier 95 auto-applied when session type is `teletherapy`. GP modifier included by default on all SLP claims. KX surfaced as a toggle when Medicare threshold info is available.
- **Superbill output:** Print-friendly HTML with structured layout. Server-side PDF is a later enhancement.
- **No clearinghouse integration:** Superbills are for patients to submit to insurance. Direct electronic claim submission is a future feature.
- **Insurance info:** Basic fields on patient profile — enough to populate superbills. Not a full insurance verification system.

---

## Schema Changes

### New table: `billingRecords`

| Field | Type | Description |
|-------|------|-------------|
| `patientId` | `Id<"patients">` | |
| `slpUserId` | `string` | |
| `sessionNoteId` | `Id<"sessionNotes">` | Links to the session this billing record covers |
| `dateOfService` | `string` | ISO date, pulled from session note |
| `cptCode` | `string` | e.g. "92507" |
| `cptDescription` | `string` | e.g. "Individual speech-language treatment" |
| `modifiers` | `array<string>` | e.g. ["GP", "95"] |
| `diagnosisCodes` | `array<{ code: string, description: string }>` | ICD-10 codes from patient record |
| `placeOfService` | `string` | e.g. "11" (Office), "02" (Telehealth) |
| `units` | `number` | Typically 1 for a session; time-based codes may need more |
| `fee` | `optional number` | In cents (e.g. 15000 = $150.00) |
| `status` | union literal | `"draft" / "finalized" / "billed"` |
| `billedAt` | `optional number` | When the SLP marked it as billed/submitted |
| `notes` | `optional string` | Internal billing notes |

**Indexes:**
- `by_patientId` — `[patientId]`
- `by_slpUserId` — `[slpUserId]`
- `by_slpUserId_status` — `[slpUserId, status]`
- `by_sessionNoteId` — `[sessionNoteId]`
- `by_dateOfService` — `[dateOfService]`

### Extended table: `patients`

New fields (in addition to `icdCodes` from SP2):
- `insuranceCarrier` | `optional string` | Carrier name |
- `insuranceMemberId` | `optional string` | Member/subscriber ID |
- `insuranceGroupNumber` | `optional string` | Group number |
- `insurancePhone` | `optional string` | Claims phone number |

### Extended table: `practiceProfiles` (from SP1)

Additional field used by superbills:
- `defaultSessionFee` | `optional number` | Default fee in cents, pre-populated on new billing records |

---

## CPT Code Module

`src/features/billing/lib/cpt-codes.ts` — Static array of SLP-relevant CPT codes:

| Code | Description | Default Place of Service |
|------|-------------|------------------------|
| 92507 | Individual speech/language/voice treatment | 11 (Office) |
| 92508 | Group speech/language treatment (2+ patients) | 11 |
| 92521 | Evaluation — speech fluency only | 11 |
| 92522 | Evaluation — speech sound production only | 11 |
| 92523 | Evaluation — speech sound + language | 11 |
| 92524 | Voice/resonance behavioral analysis | 11 |
| 92526 | Treatment of swallowing dysfunction | 11 |
| 92597 | AAC device evaluation | 11 |
| 92609 | AAC device service/programming | 11 |

Place of service codes:
- `11` — Office
- `02` — Telehealth (provided to patient)
- `10` — Telehealth (provided in patient's home)
- `12` — Patient's home (in-person home visit)

### Modifier Logic

| Modifier | Auto-Applied When |
|----------|------------------|
| GP | Always — required on every SLP claim |
| 95 | Session type is `teletherapy` |
| KX | Manual toggle — SLP enables when Medicare therapy cap exceeded |

---

## Backend — Convex Functions

### New file: `convex/billingRecords.ts`

**Mutations:**
- `createFromSessionNote` — Internal mutation. Called automatically when a session note is signed. Auto-populates: CPT code (92507 for individual, 92508 for group if SP4 adds that), modifiers (GP always, 95 for teletherapy), diagnosis codes from patient record, place of service (02 for teletherapy, 11 otherwise), date of service from session note.
- `update` — SLP-only. Edit CPT code, modifiers, diagnosis, fee, place of service, notes. Only on draft records.
- `finalize` — SLP-only. Transitions from draft to finalized. Validates required fields are present.
- `markBilled` — SLP-only. Transitions to "billed" with timestamp. Indicates superbill was generated/sent.
- `remove` — SLP-only. Soft delete (or hard delete if draft).

**Queries:**
- `listBySlp` — All billing records for the SLP, filterable by status and date range. Powers the billing dashboard.
- `listByPatient` — All billing records for a patient.
- `get` — Single record by ID.
- `getUnbilledCount` — Returns count of draft + finalized (not yet billed) records. Used for dashboard badge.

### Modified file: `convex/sessionNotes.ts`

- `sign` mutation — After existing sign logic, schedule `billingRecords.createFromSessionNote` via `ctx.scheduler.runAfter(0, ...)`. This keeps the billing record creation non-blocking and decoupled.

---

## Frontend

### Extended feature: `src/features/billing/`

The billing feature directory already exists with platform subscription billing. Clinical billing components are added alongside:

```
src/features/billing/
├── components/
│   ├── billing-section.tsx           — (existing) Platform subscription
│   ├── billing-history.tsx           — (existing) Platform invoices
│   ├── clinical-billing-dashboard.tsx — NEW: unbilled/finalized/billed records
│   ├── billing-record-editor.tsx     — NEW: Edit CPT, modifiers, diagnosis, fee
│   ├── billing-record-row.tsx        — NEW: Row in dashboard table
│   ├── superbill-viewer.tsx          — NEW: Print-friendly superbill layout
│   ├── insurance-fields.tsx          — NEW: Patient insurance info form
│   └── cpt-code-picker.tsx           — NEW: Searchable CPT code dropdown
├── hooks/
│   └── use-billing-records.ts        — NEW: Wraps billing Convex queries/mutations
└── lib/
    ├── cpt-codes.ts                  — NEW: Static CPT code data
    ├── modifiers.ts                  — NEW: Modifier logic (auto-apply rules)
    └── place-of-service.ts           — NEW: POS code data
```

### Clinical Billing Dashboard

New route: `/billing` (SLP-only)

Three tabs:
1. **Unbilled** — Draft billing records. Each row: patient name, date of service, CPT code, fee. Click to edit.
2. **Ready to Bill** — Finalized records. "Generate Superbill" button per record or batch.
3. **Billed** — Completed records with date billed.

Summary stats at top: total unbilled amount, count of unbilled sessions, total billed this month.

### Billing Record Editor

Opened from the billing dashboard or from the session note detail page. Fields:
- CPT code (dropdown with descriptions)
- Modifiers (GP pre-checked, 95 auto-checked for teletherapy, KX toggle)
- Diagnosis (ICD-10 codes from patient record, editable)
- Place of service (dropdown)
- Units (number, default 1)
- Fee (dollar amount, pre-populated from practice profile default)
- Notes (optional)

### Superbill Viewer

Print-friendly layout containing:
- **Header:** Practice name, address, phone, NPI, Tax ID (from `practiceProfiles`)
- **Patient:** Name, DOB, insurance info
- **Service:** Date of service, CPT code + description, modifiers, ICD-10 diagnosis codes, units, fee, place of service
- **Clinician:** Name, credentials, license number, signature line
- **Total:** Sum of all service line fees

"Print / Save as PDF" button uses `window.print()` with print-specific CSS.

### Insurance Fields

Added to the patient profile/edit form. Fields:
- Insurance carrier name
- Member/subscriber ID
- Group number
- Insurance phone (claims)

### Integration Points

- Session note detail page: "Billing" section showing the linked billing record with status badge
- Patient detail page: Billing history tab/widget
- Sidebar navigation: "Billing" link (SLP-only) with badge showing unbilled count

---

## Superbill Auto-Population Flow

```
Session note signed
    ↓ (scheduler)
Billing record auto-created (draft)
    — CPT: 92507 (individual) or based on session context
    — Modifiers: GP + (95 if teletherapy)
    — Diagnosis: from patient.icdCodes
    — POS: 02 if teletherapy, 11 otherwise
    — Fee: from practiceProfile.defaultSessionFee
    ↓
SLP reviews in billing dashboard
    ↓
SLP finalizes → clicks "Generate Superbill"
    ↓
Superbill rendered with practice + patient + service info
    ↓
SLP prints/saves PDF → marks as billed
```

---

## What This Does NOT Include

- Direct electronic claim submission to clearinghouses
- ERA/EOB (Explanation of Benefits) processing
- Payment tracking / accounts receivable
- Automated Medicare therapy cap tracking (KX modifier is manual)
- Batch claim generation
- Insurance eligibility verification
- Fee schedule management (single default fee for now)

---

## Dependencies

- **SP1:** `practiceProfiles` table provides NPI, Tax ID, credentials for superbills
- **SP2:** `evaluations` provide ICD-10 codes that populate patient record and billing records
- **Existing:** `sessionNotes` table is the trigger for billing record creation

---

*Sub-project 3 of 5 from the SLP Workflow Gap Analysis (March 30, 2026).*
