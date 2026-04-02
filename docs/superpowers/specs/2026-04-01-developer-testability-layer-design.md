# Developer Testability Layer — Design Spec

**Date:** 2026-04-01
**Status:** Approved for spec writing
**Scope:** Unified developer testability layer for speech coach, teletherapy, seeds, and Convex test fixtures

## 1. Overview

Bridges currently has an inconsistent testing experience:

- some features are immediately testable with auth only
- some features require a full clinical workflow before a developer can verify one change
- test setup logic is duplicated across demo scripts, E2E setup, and Convex tests

This design introduces a unified developer testability layer with a clear split:

- clinician-facing preview paths remain part of the real product when they help SLP workflows
- developer-only accelerators stay hidden behind a strict gate and are never exposed in production

The goal is to make feature verification fast without creating a parallel fake product. Developers should be able to test the real feature surface with fewer setup steps, while shared seed and fixture utilities keep manual QA, E2E, and integration tests aligned.

## 2. Goals

1. Let SLPs preview a speech coach template without needing a patient, caregiver link, or assigned home program.
2. Make the standalone speech coach route discoverable from the SLP speech coach area.
3. Give developers a one-click teletherapy shortcut that bypasses booking prerequisites while still using the real appointment and call flow.
4. Keep demo seeding, E2E seeding, and Convex test fixtures aligned through shared fixture builders.
5. Reduce duplicated Convex test setup by extracting reusable helpers.

## 3. Non-Goals

1. Build a separate internal test dashboard.
2. Expose developer-only shortcuts to normal production users.
3. Replace real clinical workflows with fake in-memory mocks.
4. Redesign speech coach or sessions information architecture beyond what is needed for testability and discoverability.

## 4. Architectural Direction

The system uses a small shared developer-testability layer plus feature-local entry points.

### 4.1 Shared responsibilities

The shared layer is responsible for:

- deciding whether developer-only accelerators should render
- providing a common vocabulary for test fixture creation
- enforcing test-only provenance on synthetic records created by shortcuts

This logic should live in shared infrastructure, not be reimplemented per feature.

### 4.2 Feature-owned entry points

The feature pages remain the primary places where shortcuts appear:

- speech coach preview actions live in the speech coach feature
- teletherapy test-call actions live in the sessions feature

This keeps verification close to the feature being changed and avoids context switching to a separate internal tool.

### 4.3 Product-facing vs developer-only split

Two classes of shortcut exist:

- **product-facing preview paths**: available to SLPs because they improve the real workflow
- **developer-only accelerators**: available only in local/dev/staging for approved developer identities

This split prevents the system from collapsing into either extreme:

- hiding useful clinician preview workflows behind dev flags
- leaking synthetic test controls into production

## 5. Gating Model

Developer-only accelerators should only render when all of the following are true:

1. The app is running in an approved non-production environment.
2. The signed-in identity is on a developer allowlist.
3. The current feature explicitly opts into the accelerator.

### 5.1 Shared gate utility

Add a shared gate helper that evaluates the current environment and user identity. Feature pages consume the helper rather than inspecting env vars directly.

The helper should support these decisions:

- `showDeveloperAccelerators`
- `showSpeechCoachTemplatePreview` (always true for SLP product flow; no dev gate)

### 5.2 Production behavior

In production:

- developer-only buttons do not render
- developer-only mutations cannot be called even if a client attempts to invoke them manually

The backend must validate the same gate for all developer-only mutations. This is a security requirement, not a convenience — UI-only gating is bypassable via the Convex dashboard or DevTools. Extract an `assertDeveloperGate(ctx)` helper and call it at the top of every developer-only mutation, before any database operations.

### 5.3 Allowlist management

The developer identity allowlist must be stored in an environment variable (`DEVELOPER_ALLOWLIST`, comma-separated emails), not hardcoded in source. This prevents a code deploy being required to add or remove a developer. The variable should be set in the Convex dashboard environment variables for backend checks, and as a `NEXT_PUBLIC_DEVELOPER_ALLOWLIST` variable for the frontend gate (non-sensitive since it only controls UI visibility, with backend as the real enforcement layer).

## 6. Feature Design

## 6.1 Speech Coach

### 6.1.1 Template preview in template library

On [template-library-page.tsx](/Users/desha/Springfield-Vibeathon/src/features/speech-coach/components/template-library-page.tsx), each template should expose a `Preview session` action.

Behavior:

- available to SLPs as a real product capability
- starts the standalone speech coach using the selected template's normalized runtime configuration
- does not require a patient, caregiver link, or assigned home program
- uses the existing standalone speech coach experience instead of a new duplicate preview UI

The main value is allowing an SLP to confirm that a template behaves as expected before assigning it to a child.

### 6.1.2 Standalone coach discoverability

The standalone authenticated speech coach already exists, but the SLP path is not obvious enough.

