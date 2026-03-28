# SLP Patient Management — Design Spec

**Date:** 2026-03-28
**Status:** Draft
**Subsystem:** 1 of 5 (Patient/Caseload Management)

## Overview

Add patient/caseload management to Bridges as a new feature wing alongside the existing builder and flashcard features. This is the foundational subsystem that all future SLP platform features (session notes, IEP goals, caregiver portal, AI speech coaching) will build on.

### Approach

**"New Feature Wing"** — Patient management is an independent feature slice in `src/features/patients/`. The existing builder and flashcard features remain untouched. A lightweight `patientMaterials` join table provides the future bridge to link generated materials to patients.

### Target User

Solo SLPs in private practice, with the data model designed to support future clinic/team (Clerk Organizations) expansion without migration.

### Scope Boundaries

**In scope:**
- Patient CRUD with progressive profile enrichment
- SLP caseload view with expandable rows
- Widget-based patient detail page
- Caregiver invite link flow (parent sign-up + auto-linking)
- Role differentiation (SLP vs caregiver) via Clerk publicMetadata
- Material assignment stub (link existing sessions/apps to patients)
- Activity log audit trail
- Mobile responsiveness
- Full test coverage (unit, component, E2E)

**Out of scope (future subsystems):**
- Session notes / SOAP documentation
- IEP goal tracking / progress measurement
- Caregiver portal with home programs
- AI-personalized material generation from patient profile
- Automated email sending for invites
- Clerk Organizations / multi-SLP teams
- Curriculum builder / scheduling

---

## Data Model

Four new Convex tables in `convex/schema.ts`.

### `patients`

| Field | Type | Required | Notes |
|---|---|---|---|
| `slpUserId` | `v.string()` | yes | Clerk user ID of the managing SLP |
| `firstName` | `v.string()` | yes | |
| `lastName` | `v.string()` | yes | |
| `dateOfBirth` | `v.string()` | yes | ISO date string |
| `diagnosis` | `v.union(v.literal("articulation"), v.literal("language"), v.literal("fluency"), v.literal("voice"), v.literal("aac-complex"), v.literal("other"))` | yes | Primary diagnosis category |
| `status` | `v.union(v.literal("active"), v.literal("on-hold"), v.literal("discharged"), v.literal("pending-intake"))` | yes | Clinical status |
| `parentEmail` | `v.optional(v.string())` | no | For invite link generation |
| `interests` | `v.optional(v.array(v.string()))` | no | e.g., `["dinosaurs", "trains", "Bluey"]` — feeds AI personalization |
| `communicationLevel` | `v.optional(v.union(v.literal("pre-verbal"), v.literal("single-words"), v.literal("phrases"), v.literal("sentences")))` | no | |
| `sensoryNotes` | `v.optional(v.string())` | no | Free text |
| `behavioralNotes` | `v.optional(v.string())` | no | Free text |
| `notes` | `v.optional(v.string())` | no | General clinical notes |

**Indexes:** `by_slpUserId` on `["slpUserId"]`, `by_status` on `["status"]`

**Future org support:** Add optional `orgId: v.optional(v.string())` field and `by_orgId` index. All existing patients have `orgId: undefined` — no migration needed.

### `caregiverLinks`

| Field | Type | Required | Notes |
|---|---|---|---|
| `patientId` | `v.id("patients")` | yes | |
| `caregiverUserId` | `v.optional(v.string())` | no | Populated when parent accepts invite |
| `email` | `v.string()` | yes | Used for invite, matched on sign-up |
| `inviteToken` | `v.string()` | yes | 32-char crypto-random hex |
| `inviteStatus` | `v.union(v.literal("pending"), v.literal("accepted"), v.literal("revoked"))` | yes | |
| `relationship` | `v.optional(v.string())` | no | `parent`, `guardian`, `grandparent`, etc. |

**Indexes:** `by_patientId` on `["patientId"]`, `by_caregiverUserId` on `["caregiverUserId"]`, `by_inviteToken` on `["inviteToken"]`, `by_email` on `["email"]`

### `patientMaterials`

