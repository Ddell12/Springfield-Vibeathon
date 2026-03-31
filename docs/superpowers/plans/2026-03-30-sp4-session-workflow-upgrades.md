# SP4: Session Workflow Upgrades — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add same-day signature warnings, group session notes (CPT 92508), multi-audience progress reports, and physician signature display to make the SLP workflow billing-compliant and multi-audience aware.
**Architecture:** Four incremental enhancements to existing `sessionNotes` and `progressReports` features. Task 1 is frontend-only (no schema changes). Tasks 2-3 extend existing Convex tables with optional fields for backward compatibility. Task 4 reads from SP2's `plansOfCare` table (dependency — graceful degradation if table doesn't exist yet).
**Tech Stack:** Convex (schema, mutations, queries), Next.js App Router, React, Tailwind v4, shadcn/ui, Anthropic SDK (streaming), Vitest + convex-test

---

## Task 1: Late-Signature Detection Utility

**Files:**
- Create: `src/features/session-notes/__tests__/session-utils.test.ts`
- Modify: `src/features/session-notes/lib/session-utils.ts:29-END`

- [ ] **Step 1: Write the failing test**

Create `src/features/session-notes/__tests__/session-utils.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  getSignatureDelayDays,
  isLateSignature,
} from "../lib/session-utils";

describe("isLateSignature", () => {
  it("returns false when signedAt is on same day as sessionDate", () => {
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-28T12:00:00Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(false);
  });

  it("returns false when signedAt is within 24h of end of sessionDate", () => {
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-29T22:59:00Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(false);
  });

  it("returns true when signedAt is >24h after end of sessionDate", () => {
    const sessionDate = "2026-03-25";
    const signedAt = new Date("2026-03-28T12:00:00Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(true);
  });

  it("returns false when signedAt is undefined", () => {
    expect(isLateSignature(undefined, "2026-03-28")).toBe(false);
  });

  it("returns false when sessionDate is empty", () => {
    expect(isLateSignature(Date.now(), "")).toBe(false);
  });
});

describe("getSignatureDelayDays", () => {
  it("returns 0 for same-day signature", () => {
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-28T18:00:00Z").getTime();
    expect(getSignatureDelayDays(signedAt, sessionDate)).toBe(0);
  });

  it("returns 3 for signature 3 days late", () => {
    const sessionDate = "2026-03-25";
    const signedAt = new Date("2026-03-28T12:00:00Z").getTime();
    expect(getSignatureDelayDays(signedAt, sessionDate)).toBe(3);
  });

  it("returns null when signedAt is undefined", () => {
    expect(getSignatureDelayDays(undefined, "2026-03-28")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/session-notes/__tests__/session-utils.test.ts`
Expected: FAIL with "is not a function" or "is not exported"

- [ ] **Step 3: Write minimal implementation**

Append to `src/features/session-notes/lib/session-utils.ts` after line 28 (after the `accuracyLabel` function):

```typescript

/**
 * Returns true if a session note was signed more than 24 hours after
 * the end of its session date. Medicare and most payers expect same-day
 * signatures; late signatures can be flagged in audits.
 */
export function isLateSignature(
  signedAt: number | undefined,
  sessionDate: string,
): boolean {
  if (!signedAt || !sessionDate) return false;
  const sessionEnd = new Date(sessionDate + "T23:59:59Z").getTime();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return signedAt - sessionEnd > twentyFourHoursMs;
}

/**
 * Returns the number of calendar days between the session date and
 * the signature timestamp, or null if unsigned.
 */
export function getSignatureDelayDays(
  signedAt: number | undefined,
  sessionDate: string,
): number | null {
  if (!signedAt || !sessionDate) return null;
  const sessionDay = new Date(sessionDate + "T00:00:00Z").getTime();
  const diffMs = signedAt - sessionDay;
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/session-notes/__tests__/session-utils.test.ts`
Expected: PASS (all 8 tests)

- [ ] **Step 5: Commit**

---

## Task 2: Late-Signature Badge on Session Note Card

**Files:**
- Modify: `src/features/session-notes/components/session-note-card.tsx:60-118`

- [ ] **Step 1: Add late-signature badge to the card**

In `src/features/session-notes/components/session-note-card.tsx`, add the import at the top (after the existing `session-utils` import line 14):

Replace:
```typescript
import {
  accuracyColor,
  accuracyLabel,
  calculateAccuracy,
  formatDuration,
} from "../lib/session-utils";
```

With:
```typescript
import {
  accuracyColor,
  accuracyLabel,
  calculateAccuracy,
  formatDuration,
  getSignatureDelayDays,
  isLateSignature,
} from "../lib/session-utils";
```

Then, after the status chip (after line 116 `{note.status}`, before `</span>`), insert a late-signature badge. Replace the entire return block of `SessionNoteCard` starting at `return (` (line 68) through the closing `);` (line 118):

