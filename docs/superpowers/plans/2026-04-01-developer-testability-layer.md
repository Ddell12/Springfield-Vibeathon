# Developer Testability Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unified developer testability layer so SLPs can preview speech coach templates, developers can start a teletherapy test call without full setup, and demo/E2E/Convex tests share one fixture vocabulary with explicit test-data provenance.

**Architecture:** Keep shortcuts in the owning feature pages, backed by a shared gate and shared Convex fixture/provenance utilities. Product-facing preview remains available to SLPs, while developer-only accelerators are gated by environment plus allowlist and enforced in both UI and backend mutations. All synthetic records carry `testMetadata` and propagate it through downstream records so billing and reporting can exclude them safely.

**Tech Stack:** Next.js App Router, React, Clerk, Convex, Vitest, convex-test, Tailwind v4, shadcn/ui

---

## File Structure

### Shared gate and provenance infrastructure

- Modify: `convex/schema.ts`
  Responsibility: add `testMetadata` to the affected tables and indexes needed for cleanup/filtering if required.
- Create: `convex/lib/testMetadata.ts`
  Responsibility: shared Convex validators and helpers for building/propagating `testMetadata`.
- Create: `convex/lib/developerGate.ts`
  Responsibility: backend `assertDeveloperGate(ctx)` and allowlist parsing using env.
- Create: `src/shared/lib/developer-gate.ts`
  Responsibility: frontend helper for deciding whether developer-only controls should render.

### Speech coach preview and discoverability

- Modify: `src/features/speech-coach/components/template-library-page.tsx`
  Responsibility: add `Preview session` actions for saved templates.
- Modify: `src/features/speech-coach/components/standalone-speech-coach-page.tsx`
  Responsibility: accept initial preview config/query params and surface a clearer SLP preview entry path.
- Modify: `src/shared/lib/navigation.ts`
  Responsibility: keep speech coach discoverable without adding a second top-level item.
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
  Responsibility: if needed, add speech coach child-link discoverability in the SLP area without changing caregiver nav.

### Teletherapy developer shortcut

- Modify: `convex/appointments.ts`
  Responsibility: add a developer-only mutation to create/reuse synthetic patient + instant appointment, and propagate `testMetadata`.
- Modify: `src/features/sessions/hooks/use-appointments.ts`
  Responsibility: expose the developer-only appointment action to the sessions UI.
- Modify: `src/features/sessions/components/sessions-page.tsx`
  Responsibility: render `Start test call` behind the shared frontend gate.

### Seed alignment and cleanup

- Modify: `convex/demo_seed.ts`
  Responsibility: route demo inserts through shared fixture/provenance helpers.
- Modify: `convex/e2e_seed.ts`
  Responsibility: reuse shared fixture helpers instead of bespoke inserts.
- Create: `convex/lib/testFixtures.ts`
  Responsibility: canonical patient/link/home-program/appointment fixture builders for demo seed, e2e seed, and tests.
- Create: `convex/testData.ts`
  Responsibility: scheduled cleanup of expired developer-shortcut data in dependency order.
- Modify: `scripts/seed-demo.ts`
  Responsibility: keep demo path intact while using the shared fixture builders.
- Create: `scripts/seed-e2e.ts`
  Responsibility: provision the Clerk E2E accounts with deterministic seed data.
- Modify: `package.json`
  Responsibility: add a `seed:e2e` script.

### Provenance propagation and filtering

- Modify: `convex/sessionNotes.ts`
  Responsibility: propagate `testMetadata` into session notes and avoid downstream contamination.
- Modify: `convex/billingRecords.ts`
  Responsibility: propagate/filter `testMetadata` so synthetic sessions do not appear in billing surfaces.
- Modify: `convex/meetingRecords.ts`
  Responsibility: carry forward `testMetadata` from appointments into meeting records.
- Modify: `convex/sessionActions.ts`
  Responsibility: ensure generated child records inherit parent `testMetadata`.