| Field | Type | Required | Notes |
|---|---|---|---|
| `patientId` | `v.id("patients")` | yes | |
| `sessionId` | `v.optional(v.id("sessions"))` | no | Builder session |
| `appId` | `v.optional(v.id("apps"))` | no | Published app |
| `assignedBy` | `v.string()` | yes | Clerk user ID |
| `assignedAt` | `v.number()` | yes | Timestamp |
| `notes` | `v.optional(v.string())` | no | Why this material was assigned |

**Indexes:** `by_patientId` on `["patientId"]`, `by_sessionId` on `["sessionId"]`

### `activityLog`

| Field | Type | Required | Notes |
|---|---|---|---|
| `patientId` | `v.id("patients")` | yes | |
| `actorUserId` | `v.string()` | yes | Who performed the action |
| `action` | `v.union(v.literal("patient-created"), v.literal("profile-updated"), v.literal("material-assigned"), v.literal("invite-sent"), v.literal("invite-accepted"), v.literal("status-changed"))` | yes | |
| `details` | `v.optional(v.string())` | no | Human-readable description |
| `timestamp` | `v.number()` | yes | |

**Indexes:** `by_patientId` on `["patientId"]`, `by_timestamp` on `["timestamp"]`

---

## Auth & Roles

### Role storage

Roles stored in Clerk `publicMetadata`:
```json
{ "role": "slp" }       // default on normal sign-up
{ "role": "caregiver" }  // set on invite acceptance
```

Role is included in JWT claims via Clerk JWT template customization, readable in Convex via `ctx.auth.getUserIdentity()`.

### Convex auth helpers

Extend `convex/lib/auth.ts`:

- `getAuthRole(ctx)` — reads role from JWT identity, returns `"slp" | "caregiver" | null`
- `assertSLP(ctx)` — throws `ConvexError` if caller is not an SLP
- `assertCaregiverAccess(ctx, patientId)` — verifies caller has an accepted `caregiverLink` to this patient

### Route protection

| Route | Access |
|---|---|
| `/patients`, `/patients/[id]`, `/patients/new` | SLP only |
| `/family` (future) | Caregiver only |
| `/builder`, `/flashcards`, `/templates` | Any authenticated user |
| `/dashboard` | Both roles, different content |
| `/tool/[toolId]` | Public (unchanged) |

Protected via `proxy.ts` matcher + Convex-side `assertSLP`/`assertCaregiverAccess` defense in depth.

### Invite link flow

```
SLP adds patient with parent email
  → patients.create mutation generates invite via caregivers.createInvite
  → SLP copies invite link manually (no automated email in v1)
  → Parent opens /invite/<token>
  → Landing page shows: "Dr. Smith invited you to connect with Alex's speech therapy"
  → Parent clicks "Accept & Sign Up" → /sign-up?invite=<token>
  → Clerk sign-up completes
  → Client-side useEffect detects ?invite param
  → Calls caregivers.acceptInvite(token)
  → Backend action sets Clerk publicMetadata.role = "caregiver"
  → Parent lands on dashboard showing their linked child
```

---

## Convex Functions

### `convex/patients.ts`

| Function | Type | Args | Purpose |
|---|---|---|---|
| `list` | `query` | `{ status?: string }` | Returns patients for authenticated SLP. Uses `by_slpUserId` index. |
| `get` | `query` | `{ patientId: Id<"patients"> }` | Single patient. Asserts SLP owner or linked caregiver. |
| `create` | `mutation` | `{ firstName, lastName, dateOfBirth, diagnosis, status?, parentEmail?, interests?, communicationLevel?, sensoryNotes?, behavioralNotes?, notes? }` | Creates patient, logs `patient-created`. Optionally calls `caregivers.createInvite` if `parentEmail` provided. |
| `update` | `mutation` | `{ patientId, ...partialFields }` | Partial update. Asserts SLP ownership. Logs `profile-updated`. |
| `updateStatus` | `mutation` | `{ patientId, status }` | Dedicated status change. Logs `status-changed` with old → new status in details. |
| `getStats` | `query` | `{}` | Returns `{ active, onHold, discharged, pendingIntake }` counts for filter pills. |

### `convex/caregivers.ts`