```typescript
  const isLate = isLateSignature(note.signedAt, note.sessionDate);
  const delayDays = getSignatureDelayDays(note.signedAt, note.sessionDate);

  return (
    <Link
      href={`/patients/${patientId}/sessions/${note._id}`}
      className="flex items-center gap-3 rounded-xl bg-surface-container px-4 py-3 transition-all duration-300 hover:bg-surface-container-high"
    >
      {/* Type icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <MaterialIcon
          icon={typeIcon}
          size="sm"
          className="text-primary"
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {firstTarget?.target ?? "No targets recorded"}
          </p>
          {accuracy !== null && (
            <span className={cn("text-xs font-medium", accuracyColor(accuracy))}>
              {accuracyLabel(accuracy)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatSessionDate(note.sessionDate)}
        </p>
      </div>

      {/* Late-signature warning badge */}
      {isLate && delayDays !== null && delayDays > 0 && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-caution-container px-2 py-0.5 text-[10px] font-medium text-on-caution-container">
          <MaterialIcon icon="schedule" size="xs" />
          Signed {delayDays}d late
        </span>
      )}

      {/* Duration badge */}
      <Badge variant="secondary" className="shrink-0 text-[10px]">
        {formatDuration(note.sessionDuration)}
      </Badge>

      {/* Status chip */}
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
          statusStyle.bg,
          statusStyle.text
        )}
      >
        {statusStyle.icon && (
          <MaterialIcon icon={statusStyle.icon} size="xs" />
        )}
        {note.status}
      </span>
    </Link>
  );
```

- [ ] **Step 2: Verify the app compiles**

Run: `npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds (or `npx tsc --noEmit` passes)

- [ ] **Step 3: Commit**

---

## Task 3: Late-Signature Info Banner in Session Note Editor

**Files:**
- Modify: `src/features/session-notes/components/session-note-editor.tsx:1-14` (imports)
- Modify: `src/features/session-notes/components/session-note-editor.tsx:320-345` (header area)

- [ ] **Step 1: Add import for late-signature utils**

In `src/features/session-notes/components/session-note-editor.tsx`, add at the end of the existing imports (after line 29, the `StructuredDataForm` import block):

```typescript
import {
  getSignatureDelayDays,
  isLateSignature,
} from "../lib/session-utils";
```

- [ ] **Step 2: Add late-signature info banner after the header**

Replace the header block (lines 322-344, from `{/* Header */}` through the closing `</div>` of the header):

```typescript
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3">
        <Link
          href={`/patients/${patientId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
        >
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to patient
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            {noteId ? "Edit Session Note" : "New Session Note"}
          </h1>

          {isSigned && (
            <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
              <MaterialIcon icon="verified" size="xs" />
              Signed
            </div>
          )}
        </div>

        {/* Late-signature warning banner */}
        {isSigned &&
          existingNote &&
          isLateSignature(existingNote.signedAt, existingNote.sessionDate) && (
            <div className="flex items-center gap-2 rounded-lg bg-caution-container/50 px-4 py-2.5 text-sm text-on-caution-container">
              <MaterialIcon icon="warning" size="sm" />
              <span>
                This note was signed{" "}
                <span className="font-semibold">
                  {getSignatureDelayDays(existingNote.signedAt, existingNote.sessionDate)} days
                </span>{" "}
                after the session date. Medicare and most payers expect same-day signatures.
              </span>
            </div>
          )}
      </div>
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

---

## Task 4: Schema — Add Group Session Fields to sessionNotes

**Files:**
- Modify: `convex/schema.ts:253-299` (sessionNotes table)

- [ ] **Step 1: Add groupSessionId and groupPatientIds to sessionNotes schema**

In `convex/schema.ts`, replace the `sessionNotes` table definition (lines 253-299):

```typescript
  sessionNotes: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    sessionDate: v.string(),
    sessionDuration: v.number(),
    sessionType: v.union(
      v.literal("in-person"),
      v.literal("teletherapy"),
      v.literal("parent-consultation")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("in-progress"),
      v.literal("complete"),
      v.literal("signed")
    ),
    structuredData: v.object({
      targetsWorkedOn: v.array(v.object({
        target: v.string(),
        goalId: v.optional(v.string()),
        trials: v.optional(v.number()),
        correct: v.optional(v.number()),
        promptLevel: v.optional(v.union(
          v.literal("independent"),
          v.literal("verbal-cue"),
          v.literal("model"),
          v.literal("physical")
        )),
        notes: v.optional(v.string()),
      })),
      behaviorNotes: v.optional(v.string()),
      parentFeedback: v.optional(v.string()),
      homeworkAssigned: v.optional(v.string()),
      nextSessionFocus: v.optional(v.string()),
    }),
    soapNote: v.optional(v.object({
      subjective: v.string(),
      objective: v.string(),
      assessment: v.string(),
      plan: v.string(),
    })),
    aiGenerated: v.boolean(),
    signedAt: v.optional(v.number()),
    meetingRecordId: v.optional(v.id("meetingRecords")),
    // Group session fields (CPT 92508)
    groupSessionId: v.optional(v.string()),
    groupPatientIds: v.optional(v.array(v.id("patients"))),
  })
    .index("by_patientId_sessionDate", ["patientId", "sessionDate"])
    .index("by_slpUserId", ["slpUserId"])
    .index("by_groupSessionId", ["groupSessionId"]),
```

- [ ] **Step 2: Run `npx convex dev --once` to verify schema pushes**

Run: `npx convex dev --typecheck-only`
Expected: No errors

- [ ] **Step 3: Commit**

---

## Task 5: Schema — Add Audience Field to progressReports

**Files:**
- Modify: `convex/schema.ts:435-482` (progressReports table)

- [ ] **Step 1: Add audience field to progressReports schema**

In `convex/schema.ts`, in the `progressReports` table definition, add the `audience` field after `signedAt` (before the closing `})` of the table):

Replace:
```typescript
    signedAt: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_reportType", ["patientId", "reportType"]),