Design direction:

- keep `Speech Coach` as the top-level navigation item
- make standalone preview clearly discoverable within the speech coach area as `Preview Coach` or `Test Session`
- avoid adding another top-level sidebar item unless usability testing later shows the current information architecture is insufficient

This keeps the nav focused while still solving the discoverability problem.

### 6.1.3 Preview data behavior

Preview sessions must be clearly separate from patient-bound therapy history.

Rules:

- preview sessions should not attach to a patient record
- preview sessions should not appear in caregiver-visible history
- preview sessions should not pollute patient progress, billing, or clinical reporting

If analytics are captured, preview sessions should be tagged as preview-only.

## 6.2 Teletherapy

### 6.2.1 In-place developer shortcut

On [sessions-page.tsx](/Users/desha/Springfield-Vibeathon/src/features/sessions/components/sessions-page.tsx), add a developer-only `Start test call` action.

Behavior:

- only visible behind the shared developer gate
- creates a synthetic appointment with test provenance
- routes directly into the existing call flow
- uses the real appointment and call pages instead of a fake test view

The action is intended to bypass booking friction, not bypass the actual teletherapy runtime.

### 6.2.2 Synthetic appointment strategy

The shortcut should create or reuse a synthetic patient fixture owned by the current SLP, then create an appointment in a joinable state.

Requirements:

- the appointment must be identifiable as test-only
- test appointments must be excluded from billing and clinician reporting
- cleanup can be deferred initially if records are safely filterable, but the provenance marker is mandatory from the first version

## 7. Seed And Fixture Strategy

The current repo already has:

- [demo_seed.ts](/Users/desha/Springfield-Vibeathon/convex/demo_seed.ts) for rich manual demo data
- [e2e_seed.ts](/Users/desha/Springfield-Vibeathon/convex/e2e_seed.ts) for narrower E2E setup

The problem is not absence of seeding, but divergence between seed paths.

### 7.1 Canonical fixture vocabulary

Define a shared fixture vocabulary that can be reused across contexts:

- test SLP identity
- test caregiver identity
- patient fixture
- accepted caregiver link
- speech coach home program
- appointment fixture
- availability fixture

### 7.2 Seed layers

The same core fixture builders should feed three layers:

1. **Demo seed**
   - realistic manual QA dataset for the demo accounts
2. **E2E seed**
   - deterministic fixture subset for Clerk test accounts
3. **Convex test helpers**
   - direct helpers for unit and integration tests

Each layer can choose different breadth, but they should not redefine how the underlying records are shaped.

### 7.3 Script direction

Keep `seed:demo` for broad manual verification.

Add a first-class `seed:e2e` path that provisions the Clerk E2E accounts with the same core fixture structure used by demo seed, without requiring the full demo dataset.

This resolves the current mismatch where demo accounts work but E2E accounts feel broken.

## 8. Convex Test Helpers

Extract reusable helpers into [testHelpers.ts](/Users/desha/Springfield-Vibeathon/convex/__tests__/testHelpers.ts) so tests stop redefining domain setup inline.

Initial helpers should include:

- `createTestPatient`
- `createAcceptedCaregiverLink`
- `createSpeechCoachHomeProgram`
- `createTestAppointment`
- `createTestAvailability`

### 8.1 Adoption targets

The first migration targets are:

- [speechCoach.test.ts](/Users/desha/Springfield-Vibeathon/convex/__tests__/speechCoach.test.ts)
- [activityLog.test.ts](/Users/desha/Springfield-Vibeathon/convex/__tests__/activityLog.test.ts)

This keeps the first pass focused and proves the helper API before broader migration.

## 9. Data Model And Provenance

Any record created through a developer-only accelerator must be identifiable as synthetic.

The design standardizes on an explicit provenance object for developer-created records:

```ts
testMetadata: {
  source: "developer-shortcut" | "seed-demo" | "seed-e2e";
  createdByUserId?: string;
  expiresAt?: number; // Unix ms — used for scheduled cleanup
}
```

This provenance object should be added anywhere developer-only accelerators or seed flows create records that could otherwise look clinical or billable, such as:

- test appointments
- synthetic patients created for test calls
- any related generated records

### 9.1 Provenance requirements

The provenance marker must allow the app to:

- filter synthetic records out of billing
- filter synthetic records out of production analytics and reports
- distinguish developer-created shortcuts from clinician-created real records

This is a hard requirement. Shortcut-created records without provenance are not acceptable.

### 9.2 Schema migration

`testMetadata` is a new optional field that must be added to the Convex schema for any table that can receive test records. The initial set of affected tables is:

- `appointments`
- `patients`
- `speechCoachSessions`

Add the field as `v.optional(v.object({ ... }))` in `convex/schema.ts`. A `npx convex dev` codegen run is required after any schema change before downstream code can reference the new fields.

