# SP1: Security & Legal Compliance — Design Spec

**Date:** March 30, 2026
**Sub-project:** SP1 of 5 (SLP Workflow Gap Analysis)
**Scope:** LiveKit token auth fix + patient intake packet + HIPAA forms + telehealth consent + practice profile

---

## Overview

SP1 addresses the two most urgent gaps in Bridges: a security vulnerability in the LiveKit token route and the complete absence of patient intake forms required by federal law (HIPAA) and professional standards (ASHA). This sub-project ships in two phases — the security fix immediately, the intake system as a full feature build.

---

## Phase 1: LiveKit Token Authorization Fix

**File:** `src/app/api/livekit/token/route.ts`

### Problem

The LiveKit token route authenticates the user via Clerk but does not verify the user has any relationship to the requested appointment. Any authenticated user who knows (or guesses) an appointment ID can obtain a room token and join the video session.

### Fix

Add three checks after fetching the appointment, before issuing the token:

1. **Status check:** Reject if `appointment.status` is `cancelled`, `completed`, or `no-show`. Only `scheduled` and `in-progress` appointments issue tokens.

2. **SLP check:** If `userId === appointment.slpId`, allow — the SLP owns this appointment.

3. **Caregiver check:** If the user is not the SLP, use the existing `ConvexHttpClient` to query `caregiverLinks` (via a new internal query) for an accepted link where `caregiverUserId === userId` and `patientId === appointment.patientId`. If no accepted link exists, return 403.

### Changes

- **Modified:** `src/app/api/livekit/token/route.ts` — add authorization logic (~30 lines)
- **No schema changes**
- **No UI changes**
- **No new dependencies**

---

## Phase 2: Patient Intake Packet & Legal Compliance

### Schema Changes

#### New table: `intakeForms`

| Field | Type | Description |
|-------|------|-------------|
| `patientId` | `Id<"patients">` | The patient this form pertains to |
| `caregiverUserId` | `string` | Clerk user ID of the signer |
| `formType` | union literal | One of: `"hipaa-npp"`, `"consent-treatment"`, `"financial-agreement"`, `"cancellation-policy"`, `"release-authorization"`, `"telehealth-consent"` |
| `signedAt` | `number` | Timestamp of signing |
| `signerName` | `string` | Full legal name typed by signer |
| `signerIP` | `optional string` | IP address at signing time |
| `formVersion` | `string` | Template version (e.g., `"1.0"`) — tracks form text changes |
| `metadata` | `optional object` | Form-specific extra data (e.g., third-party name for release authorization) |

**Indexes:**
- `by_patientId` — `[patientId]`
- `by_caregiverUserId` — `[caregiverUserId]`
- `by_patientId_formType` — `[patientId, formType]`

#### Extended table: `caregiverLinks`

New field:
- `intakeCompletedAt: optional number` — Set when all 4 required intake forms are signed. Denormalized for dashboard queries.

#### New table: `practiceProfiles`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | Clerk user ID of the SLP |
| `practiceName` | `optional string` | Business name |
| `practiceAddress` | `optional string` | Full address |
| `practicePhone` | `optional string` | Contact number |
| `npiNumber` | `optional string` | National Provider Identifier |
| `licenseNumber` | `optional string` | State license number |
| `licenseState` | `optional string` | State of licensure |
| `taxId` | `optional string` | For billing/superbills (SP3) |
| `credentials` | `optional string` | e.g., "M.S., CCC-SLP" |

**Indexes:**
- `by_userId` — `[userId]`

---

### Backend — Convex Functions

#### New file: `convex/intakeForms.ts`

**Mutations:**
- `signForm` — Args: `patientId`, `formType`, `signerName`, `signerIP` (optional), `metadata` (optional). Validates the caller is a caregiver with an accepted link to the patient. Inserts into `intakeForms`. If all 4 required forms are now complete, patches `caregiverLinks.intakeCompletedAt`. Logs to `activityLog` with action `"intake-form-signed"`.
- `signTelehealthConsent` — Same signature mechanism but `formType` is always `"telehealth-consent"`. Separate function so the call-join gate can invoke it independently.

**Queries:**
- `getByPatient` — Args: `patientId`. Returns all signed forms grouped by caregiver. SLP-facing: used by the intake status widget on the patient profile.
- `getByCaregiver` — Args: `patientId`. Returns which forms the current caregiver has signed for that patient. Used by the intake flow to show progress and skip completed forms.
- `hasTelehealthConsent` — Args: `patientId`. Returns boolean for the current caregiver. Used by the call-join gate.

#### New file: `convex/practiceProfile.ts`

**Mutations:**
- `update` — SLP-only. Upserts practice profile fields.

**Queries:**
- `get` — Returns the current SLP's practice profile.
- `getBySlpId` — Internal query. Returns practice profile for a given SLP ID. The intake flow resolves this by: caregiver → patient (via `caregiverLinks.patientId`) → `patient.slpUserId` → `practiceProfiles.by_userId`.

#### Modified file: `convex/caregivers.ts`

- `acceptInvite` — No behavioral change. Intake is a separate step on the caregiver dashboard, not part of invite acceptance.

---

### Frontend

#### New feature: `src/features/intake/`