```

With:
```typescript
    signedAt: v.optional(v.number()),
    audience: v.optional(v.union(
      v.literal("clinical"),
      v.literal("parent"),
      v.literal("iep-team")
    )),
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_reportType", ["patientId", "reportType"]),
```

- [ ] **Step 2: Verify schema compiles**

Run: `npx convex dev --typecheck-only`
Expected: No errors

- [ ] **Step 3: Commit**

---

## Task 6: Backend — Group Session createGroup Mutation

**Files:**
- Modify: `convex/sessionNotes.ts:1-438` (add createGroup mutation)
- Test: `convex/__tests__/sessionNotes.test.ts`

- [ ] **Step 1: Write the failing test for createGroup**

Append to `convex/__tests__/sessionNotes.test.ts`:

```typescript
// ── createGroup ────────────────────────────────────────────────────────────

describe("sessionNotes.createGroup", () => {
  it("creates one note per patient with shared groupSessionId", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    // Create 3 patients
    const { patientId: p1 } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Patient",
      lastName: "One",
    });
    const { patientId: p2 } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Patient",
      lastName: "Two",
    });
    const { patientId: p3 } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Patient",
      lastName: "Three",
    });

    const noteIds = await t.mutation(api.sessionNotes.createGroup, {
      patientIds: [p1, p2, p3],
      sessionDate: today,
      sessionDuration: 45,
      sessionType: "in-person" as const,
      structuredData: {
        targetsWorkedOn: [
          { target: "Group activity: turn-taking" },
        ],
      },
    });

    expect(noteIds).toHaveLength(3);

    // All notes share the same groupSessionId
    const note1 = await t.query(api.sessionNotes.get, { noteId: noteIds[0] });
    const note2 = await t.query(api.sessionNotes.get, { noteId: noteIds[1] });
    const note3 = await t.query(api.sessionNotes.get, { noteId: noteIds[2] });

    expect(note1!.groupSessionId).toBeDefined();
    expect(note1!.groupSessionId).toBe(note2!.groupSessionId);
    expect(note2!.groupSessionId).toBe(note3!.groupSessionId);

    // Each note has groupPatientIds listing all 3 patients
    expect(note1!.groupPatientIds).toEqual(expect.arrayContaining([p1, p2, p3]));
    expect(note1!.groupPatientIds).toHaveLength(3);

    // Each note has correct patientId
    expect(note1!.patientId).toBe(p1);
    expect(note2!.patientId).toBe(p2);
    expect(note3!.patientId).toBe(p3);

    // Shared structured data is copied to each
    expect(note1!.structuredData.targetsWorkedOn[0].target).toBe("Group activity: turn-taking");
    expect(note2!.structuredData.targetsWorkedOn[0].target).toBe("Group activity: turn-taking");
  });

  it("rejects fewer than 2 patients", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId: p1 } = await t.mutation(api.patients.create, VALID_PATIENT);

    await expect(
      t.mutation(api.sessionNotes.createGroup, {
        patientIds: [p1],
        sessionDate: today,
        sessionDuration: 30,
        sessionType: "in-person" as const,
        structuredData: { targetsWorkedOn: [{ target: "Test" }] },
      }),
    ).rejects.toThrow("2");
  });

  it("rejects more than 6 patients", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const patientIds = [];
    for (let i = 0; i < 7; i++) {
      const { patientId } = await t.mutation(api.patients.create, {
        ...VALID_PATIENT,
        firstName: `Patient`,
        lastName: `${i}`,
      });
      patientIds.push(patientId);
    }

    await expect(
      t.mutation(api.sessionNotes.createGroup, {
        patientIds,
        sessionDate: today,
        sessionDuration: 30,
        sessionType: "in-person" as const,
        structuredData: { targetsWorkedOn: [{ target: "Test" }] },
      }),
    ).rejects.toThrow("6");
  });

  it("rejects when SLP does not own a patient", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const slp2 = base.withIdentity(OTHER_SLP);

    const { patientId: ownedPatient } = await slp1.mutation(api.patients.create, VALID_PATIENT);
    const { patientId: otherPatient } = await slp2.mutation(api.patients.create, {
      ...VALID_PATIENT,
      firstName: "Other",
      lastName: "Patient",
    });

    await expect(
      slp1.mutation(api.sessionNotes.createGroup, {
        patientIds: [ownedPatient, otherPatient],
        sessionDate: today,
        sessionDuration: 30,
        sessionType: "in-person" as const,
        structuredData: { targetsWorkedOn: [{ target: "Test" }] },
      }),
    ).rejects.toThrow("Not authorized");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/sessionNotes.test.ts`
Expected: FAIL with "api.sessionNotes.createGroup is not a function" or similar

- [ ] **Step 3: Implement createGroup mutation**

In `convex/sessionNotes.ts`, add after the `create` mutation (after line 228, before the `update` mutation):

```typescript
export const createGroup = slpMutation({
  args: {
    patientIds: v.array(v.id("patients")),
    sessionDate: v.string(),
    sessionDuration: v.number(),
    sessionType: sessionTypeValidator,
    structuredData: structuredDataValidator,
  },
  handler: async (ctx, args) => {
    if (args.patientIds.length < 2) {
      throw new ConvexError("Group sessions require at least 2 patients");
    }
    if (args.patientIds.length > 6) {
      throw new ConvexError("Group sessions allow a maximum of 6 patients");
    }

    // Verify the SLP owns all patients
    for (const pid of args.patientIds) {
      const patient = await ctx.db.get(pid);
      if (!patient) throw new ConvexError("Patient not found");
      if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    }

    validateSessionDate(args.sessionDate);
    validateSessionDuration(args.sessionDuration);
    validateTargets(args.structuredData.targetsWorkedOn);

    // Generate a shared group session ID
    const groupSessionId = crypto.randomUUID();
    const now = Date.now();

    const noteIds = [];
    for (const pid of args.patientIds) {
      const noteId = await ctx.db.insert("sessionNotes", {
        patientId: pid,
        slpUserId: ctx.slpUserId,
        sessionDate: args.sessionDate,
        sessionDuration: args.sessionDuration,
        sessionType: args.sessionType,
        status: "draft",
        structuredData: args.structuredData,
        aiGenerated: false,
        groupSessionId,
        groupPatientIds: args.patientIds,
      });
      noteIds.push(noteId);

      await ctx.db.insert("activityLog", {
        patientId: pid,
        actorUserId: ctx.slpUserId,
        action: "session-documented",
        details: `Created group session note for ${args.sessionDate} (${args.patientIds.length} patients)`,
        timestamp: now,
      });
    }

    return noteIds;
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/sessionNotes.test.ts`
Expected: PASS (all tests including new createGroup tests)

- [ ] **Step 5: Commit**

---

## Task 7: Backend — progressReports.create Accept Audience Param

**Files:**
- Modify: `convex/progressReports.ts:76-101` (create mutation)
- Test: `convex/__tests__/progressReports.test.ts`

- [ ] **Step 1: Write the failing test for audience on create**

Append to `convex/__tests__/progressReports.test.ts`:

```typescript
describe("progressReports audience", () => {
  it("stores audience when provided", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);

    const reportId = await t.mutation(api.progressReports.create, {
      patientId,
      reportType: "weekly-summary" as const,
      periodStart: "2026-03-21",
      periodEnd: "2026-03-28",
      goalSummaries: [VALID_GOAL_SUMMARY],
      overallNarrative: "Good progress.",
      audience: "parent" as const,
    });

    const report = await t.query(api.progressReports.get, { reportId });
    expect(report.audience).toBe("parent");
  });

  it("defaults to undefined when audience is omitted (backward compat)", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);
    const report = await t.query(api.progressReports.get, { reportId });
    expect(report.audience).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/progressReports.test.ts`
Expected: FAIL — `audience` arg not accepted by create mutation

- [ ] **Step 3: Add audience arg to create mutation**

In `convex/progressReports.ts`, add an audience validator at the top (after line 34, after `reportTypeValidator`):

```typescript
const audienceValidator = v.optional(v.union(
  v.literal("clinical"),
  v.literal("parent"),
  v.literal("iep-team")
));
```

Then modify the `create` mutation args (line 83) to add `audience`:

Replace:
```typescript
export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    reportType: reportTypeValidator,
    periodStart: v.string(),
    periodEnd: v.string(),
    goalSummaries: v.array(goalSummaryValidator),
    overallNarrative: v.string(),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db.insert("progressReports", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      reportType: args.reportType,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      goalSummaries: args.goalSummaries,
      overallNarrative: args.overallNarrative,
      status: "draft",
    });
  },
});
```

With:
```typescript
export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    reportType: reportTypeValidator,
    periodStart: v.string(),
    periodEnd: v.string(),
    goalSummaries: v.array(goalSummaryValidator),
    overallNarrative: v.string(),
    audience: audienceValidator,
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db.insert("progressReports", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      reportType: args.reportType,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      goalSummaries: args.goalSummaries,
      overallNarrative: args.overallNarrative,
      status: "draft",
      audience: args.audience,
    });
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/progressReports.test.ts`
Expected: PASS (all tests including new audience tests)

- [ ] **Step 5: Commit**

---

## Task 8: Multi-Audience Prompt Variants

**Files:**
- Modify: `src/features/goals/lib/progress-prompt.ts:30-115` (buildReportPrompt)

- [ ] **Step 1: Add audience parameter to buildReportPrompt**

In `src/features/goals/lib/progress-prompt.ts`, replace the `buildReportPrompt` function signature and the `reportTypeInstructions` block (lines 30-45):

Replace:
```typescript
export function buildReportPrompt(
  patient: PatientContext,
  goals: GoalWithData[],
  reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report",
  periodStart: string,
  periodEnd: string,
  previousNarrative?: string,
): string {
  const reportTypeInstructions: Record<string, string> = {
    "weekly-summary":
      "Write a brief, conversational but professional weekly summary. Highlight wins, note any concerns, and suggest focus areas for next week.",
    "monthly-summary":
      "Write a moderately detailed monthly summary. Include per-goal progress analysis, overall trends, and recommendations for the coming month.",
    "iep-progress-report":
      "Write a formal IEP progress report using educational language. Reference measurable criteria from goal statements. Use phrases appropriate for school district documentation. Note progress toward benchmarks with specific data.",
  };
```

With:
```typescript
export type ReportAudience = "clinical" | "parent" | "iep-team";

export function buildReportPrompt(
  patient: PatientContext,
  goals: GoalWithData[],
  reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report",
  periodStart: string,
  periodEnd: string,
  previousNarrative?: string,
  audience?: ReportAudience,
): string {
  const reportTypeInstructions: Record<string, string> = {
    "weekly-summary":
      "Write a brief, conversational but professional weekly summary. Highlight wins, note any concerns, and suggest focus areas for next week.",
    "monthly-summary":
      "Write a moderately detailed monthly summary. Include per-goal progress analysis, overall trends, and recommendations for the coming month.",
    "iep-progress-report":
      "Write a formal IEP progress report using educational language. Reference measurable criteria from goal statements. Use phrases appropriate for school district documentation. Note progress toward benchmarks with specific data.",
  };

  const audienceInstructions: Record<ReportAudience, string> = {
    clinical:
      "Write for a clinical audience: use formal medical/SLP terminology, include standard scores where relevant, justify medical necessity, and reference clinician credentials. This is for insurance documentation and clinical records.",
    parent:
      "Write for a parent/caregiver audience: use plain, everyday language with no medical jargon. Celebrate progress warmly, explain goals in accessible terms, describe next steps clearly, and suggest home practice activities. Be encouraging but honest.",
    "iep-team":
      "Write for an IEP/educational team audience: use IDEA-aligned educational language, frame progress in terms of educational access and classroom participation, reference academic impact, and tie goals to curriculum standards where applicable.",
  };
```

Then after the line `${reportTypeInstructions[reportType]}` (around the prompt assembly area), add the audience instruction. Replace:

```typescript
  prompt += `\n\n## Report Period: ${periodStart} to ${periodEnd}
## Report Type: ${reportType}

${reportTypeInstructions[reportType]}

## Goals\n`;
```

With:
```typescript
  prompt += `\n\n## Report Period: ${periodStart} to ${periodEnd}
## Report Type: ${reportType}

${reportTypeInstructions[reportType]}
${audience ? `\n## Audience\n${audienceInstructions[audience]}` : ""}

## Goals\n`;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

---

## Task 9: SSE Route — Accept and Pass Audience Parameter

**Files:**
- Modify: `src/app/api/generate-report/route.ts:6-11` (Zod schema)
- Modify: `src/app/api/generate-report/route.ts:113-121` (prompt builder call)
- Modify: `src/app/api/generate-report/route.ts:178-185` (convex mutation call)

- [ ] **Step 1: Add audience to the Zod schema**

In `src/app/api/generate-report/route.ts`, replace the `ReportInputSchema` (lines 6-11):

Replace:
```typescript
const ReportInputSchema = z.object({
  patientId: z.string().min(1),
  reportType: z.enum(["weekly-summary", "monthly-summary", "iep-progress-report"]),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

With:
```typescript
const ReportInputSchema = z.object({
  patientId: z.string().min(1),
  reportType: z.enum(["weekly-summary", "monthly-summary", "iep-progress-report"]),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  audience: z.enum(["clinical", "parent", "iep-team"]).optional(),
});
```

- [ ] **Step 2: Extract audience from parsed body and pass to prompt builder**

Replace the destructuring line (line 62):

Replace:
```typescript
  const { patientId, reportType, periodStart, periodEnd } = parsedBody.data;
```

With:
```typescript
  const { patientId, reportType, periodStart, periodEnd, audience } = parsedBody.data;
```

Replace the `buildReportPrompt` call (lines 113-120):

Replace:
```typescript
  const systemPrompt = buildReportPrompt(
    patient,
    goalsWithData,
    reportType,
    periodStart,
    periodEnd,
    previousNarrative,
  );
```

With:
```typescript
  const systemPrompt = buildReportPrompt(
    patient,
    goalsWithData,
    reportType,
    periodStart,
    periodEnd,
    previousNarrative,
    audience,
  );
```

- [ ] **Step 3: Pass audience to the Convex mutation**

Replace the `convex.mutation` call (lines 178-185):

Replace:
```typescript
          const reportId = await convex.mutation(api.progressReports.create, {
            patientId: pid,
            reportType,
            periodStart,
            periodEnd,
            goalSummaries,
            overallNarrative: parsed.overallNarrative,
          });
```

With:
```typescript
          const reportId = await convex.mutation(api.progressReports.create, {
            patientId: pid,
            reportType,
            periodStart,
            periodEnd,
            goalSummaries,
            overallNarrative: parsed.overallNarrative,
            audience,
          });
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

---

## Task 10: Frontend — Audience Selector in Progress Report Generator

**Files:**
- Modify: `src/features/goals/components/progress-report-generator.tsx:56-159`
- Modify: `src/features/goals/hooks/use-report-generation.ts:36-42` (generate args)

- [ ] **Step 1: Add audience to the generate hook args**

In `src/features/goals/hooks/use-report-generation.ts`, replace the `generate` callback args type (lines 38-42):

Replace:
```typescript
    async (args: {
      patientId: string;
      reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report";
      periodStart: string;
      periodEnd: string;
    }) => {
```

With:
```typescript
    async (args: {
      patientId: string;
      reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report";
      periodStart: string;
      periodEnd: string;
      audience?: "clinical" | "parent" | "iep-team";
    }) => {
```

- [ ] **Step 2: Add audience state and radio group to the generator component**

In `src/features/goals/components/progress-report-generator.tsx`, add the audience state after the `periodEnd` state (after line 64):

Replace:
```typescript
  const [periodEnd, setPeriodEnd] = useState(period.end);

  const { status, streamedText, reportId, error, generate, reset } = useReportGeneration();
```

With:
```typescript
  const [periodEnd, setPeriodEnd] = useState(period.end);
  const [audience, setAudience] = useState<"clinical" | "parent" | "iep-team">("clinical");

  const { status, streamedText, reportId, error, generate, reset } = useReportGeneration();
```

Add the `RadioGroup` import. Replace the existing imports from `@/shared/components/ui/radio-group` — actually, the file does not import RadioGroup yet. Add it after the Label import (line 8):

Replace:
```typescript
import { Label } from "@/shared/components/ui/label";
```

With:
```typescript
import { Label } from "@/shared/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/shared/components/ui/radio-group";
```

Pass audience in the generate call. Replace the `handleGenerate` function (lines 75-82):

Replace:
```typescript
  async function handleGenerate() {
    await generate({
      patientId: patientId as string,
      reportType,
      periodStart,
      periodEnd,
    });
  }
```

With:
```typescript
  async function handleGenerate() {
    await generate({
      patientId: patientId as string,
      reportType,
      periodStart,
      periodEnd,
      audience,
    });
  }
```

Add the audience radio group in the form. After the period inputs grid and before the error display, insert the audience selector. Replace:

```typescript
            </div>

            {error && (
```

With:
```typescript
            </div>

            <div className="flex flex-col gap-2">
              <Label>Audience</Label>
              <RadioGroup
                value={audience}
                onValueChange={(v) => setAudience(v as "clinical" | "parent" | "iep-team")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="clinical" id="audience-clinical" />
                  <Label htmlFor="audience-clinical" className="text-sm font-normal">
                    Clinical
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="parent" id="audience-parent" />
                  <Label htmlFor="audience-parent" className="text-sm font-normal">
                    Parent-Friendly
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="iep-team" id="audience-iep" />
                  <Label htmlFor="audience-iep" className="text-sm font-normal">
                    IEP Team
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {error && (
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

---

## Task 11: Frontend — Audience Badge on Progress Report Viewer

**Files:**
- Modify: `src/features/goals/components/progress-report-viewer.tsx:60-74`

- [ ] **Step 1: Add audience badge to report header**

In `src/features/goals/components/progress-report-viewer.tsx`, replace the report header block (lines 61-74):

Replace:
```typescript
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <p className="text-sm font-medium capitalize">
            {report.reportType.replace(/-/g, " ")}
          </p>
          <p className="text-xs text-muted-foreground">
            {report.periodStart} to {report.periodEnd}
          </p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeColor(report.status))}>
          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
        </span>
      </div>