### Tests

- Modify: `src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`
- Create: `src/features/speech-coach/components/__tests__/template-library-page.test.tsx`
- Create: `src/features/sessions/components/__tests__/sessions-page.test.tsx`
- Modify: `convex/__tests__/testHelpers.ts`
- Modify: `convex/__tests__/speechCoach.test.ts`
- Modify: `convex/__tests__/activityLog.test.ts`
- Create: `convex/__tests__/appointments.test.ts`
- Modify: `convex/__tests__/billingRecords.test.ts`

## Task 1: Add Shared Developer Gate And `testMetadata` Schema Support

**Files:**
- Create: `convex/lib/testMetadata.ts`
- Create: `convex/lib/developerGate.ts`
- Create: `src/shared/lib/developer-gate.ts`
- Modify: `convex/schema.ts`
- Test: `convex/__tests__/appointments.test.ts`

- [ ] **Step 1: Write the failing backend schema/gate tests**

```ts
// convex/__tests__/appointments.test.ts
it("rejects developer shortcut when identity is not allowlisted", async () => {
  vi.stubEnv("DEVELOPER_ALLOWLIST", "dev@bridges.ai");
  const t = convexTest(schema, modules).withIdentity({
    subject: "slp-user-123",
    issuer: "clerk",
    email: "other@bridges.ai",
  });

  await expect(
    t.mutation(api.appointments.startDeveloperTestCall, {})
  ).rejects.toThrow("Developer shortcuts are not enabled");
});

it("persists testMetadata on developer-created appointments", async () => {
  vi.stubEnv("DEVELOPER_ALLOWLIST", "dev@bridges.ai");
  const t = convexTest(schema, modules).withIdentity({
    subject: "slp-user-123",
    issuer: "clerk",
    email: "dev@bridges.ai",
  });

  const appointmentId = await t.mutation(api.appointments.startDeveloperTestCall, {});
  const appointment = await t.run((ctx) => ctx.db.get(appointmentId));

  expect(appointment?.testMetadata?.source).toBe("developer-shortcut");
  expect(appointment?.testMetadata?.createdByUserId).toBe("slp-user-123");
  expect(appointment?.testMetadata?.expiresAt).toBeTypeOf("number");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- convex/__tests__/appointments.test.ts`
Expected: FAIL with `Property 'startDeveloperTestCall' does not exist` or missing `testMetadata` fields in schema.

- [ ] **Step 3: Add shared `testMetadata` validator and backend developer gate**

```ts
// convex/lib/testMetadata.ts
import { v } from "convex/values";

export const testMetadataValidator = v.object({
  source: v.union(
    v.literal("developer-shortcut"),
    v.literal("seed-demo"),
    v.literal("seed-e2e"),
  ),
  createdByUserId: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
});

export function buildDeveloperTestMetadata(userId: string, now = Date.now()) {
  return {
    source: "developer-shortcut" as const,
    createdByUserId: userId,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
  };
}
```

```ts
// convex/lib/developerGate.ts
import { ConvexError } from "convex/values";

export function parseAllowlist(raw: string | undefined) {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function assertDeveloperGate(ctx: { auth: any }) {
  const identity = await ctx.auth.getUserIdentity();
  const email = identity?.email?.toLowerCase();
  const allowlist = parseAllowlist(process.env.DEVELOPER_ALLOWLIST);

  if (!email || !allowlist.has(email)) {
    throw new ConvexError("Developer shortcuts are not enabled");
  }

  return identity;
}
```

```ts
// src/shared/lib/developer-gate.ts
export function canShowDeveloperAccelerators(email: string | null | undefined) {
  if (process.env.NODE_ENV === "production") return false;

  const allowlist = new Set(
    (process.env.NEXT_PUBLIC_DEVELOPER_ALLOWLIST ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  return !!email && allowlist.has(email.toLowerCase());
}
```

- [ ] **Step 4: Add `testMetadata` to schema tables that can receive synthetic or propagated test records**