```
src/features/intake/
├── components/
│   ├── intake-flow.tsx              — Stepper UI: 4 forms sequentially
│   ├── intake-form-renderer.tsx     — Single form layout: title, body, typed-name input, checkbox, sign button
│   ├── intake-status-widget.tsx     — SLP-facing badge + detail on patient profile
│   ├── telehealth-consent-gate.tsx  — Shown before call lobby if consent not yet given
│   └── form-templates/
│       ├── hipaa-npp.tsx
│       ├── consent-treatment.tsx
│       ├── financial-agreement.tsx
│       ├── release-authorization.tsx
│       └── cancellation-policy.tsx
├── hooks/
│   └── use-intake-forms.ts          — Wraps Convex queries + signForm mutation
└── lib/
    └── form-content.ts              — Parameterized legal text for each form
```

#### Caregiver Experience

1. Caregiver accepts invite → lands on family dashboard.
2. Prominent banner: "Complete intake forms for [patient name]" if `intakeCompletedAt` is null.
3. Clicking opens `intake-flow.tsx` — step-by-step, one form at a time.
4. Each step: read the form text → type full legal name → check "I acknowledge and agree" → Sign.
5. Stored: `signerName` + `signedAt` timestamp + optional `signerIP`.
6. Already-signed forms show as completed with checkmark and date.
7. After all 4 complete → banner disappears, `intakeCompletedAt` set.

#### Telehealth Consent (Separate Flow)

1. Caregiver clicks "Join Call" on an appointment.
2. System checks `hasTelehealthConsent` for that patient.
3. If false → `telehealth-consent-gate.tsx` renders inline before proceeding to lobby.
4. After signing → proceed to lobby normally.
5. One-time per patient — subsequent calls skip the gate.

#### SLP Experience

1. `intake-status-widget.tsx` on patient detail page.
2. Badge: green "Intake complete" or amber "2/4 forms signed".
3. Expandable: shows which forms are signed (with dates) and which are outstanding.
4. **Soft warning only** — no gates on session creation or anything else.
5. Prompt when SLP first sends an invite with empty practice profile: "Complete your practice profile so intake forms display your information."

#### Practice Profile Settings

- New section in existing SLP settings/profile page.
- Fields: Practice Name, Address, Phone, NPI, License Number, State, Tax ID, Credentials.
- Saves via `practiceProfile.update`.

#### Routes

- `/intake/[patientId]` — Caregiver intake flow (standalone page, outside `(app)` layout).
- No new SLP-only routes — widget lives on existing patient detail page.
- Practice profile section added to existing settings page.

---

### Form Content

Each form template is a function accepting practice profile + patient name, returning structured sections.

| Form | Key Content | Dynamic Fields |
|------|------------|----------------|
| **HIPAA NPP** | Notice of Privacy Practices — how PHI is used, disclosed, protected; patient rights (access, amend, restrict, complain) | Practice name, address, phone, SLP name |
| **Consent for Treatment** | Authorization to evaluate and treat; scope of SLP services; right to withdraw at any time | Patient name, SLP name + credentials, practice name |
| **Financial Agreement** | Fee schedule disclosure; payment terms; insurance responsibility; No Surprises Act Good Faith Estimate notice | Practice name, SLP credentials |
| **Cancellation Policy** | Required notice period; late-cancel/no-show fee; how to cancel | Practice name |
| **Release Authorization** | Consent to exchange info with named third party; what info is released; 1-year expiration default | Third-party name (user-entered), patient name, SLP name |
| **Telehealth Consent** | Risks/limitations of telehealth; technology requirements; emergency protocols; voluntary; right to withdraw | Patient name, SLP name + credentials |

**Notes:**
- All forms include a disclaimer: "This is a template. Consult your legal counsel to ensure compliance with your state's requirements."
- Release authorization is repeatable — a caregiver can sign multiple for different third parties. Each produces a separate `intakeForms` row with third-party name in `metadata`.
- E-signature mechanism: typed full legal name + "I acknowledge" checkbox + timestamp. Legally valid for digital health consent (industry standard per SimplePractice, TheraPlatform).

---

### Intake Completion Logic

**Required for "Intake complete" status (4 forms):**
1. HIPAA Notice of Privacy Practices
2. Consent for Evaluation and Treatment
3. Financial Agreement
4. Cancellation Policy

**Separate flows (not counted toward intake completion):**
- **Release Authorization** — signed per third party, on-demand when the SLP needs to share records with a specific school/physician/etc.
- **Telehealth Consent** — signed once per patient, gated at first video call join.

---

### What This Does NOT Include

- Hard-gating sessions on incomplete intake (soft warning only).
- Attorney-reviewed legal language (templates only, with disclaimer).
- Direct integration with DocuSign/HelloSign (typed name is sufficient).
- Good Faith Estimate calculator (the financial agreement includes a notice about the patient's right to request one; the actual estimate is a later enhancement).
- Form customization UI for SLPs to edit template text (later enhancement).

---

### Dependencies on Other Sub-Projects

- **SP3 (Clinical Billing)** will reuse `practiceProfiles` fields (NPI, Tax ID, credentials) for superbill generation.
- **SP2 (Clinical Documents)** will reuse `practiceProfiles` for clinician signature blocks.
- No dependencies FROM other sub-projects — SP1 can ship independently.

---

*Sub-project 1 of 5 from the SLP Workflow Gap Analysis (March 30, 2026).*