| Function | Type | Args | Purpose |
|---|---|---|---|
| `createInvite` | `mutation` | `{ patientId, email, relationship? }` | Generates 32-char hex token. Creates pending `caregiverLinks` row. Logs `invite-sent`. Returns token. |
| `getInvite` | `query` | `{ token }` | Looks up by `by_inviteToken`. Returns patient first name + SLP display name. Returns `null` if not pending. |
| `acceptInvite` | `mutation` | `{ token }` | Sets `caregiverUserId`, flips to `accepted`. Logs `invite-accepted`. Schedules `clerkActions.setCaregiverRole`. Idempotent for same user. |
| `revokeInvite` | `mutation` | `{ token }` | Asserts SLP ownership. Flips to `revoked`. |
| `listByPatient` | `query` | `{ patientId }` | All caregiver links for patient detail widget. |
| `listByCaregiver` | `query` | `{}` | All patients linked to authenticated caregiver. |

### `convex/activityLog.ts`

| Function | Type | Args | Purpose |
|---|---|---|---|
| `log` | `internalMutation` | `{ patientId, actorUserId, action, details?, timestamp }` | Internal-only write. Called by other mutations. |
| `listByPatient` | `query` | `{ patientId, limit? }` | Recent activity. Asserts SLP or caregiver access. Defaults to 20 entries. |

### `convex/patientMaterials.ts`

| Function | Type | Args | Purpose |
|---|---|---|---|
| `assign` | `mutation` | `{ patientId, sessionId?, appId?, notes? }` | Links material to patient. Asserts SLP ownership. Logs `material-assigned`. |
| `listByPatient` | `query` | `{ patientId }` | Returns materials with joined session/app title. |
| `unassign` | `mutation` | `{ materialId }` | Removes assignment. Asserts SLP ownership. |

### `convex/clerkActions.ts` (`"use node"`)

| Function | Type | Args | Purpose |
|---|---|---|---|
| `setCaregiverRole` | `internalAction` | `{ userId }` | Calls Clerk Backend API to set `publicMetadata.role = "caregiver"`. |

---

## UI & Routes

### New feature structure

```
src/features/patients/
  components/
    patients-page.tsx          — Caseload list with expandable rows
    patient-detail-page.tsx    — Widget dashboard
    patient-intake-form.tsx    — Two-step add patient form
    patient-row.tsx            — Single expandable row component
    patient-row-expanded.tsx   — Expanded panel content
    patient-profile-widget.tsx — Profile card widget
    activity-timeline.tsx      — Activity feed widget
    assigned-materials.tsx     — Materials list widget
    caregiver-info.tsx         — Caregiver status widget
    quick-notes.tsx            — Auto-saving notes widget
    invite-landing.tsx         — Invite acceptance page
  hooks/
    use-patients.ts            — Query hooks for patient data
    use-invite.ts              — Invite flow state management
  lib/
    diagnosis-colors.ts        — Diagnosis → avatar color mapping
    patient-utils.ts           — Age calculation, name formatting
```

### Routes

| Route | Page Component | Layout |
|---|---|---|
| `/patients` | `patients-page.tsx` | `(app)` layout with sidebar |
| `/patients/[id]` | `patient-detail-page.tsx` | `(app)` layout with sidebar |
| `/patients/new` | `patient-intake-form.tsx` | `(app)` layout with sidebar |
| `/invite/[token]` | `invite-landing.tsx` | Standalone (no sidebar) |

### Sidebar

Add "Patients" item to `src/shared/lib/navigation.ts` between Home and Builder. Icon: `Users` from lucide-react. Conditionally shown only when `role === "slp"`.

### Caseload page (`/patients`)

**Top bar:** Title "My Caseload" | Count badge "24 active" | Filter pills (All / Active / On Hold / Pending Intake / Discharged) | Search input | "+ Add Patient" primary CTA

**Collapsed row:** Initials avatar (color by diagnosis) | Full name | Age | Diagnosis chip | Status chip | Last activity date | Expand chevron

**Expanded panel (3 columns):**
- Left: Quick profile (communication level, interests tags, parent link status)
- Center: Recent activity (last 5 from activityLog)
- Right: Quick actions (View Full Profile, Assign Material, Message Parent, Edit Status)

### Patient detail (`/patients/[id]`)

Fixed 2-column widget grid (stacks to 1 column on mobile):