```ts
// convex/schema.ts
import { testMetadataValidator } from "./lib/testMetadata";

appointments: defineTable({
  // existing fields...
  testMetadata: v.optional(testMetadataValidator),
})

meetingRecords: defineTable({
  // existing fields...
  testMetadata: v.optional(testMetadataValidator),
})

sessionNotes: defineTable({
  // existing fields...
  testMetadata: v.optional(testMetadataValidator),
})

patients: defineTable({
  // existing fields...
  testMetadata: v.optional(testMetadataValidator),
})

speechCoachSessions: defineTable({
  // existing fields...
  testMetadata: v.optional(testMetadataValidator),
})

billingRecords: defineTable({
  // existing fields...
  testMetadata: v.optional(testMetadataValidator),
})
```

- [ ] **Step 5: Run codegen and tests**

Run: `npx convex dev --once`
Expected: codegen completes and updates generated types.

Run: `npm test -- convex/__tests__/appointments.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/lib/testMetadata.ts convex/lib/developerGate.ts src/shared/lib/developer-gate.ts convex/__tests__/appointments.test.ts convex/_generated
git commit -m "feat: add developer gate and test metadata schema"
```

## Task 2: Add SLP Speech Coach Preview And Discoverability

**Files:**
- Modify: `src/features/speech-coach/components/template-library-page.tsx`
- Modify: `src/features/speech-coach/components/standalone-speech-coach-page.tsx`
- Modify: `src/shared/lib/navigation.ts`
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
- Create: `src/features/speech-coach/components/__tests__/template-library-page.test.tsx`
- Test: `src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`

- [ ] **Step 1: Write the failing component tests**

```tsx
// src/features/speech-coach/components/__tests__/template-library-page.test.tsx
it("renders Preview session for each SLP template", async () => {
  mockedUseQuery.mockReturnValue([
    { _id: "tpl1", name: "Playful /s/", description: "desc", status: "active" },
  ]);

  render(<TemplateLibraryPage />);

  expect(screen.getByRole("button", { name: /preview session/i })).toBeInTheDocument();
});

it("opens standalone preview link with template id", async () => {
  mockedUseQuery.mockReturnValue([
    { _id: "tpl1", name: "Playful /s/", description: "desc", status: "active" },
  ]);

  render(<TemplateLibraryPage />);
  expect(screen.getByRole("link", { name: /preview session/i })).toHaveAttribute(
    "href",
    "/speech-coach?templateId=tpl1&mode=preview",
  );
});
```

```tsx
// src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx
it("keeps Speech Coach as the top-level nav item for SLPs", () => {
  render(<DashboardSidebar />);
  expect(screen.getByRole("link", { name: /speech coach/i })).toHaveAttribute("href", "/speech-coach");
  expect(screen.queryByRole("link", { name: /preview coach/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/speech-coach/components/__tests__/template-library-page.test.tsx src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`
Expected: FAIL because `Preview session` is not rendered and no preview link exists.

- [ ] **Step 3: Add preview action on template cards**

```tsx
// src/features/speech-coach/components/template-library-page.tsx
import Link from "next/link";

<div className="flex items-start justify-between gap-4">
  <div>
    <p className="font-headline text-lg text-foreground">{t.name}</p>
    {t.description ? <p className="mt-0.5 text-sm text-muted-foreground">{t.description}</p> : null}
  </div>
  <div className="flex items-center gap-2">
    <span className="mt-1 shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
      {t.status}
    </span>
    <Button asChild type="button" variant="outline">
      <Link href={`/speech-coach?templateId=${t._id}&mode=preview`}>
        Preview session
      </Link>
    </Button>
  </div>
</div>
```

- [ ] **Step 4: Read preview params in standalone speech coach and preload config**