```

With:
```typescript
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium capitalize">
              {report.reportType.replace(/-/g, " ")}
            </p>
            {report.audience && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {report.audience === "clinical"
                  ? "Clinical"
                  : report.audience === "parent"
                    ? "Parent-Friendly"
                    : "IEP Team"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {report.periodStart} to {report.periodEnd}
          </p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeColor(report.status))}>
          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
        </span>
      </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

---

## Task 12: Frontend — Group Patient Picker Component

**Files:**
- Create: `src/features/session-notes/components/group-patient-picker.tsx`

- [ ] **Step 1: Create the group patient picker component**

Create `src/features/session-notes/components/group-patient-picker.tsx`:

```typescript
"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface GroupPatientPickerProps {
  selectedIds: Id<"patients">[];
  excludePatientId?: Id<"patients">;
  onSelectionChange: (ids: Id<"patients">[]) => void;
  disabled?: boolean;
}

const MIN_GROUP_SIZE = 2;
const MAX_GROUP_SIZE = 6;

export function GroupPatientPicker({
  selectedIds,
  excludePatientId,
  onSelectionChange,
  disabled,
}: GroupPatientPickerProps) {
  const { isAuthenticated } = useConvexAuth();
  const patients = useQuery(
    api.patients.list,
    isAuthenticated ? { status: "active" } : "skip",
  );

  if (!patients) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Loading patients...
      </p>
    );
  }

  const available = excludePatientId
    ? patients.filter((p) => p._id !== excludePatientId)
    : patients;

  function togglePatient(id: Id<"patients">) {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else if (selectedIds.length < MAX_GROUP_SIZE) {
      onSelectionChange([...selectedIds, id]);
    }
  }

  const atMax = selectedIds.length >= MAX_GROUP_SIZE;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Select patients ({MIN_GROUP_SIZE}-{MAX_GROUP_SIZE})
        </p>
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} selected
        </p>
      </div>

      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-2">
        {available.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No active patients found
          </p>
        ) : (
          available.map((patient) => {
            const isSelected = selectedIds.includes(patient._id);
            const isDisabledItem = disabled || (!isSelected && atMax);
            return (
              <button
                key={patient._id}
                type="button"
                disabled={isDisabledItem}
                onClick={() => togglePatient(patient._id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-200",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted",
                  isDisabledItem && !isSelected && "cursor-not-allowed opacity-50",
                )}
              >
                <MaterialIcon
                  icon={isSelected ? "check_box" : "check_box_outline_blank"}
                  size="sm"
                  className={isSelected ? "text-primary" : "text-muted-foreground"}
                />
                <span>
                  {patient.firstName} {patient.lastName}
                </span>
              </button>
            );
          })
        )}
      </div>

      {selectedIds.length > 0 && selectedIds.length < MIN_GROUP_SIZE && (
        <p className="text-xs text-caution">
          Select at least {MIN_GROUP_SIZE} patients for a group session
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

---

## Task 13: Frontend — Group Mode Toggle in Session Note Editor

**Files:**
- Modify: `src/features/session-notes/components/session-note-editor.tsx`
- Modify: `src/features/session-notes/hooks/use-session-notes.ts`

- [ ] **Step 1: Add useCreateGroupSessionNote hook**

Append to `src/features/session-notes/hooks/use-session-notes.ts`:

```typescript
export function useCreateGroupSessionNote() {
  return useMutation(api.sessionNotes.createGroup);
}
```

- [ ] **Step 2: Add group mode to session note editor**

In `src/features/session-notes/components/session-note-editor.tsx`, add the imports for the group picker and the new hook. After the existing `useDeleteSessionNote` is not imported, but after the `use-session-notes` imports (line 22), add:

Replace:
```typescript
import {
  useCreateSessionNote,
  useSessionNote,
  useSignSessionNote,
  useUnsignSessionNote,
  useUpdateSessionNote,
  useUpdateSessionNoteStatus,
  useUpdateSoap,
} from "../hooks/use-session-notes";
```

With:
```typescript
import {
  useCreateGroupSessionNote,
  useCreateSessionNote,
  useSessionNote,
  useSignSessionNote,
  useUnsignSessionNote,
  useUpdateSessionNote,
  useUpdateSessionNoteStatus,
  useUpdateSoap,
} from "../hooks/use-session-notes";
import { GroupPatientPicker } from "./group-patient-picker";
```

Add the group mode state and mutation. After line 66 (`const soap = useSoapGeneration();`), add:

Replace:
```typescript
  // ── SOAP generation ────────────────────────────────────────────────────────
  const soap = useSoapGeneration();

  // ── Local form state ───────────────────────────────────────────────────────