| Widget | Position | Content |
|---|---|---|
| Profile Card | Top, full width | Name, age, diagnosis, communication level, interests, status, parent status. Inline edit. |
| Activity Timeline | Left column | Chronological feed, filterable by action type |
| Assigned Materials | Right column | Cards with title, type badge, date, "Open" button. Empty state CTA to builder. |
| Caregiver Info | Right column | Parent name/email, invite status, relationship. "Invite a caregiver" CTA if none. |
| Quick Notes | Bottom, full width | Auto-saves on blur to `patients.notes`. |

### Patient intake (`/patients/new`)

**Step 1 (required):** First name, Last name, Date of birth (date picker), Primary diagnosis (select), Status (defaults to "active")

**Step 2 (optional, expandable):** Communication level (radio group), Interests (tag input), Parent email (triggers invite), Sensory notes, Behavioral notes

Submit creates patient + optionally generates invite link. Success screen shows invite link to copy.

### Invite landing (`/invite/[token]`)

Centered card showing: "Dr. [SLP Name] invited you to connect with [Child First Name]'s speech therapy on Bridges." Two CTAs: "Accept & Sign Up" (primary) and "Learn More" (secondary, links to landing page).

---

## Validation

All validation enforced at the Convex mutation layer.

| Field | Rules |
|---|---|
| `firstName`, `lastName` | Non-empty, max 100 chars, trimmed |
| `dateOfBirth` | Valid ISO date, in the past, within 21 years |
| `diagnosis` | Strict union literal |
| `email` | Regex format validation, normalized to lowercase |
| `inviteToken` | 32-char hex, must exist and be `pending` status for acceptance |
| `interests` | Max 20 items, each max 50 chars |

Mutations throw `ConvexError` with structured error codes. Frontend catches and displays inline field errors.

---

## Error Handling

| Screen | Scenario | Handling |
|---|---|---|
| Caseload list | Empty caseload | Illustrated empty state with "Add your first patient" CTA |
| Caseload list | Network error | Sonner toast, stale data stays visible (Convex reactive reconnect) |
| Patient intake | Validation failure | Inline field errors, form doesn't submit |
| Patient detail | Not found / no access | Route segment `not-found.tsx` |
| Invite landing | Invalid/expired/revoked token | "This invite is no longer valid. Ask your therapist to send a new one." |
| Invite acceptance | Already accepted by same user | Idempotent — treat as success |
| Invite acceptance | Already accepted by different user | Error: "This invite has already been used." |

---

## Mobile Responsiveness

| Screen | Desktop | Mobile |
|---|---|---|
| Caseload list | Table with expandable rows | Cards. Tap to expand. Filter pills horizontal scroll. |
| Patient detail | 2-column widget grid | Single column stack |
| Intake form | Side-by-side steps | Stacked, step 2 as collapsible accordion |
| Invite landing | Centered card | Full-screen card with large CTA |

---

## Accessibility

- All form inputs paired with `<Label>` + `htmlFor`
- Diagnosis/status chips use `aria-label` with full text
- Expandable rows use `aria-expanded`, keyboard navigable (Enter/Space)
- Avatar colors meet WCAG AA contrast
- Focus management: after patient creation, focus moves to success message

---

## Testing

### Unit tests (Vitest + convex-test) — ~20 tests

**patients.ts:**
- `create` validates required fields, rejects bad DOB, sets correct `slpUserId`
- `update` partial updates work, asserts ownership, rejects unauthorized
- `updateStatus` logs activity, validates transitions
- `getStats` returns correct counts

**caregivers.ts:**
- `createInvite` generates valid token, creates pending link
- `acceptInvite` links user, flips status, rejects already-accepted by different user
- `acceptInvite` idempotent for same user
- `revokeInvite` asserts SLP ownership

**activityLog.ts:**
- `log` writes correct fields
- `listByPatient` respects access control

**patientMaterials.ts:**
- `assign` creates link, asserts ownership
- `unassign` removes link

### Component tests (Vitest + RTL) — ~10 tests

- Intake form: step 1 validation, step 2 optional fields, submit flow
- Caseload list: renders patients, filter pills, expand/collapse
- Patient detail: widgets render, empty states
- Invite landing: valid token shows info, invalid shows error

### E2E (Playwright) — 3 flows

1. SLP signs in → adds patient → sees in caseload → opens detail page
2. SLP adds patient with parent email → copies invite link → parent signs up via invite → parent sees linked child
3. SLP assigns existing material to patient → material appears in patient detail