```tsx
// src/features/speech-coach/components/standalone-speech-coach-page.tsx
import { useSearchParams } from "next/navigation";

const searchParams = useSearchParams();
const previewTemplateId = searchParams.get("templateId");
const isPreviewMode = searchParams.get("mode") === "preview";

const template = useQuery(
  api.speechCoachTemplates.getById,
  previewTemplateId ? { templateId: previewTemplateId as Id<"speechCoachTemplates"> } : "skip",
);

const speechCoachConfig = template
  ? {
      targetSounds: template.defaultTargetSounds,
      ageRange: template.defaultAgeRange,
      defaultDurationMinutes: template.defaultDurationMinutes,
    }
  : DEFAULT_CONFIG;
```

- [ ] **Step 5: Keep discoverability inside the speech coach surface rather than adding a new top-level nav item**

```ts
// src/shared/lib/navigation.ts
export const NAV_ITEMS = [
  { icon: "auto_awesome", label: "Builder", href: ROUTES.BUILDER },
  { icon: "group", label: "Patients", href: ROUTES.PATIENTS },
  { icon: "video_call", label: "Sessions", href: ROUTES.SESSIONS },
  { icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH },
  { icon: "collections_bookmark", label: "Library", href: ROUTES.LIBRARY },
] as const;
```

```tsx
// src/features/speech-coach/components/standalone-speech-coach-page.tsx
{isSLP && isPreviewMode ? (
  <p className="mt-1 text-sm text-on-surface-variant">
    Previewing this coach setup before assigning it to a child.
  </p>
) : null}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/features/speech-coach/components/__tests__/template-library-page.test.tsx src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/speech-coach/components/template-library-page.tsx src/features/speech-coach/components/standalone-speech-coach-page.tsx src/shared/lib/navigation.ts src/features/dashboard/components/dashboard-sidebar.tsx src/features/speech-coach/components/__tests__/template-library-page.test.tsx src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx
git commit -m "feat: add speech coach template preview flow"
```

## Task 3: Add Developer-Only Teletherapy `Start test call`

**Files:**
- Modify: `convex/appointments.ts`
- Modify: `src/features/sessions/hooks/use-appointments.ts`
- Modify: `src/features/sessions/components/sessions-page.tsx`
- Create: `src/features/sessions/components/__tests__/sessions-page.test.tsx`
- Modify: `convex/__tests__/appointments.test.ts`

- [ ] **Step 1: Write the failing UI and mutation tests**

```tsx
// src/features/sessions/components/__tests__/sessions-page.test.tsx
it("shows Start test call only for allowlisted developers", () => {
  mockedCanShowDeveloperAccelerators.mockReturnValue(true);
  render(<SessionsPage />);
  expect(screen.getByRole("button", { name: /start test call/i })).toBeInTheDocument();
});

it("hides Start test call for normal SLP accounts", () => {
  mockedCanShowDeveloperAccelerators.mockReturnValue(false);
  render(<SessionsPage />);
  expect(screen.queryByRole("button", { name: /start test call/i })).not.toBeInTheDocument();
});
```

```ts
// convex/__tests__/appointments.test.ts
it("creates a synthetic patient and joinable appointment for the current SLP", async () => {
  vi.stubEnv("DEVELOPER_ALLOWLIST", "dev@bridges.ai");
  const t = convexTest(schema, modules).withIdentity({
    subject: "slp-user-123",
    issuer: "clerk",
    email: "dev@bridges.ai",
  });

  const appointmentId = await t.mutation(api.appointments.startDeveloperTestCall, {});
  const appointment = await t.run((ctx) => ctx.db.get(appointmentId));
  const patient = appointment ? await t.run((ctx) => ctx.db.get(appointment.patientId)) : null;

  expect(appointment?.status).toBe("scheduled");
  expect(appointment?.joinLink).toBe(`/sessions/${appointmentId}/call`);
  expect(patient?.testMetadata?.source).toBe("developer-shortcut");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/features/sessions/components/__tests__/sessions-page.test.tsx convex/__tests__/appointments.test.ts`
Expected: FAIL because the action and button do not exist yet.