```

With:
```typescript
  // ── SOAP generation ────────────────────────────────────────────────────────
  const soap = useSoapGeneration();
  const createGroupNote = useCreateGroupSessionNote();

  // ── Group session state ────────────────────────────────────────────────────
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupPatientIds, setGroupPatientIds] = useState<
    import("../../../../convex/_generated/dataModel").Id<"patients">[]
  >([]);

  // ── Local form state ───────────────────────────────────────────────────────
```

Add the group mode toggle and picker to the form. In the return JSX, after the `{/* Two-column layout */}` comment and before `<StructuredDataForm`, insert the group mode UI. Replace:

```typescript
        <div className="flex flex-col gap-4">
          <StructuredDataForm
```

With:
```typescript
        <div className="flex flex-col gap-4">
          {/* Group/Individual mode toggle — only in create mode */}
          {!noteId && (
            <div className="flex flex-col gap-3 rounded-xl bg-surface-container/30 p-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setIsGroupMode(false); setGroupPatientIds([]); }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-300",
                    !isGroupMode
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  <MaterialIcon icon="person" size="xs" />
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setIsGroupMode(true)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-300",
                    isGroupMode
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  <MaterialIcon icon="group" size="xs" />
                  Group (CPT 92508)
                </button>
              </div>

              {isGroupMode && (
                <GroupPatientPicker
                  selectedIds={groupPatientIds}
                  excludePatientId={typedPatientId}
                  onSelectionChange={setGroupPatientIds}
                  disabled={isSigned}
                />
              )}
            </div>
          )}

          <StructuredDataForm