```ts
// convex/schema.ts — shared testMetadata shape (repeat inline per table)
testMetadata: v.optional(v.object({
  source: v.union(
    v.literal("developer-shortcut"),
    v.literal("seed-demo"),
    v.literal("seed-e2e")
  ),
  createdByUserId: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
}))
```

### 9.3 Child record propagation

When the real call or session flow creates child records from a test-tagged root — session notes, billing events, progress data, LiveKit room records — those children must explicitly inherit `testMetadata` from the parent. This propagation is not automatic. Each Convex mutation that creates a child of a potentially-test record must:

1. Read the parent's `testMetadata`.
2. Pass it through to the child insert if present.

A child record without `testMetadata` that was created from a test appointment is indistinguishable from a clinical record and will appear in reporting surfaces. This is a correctness requirement for every mutation in the session and billing flows.

### 9.4 Expiry and cleanup

Developer-shortcut records should default to `expiresAt = now + 30 days`. Seed records (demo, e2e) can omit `expiresAt` as they are managed by the seed reset flow.

Add a scheduled internal Convex mutation (`internal.testData.sweepExpiredRecords`) that:

- Runs nightly via `ctx.scheduler`.
- Queries each affected table for records where `testMetadata.expiresAt < Date.now()`.
- Deletes them in dependency order (children before parents) to avoid FK violations.

This satisfies ISO 27001 Annex A 8.31 (separation of test and production environments with defined retention) and reduces the risk of test records accumulating alongside real PHI indefinitely.

## 10. Data Flow

## 10.1 Speech coach preview flow

1. SLP opens template library.
2. SLP selects `Preview session` on a template.
3. Template configuration is normalized into standalone runtime config.
4. Standalone speech coach opens with that configuration.
5. Preview session runs without patient-bound persistence requirements.

## 10.2 Teletherapy test-call flow

1. Developer opens sessions page.
2. Shared gate enables `Start test call`.
3. User clicks the action.
4. Frontend invokes a dedicated backend mutation.
5. Backend creates or reuses synthetic fixture records with test provenance.
6. Backend returns the appointment identifier.
7. Frontend routes to the normal call page.

## 10.3 Seed flow

1. Seed script identifies target Clerk users.
2. Shared fixture builders create the required domain records.
3. Manual QA, E2E, and Convex tests consume aligned data shapes.

## 11. Error Handling

### 11.1 Gate failures

If a user is not eligible for developer-only accelerators:

- the UI should not render the control
- backend mutations should reject access cleanly

### 11.2 Preview launch failures

If a template cannot be normalized into a valid runtime config:

- the preview should not start
- the SLP should see a clear template-specific error
- the template should remain editable

### 11.3 Test-call creation failures

If synthetic appointment creation fails:

- do not route to the call page
- show a clear non-clinical error state such as `Unable to start test call`
- avoid partially created records where possible

## 12. Testing Strategy

### 12.1 Frontend tests

Add or update tests for:

- SLP visibility of template preview controls
- absence of developer-only controls for non-developer users
- sessions page rendering of `Start test call` behind the gate
- navigation discoverability for standalone speech coach

### 12.2 Backend tests

Add or update tests for:

- developer-only mutation gate enforcement
- synthetic appointment creation with provenance markers
- filtering of synthetic records from non-test surfaces where applicable
- shared fixture helper behavior

### 12.3 Seed verification

Verify that:

- demo seed still produces a complete manual QA dataset
- E2E seed produces a deterministic testable dataset for Clerk test accounts
- both paths share the same core fixture structure

## 13. Implementation Boundaries

This design intentionally stays focused on the current testability pain:

- speech coach preview and discoverability
- teletherapy developer shortcut
- seed alignment
- shared Convex helpers

It does not include a generalized internal QA suite, admin dashboard, or broader refactor of every clinical workflow.

### 13.1 Implementation order constraint

Schema changes must be applied and codegen run (`npx convex dev`) **before** any feature or mutation code references `testMetadata`. The migration step is a hard prerequisite for the teletherapy shortcut, child record propagation, and the nightly sweep mutation.

## 14. Success Criteria

This work is successful when:

1. An SLP can preview a speech coach template without patient setup.
2. A developer can enter the teletherapy call flow from the sessions page without booking through the full workflow.
3. E2E accounts have reliable seed data shaped like the demo path.
4. New Convex tests can compose domain fixtures in a few lines instead of rebuilding setup from scratch.
5. Synthetic shortcut data is clearly marked and excluded from real reporting surfaces.
6. All child records of test-tagged appointments carry `testMetadata` and do not appear in billing or progress reports.
7. Developer-shortcut appointments expire and are automatically cleaned up within 30 days.
8. Removing or adding a developer to the allowlist requires only an env var change, not a code deploy.