- [ ] **Step 3: Implement the backend developer shortcut**

```ts
// convex/appointments.ts
export const startDeveloperTestCall = slpMutation({
  args: {},
  handler: async (ctx) => {
    const identity = await assertDeveloperGate(ctx);
    const slpId = ctx.slpUserId;
    const testMetadata = buildDeveloperTestMetadata(slpId);

    const patientId = await ctx.db.insert("patients", {
      slpUserId: slpId,
      firstName: "Test",
      lastName: "Call",
      dateOfBirth: "2020-01-01",
      diagnosis: "articulation",
      status: "active",
      notes: "Synthetic developer teletherapy patient",
      testMetadata,
    });

    const scheduledAt = Date.now() + 60_000;
    const appointmentId = await ctx.db.insert("appointments", {
      slpId,
      patientId,
      scheduledAt,
      duration: 30,
      status: "scheduled",
      joinLink: "",
      testMetadata: {
        ...testMetadata,
        createdByUserId: identity.subject,
      },
    });

    await ctx.db.patch(appointmentId, {
      joinLink: `/sessions/${appointmentId}/call`,
    });

    return appointmentId;
  },
});
```

- [ ] **Step 4: Wire the action into the sessions hook and page**

```ts
// src/features/sessions/hooks/use-appointments.ts
const startDeveloperTestCall = useMutation(api.appointments.startDeveloperTestCall);

return {
  create,
  bookAsCaregiver,
  cancel,
  startSession,
  completeSession,
  markNoShow,
  startDeveloperTestCall,
};
```

```tsx
// src/features/sessions/components/sessions-page.tsx
const showDeveloperAccelerators = canShowDeveloperAccelerators(
  user?.primaryEmailAddress?.emailAddress ?? null,
);

{isSLP && showDeveloperAccelerators ? (
  <Button
    type="button"
    variant="outline"
    onClick={async () => {
      const appointmentId = await startDeveloperTestCall();
      router.push(`/sessions/${appointmentId}/call`);
    }}
  >
    <MaterialIcon icon="science" size="sm" />
    Start test call
  </Button>
) : null}
```

- [ ] **Step 5: Run the focused tests**

Run: `npm test -- src/features/sessions/components/__tests__/sessions-page.test.tsx convex/__tests__/appointments.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add convex/appointments.ts src/features/sessions/hooks/use-appointments.ts src/features/sessions/components/sessions-page.tsx src/features/sessions/components/__tests__/sessions-page.test.tsx convex/__tests__/appointments.test.ts
git commit -m "feat: add developer teletherapy test call shortcut"
```

## Task 4: Align Demo Seed, E2E Seed, And Convex Fixture Builders

**Files:**
- Create: `convex/lib/testFixtures.ts`
- Modify: `convex/demo_seed.ts`
- Modify: `convex/e2e_seed.ts`
- Create: `scripts/seed-e2e.ts`
- Modify: `scripts/seed-demo.ts`
- Modify: `package.json`
- Test: `convex/__tests__/speechCoach.test.ts`

- [ ] **Step 1: Write the failing fixture-helper tests**

```ts
// convex/__tests__/speechCoach.test.ts
it("creates a speech coach home program from shared fixtures", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createSpeechCoachFixture(t, {
    slpIdentity: SLP_IDENTITY,
    caregiverIdentity: CAREGIVER_IDENTITY,
  });

  expect(fixture.patientId).toBeTruthy();
  expect(fixture.programId).toBeTruthy();
  expect(fixture.patient?.testMetadata).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- convex/__tests__/speechCoach.test.ts`
Expected: FAIL because `createSpeechCoachFixture` does not exist.

- [ ] **Step 3: Extract canonical fixture builders**