```

Finally, modify the `doSave` function to handle group creation. In the `doSave` callback, replace the `else` branch (the create path, around lines 136-148):

Replace:
```typescript
        } else {
          const newId = await createNote({
            patientId: typedPatientId,
            sessionDate: date,
            sessionDuration: duration,
            sessionType: type,
            structuredData: data,
          });
          setCurrentNoteId(newId);
          // Update URL to include the new note ID without a full navigation
          router.replace(
            `/patients/${patientId}/sessions/${newId}`
          );
        }
```

With:
```typescript
        } else if (isGroupMode && groupPatientIds.length >= 2) {
          // Group mode: include the current patient + selected group patients
          const allPatientIds = [typedPatientId, ...groupPatientIds.filter(
            (id) => id !== typedPatientId,
          )];
          const noteIds = await createGroupNote({
            patientIds: allPatientIds,
            sessionDate: date,
            sessionDuration: duration,
            sessionType: type,
            structuredData: data,
          });
          // Navigate to the first note (for the current patient)
          const firstNoteId = noteIds[0];
          setCurrentNoteId(firstNoteId);
          router.replace(`/patients/${patientId}/sessions/${firstNoteId}`);
          toast.success(`Created group session notes for ${allPatientIds.length} patients`);
        } else {
          const newId = await createNote({
            patientId: typedPatientId,
            sessionDate: date,
            sessionDuration: duration,
            sessionType: type,
            structuredData: data,
          });
          setCurrentNoteId(newId);
          router.replace(
            `/patients/${patientId}/sessions/${newId}`
          );
        }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