```ts
// convex/lib/testFixtures.ts
export async function createPatientFixture(ctx: MutationCtx, args: {
  slpUserId: string;
  firstName: string;
  lastName: string;
  caregiverEmail?: string;
  testMetadata?: TestMetadata;
}) {
  return await ctx.db.insert("patients", {
    slpUserId: args.slpUserId,
    firstName: args.firstName,
    lastName: args.lastName,
    dateOfBirth: "2020-01-01",
    diagnosis: "articulation",
    status: "active",
    parentEmail: args.caregiverEmail,
    testMetadata: args.testMetadata,
  });
}

export async function createSpeechCoachProgramFixture(ctx: MutationCtx, args: {
  patientId: Id<"patients">;
  slpUserId: string;
  testMetadata?: TestMetadata;
}) {
  return await ctx.db.insert("homePrograms", {
    patientId: args.patientId,
    slpUserId: args.slpUserId,
    title: "Speech Coach — /s/ sounds",
    instructions: "Practice /s/ sounds with the speech coach.",
    frequency: "daily",
    status: "active",
    startDate: "2026-04-01",
    type: "speech-coach",
    speechCoachConfig: {
      targetSounds: ["/s/"],
      ageRange: "5-7",
      defaultDurationMinutes: 5,
    },
  });
}
```

- [ ] **Step 4: Refactor `demo_seed`, `e2e_seed`, and scripts to use shared fixtures**

```ts
// convex/e2e_seed.ts
const testMetadata = { source: "seed-e2e" as const };
const patientId = await createPatientFixture(ctx, {
  slpUserId: args.slpUserId,
  firstName: "Test",
  lastName: "Child",
  caregiverEmail: args.caregiverEmail,
  testMetadata,
});

await createAcceptedCaregiverLinkFixture(ctx, {
  patientId,
  caregiverUserId: args.caregiverUserId,
  caregiverEmail: args.caregiverEmail,
});

await createSpeechCoachProgramFixture(ctx, {
  patientId,
  slpUserId: args.slpUserId,
  testMetadata,
});
```

```json
// package.json
{
  "scripts": {
    "seed:demo": "npx tsx scripts/seed-demo.ts",
    "seed:e2e": "npx tsx scripts/seed-e2e.ts"
  }
}
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- convex/__tests__/speechCoach.test.ts`
Expected: PASS

- [ ] **Step 6: Smoke the scripts**

Run: `npm run seed:demo -- --help`
Expected: existing demo script still parses arguments.

Run: `npm run seed:e2e -- --help`
Expected: new e2e script prints usage for target Clerk test accounts.

- [ ] **Step 7: Commit**

```bash
git add convex/lib/testFixtures.ts convex/demo_seed.ts convex/e2e_seed.ts scripts/seed-demo.ts scripts/seed-e2e.ts package.json convex/__tests__/speechCoach.test.ts
git commit -m "refactor: unify demo and e2e fixture builders"
```

## Task 5: Propagate And Filter `testMetadata` Through Session/Billing Flows

**Files:**
- Modify: `convex/appointments.ts`
- Modify: `convex/meetingRecords.ts`
- Modify: `convex/sessionNotes.ts`
- Modify: `convex/sessionActions.ts`
- Modify: `convex/billingRecords.ts`
- Modify: `convex/__tests__/billingRecords.test.ts`
- Modify: `convex/__tests__/appointments.test.ts`

- [ ] **Step 1: Write the failing propagation/filtering tests**

```ts
// convex/__tests__/appointments.test.ts
it("copies appointment testMetadata into meeting records on completion", async () => {
  const t = await createDeveloperAppointmentTestHarness();
  const meetingRecordId = await t.slp.mutation(api.appointments.completeSession, {
    appointmentId: t.appointmentId,
    durationSeconds: 600,
  });

  const meetingRecord = await t.run((ctx) => ctx.db.get(meetingRecordId));
  expect(meetingRecord?.testMetadata?.source).toBe("developer-shortcut");
});
```

```ts
// convex/__tests__/billingRecords.test.ts
it("excludes testMetadata-tagged billing records from listBySlp", async () => {
  const { t, patientId, noteId } = await createSyntheticSessionNoteHarness();
  await t.mutation(internal.billingRecords.createFromSessionNote, {
    sessionNoteId: noteId,
    slpUserId: "slp-user-123",
    patientId,
    sessionDate: "2026-04-01",
    sessionType: "teletherapy",
  });

  const records = await t.query(api.billingRecords.listBySlp, {});
  expect(records).toHaveLength(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- convex/__tests__/appointments.test.ts convex/__tests__/billingRecords.test.ts`
Expected: FAIL because `testMetadata` is not yet propagated or filtered.

- [ ] **Step 3: Propagate `testMetadata` from appointments into meeting records and session notes**

```ts
// convex/appointments.ts
const meetingRecordId = await ctx.db.insert("meetingRecords", {
  appointmentId: args.appointmentId,
  slpId,
  patientId: appointment.patientId,
  duration: args.durationSeconds,
  interactionLog: args.interactionLog,
  status: "processing",
  testMetadata: appointment.testMetadata,
});
```

```ts
// convex/sessionNotes.ts
return await ctx.db.insert("sessionNotes", {
  patientId: meeting.patientId,
  slpUserId: meeting.slpId,
  sessionDate,
  sessionDuration,
  sessionType: "teletherapy",
  status: "draft",
  structuredData,
  aiGenerated: true,
  meetingRecordId: args.meetingRecordId,
  testMetadata: meeting.testMetadata,
});
```

- [ ] **Step 4: Filter test-tagged billing records out of clinician lists**

```ts
// convex/billingRecords.ts
return (await ctx.db
  .query("billingRecords")
  .withIndex("by_slpUserId", (q) => q.eq("slpUserId", ctx.slpUserId!))
  .order("desc")
  .collect()
).filter((record) => !record.testMetadata);
```

```ts
// convex/billingRecords.ts
return await ctx.db.insert("billingRecords", {
  patientId: args.patientId,
  slpUserId: args.slpUserId,
  sessionNoteId: args.sessionNoteId,
  dateOfService: args.sessionDate,
  cptCode,
  cptDescription,
  modifiers,
  diagnosisCodes: [],
  placeOfService,
  units: 1,
  fee,
  status: "draft",
  testMetadata: sessionNote.testMetadata,
});
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- convex/__tests__/appointments.test.ts convex/__tests__/billingRecords.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add convex/appointments.ts convex/meetingRecords.ts convex/sessionNotes.ts convex/sessionActions.ts convex/billingRecords.ts convex/__tests__/appointments.test.ts convex/__tests__/billingRecords.test.ts
git commit -m "fix: propagate and filter test metadata"
```

## Task 6: Add Reusable Convex Test Helpers And Cleanup Job

**Files:**
- Modify: `convex/__tests__/testHelpers.ts`
- Modify: `convex/__tests__/speechCoach.test.ts`
- Modify: `convex/__tests__/activityLog.test.ts`
- Create: `convex/testData.ts`
- Modify: `convex/convex.config.ts`

- [ ] **Step 1: Write the failing helper reuse tests**

```ts
// convex/__tests__/activityLog.test.ts
it("creates a patient through shared test helpers", async () => {
  const t = convexTest(schema, modules);
  const patientId = await createTestPatient(t, { slpUserId: "slp-user-123" });
  expect(patientId).toBeTruthy();
});
```

```ts
// convex/__tests__/speechCoach.test.ts
it("creates speech coach fixtures through shared helpers", async () => {
  const t = convexTest(schema, modules);
  const fixture = await createSpeechCoachFixture(t, {
    slpIdentity: SLP_IDENTITY,
    caregiverIdentity: CAREGIVER_IDENTITY,
  });

  expect(fixture.programId).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- convex/__tests__/activityLog.test.ts convex/__tests__/speechCoach.test.ts`
Expected: FAIL because the helper API does not exist yet.

- [ ] **Step 3: Expand `convex/__tests__/testHelpers.ts` with shared fixture creators**