---

## Task 14: Frontend — Group Badge on Session Notes List

**Files:**
- Modify: `src/features/session-notes/components/session-note-card.tsx:60-68`

- [ ] **Step 1: Add group badge to session note card**

In `src/features/session-notes/components/session-note-card.tsx`, add a group badge indicator. After the `accuracy` calculation (around line 66) and before the `return`, add:

Replace:
```typescript
  const accuracy = firstTarget
    ? calculateAccuracy(firstTarget.correct, firstTarget.trials)
    : null;

  const isLate = isLateSignature(note.signedAt, note.sessionDate);
```

With:
```typescript
  const accuracy = firstTarget
    ? calculateAccuracy(firstTarget.correct, firstTarget.trials)
    : null;
  const isGroup = !!note.groupSessionId;
  const groupSize = note.groupPatientIds?.length ?? 0;

  const isLate = isLateSignature(note.signedAt, note.sessionDate);
```

Then, after the type icon div and before the content div, insert a group badge. Replace:

```typescript
      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {firstTarget?.target ?? "No targets recorded"}
```

With:
```typescript
      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {firstTarget?.target ?? "No targets recorded"}
          </p>
          {isGroup && (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-info-container px-1.5 py-0.5 text-[10px] font-medium text-on-info-container">
              <MaterialIcon icon="group" size="xs" />
              {groupSize}
            </span>
          )}
```

Note: This requires removing the duplicate closing of the accuracy line. The full corrected content div should be:

```typescript
      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {firstTarget?.target ?? "No targets recorded"}
          </p>
          {isGroup && (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-info-container px-1.5 py-0.5 text-[10px] font-medium text-on-info-container">
              <MaterialIcon icon="group" size="xs" />
              {groupSize}
            </span>
          )}
          {accuracy !== null && (
            <span className={cn("text-xs font-medium", accuracyColor(accuracy))}>
              {accuracyLabel(accuracy)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatSessionDate(note.sessionDate)}
        </p>
      </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

---

## Task 15: Frontend — Physician Signature Display on Progress Reports

**Files:**
- Modify: `src/features/goals/components/progress-report-viewer.tsx:23-30` (add hook)
- Modify: `src/features/goals/components/progress-report-viewer.tsx:139-145` (add display)

This feature depends on SP2's `plansOfCare` table. If the table doesn't exist yet, the query returns `undefined` and we show "Not on file" gracefully.

- [ ] **Step 1: Create a safe query hook for plan of care physician signature**

First, check if `plansOfCare` exists. If SP2 hasn't been implemented yet, create a placeholder hook that returns `undefined`. Add after the existing imports in `progress-report-viewer.tsx`:

Replace:
```typescript
import {
  useMarkReportReviewed,
  useReport,
  useSignReport,
  useUnsignReport,
  useUpdateReportNarrative,
} from "../hooks/use-report-generation";
```

With:
```typescript
import {
  useMarkReportReviewed,
  useReport,
  useSignReport,
  useUnsignReport,
  useUpdateReportNarrative,
} from "../hooks/use-report-generation";

// Physician signature data from Plan of Care (SP2 dependency).
// Returns undefined if plansOfCare table does not exist yet.
interface PhysicianSigInfo {
  onFile: boolean;
  physicianName?: string;
  signatureDate?: string;
}
function usePhysicianSignature(_patientId: Id<"patients">): PhysicianSigInfo | undefined {
  // SP2 dependency: plansOfCare table may not exist yet.
  // When SP2 is implemented, replace this with:
  //   const poc = useQuery(api.plansOfCare.getActive, { patientId });
  //   if (!poc) return undefined;
  //   return {
  //     onFile: poc.physicianSignatureOnFile ?? false,
  //     physicianName: poc.physicianName,
  //     signatureDate: poc.physicianSignatureDate,
  //   };
  return undefined;
}
```

- [ ] **Step 2: Add physician signature display to the report viewer**

In `progress-report-viewer.tsx`, after the `const [saving, setSaving]` line, add:

Replace:
```typescript
  const [saving, setSaving] = useState(false);

  if (!report) {
```

With:
```typescript
  const [saving, setSaving] = useState(false);
  const physicianSig = report ? usePhysicianSignature(report.patientId) : undefined;

  if (!report) {
```

Then, before the print footer div (the `<div className="hidden print:block` block), insert the physician signature section:

Replace:
```typescript
      <div className="hidden print:block print:mt-8 print:border-t print:pt-4">
        <p className="text-xs text-muted-foreground">
          Generated by Bridges | {new Date().toLocaleDateString()}
        </p>
      </div>
```

With:
```typescript
      {/* Physician signature status */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-4 py-3 print:break-inside-avoid">
        <MaterialIcon
          icon={physicianSig?.onFile ? "verified" : "pending"}
          size="sm"
          className={physicianSig?.onFile ? "text-success" : "text-muted-foreground"}
        />
        <div className="flex flex-col">
          {physicianSig?.onFile ? (
            <>
              <p className="text-sm font-medium text-foreground">
                Physician signature on file
              </p>
              {physicianSig.physicianName && (
                <p className="text-xs text-muted-foreground">
                  {physicianSig.physicianName}
                  {physicianSig.signatureDate && ` - Signed ${physicianSig.signatureDate}`}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Physician signature: Not on file
            </p>
          )}
        </div>
      </div>

      <div className="hidden print:block print:mt-8 print:border-t print:pt-4">
        <p className="text-xs text-muted-foreground">
          Generated by Bridges | {new Date().toLocaleDateString()}
        </p>
      </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

---

## Task 16: Run Full Test Suite

**Files:** None (verification only)

- [ ] **Step 1: Run all Convex backend tests**

Run: `npx vitest run convex/__tests__/sessionNotes.test.ts convex/__tests__/progressReports.test.ts`
Expected: PASS (all tests)

- [ ] **Step 2: Run all frontend tests**

Run: `npx vitest run src/features/session-notes/__tests__/session-utils.test.ts`
Expected: PASS (all tests)

- [ ] **Step 3: Run full project test suite**

Run: `npm test`
Expected: PASS (all 636+ tests)

- [ ] **Step 4: Final commit (if any fixes were needed)**

---

## Task Summary

| Task | Description | Type | Files | Estimated Time |
|------|-------------|------|-------|----------------|
| 1 | Late-signature detection utility (TDD) | Backend util + test | 2 | 5 min |
| 2 | Late-signature badge on session note card | Frontend | 1 | 3 min |
| 3 | Late-signature info banner in editor | Frontend | 1 | 3 min |
| 4 | Schema: group session fields on sessionNotes | Schema | 1 | 2 min |
| 5 | Schema: audience field on progressReports | Schema | 1 | 2 min |
| 6 | Backend: createGroup mutation (TDD) | Backend + test | 2 | 10 min |
| 7 | Backend: progressReports.create accept audience (TDD) | Backend + test | 2 | 5 min |
| 8 | Multi-audience prompt variants | Backend | 1 | 5 min |
| 9 | SSE route: accept and pass audience param | API route | 1 | 3 min |
| 10 | Audience selector in report generator | Frontend + hook | 2 | 5 min |
| 11 | Audience badge on report viewer | Frontend | 1 | 3 min |
| 12 | Group patient picker component | Frontend (new) | 1 | 5 min |
| 13 | Group mode toggle in session note editor | Frontend + hook | 2 | 8 min |
| 14 | Group badge on session notes list | Frontend | 1 | 3 min |
| 15 | Physician signature display on reports | Frontend | 1 | 5 min |
| 16 | Run full test suite | Verification | 0 | 5 min |
| **Total** | | | **20 files** | **~72 min** |