```ts
// convex/__tests__/testHelpers.ts
export async function createTestPatient(
  t: ReturnType<typeof convexTest>,
  args: { slpUserId?: string; testMetadata?: any } = {},
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("patients", {
      slpUserId: args.slpUserId ?? "slp-user-123",
      firstName: "Alex",
      lastName: "Smith",
      dateOfBirth: "2020-01-15",
      diagnosis: "articulation",
      status: "active",
      testMetadata: args.testMetadata,
    });
  });
}
```

```ts
export async function createSpeechCoachFixture(
  t: ReturnType<typeof convexTest>,
  args: { slpIdentity: any; caregiverIdentity: any },
) {
  const slp = t.withIdentity(args.slpIdentity);
  const { patientId, inviteToken } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation",
    parentEmail: "parent@test.com",
  });

  const caregiver = t.withIdentity(args.caregiverIdentity);
  await caregiver.mutation(api.caregivers.acceptInvite, { token: inviteToken! });

  const programId = await slp.mutation(api.homePrograms.create, {
    patientId,
    title: "Speech Coach - /s/ sounds",
    instructions: "Practice /s/ sounds with the voice coach.",
    frequency: "daily",
    startDate: new Date().toISOString().slice(0, 10),
    type: "speech-coach",
    speechCoachConfig: {
      targetSounds: ["/s/"],
      ageRange: "2-4",
      defaultDurationMinutes: 5,
    },
  });

  return { patientId, programId };
}
```

- [ ] **Step 4: Add cleanup job for expired developer-shortcut data**

```ts
// convex/testData.ts
export const sweepExpiredRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    for (const appointment of await ctx.db.query("appointments").collect()) {
      if (appointment.testMetadata?.expiresAt && appointment.testMetadata.expiresAt < now) {
        await ctx.db.delete(appointment._id);
      }
    }
  },
});
```

```ts
// convex/convex.config.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.daily("sweep expired developer test data", { hourUTC: 6, minuteUTC: 0 }, internal.testData.sweepExpiredRecords);
export default crons;
```

- [ ] **Step 5: Run focused tests**

Run: `npm test -- convex/__tests__/activityLog.test.ts convex/__tests__/speechCoach.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add convex/__tests__/testHelpers.ts convex/__tests__/speechCoach.test.ts convex/__tests__/activityLog.test.ts convex/testData.ts convex/convex.config.ts
git commit -m "test: extract shared convex fixtures and cleanup job"
```

## Verification

- `npx convex dev --once`
- `npm test -- convex/__tests__/appointments.test.ts convex/__tests__/billingRecords.test.ts convex/__tests__/speechCoach.test.ts convex/__tests__/activityLog.test.ts`
- `npm test -- src/features/speech-coach/components/__tests__/template-library-page.test.tsx src/features/sessions/components/__tests__/sessions-page.test.tsx src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx`

Expected verification outcome:

- developer-only shortcut controls are only visible for allowlisted developers in non-production environments
- speech coach preview is visible to SLPs as a product feature
- developer teletherapy shortcut creates tagged synthetic data and routes into the real call flow
- billing/reporting surfaces exclude tagged synthetic data
- shared fixtures reduce repeated Convex test setup

## Self-Review

Spec coverage check:

- Shared gate and allowlist: covered by Task 1.
- Speech coach preview and discoverability: covered by Task 2.
- Developer teletherapy shortcut: covered by Task 3.
- Demo/E2E fixture alignment: covered by Task 4.
- `testMetadata` propagation and filtering: covered by Task 5.
- Shared Convex helpers and cleanup: covered by Task 6.

Placeholder scan:

- No `TODO`, `TBD`, or deferred “implement later” items remain.

Type consistency:

- The plan uses `testMetadata` consistently across schema, appointment creation, meeting records, session notes, and billing records.
- The developer-only mutation name is consistently `api.appointments.startDeveloperTestCall`.
