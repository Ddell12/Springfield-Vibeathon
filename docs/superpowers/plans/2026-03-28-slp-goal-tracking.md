# IEP Goal Tracking & Progress Measurement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add IEP goal tracking with measurable criteria, automatic progress calculation from signed session notes, and AI-synthesized progress reports.

**Architecture:** New feature slice `src/features/goals/` alongside existing `src/features/patients/` and `src/features/session-notes/`. Three new Convex tables (`goals`, `progressData`, `progressReports`), one new API route (`/api/generate-report`), shared progress helpers in `convex/lib/progress.ts`, and integration into the patient detail page + session note sign flow.

**Tech Stack:** Next.js 16 (App Router), Convex (backend), Clerk v7 (auth), Claude Sonnet via `@anthropic-ai/sdk` (report generation), Recharts (charts), shadcn/ui, Tailwind v4, Vitest + convex-test + Playwright

**Spec:** `docs/superpowers/specs/2026-03-28-slp-goal-tracking-design.md`

---

## File Map

### New files — Convex backend
| File | Responsibility |
|---|---|
| `convex/goals.ts` | Goal CRUD: list, listActive, get, getWithProgress, create, update, remove |
| `convex/progressData.ts` | Progress data queries + manual entry: listByGoal, listByPatient, createManual |
| `convex/progressReports.ts` | Report CRUD + sign workflow: list, get, create, updateNarrative, markReviewed, sign, unsign |
| `convex/lib/progress.ts` | Shared helpers: calculateStreak, detectTrend, checkGoalMet, insertProgressFromTargets |
| `convex/__tests__/goals.test.ts` | Unit tests for goals CRUD, validation, auth |
| `convex/__tests__/progressData.test.ts` | Unit tests for progress data queries and manual entry |
| `convex/__tests__/progressReports.test.ts` | Unit tests for report sign/unsign state machine |
| `convex/__tests__/progress.test.ts` | Unit tests for progress helper functions |

### New files — API route
| File | Responsibility |
|---|---|
| `src/app/api/generate-report/route.ts` | SSE streaming endpoint: fetches context, calls Claude, streams report, persists draft |

### New files — Frontend feature slice
| File | Responsibility |
|---|---|
| `src/features/goals/lib/goal-bank-data.ts` | Static array of common IEP goal templates by domain |
| `src/features/goals/lib/goal-utils.ts` | Client-side accuracy, streak, trend formatting helpers |
| `src/features/goals/lib/progress-prompt.ts` | System prompt builder for progress report generation |
| `src/features/goals/hooks/use-goals.ts` | Query/mutation hooks wrapping Convex goals functions |
| `src/features/goals/hooks/use-progress.ts` | Progress data query hooks |
| `src/features/goals/hooks/use-report-generation.ts` | SSE streaming state management for report generation |
| `src/features/goals/components/goals-list.tsx` | Per-patient goal list widget with sparklines |
| `src/features/goals/components/goal-detail.tsx` | Full goal view with chart, data table, actions |
| `src/features/goals/components/goal-form.tsx` | Add/edit goal form (dialog) |
| `src/features/goals/components/goal-bank-picker.tsx` | Pre-populated goal template selector |
| `src/features/goals/components/progress-chart.tsx` | Recharts line chart with prompt-level color-coded dots |
| `src/features/goals/components/progress-data-table.tsx` | Tabular view of all data points |
| `src/features/goals/components/goal-met-banner.tsx` | "Goal criteria met — confirm?" banner |
| `src/features/goals/components/progress-report-viewer.tsx` | AI report review/edit/sign + print export |
| `src/features/goals/components/progress-report-generator.tsx` | Report type/date range picker + trigger |

### New files — Routes (thin wrappers)
| File | Responsibility |
|---|---|
| `src/app/(app)/patients/[id]/goals/[goalId]/page.tsx` | → `goal-detail.tsx` |
| `src/app/(app)/patients/[id]/goals/[goalId]/not-found.tsx` | 404 for invalid goal ID |

### New files — Tests
| File | Responsibility |
|---|---|
| `src/features/goals/__tests__/goal-utils.test.ts` | Unit tests for client-side utility functions |
| `src/features/goals/__tests__/goal-bank-data.test.ts` | Validates all templates have required fields, no duplicate IDs |
| `src/features/goals/__tests__/progress-prompt.test.ts` | Unit tests for prompt builder |
| `tests/e2e/goal-tracking.spec.ts` | E2E: create goal, add data, generate report |

### Modified files
| File | Change |
|---|---|
| `convex/schema.ts` | Add `goals`, `progressData`, `progressReports` tables; extend `activityLog.action` union with 4 new literals |
| `convex/sessionNotes.ts` | Modify `sign` mutation to insert `progressData` rows for targets with `goalId` |
| `src/features/patients/components/patient-detail-page.tsx` | Add GoalsList widget to left column above SessionNotesList |
| `src/features/session-notes/components/target-entry.tsx` | Add `goalId` to `TargetData` interface; add goal picker dropdown |
| `src/features/session-notes/components/structured-data-form.tsx` | Pass `patientId` to TargetEntry for goal picker |
| `package.json` | Add `recharts` dependency |

---

## Phase 1: Goals CRUD + Goal Bank

---

### Task 1: Schema — Add goals Table and Extend activityLog

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add goals table to schema.ts**

Add after the `sessionNotes` table definition (before the closing `});`):

```ts
  goals: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    domain: v.union(
      v.literal("articulation"),
      v.literal("language-receptive"),
      v.literal("language-expressive"),
      v.literal("fluency"),
      v.literal("voice"),
      v.literal("pragmatic-social"),
      v.literal("aac"),
      v.literal("feeding")
    ),
    shortDescription: v.string(),
    fullGoalText: v.string(),
    targetAccuracy: v.number(),
    targetConsecutiveSessions: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("met"),
      v.literal("discontinued"),
      v.literal("modified")
    ),
    startDate: v.string(),
    targetDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_status", ["patientId", "status"]),
```

- [ ] **Step 2: Extend activityLog.action union**

In the `activityLog` table definition, add four new literals to the `action` union:

```ts
      v.literal("goal-created"),
      v.literal("goal-met"),
      v.literal("goal-modified"),
      v.literal("report-generated"),
```

Add these after the existing `v.literal("session-unsigned")` line.

- [ ] **Step 3: Verify schema compiles**

Run: `npx convex dev --once --typecheck=enable 2>&1 | head -20`
Expected: No errors. New table types should appear in `convex/_generated/`.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(goals): add goals table and extend activityLog action types"
```

---

### Task 2: Backend — Goals CRUD Functions

**Files:**
- Create: `convex/goals.ts`

- [ ] **Step 1: Create convex/goals.ts with validators and helpers**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { assertSLP } from "./lib/auth";

// ── Validators ──────────────────────────────────────────────────────────────

const domainValidator = v.union(
  v.literal("articulation"),
  v.literal("language-receptive"),
  v.literal("language-expressive"),
  v.literal("fluency"),
  v.literal("voice"),
  v.literal("pragmatic-social"),
  v.literal("aac"),
  v.literal("feeding")
);

const statusValidator = v.union(
  v.literal("active"),
  v.literal("met"),
  v.literal("discontinued"),
  v.literal("modified")
);

// ── Validation Helpers ──────────────────────────────────────────────────────

function validateGoalFields(args: {
  shortDescription: string;
  fullGoalText: string;
  targetAccuracy: number;
  targetConsecutiveSessions: number;
  startDate: string;
  targetDate?: string;
}): void {
  const desc = args.shortDescription.trim();
  if (desc.length === 0 || desc.length > 200) {
    throw new ConvexError("Short description must be 1-200 characters");
  }
  const full = args.fullGoalText.trim();
  if (full.length === 0 || full.length > 2000) {
    throw new ConvexError("Full goal text must be 1-2000 characters");
  }
  if (!Number.isFinite(args.targetAccuracy) || args.targetAccuracy < 1 || args.targetAccuracy > 100) {
    throw new ConvexError("Target accuracy must be between 1 and 100");
  }
  if (!Number.isInteger(args.targetConsecutiveSessions) || args.targetConsecutiveSessions < 1 || args.targetConsecutiveSessions > 10) {
    throw new ConvexError("Target consecutive sessions must be between 1 and 10");
  }
  const date = new Date(args.startDate);
  if (isNaN(date.getTime())) {
    throw new ConvexError("Invalid start date");
  }
  if (args.targetDate !== undefined) {
    const target = new Date(args.targetDate);
    if (isNaN(target.getTime())) {
      throw new ConvexError("Invalid target date");
    }
  }
}
```

- [ ] **Step 2: Add queries (list, listActive, get, getWithProgress)**

Append to `convex/goals.ts`:

```ts
// ── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("goals")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

export const listActive = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("goals")
      .withIndex("by_patientId_status", (q) =>
        q.eq("patientId", args.patientId).eq("status", "active")
      )
      .collect();
  },
});

export const get = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    return goal;
  },
});

export const getWithProgress = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    const progressData = await ctx.db
      .query("progressData")
      .withIndex("by_goalId_date", (q) => q.eq("goalId", args.goalId))
      .order("desc")
      .take(20);

    return { goal, progressData };
  },
});
```

- [ ] **Step 3: Add mutations (create, update, remove)**

Append to `convex/goals.ts`:

```ts
// ── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    domain: domainValidator,
    shortDescription: v.string(),
    fullGoalText: v.string(),
    targetAccuracy: v.number(),
    targetConsecutiveSessions: v.number(),
    startDate: v.string(),
    targetDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    validateGoalFields(args);

    const goalId = await ctx.db.insert("goals", {
      patientId: args.patientId,
      slpUserId,
      domain: args.domain,
      shortDescription: args.shortDescription.trim(),
      fullGoalText: args.fullGoalText.trim(),
      targetAccuracy: args.targetAccuracy,
      targetConsecutiveSessions: args.targetConsecutiveSessions,
      status: "active",
      startDate: args.startDate,
      targetDate: args.targetDate,
      notes: args.notes,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "goal-created",
      details: `Created goal: ${args.shortDescription.trim()}`,
      timestamp: Date.now(),
    });

    return goalId;
  },
});

export const update = mutation({
  args: {
    goalId: v.id("goals"),
    domain: v.optional(domainValidator),
    shortDescription: v.optional(v.string()),
    fullGoalText: v.optional(v.string()),
    targetAccuracy: v.optional(v.number()),
    targetConsecutiveSessions: v.optional(v.number()),
    startDate: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    if (goal.status === "met") {
      // Can only change status from met (to modified/discontinued)
      if (args.status === undefined) {
        throw new ConvexError("Cannot edit a met goal — change status to 'modified' first");
      }
      if (args.status !== "modified" && args.status !== "discontinued") {
        throw new ConvexError("Met goals can only be changed to 'modified' or 'discontinued'");
      }
    }

    // Validate any provided fields
    const merged = {
      shortDescription: args.shortDescription ?? goal.shortDescription,
      fullGoalText: args.fullGoalText ?? goal.fullGoalText,
      targetAccuracy: args.targetAccuracy ?? goal.targetAccuracy,
      targetConsecutiveSessions: args.targetConsecutiveSessions ?? goal.targetConsecutiveSessions,
      startDate: args.startDate ?? goal.startDate,
      targetDate: args.targetDate ?? goal.targetDate,
    };
    validateGoalFields(merged);

    const updates: Record<string, unknown> = {};
    if (args.domain !== undefined) updates.domain = args.domain;
    if (args.shortDescription !== undefined) updates.shortDescription = args.shortDescription.trim();
    if (args.fullGoalText !== undefined) updates.fullGoalText = args.fullGoalText.trim();
    if (args.targetAccuracy !== undefined) updates.targetAccuracy = args.targetAccuracy;
    if (args.targetConsecutiveSessions !== undefined) updates.targetConsecutiveSessions = args.targetConsecutiveSessions;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.targetDate !== undefined) updates.targetDate = args.targetDate;
    if (args.notes !== undefined) updates.notes = args.notes;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.goalId, updates);

    // Log status changes
    if (args.status === "met") {
      await ctx.db.insert("activityLog", {
        patientId: goal.patientId,
        actorUserId: slpUserId,
        action: "goal-met",
        details: `Goal met: ${goal.shortDescription}`,
        timestamp: Date.now(),
      });
    } else if (args.status === "modified" || args.status === "discontinued") {
      await ctx.db.insert("activityLog", {
        patientId: goal.patientId,
        actorUserId: slpUserId,
        action: "goal-modified",
        details: `Goal ${args.status}: ${goal.shortDescription}`,
        timestamp: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    await ctx.db.patch(args.goalId, { status: "discontinued" });

    await ctx.db.insert("activityLog", {
      patientId: goal.patientId,
      actorUserId: slpUserId,
      action: "goal-modified",
      details: `Goal discontinued: ${goal.shortDescription}`,
      timestamp: Date.now(),
    });
  },
});
```

- [ ] **Step 4: Verify compilation**

Run: `npx convex dev --once --typecheck=enable 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add convex/goals.ts
git commit -m "feat(goals): add goals CRUD functions with validation and auth"
```

---

### Task 3: Tests — Goals CRUD

**Files:**
- Create: `convex/__tests__/goals.test.ts`

- [ ] **Step 1: Write tests for goals CRUD**

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

const today = new Date().toISOString().slice(0, 10);

const VALID_GOAL = {
  domain: "articulation" as const,
  shortDescription: "Produce /r/ in initial position",
  fullGoalText: "Alex will produce /r/ in the initial position of words with 80% accuracy across 3 consecutive sessions.",
  targetAccuracy: 80,
  targetConsecutiveSessions: 3,
  startDate: today,
};

async function createPatientAndGoal(
  t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  goalOverrides?: Partial<typeof VALID_GOAL>,
) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const goalId = await t.mutation(api.goals.create, {
    patientId,
    ...VALID_GOAL,
    ...goalOverrides,
  });
  return { patientId, goalId };
}

// ── create ──────────────────────────────────────────────────────────────────

describe("goals.create", () => {
  it("creates goal with correct fields and status=active", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);
    const goal = await t.query(api.goals.get, { goalId });
    expect(goal.status).toBe("active");
    expect(goal.slpUserId).toBe("slp-user-123");
    expect(goal.domain).toBe("articulation");
    expect(goal.targetAccuracy).toBe(80);
  });

  it("rejects empty shortDescription", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.goals.create, { patientId, ...VALID_GOAL, shortDescription: "" })
    ).rejects.toThrow("Short description must be 1-200 characters");
  });

  it("rejects shortDescription over 200 chars", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.goals.create, { patientId, ...VALID_GOAL, shortDescription: "x".repeat(201) })
    ).rejects.toThrow("Short description must be 1-200 characters");
  });

  it("rejects targetAccuracy outside 1-100", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.goals.create, { patientId, ...VALID_GOAL, targetAccuracy: 0 })
    ).rejects.toThrow("Target accuracy must be between 1 and 100");
    await expect(
      t.mutation(api.goals.create, { patientId, ...VALID_GOAL, targetAccuracy: 101 })
    ).rejects.toThrow("Target accuracy must be between 1 and 100");
  });

  it("rejects targetConsecutiveSessions outside 1-10", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.goals.create, { patientId, ...VALID_GOAL, targetConsecutiveSessions: 0 })
    ).rejects.toThrow("Target consecutive sessions must be between 1 and 10");
  });

  it("rejects access to another SLP's patient", async () => {
    const t1 = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t1.mutation(api.patients.create, VALID_PATIENT);
    const t2 = t1.withIdentity(OTHER_SLP);
    await expect(
      t2.mutation(api.goals.create, { patientId, ...VALID_GOAL })
    ).rejects.toThrow("Not authorized");
  });

  it("logs goal-created to activityLog", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatientAndGoal(t);
    const logs = await t.query(api.activityLog.listByPatient, { patientId });
    const goalLog = logs.find((l: { action: string }) => l.action === "goal-created");
    expect(goalLog).toBeDefined();
  });
});

// ── list / listActive ───────────────────────────────────────────────────────

describe("goals.list and listActive", () => {
  it("returns all goals for a patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.goals.create, { patientId, ...VALID_GOAL });
    await t.mutation(api.goals.create, {
      patientId,
      ...VALID_GOAL,
      domain: "fluency" as const,
      shortDescription: "Reduce disfluencies",
    });
    const all = await t.query(api.goals.list, { patientId });
    expect(all).toHaveLength(2);
  });

  it("listActive filters to active only", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.update, { goalId, status: "discontinued" as const });
    const active = await t.query(api.goals.listActive, { patientId });
    expect(active).toHaveLength(0);
  });
});

// ── update ──────────────────────────────────────────────────────────────────

describe("goals.update", () => {
  it("updates fields on active goal", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.update, { goalId, targetAccuracy: 90 });
    const goal = await t.query(api.goals.get, { goalId });
    expect(goal.targetAccuracy).toBe(90);
  });

  it("cannot edit met goal without status change", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.update, { goalId, status: "met" as const });
    await expect(
      t.mutation(api.goals.update, { goalId, targetAccuracy: 90 })
    ).rejects.toThrow("Cannot edit a met goal");
  });

  it("can change met goal to modified", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.update, { goalId, status: "met" as const });
    await t.mutation(api.goals.update, { goalId, status: "modified" as const });
    const goal = await t.query(api.goals.get, { goalId });
    expect(goal.status).toBe("modified");
  });

  it("logs goal-met on status change to met", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.update, { goalId, status: "met" as const });
    const logs = await t.query(api.activityLog.listByPatient, { patientId });
    const metLog = logs.find((l: { action: string }) => l.action === "goal-met");
    expect(metLog).toBeDefined();
  });
});

// ── remove (soft delete) ────────────────────────────────────────────────────

describe("goals.remove", () => {
  it("soft-deletes by setting status to discontinued", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);
    await t.mutation(api.goals.remove, { goalId });
    const goal = await t.query(api.goals.get, { goalId });
    expect(goal.status).toBe("discontinued");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run convex/__tests__/goals.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add convex/__tests__/goals.test.ts
git commit -m "test(goals): add unit tests for goals CRUD functions"
```

---

### Task 4: Goal Bank Data + Client Utilities

**Files:**
- Create: `src/features/goals/lib/goal-bank-data.ts`
- Create: `src/features/goals/lib/goal-utils.ts`
- Create: `src/features/goals/__tests__/goal-bank-data.test.ts`
- Create: `src/features/goals/__tests__/goal-utils.test.ts`

- [ ] **Step 1: Create goal-bank-data.ts with GoalTemplate type and templates**

```ts
export type GoalDomain =
  | "articulation"
  | "language-receptive"
  | "language-expressive"
  | "fluency"
  | "voice"
  | "pragmatic-social"
  | "aac"
  | "feeding";

export interface GoalTemplate {
  id: string;
  domain: GoalDomain;
  shortDescription: string;
  fullGoalText: string;
  defaultTargetAccuracy: number;
  defaultConsecutiveSessions: number;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // ── Articulation ──────────────────────────────────────────────
  {
    id: "artic-initial-r",
    domain: "articulation",
    shortDescription: "Produce /r/ in initial position",
    fullGoalText: "Client will produce /r/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "artic-initial-s",
    domain: "articulation",
    shortDescription: "Produce /s/ in initial position",
    fullGoalText: "Client will produce /s/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "artic-final-s",
    domain: "articulation",
    shortDescription: "Produce /s/ in final position",
    fullGoalText: "Client will produce /s/ in the final position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "artic-s-blends",
    domain: "articulation",
    shortDescription: "Produce /s/ blends in words",
    fullGoalText: "Client will produce /s/ blends (sp, st, sk, sm, sn, sl, sw) in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "artic-l-initial",
    domain: "articulation",
    shortDescription: "Produce /l/ in initial position",
    fullGoalText: "Client will produce /l/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "artic-th-voiced",
    domain: "articulation",
    shortDescription: "Produce voiced /th/ in words",
    fullGoalText: "Client will produce voiced /th/ in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  // ── Language Receptive ────────────────────────────────────────
  {
    id: "lang-rec-2step",
    domain: "language-receptive",
    shortDescription: "Follow 2-step directions",
    fullGoalText: "Client will follow 2-step directions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "lang-rec-wh-questions",
    domain: "language-receptive",
    shortDescription: "Answer WH questions",
    fullGoalText: "Client will correctly answer who, what, where, when, and why questions about a short story with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "lang-rec-basic-concepts",
    domain: "language-receptive",
    shortDescription: "Identify basic concepts",
    fullGoalText: "Client will identify basic concepts (big/little, on/off, in/out) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 90,
    defaultConsecutiveSessions: 3,
  },
  // ── Language Expressive ───────────────────────────────────────
  {
    id: "lang-exp-2word",
    domain: "language-expressive",
    shortDescription: "Use 2-word combinations",
    fullGoalText: "Client will spontaneously use 2-word combinations to make requests with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "lang-exp-pronouns",
    domain: "language-expressive",
    shortDescription: "Use subject pronouns correctly",
    fullGoalText: "Client will use subject pronouns (he, she, they) correctly in spontaneous speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "lang-exp-past-tense",
    domain: "language-expressive",
    shortDescription: "Use regular past tense -ed",
    fullGoalText: "Client will use regular past tense -ed in structured activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  // ── Fluency ───────────────────────────────────────────────────
  {
    id: "fluency-easy-onset",
    domain: "fluency",
    shortDescription: "Use easy onset in sentences",
    fullGoalText: "Client will use easy onset technique in structured sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "fluency-self-monitor",
    domain: "fluency",
    shortDescription: "Self-monitor disfluencies",
    fullGoalText: "Client will identify and self-correct disfluencies during structured conversation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  // ── Pragmatic/Social ──────────────────────────────────────────
  {
    id: "prag-turn-taking",
    domain: "pragmatic-social",
    shortDescription: "Demonstrate turn-taking",
    fullGoalText: "Client will demonstrate appropriate turn-taking during structured play activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "prag-topic-maintenance",
    domain: "pragmatic-social",
    shortDescription: "Maintain conversational topic",
    fullGoalText: "Client will maintain a conversational topic for 3+ exchanges with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  // ── AAC ───────────────────────────────────────────────────────
  {
    id: "aac-2word-combo",
    domain: "aac",
    shortDescription: "Combine 2 symbols on AAC device",
    fullGoalText: "Client will independently combine 2 symbols on AAC device to make requests with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    id: "aac-navigate-categories",
    domain: "aac",
    shortDescription: "Navigate AAC categories",
    fullGoalText: "Client will independently navigate to the correct category on AAC device to find target vocabulary with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  // ── Feeding ───────────────────────────────────────────────────
  {
    id: "feeding-accept-textures",
    domain: "feeding",
    shortDescription: "Accept varied food textures",
    fullGoalText: "Client will accept presentation of new food textures (touch, smell, or taste) without aversive response with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  // ── Voice ─────────────────────────────────────────────────────
  {
    id: "voice-appropriate-volume",
    domain: "voice",
    shortDescription: "Use appropriate vocal volume",
    fullGoalText: "Client will use appropriate vocal volume in structured activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
];

export function getTemplatesByDomain(domain: GoalDomain): GoalTemplate[] {
  return GOAL_TEMPLATES.filter((t) => t.domain === domain);
}

export function fillTemplate(
  template: GoalTemplate,
  accuracy: number,
  sessions: number,
): string {
  return template.fullGoalText
    .replace("{accuracy}", String(accuracy))
    .replace("{sessions}", String(sessions));
}
```

- [ ] **Step 2: Create goal-utils.ts**

```ts
export function formatAccuracy(accuracy: number | null): string {
  if (accuracy === null) return "\u2014";
  return `${Math.round(accuracy)}%`;
}

export function formatAccuracyWithTarget(current: number | null, target: number): string {
  if (current === null) return `\u2014 \u2192 ${target}%`;
  return `${Math.round(current)}% \u2192 ${target}%`;
}

export function trendArrow(trend: "improving" | "stable" | "declining"): string {
  switch (trend) {
    case "improving": return "\u2191";
    case "stable": return "\u2192";
    case "declining": return "\u2193";
  }
}

export function domainLabel(domain: string): string {
  const labels: Record<string, string> = {
    "articulation": "Articulation",
    "language-receptive": "Receptive Language",
    "language-expressive": "Expressive Language",
    "fluency": "Fluency",
    "voice": "Voice",
    "pragmatic-social": "Pragmatic/Social",
    "aac": "AAC",
    "feeding": "Feeding",
  };
  return labels[domain] ?? domain;
}

export function domainColor(domain: string): string {
  const colors: Record<string, string> = {
    "articulation": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "language-receptive": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "language-expressive": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    "fluency": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "voice": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    "pragmatic-social": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    "aac": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    "feeding": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };
  return colors[domain] ?? "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
}

export function promptLevelColor(level: string | undefined): string {
  switch (level) {
    case "independent": return "#22c55e";  // green-500
    case "verbal-cue": return "#eab308";   // yellow-500
    case "model": return "#f97316";         // orange-500
    case "physical": return "#ef4444";      // red-500
    default: return "#94a3b8";              // slate-400
  }
}

export function promptLevelLabel(level: string | undefined): string {
  switch (level) {
    case "independent": return "Independent";
    case "verbal-cue": return "Verbal Cue";
    case "model": return "Model";
    case "physical": return "Physical";
    default: return "Unknown";
  }
}

/** Client-side mirror of convex/lib/progress.ts calculateStreak */
export function calculateStreakClient(
  dataPoints: Array<{ accuracy: number }>,
  targetAccuracy: number,
): number {
  let streak = 0;
  for (const dp of dataPoints) {
    if (dp.accuracy >= targetAccuracy) streak++;
    else break;
  }
  return streak;
}

/** Client-side mirror of convex/lib/progress.ts checkGoalMet */
export function checkGoalMetClient(
  targetAccuracy: number,
  targetConsecutiveSessions: number,
  dataPoints: Array<{ accuracy: number }>,
): boolean {
  return calculateStreakClient(dataPoints, targetAccuracy) >= targetConsecutiveSessions;
}

export function statusBadgeColor(status: string): string {
  switch (status) {
    case "active": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "met": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "discontinued": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    case "modified": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    default: return "bg-gray-100 text-gray-800";
  }
}
```

- [ ] **Step 3: Write tests for goal-bank-data.ts**

```ts
import { describe, expect, it } from "vitest";
import { GOAL_TEMPLATES, getTemplatesByDomain, fillTemplate } from "../lib/goal-bank-data";

describe("goal-bank-data", () => {
  it("has no duplicate template IDs", () => {
    const ids = GOAL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all templates have required fields", () => {
    for (const t of GOAL_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.domain).toBeTruthy();
      expect(t.shortDescription.length).toBeGreaterThan(0);
      expect(t.shortDescription.length).toBeLessThanOrEqual(200);
      expect(t.fullGoalText).toContain("{accuracy}");
      expect(t.fullGoalText).toContain("{sessions}");
      expect(t.defaultTargetAccuracy).toBeGreaterThanOrEqual(1);
      expect(t.defaultTargetAccuracy).toBeLessThanOrEqual(100);
      expect(t.defaultConsecutiveSessions).toBeGreaterThanOrEqual(1);
      expect(t.defaultConsecutiveSessions).toBeLessThanOrEqual(10);
    }
  });

  it("getTemplatesByDomain filters correctly", () => {
    const artic = getTemplatesByDomain("articulation");
    expect(artic.length).toBeGreaterThan(0);
    expect(artic.every((t) => t.domain === "articulation")).toBe(true);
  });

  it("fillTemplate replaces placeholders", () => {
    const template = GOAL_TEMPLATES[0];
    const filled = fillTemplate(template, 85, 4);
    expect(filled).toContain("85%");
    expect(filled).toContain("4 consecutive");
  });
});
```

- [ ] **Step 4: Write tests for goal-utils.ts**

```ts
import { describe, expect, it } from "vitest";
import {
  formatAccuracy,
  formatAccuracyWithTarget,
  trendArrow,
  domainLabel,
  promptLevelColor,
  statusBadgeColor,
} from "../lib/goal-utils";

describe("goal-utils", () => {
  it("formatAccuracy handles null", () => {
    expect(formatAccuracy(null)).toBe("\u2014");
  });

  it("formatAccuracy rounds", () => {
    expect(formatAccuracy(72.7)).toBe("73%");
  });

  it("formatAccuracyWithTarget shows arrow", () => {
    expect(formatAccuracyWithTarget(72, 80)).toBe("72% \u2192 80%");
    expect(formatAccuracyWithTarget(null, 80)).toContain("80%");
  });

  it("trendArrow returns correct symbols", () => {
    expect(trendArrow("improving")).toBe("\u2191");
    expect(trendArrow("stable")).toBe("\u2192");
    expect(trendArrow("declining")).toBe("\u2193");
  });

  it("domainLabel returns readable names", () => {
    expect(domainLabel("language-receptive")).toBe("Receptive Language");
    expect(domainLabel("aac")).toBe("AAC");
  });

  it("promptLevelColor returns hex colors", () => {
    expect(promptLevelColor("independent")).toMatch(/^#/);
    expect(promptLevelColor(undefined)).toMatch(/^#/);
  });

  it("statusBadgeColor returns tailwind classes for all statuses", () => {
    for (const s of ["active", "met", "discontinued", "modified"]) {
      expect(statusBadgeColor(s)).toContain("bg-");
    }
  });
});
```

- [ ] **Step 5: Run all tests**

Run: `npx vitest run src/features/goals/__tests__/`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/goals/lib/ src/features/goals/__tests__/
git commit -m "feat(goals): add goal bank data and client utility functions with tests"
```

---

### Task 5: Hooks — Goal Query and Mutation Hooks

**Files:**
- Create: `src/features/goals/hooks/use-goals.ts`

- [ ] **Step 1: Create use-goals.ts**

Follow the pattern from `src/features/session-notes/hooks/use-session-notes.ts`:

```ts
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useGoals(patientId: Id<"patients">) {
  return useQuery(api.goals.list, { patientId });
}

export function useActiveGoals(patientId: Id<"patients">) {
  return useQuery(api.goals.listActive, { patientId });
}

export function useGoal(goalId: Id<"goals"> | null) {
  return useQuery(api.goals.get, goalId ? { goalId } : "skip");
}

export function useGoalWithProgress(goalId: Id<"goals"> | null) {
  return useQuery(api.goals.getWithProgress, goalId ? { goalId } : "skip");
}

export function useCreateGoal() {
  return useMutation(api.goals.create);
}

export function useUpdateGoal() {
  return useMutation(api.goals.update);
}

export function useRemoveGoal() {
  return useMutation(api.goals.remove);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/goals/hooks/use-goals.ts
git commit -m "feat(goals): add Convex query and mutation hooks"
```

---

### Task 6: UI — Goal Bank Picker Component

**Files:**
- Create: `src/features/goals/components/goal-bank-picker.tsx`

- [ ] **Step 1: Create goal-bank-picker.tsx**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/core/utils";
import {
  type GoalDomain,
  type GoalTemplate,
  getTemplatesByDomain,
  fillTemplate,
} from "../lib/goal-bank-data";
import { domainLabel, domainColor } from "../lib/goal-utils";

const DOMAINS: GoalDomain[] = [
  "articulation",
  "language-receptive",
  "language-expressive",
  "fluency",
  "voice",
  "pragmatic-social",
  "aac",
  "feeding",
];

interface GoalBankPickerProps {
  onSelect: (template: GoalTemplate) => void;
}

export function GoalBankPicker({ onSelect }: GoalBankPickerProps) {
  const [selectedDomain, setSelectedDomain] = useState<GoalDomain | null>(null);
  const templates = selectedDomain ? getTemplatesByDomain(selectedDomain) : [];

  return (
    <div className="flex flex-col gap-4">
      <Select
        value={selectedDomain ?? ""}
        onValueChange={(v) => setSelectedDomain(v as GoalDomain)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Choose a domain..." />
        </SelectTrigger>
        <SelectContent>
          {DOMAINS.map((d) => (
            <SelectItem key={d} value={d}>
              {domainLabel(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {templates.length > 0 && (
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className={cn(
                "flex flex-col gap-1 rounded-lg border border-border p-3 text-left transition-colors duration-300",
                "hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", domainColor(t.domain))}>
                  {domainLabel(t.domain)}
                </span>
                <span className="text-sm font-medium">{t.shortDescription}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {fillTemplate(t, t.defaultTargetAccuracy, t.defaultConsecutiveSessions)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/goals/components/goal-bank-picker.tsx
git commit -m "feat(goals): add goal bank picker component"
```

---

### Task 7: UI — Goal Form Component

**Files:**
- Create: `src/features/goals/components/goal-form.tsx`

- [ ] **Step 1: Create goal-form.tsx**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { GoalBankPicker } from "./goal-bank-picker";
import { useCreateGoal, useUpdateGoal } from "../hooks/use-goals";
import { domainLabel } from "../lib/goal-utils";
import { fillTemplate, type GoalDomain, type GoalTemplate } from "../lib/goal-bank-data";
import type { Id } from "../../../../convex/_generated/dataModel";

const DOMAINS: GoalDomain[] = [
  "articulation", "language-receptive", "language-expressive",
  "fluency", "voice", "pragmatic-social", "aac", "feeding",
];

interface GoalFormProps {
  patientId: Id<"patients">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, form is in edit mode */
  editGoal?: {
    _id: Id<"goals">;
    domain: GoalDomain;
    shortDescription: string;
    fullGoalText: string;
    targetAccuracy: number;
    targetConsecutiveSessions: number;
    startDate: string;
    targetDate?: string;
    notes?: string;
  };
}

export function GoalForm({ patientId, open, onOpenChange, editGoal }: GoalFormProps) {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const [saving, setSaving] = useState(false);

  const [domain, setDomain] = useState<GoalDomain>(editGoal?.domain ?? "articulation");
  const [shortDescription, setShortDescription] = useState(editGoal?.shortDescription ?? "");
  const [fullGoalText, setFullGoalText] = useState(editGoal?.fullGoalText ?? "");
  const [targetAccuracy, setTargetAccuracy] = useState(editGoal?.targetAccuracy ?? 80);
  const [targetConsecutiveSessions, setTargetConsecutiveSessions] = useState(editGoal?.targetConsecutiveSessions ?? 3);
  const [startDate, setStartDate] = useState(editGoal?.startDate ?? new Date().toISOString().slice(0, 10));
  const [targetDate, setTargetDate] = useState(editGoal?.targetDate ?? "");
  const [notes, setNotes] = useState(editGoal?.notes ?? "");

  function handleTemplateSelect(template: GoalTemplate) {
    setDomain(template.domain);
    setShortDescription(template.shortDescription);
    setTargetAccuracy(template.defaultTargetAccuracy);
    setTargetConsecutiveSessions(template.defaultConsecutiveSessions);
    setFullGoalText(
      fillTemplate(template, template.defaultTargetAccuracy, template.defaultConsecutiveSessions)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editGoal) {
        await updateGoal({
          goalId: editGoal._id,
          domain,
          shortDescription,
          fullGoalText,
          targetAccuracy,
          targetConsecutiveSessions,
          startDate,
          targetDate: targetDate || undefined,
          notes: notes || undefined,
        });
      } else {
        await createGoal({
          patientId,
          domain,
          shortDescription,
          fullGoalText,
          targetAccuracy,
          targetConsecutiveSessions,
          startDate,
          targetDate: targetDate || undefined,
          notes: notes || undefined,
        });
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editGoal ? "Edit Goal" : "Add IEP Goal"}</DialogTitle>
          <DialogDescription>
            {editGoal ? "Update this goal's details." : "Choose from the goal bank or write your own."}
          </DialogDescription>
        </DialogHeader>

        {!editGoal && (
          <Tabs defaultValue="bank" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="bank" className="flex-1">Goal Bank</TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="bank">
              <GoalBankPicker onSelect={handleTemplateSelect} />
            </TabsContent>
            <TabsContent value="custom">
              <p className="text-sm text-muted-foreground">Fill out all fields below.</p>
            </TabsContent>
          </Tabs>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="domain">Domain</Label>
            <Select value={domain} onValueChange={(v) => setDomain(v as GoalDomain)}>
              <SelectTrigger id="domain">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map((d) => (
                  <SelectItem key={d} value={d}>{domainLabel(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="shortDesc">Short Description</Label>
            <Input
              id="shortDesc"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder='e.g., "Produce /r/ in initial position"'
              maxLength={200}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fullGoal">Full Goal Text</Label>
            <Textarea
              id="fullGoal"
              value={fullGoalText}
              onChange={(e) => setFullGoalText(e.target.value)}
              placeholder="Complete IEP goal with measurable criteria..."
              rows={3}
              maxLength={2000}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="accuracy">Target Accuracy (%)</Label>
              <Input
                id="accuracy"
                type="number"
                min={1}
                max={100}
                value={targetAccuracy}
                onChange={(e) => setTargetAccuracy(Number(e.target.value))}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sessions">Consecutive Sessions</Label>
              <Input
                id="sessions"
                type="number"
                min={1}
                max={10}
                value={targetConsecutiveSessions}
                onChange={(e) => setTargetConsecutiveSessions(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="targetDate">Target Date (optional)</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={2}
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving..." : editGoal ? "Update Goal" : "Add Goal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/goals/components/goal-form.tsx
git commit -m "feat(goals): add goal form component with bank and custom modes"
```

---

### Task 8: UI — Goals List Widget + Patient Detail Integration

**Files:**
- Create: `src/features/goals/components/goals-list.tsx`
- Modify: `src/features/patients/components/patient-detail-page.tsx`

- [ ] **Step 1: Create goals-list.tsx**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import { useActiveGoals } from "../hooks/use-goals";
import { GoalForm } from "./goal-form";
import { domainLabel, domainColor, formatAccuracyWithTarget } from "../lib/goal-utils";
import type { Id } from "../../../../convex/_generated/dataModel";

interface GoalsListProps {
  patientId: Id<"patients">;
}

export function GoalsList({ patientId }: GoalsListProps) {
  const goals = useActiveGoals(patientId);
  const [formOpen, setFormOpen] = useState(false);

  if (goals === undefined) {
    return (
      <div className="rounded-xl bg-surface-container p-4">
        <p className="text-sm text-on-surface-variant">Loading goals...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-container p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">Goals</h3>
        <Button variant="ghost" size="sm" onClick={() => setFormOpen(true)}>
          <MaterialIcon icon="add" size="sm" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          No goals yet — add IEP goals to track progress
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {goals.map((goal) => (
            <Link
              key={goal._id}
              href={`/patients/${patientId}/goals/${goal._id}`}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 transition-colors duration-300",
                "hover:bg-muted/50"
              )}
            >
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", domainColor(goal.domain))}>
                {domainLabel(goal.domain)}
              </span>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{goal.shortDescription}</span>
                <span className="text-xs text-muted-foreground">
                  Target: {goal.targetAccuracy}%
                </span>
              </div>
              <MaterialIcon icon="chevron_right" size="sm" className="text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      <GoalForm patientId={patientId} open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
```

- [ ] **Step 2: Integrate into patient-detail-page.tsx**

In `src/features/patients/components/patient-detail-page.tsx`, add the import at the top:

```ts
import { GoalsList } from "@/features/goals/components/goals-list";
```

Then add `<GoalsList patientId={patient._id} />` as the first element in the left column `<div>`, above `<SessionNotesList>`:

```tsx
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <GoalsList patientId={patient._id} />
          <SessionNotesList patientId={patient._id} />
          <ActivityTimeline patientId={patient._id} />
        </div>
```

- [ ] **Step 3: Verify the dev server compiles**

Run: `npx next build 2>&1 | tail -20` (or just check that the import resolves without errors)
Expected: No build errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/goals/components/goals-list.tsx src/features/patients/components/patient-detail-page.tsx
git commit -m "feat(goals): add goals list widget and integrate into patient detail page"
```

---

### Task 9: Routing — Goal Detail Page

**Files:**
- Create: `src/app/(app)/patients/[id]/goals/[goalId]/page.tsx`
- Create: `src/app/(app)/patients/[id]/goals/[goalId]/not-found.tsx`
- Create: `src/features/goals/components/goal-detail.tsx` (placeholder — full implementation in Phase 2)

- [ ] **Step 1: Create the route page (thin wrapper)**

```tsx
import { GoalDetail } from "@/features/goals/components/goal-detail";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string; goalId: string }>;
}) {
  const { id, goalId } = await params;
  return <GoalDetail patientId={id} goalId={goalId} />;
}
```

- [ ] **Step 2: Create not-found.tsx**

```tsx
export default function GoalNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-on-surface-variant">Goal not found.</p>
    </div>
  );
}
```

- [ ] **Step 3: Create placeholder goal-detail.tsx**

This renders the goal header and basic info. Chart and data table are added in Phase 2.

```tsx
"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import { useGoalWithProgress } from "../hooks/use-goals";
import { domainLabel, domainColor, statusBadgeColor } from "../lib/goal-utils";
import type { Id } from "../../../../convex/_generated/dataModel";

interface GoalDetailProps {
  patientId: string;
  goalId: string;
}

export function GoalDetail({ patientId, goalId }: GoalDetailProps) {
  const result = useGoalWithProgress(goalId as Id<"goals">);

  if (result === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (result === null) {
    notFound();
  }

  const { goal, progressData } = result;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/patients/${patientId}`}>
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to Patient
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", domainColor(goal.domain))}>
            {domainLabel(goal.domain)}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeColor(goal.status))}>
            {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{goal.shortDescription}</h1>
        <p className="text-sm text-muted-foreground">{goal.fullGoalText}</p>
        <p className="text-sm text-muted-foreground">
          Target: {goal.targetAccuracy}% across {goal.targetConsecutiveSessions} consecutive sessions
        </p>
      </div>

      {/* Placeholder for progress chart — added in Phase 2 */}
      <div className="rounded-xl bg-surface-container p-6">
        <h3 className="mb-2 text-sm font-semibold">Progress</h3>
        {progressData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No progress data yet. Data will appear here when session notes with this goal are signed.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {progressData.length} data point{progressData.length !== 1 ? "s" : ""} recorded.
            Chart coming in Phase 2.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/patients/\[id\]/goals/ src/features/goals/components/goal-detail.tsx
git commit -m "feat(goals): add goal detail route and placeholder component"
```

---

## Phase 2: Progress Data Pipeline

---

### Task 10: Schema — Add progressData Table

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add progressData table**

Add after the `goals` table definition:

```ts
  progressData: defineTable({
    goalId: v.id("goals"),
    patientId: v.id("patients"),
    source: v.union(
      v.literal("session-note"),
      v.literal("in-app-auto"),
      v.literal("manual-entry")
    ),
    sourceId: v.optional(v.string()),
    date: v.string(),
    trials: v.optional(v.number()),
    correct: v.optional(v.number()),
    accuracy: v.number(),
    promptLevel: v.optional(v.union(
      v.literal("independent"),
      v.literal("verbal-cue"),
      v.literal("model"),
      v.literal("physical")
    )),
    notes: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_goalId", ["goalId"])
    .index("by_goalId_date", ["goalId", "date"])
    .index("by_patientId_date", ["patientId", "date"]),
```

- [ ] **Step 2: Verify**

Run: `npx convex dev --once --typecheck=enable 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(goals): add progressData table to schema"
```

---

### Task 11: Backend — Progress Helpers

**Files:**
- Create: `convex/lib/progress.ts`
- Create: `convex/__tests__/progress.test.ts`

- [ ] **Step 1: Create convex/lib/progress.ts**

```ts
import type { GenericDatabaseWriter } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

interface DataPoint {
  accuracy: number;
  date: string;
}

interface TargetWithGoal {
  goalId: string;
  trials?: number;
  correct?: number;
  promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
  notes?: string;
}

/**
 * Count consecutive sessions (most recent first) where accuracy >= target.
 * Stops at the first session below target.
 */
export function calculateStreak(
  dataPoints: DataPoint[],
  targetAccuracy: number,
): number {
  // dataPoints should be sorted most-recent-first
  let streak = 0;
  for (const dp of dataPoints) {
    if (dp.accuracy >= targetAccuracy) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Detect trend using simple linear regression on accuracy values.
 * Requires 5+ data points; returns "stable" if fewer.
 * dataPoints should be sorted most-recent-first (we reverse internally).
 */
export function detectTrend(
  dataPoints: DataPoint[],
): "improving" | "stable" | "declining" {
  if (dataPoints.length < 5) return "stable";

  // Reverse to chronological order for regression
  const chronological = [...dataPoints].reverse();
  const n = chronological.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += chronological[i].accuracy;
    sumXY += i * chronological[i].accuracy;
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Threshold: slope of 1% per session is meaningful
  if (slope > 1) return "improving";
  if (slope < -1) return "declining";
  return "stable";
}

/**
 * Check if a goal's criteria have been met.
 */
export function checkGoalMet(
  targetAccuracy: number,
  targetConsecutiveSessions: number,
  dataPoints: DataPoint[],
): boolean {
  const streak = calculateStreak(dataPoints, targetAccuracy);
  return streak >= targetConsecutiveSessions;
}

/**
 * Insert progressData rows from signed session note targets.
 * Runs inline within the sessionNotes.sign mutation transaction.
 * Skips targets without goalId, or without both trials and correct.
 * Skips targets whose goalId points to a non-existent or non-active goal.
 */
export async function insertProgressFromTargets(
  db: GenericDatabaseWriter<DataModel>,
  targets: TargetWithGoal[],
  noteId: Id<"sessionNotes">,
  patientId: Id<"patients">,
  sessionDate: string,
): Promise<void> {
  const now = Date.now();
  for (const target of targets) {
    if (!target.goalId) continue;
    if (target.trials === undefined || target.correct === undefined) continue;
    if (target.trials === 0) continue;

    // Verify the goal exists and belongs to this patient
    const goal = await db.get(target.goalId as Id<"goals">);
    if (!goal || goal.patientId !== patientId) continue;
    if (goal.status === "discontinued") continue;

    const accuracy = Math.round((target.correct / target.trials) * 100);

    await db.insert("progressData", {
      goalId: target.goalId as Id<"goals">,
      patientId,
      source: "session-note",
      sourceId: noteId as string,
      date: sessionDate,
      trials: target.trials,
      correct: target.correct,
      accuracy,
      promptLevel: target.promptLevel,
      notes: target.notes,
      timestamp: now,
    });
  }
}
```

- [ ] **Step 2: Write tests for progress helpers**

```ts
import { describe, expect, it } from "vitest";
import { calculateStreak, detectTrend, checkGoalMet } from "../lib/progress";

describe("calculateStreak", () => {
  it("returns 0 for empty data", () => {
    expect(calculateStreak([], 80)).toBe(0);
  });

  it("counts consecutive sessions at or above target", () => {
    const data = [
      { accuracy: 85, date: "2026-03-28" },
      { accuracy: 80, date: "2026-03-27" },
      { accuracy: 82, date: "2026-03-26" },
      { accuracy: 70, date: "2026-03-25" },
      { accuracy: 90, date: "2026-03-24" },
    ];
    expect(calculateStreak(data, 80)).toBe(3);
  });

  it("stops at first miss", () => {
    const data = [
      { accuracy: 90, date: "2026-03-28" },
      { accuracy: 60, date: "2026-03-27" },
      { accuracy: 90, date: "2026-03-26" },
    ];
    expect(calculateStreak(data, 80)).toBe(1);
  });

  it("counts all if all above target", () => {
    const data = [
      { accuracy: 90, date: "2026-03-28" },
      { accuracy: 85, date: "2026-03-27" },
      { accuracy: 80, date: "2026-03-26" },
    ];
    expect(calculateStreak(data, 80)).toBe(3);
  });

  it("returns 0 if first (most recent) is below target", () => {
    const data = [
      { accuracy: 70, date: "2026-03-28" },
      { accuracy: 90, date: "2026-03-27" },
    ];
    expect(calculateStreak(data, 80)).toBe(0);
  });
});

describe("detectTrend", () => {
  it("returns stable for fewer than 5 data points", () => {
    expect(detectTrend([
      { accuracy: 90, date: "2026-03-28" },
      { accuracy: 80, date: "2026-03-27" },
    ])).toBe("stable");
  });

  it("detects improving trend", () => {
    const data = [
      { accuracy: 90, date: "2026-03-28" },
      { accuracy: 85, date: "2026-03-27" },
      { accuracy: 80, date: "2026-03-26" },
      { accuracy: 70, date: "2026-03-25" },
      { accuracy: 60, date: "2026-03-24" },
    ];
    expect(detectTrend(data)).toBe("improving");
  });

  it("detects declining trend", () => {
    const data = [
      { accuracy: 60, date: "2026-03-28" },
      { accuracy: 70, date: "2026-03-27" },
      { accuracy: 80, date: "2026-03-26" },
      { accuracy: 85, date: "2026-03-25" },
      { accuracy: 90, date: "2026-03-24" },
    ];
    expect(detectTrend(data)).toBe("declining");
  });

  it("detects stable trend", () => {
    const data = [
      { accuracy: 80, date: "2026-03-28" },
      { accuracy: 81, date: "2026-03-27" },
      { accuracy: 79, date: "2026-03-26" },
      { accuracy: 80, date: "2026-03-25" },
      { accuracy: 80, date: "2026-03-24" },
    ];
    expect(detectTrend(data)).toBe("stable");
  });
});

describe("checkGoalMet", () => {
  it("returns true when streak meets target", () => {
    const data = [
      { accuracy: 85, date: "2026-03-28" },
      { accuracy: 82, date: "2026-03-27" },
      { accuracy: 80, date: "2026-03-26" },
    ];
    expect(checkGoalMet(80, 3, data)).toBe(true);
  });

  it("returns false when streak is short", () => {
    const data = [
      { accuracy: 85, date: "2026-03-28" },
      { accuracy: 82, date: "2026-03-27" },
      { accuracy: 70, date: "2026-03-26" },
    ];
    expect(checkGoalMet(80, 3, data)).toBe(false);
  });

  it("returns true when streak exceeds target", () => {
    const data = [
      { accuracy: 90, date: "2026-03-28" },
      { accuracy: 85, date: "2026-03-27" },
      { accuracy: 82, date: "2026-03-26" },
      { accuracy: 80, date: "2026-03-25" },
    ];
    expect(checkGoalMet(80, 3, data)).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run convex/__tests__/progress.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add convex/lib/progress.ts convex/__tests__/progress.test.ts
git commit -m "feat(goals): add progress helper functions (streak, trend, goal-met detection)"
```

---

### Task 12: Backend — progressData Queries + Manual Entry

**Files:**
- Create: `convex/progressData.ts`
- Create: `convex/__tests__/progressData.test.ts`

- [ ] **Step 1: Create convex/progressData.ts**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { assertSLP } from "./lib/auth";

const promptLevelValidator = v.optional(v.union(
  v.literal("independent"),
  v.literal("verbal-cue"),
  v.literal("model"),
  v.literal("physical")
));

// ── Queries ─────────────────────────────────────────────────────────────────

export const listByGoal = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("progressData")
      .withIndex("by_goalId_date", (q) => q.eq("goalId", args.goalId))
      .order("desc")
      .collect();
  },
});

export const listByPatient = query({
  args: {
    patientId: v.id("patients"),
    periodStart: v.string(),
    periodEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("progressData")
      .withIndex("by_patientId_date", (q) =>
        q.eq("patientId", args.patientId)
          .gte("date", args.periodStart)
          .lte("date", args.periodEnd)
      )
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const createManual = mutation({
  args: {
    goalId: v.id("goals"),
    date: v.string(),
    trials: v.optional(v.number()),
    correct: v.optional(v.number()),
    accuracy: v.number(),
    promptLevel: promptLevelValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    // Validate
    if (!Number.isFinite(args.accuracy) || args.accuracy < 0 || args.accuracy > 100) {
      throw new ConvexError("Accuracy must be between 0 and 100");
    }
    if (args.trials !== undefined && args.correct !== undefined && args.correct > args.trials) {
      throw new ConvexError("Correct cannot exceed total trials");
    }
    const date = new Date(args.date);
    if (isNaN(date.getTime())) {
      throw new ConvexError("Invalid date");
    }

    return await ctx.db.insert("progressData", {
      goalId: args.goalId,
      patientId: goal.patientId,
      source: "manual-entry",
      date: args.date,
      trials: args.trials,
      correct: args.correct,
      accuracy: args.accuracy,
      promptLevel: args.promptLevel,
      notes: args.notes,
      timestamp: Date.now(),
    });
  },
});
```

- [ ] **Step 2: Write tests**

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");
const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const today = new Date().toISOString().slice(0, 10);

async function setup(t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>) {
  const { patientId } = await t.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });
  const goalId = await t.mutation(api.goals.create, {
    patientId,
    domain: "articulation" as const,
    shortDescription: "Produce /r/ in initial position",
    fullGoalText: "Test goal with 80% accuracy across 3 sessions.",
    targetAccuracy: 80,
    targetConsecutiveSessions: 3,
    startDate: today,
  });
  return { patientId, goalId };
}

describe("progressData.createManual", () => {
  it("creates a manual data point", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await setup(t);
    const id = await t.mutation(api.progressData.createManual, {
      goalId,
      date: today,
      accuracy: 75,
      trials: 20,
      correct: 15,
      promptLevel: "verbal-cue" as const,
    });
    expect(id).toBeDefined();
  });

  it("rejects accuracy outside 0-100", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await setup(t);
    await expect(
      t.mutation(api.progressData.createManual, { goalId, date: today, accuracy: 101 })
    ).rejects.toThrow("Accuracy must be between 0 and 100");
  });

  it("rejects correct > trials", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await setup(t);
    await expect(
      t.mutation(api.progressData.createManual, {
        goalId, date: today, accuracy: 80, trials: 10, correct: 15,
      })
    ).rejects.toThrow("Correct cannot exceed total trials");
  });
});

describe("progressData.listByGoal", () => {
  it("returns data points for a goal ordered by date desc", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await setup(t);
    await t.mutation(api.progressData.createManual, { goalId, date: "2026-03-26", accuracy: 70 });
    await t.mutation(api.progressData.createManual, { goalId, date: "2026-03-27", accuracy: 80 });
    const data = await t.query(api.progressData.listByGoal, { goalId });
    expect(data).toHaveLength(2);
    expect(data[0].date).toBe("2026-03-27");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run convex/__tests__/progressData.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add convex/progressData.ts convex/__tests__/progressData.test.ts
git commit -m "feat(goals): add progressData queries and manual entry mutation"
```

---

### Task 13: Integrate Session Note Sign → Progress Data

**Files:**
- Modify: `convex/sessionNotes.ts`
- Modify: `src/features/session-notes/components/target-entry.tsx`

- [ ] **Step 1: Modify sessionNotes.sign to insert progressData**

In `convex/sessionNotes.ts`, add the import at the top:

```ts
import { insertProgressFromTargets } from "./lib/progress";
```

In the `sign` mutation handler, after the `await ctx.db.insert("activityLog", ...)` call, add:

```ts
    // Auto-create progressData for targets linked to goals
    await insertProgressFromTargets(
      ctx.db,
      note.structuredData.targetsWorkedOn,
      args.noteId,
      note.patientId,
      note.sessionDate,
    );
```

- [ ] **Step 2: Extend TargetData interface in target-entry.tsx**

In `src/features/session-notes/components/target-entry.tsx`, add `goalId` to the `TargetData` interface:

```ts
export interface TargetData {
  target: string;
  goalId?: string;      // ← add this line
  trials?: number;
  correct?: number;
  promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
  notes?: string;
}
```

- [ ] **Step 3: Add goal picker dropdown to TargetEntry component**

In `src/features/session-notes/components/target-entry.tsx`:

1. Add props for goals list:

```ts
interface TargetEntryProps {
  data: TargetData;
  onChange: (data: TargetData) => void;
  onRemove: () => void;
  disabled?: boolean;
  activeGoals?: Array<{ _id: string; shortDescription: string; domain: string }>;
}
```

2. Add a goal picker Select after the prompt level select, inside the grid:

```tsx
          {/* Goal link (optional) */}
          {activeGoals && activeGoals.length > 0 && (
            <Select
              value={data.goalId ?? ""}
              onValueChange={(value) =>
                onChange({ ...data, goalId: value || undefined })
              }
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Link to goal..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No goal</SelectItem>
                {activeGoals.map((g) => (
                  <SelectItem key={g._id} value={g._id}>
                    {g.shortDescription}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
```

- [ ] **Step 4: Pass patientId and goals to TargetEntry from structured-data-form.tsx**

In `src/features/session-notes/components/structured-data-form.tsx`:

1. Add import and hook:

```ts
import { useActiveGoals } from "@/features/goals/hooks/use-goals";
```

2. Accept `patientId` as a prop and fetch active goals:

```ts
const activeGoals = useActiveGoals(patientId);
```

3. Pass `activeGoals` to each `<TargetEntry>`:

```tsx
<TargetEntry
  data={target}
  onChange={(updated) => handleTargetChange(i, updated)}
  onRemove={() => handleRemoveTarget(i)}
  disabled={disabled}
  activeGoals={activeGoals ?? []}
/>
```

4. Update `session-note-editor.tsx` to pass `patientId` to `StructuredDataForm`.

- [ ] **Step 5: Write integration test**

Add to `convex/__tests__/sessionNotes.test.ts` (or create a separate integration test file):

In `convex/__tests__/progressData.test.ts`, add a new describe block:

```ts
describe("session note sign → progressData integration", () => {
  it("creates progressData when signing a note with goalId targets", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setup(t);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      sessionDate: today,
      sessionDuration: 30,
      sessionType: "in-person" as const,
      structuredData: {
        targetsWorkedOn: [
          { target: "Initial /r/", goalId: goalId as string, trials: 20, correct: 16, promptLevel: "verbal-cue" as const },
        ],
      },
    });
    // Transition to complete (required before sign)
    await t.mutation(api.sessionNotes.updateStatus, { noteId, status: "complete" as const });
    // Add SOAP (required before sign)
    await t.mutation(api.sessionNotes.updateSoap, {
      noteId,
      soapNote: {
        subjective: "Patient reports practice at home.",
        objective: "14/20 trials correct.",
        assessment: "Making progress.",
        plan: "Continue treatment.",
      },
    });
    await t.mutation(api.sessionNotes.sign, { noteId });

    const data = await t.query(api.progressData.listByGoal, { goalId });
    expect(data).toHaveLength(1);
    expect(data[0].accuracy).toBe(80);
    expect(data[0].source).toBe("session-note");
    expect(data[0].sourceId).toBe(noteId as string);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run convex/__tests__/progressData.test.ts`
Expected: All tests pass, including the integration test.

- [ ] **Step 5: Commit**

```bash
git add convex/sessionNotes.ts src/features/session-notes/components/target-entry.tsx convex/__tests__/progressData.test.ts
git commit -m "feat(goals): integrate session note sign with progressData creation"
```

---

### Task 14: Install Recharts + Progress Chart Component

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/features/goals/components/progress-chart.tsx`
- Create: `src/features/goals/hooks/use-progress.ts`

- [ ] **Step 1: Install recharts**

Run: `npm install recharts`

- [ ] **Step 2: Create use-progress.ts**

```ts
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useProgressByGoal(goalId: Id<"goals"> | null) {
  return useQuery(api.progressData.listByGoal, goalId ? { goalId } : "skip");
}

export function useProgressByPatient(
  patientId: Id<"patients"> | null,
  periodStart: string,
  periodEnd: string,
) {
  return useQuery(
    api.progressData.listByPatient,
    patientId ? { patientId, periodStart, periodEnd } : "skip"
  );
}

export function useCreateManualProgress() {
  return useMutation(api.progressData.createManual);
}
```

- [ ] **Step 3: Create progress-chart.tsx**

```tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { promptLevelColor, promptLevelLabel } from "../lib/goal-utils";

interface ProgressDataPoint {
  date: string;
  accuracy: number;
  trials?: number;
  correct?: number;
  promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  targetAccuracy: number;
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: ProgressDataPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={promptLevelColor(payload.promptLevel)}
      stroke="white"
      strokeWidth={2}
    />
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ProgressDataPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const dp = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-md">
      <p className="text-sm font-medium">{dp.date}</p>
      <p className="text-sm">Accuracy: {dp.accuracy}%</p>
      {dp.trials !== undefined && (
        <p className="text-sm text-muted-foreground">
          {dp.correct}/{dp.trials} trials
        </p>
      )}
      {dp.promptLevel && (
        <p className="text-sm text-muted-foreground">
          Prompt: {promptLevelLabel(dp.promptLevel)}
        </p>
      )}
    </div>
  );
}

export function ProgressChart({ data, targetAccuracy }: ProgressChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">
          {data.length === 0
            ? "No progress data yet."
            : "At least 2 data points needed to show a chart."}
        </p>
      </div>
    );
  }

  // Reverse to chronological order for the chart (data comes in desc)
  const chartData = [...data].reverse();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={targetAccuracy}
          stroke="#f97316"
          strokeDasharray="4 4"
          label={{ value: `Target: ${targetAccuracy}%`, position: "right", fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke="#0d7377"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 7 }}
        />
        <Legend
          content={() => (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
              {(["independent", "verbal-cue", "model", "physical"] as const).map((level) => (
                <div key={level} className="flex items-center gap-1">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: promptLevelColor(level) }}
                  />
                  <span>{promptLevelLabel(level)}</span>
                </div>
              ))}
            </div>
          )}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/features/goals/hooks/use-progress.ts src/features/goals/components/progress-chart.tsx
git commit -m "feat(goals): add Recharts progress chart with prompt-level dots"
```

---

### Task 15: UI — Progress Data Table + Goal Met Banner + Updated Goal Detail

**Files:**
- Create: `src/features/goals/components/progress-data-table.tsx`
- Create: `src/features/goals/components/goal-met-banner.tsx`
- Modify: `src/features/goals/components/goal-detail.tsx`

- [ ] **Step 1: Create progress-data-table.tsx**

```tsx
"use client";

import { promptLevelLabel } from "../lib/goal-utils";

interface ProgressDataPoint {
  _id: string;
  date: string;
  accuracy: number;
  trials?: number;
  correct?: number;
  promptLevel?: string;
  source: string;
  notes?: string;
}

interface ProgressDataTableProps {
  data: ProgressDataPoint[];
}

function sourceLabel(source: string): string {
  switch (source) {
    case "session-note": return "Session Note";
    case "in-app-auto": return "In-App";
    case "manual-entry": return "Manual";
    default: return source;
  }
}

export function ProgressDataTable({ data }: ProgressDataTableProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No data points recorded yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Source</th>
            <th className="pb-2 pr-4">Accuracy</th>
            <th className="pb-2 pr-4">Trials</th>
            <th className="pb-2 pr-4">Prompt Level</th>
            <th className="pb-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((dp) => (
            <tr key={dp._id} className="border-b border-border/50">
              <td className="py-2 pr-4">{dp.date}</td>
              <td className="py-2 pr-4">{sourceLabel(dp.source)}</td>
              <td className="py-2 pr-4 font-medium">{dp.accuracy}%</td>
              <td className="py-2 pr-4 text-muted-foreground">
                {dp.trials !== undefined ? `${dp.correct ?? "?"}/${dp.trials}` : "\u2014"}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {dp.promptLevel ? promptLevelLabel(dp.promptLevel) : "\u2014"}
              </td>
              <td className="py-2 text-muted-foreground">{dp.notes ?? "\u2014"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create goal-met-banner.tsx**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { useUpdateGoal } from "../hooks/use-goals";
import type { Id } from "../../../../convex/_generated/dataModel";

interface GoalMetBannerProps {
  goalId: Id<"goals">;
  targetAccuracy: number;
  targetConsecutiveSessions: number;
}

export function GoalMetBanner({
  goalId,
  targetAccuracy,
  targetConsecutiveSessions,
}: GoalMetBannerProps) {
  const updateGoal = useUpdateGoal();
  const [confirming, setConfirming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleConfirm() {
    setConfirming(true);
    try {
      await updateGoal({ goalId, status: "met" as const });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
      <MaterialIcon icon="check_circle" className="text-green-600 dark:text-green-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          Goal criteria met!
        </p>
        <p className="text-xs text-green-600 dark:text-green-400">
          {targetAccuracy}% accuracy achieved across {targetConsecutiveSessions} consecutive sessions.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleConfirm}
        disabled={confirming}
        className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300"
      >
        {confirming ? "Confirming..." : "Mark as Met"}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDismissed(true)}
        className="h-8 w-8 text-green-600"
        aria-label="Dismiss"
      >
        <MaterialIcon icon="close" size="sm" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Update goals-list.tsx to show current accuracy per goal**

In `src/features/goals/components/goals-list.tsx`, update the component to use `useGoals` (which returns all goals) instead of `useActiveGoals`, and add a `getWithProgress`-based approach. Since N+1 queries are expensive, use a simpler approach: add a `getLatestAccuracy` query to `convex/goals.ts` that returns the most recent `progressData.accuracy` per goal, or just change the list query to also return the latest data point. For the initial implementation, update the display to show the most recent accuracy from `getWithProgress` for each goal, noting this is called per-row. A more efficient batch query can be added later.

For now, update the target text line in each goal row to:

```tsx
                <span className="text-xs text-muted-foreground">
                  {formatAccuracyWithTarget(null, goal.targetAccuracy)}
                </span>
```

This shows `— → 80%` when no data exists yet. Once a data point exists (after session note signing), the accuracy will be populated when the `getWithProgress` query is used in the goal detail view. Full sparkline rendering is deferred to a future enhancement as it requires a batch progress data fetch.

- [ ] **Step 4: Replace the placeholder goal-detail.tsx with the full implementation**

Replace the entire contents of `src/features/goals/components/goal-detail.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import { useGoalWithProgress } from "../hooks/use-goals";
import { GoalForm } from "./goal-form";
import { GoalMetBanner } from "./goal-met-banner";
import { ProgressChart } from "./progress-chart";
import { ProgressDataTable } from "./progress-data-table";
import { domainLabel, domainColor, statusBadgeColor, checkGoalMetClient } from "../lib/goal-utils";
import type { Id } from "../../../../convex/_generated/dataModel";

interface GoalDetailProps {
  patientId: string;
  goalId: string;
}

export function GoalDetail({ patientId, goalId }: GoalDetailProps) {
  const result = useGoalWithProgress(goalId as Id<"goals">);
  const [editOpen, setEditOpen] = useState(false);

  if (result === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (result === null) {
    notFound();
  }

  const { goal, progressData } = result;
  const isGoalMet = goal.status === "active" && checkGoalMetClient(
    goal.targetAccuracy,
    goal.targetConsecutiveSessions,
    progressData,
  );

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/patients/${patientId}`}>
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to Patient
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", domainColor(goal.domain))}>
            {domainLabel(goal.domain)}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeColor(goal.status))}>
            {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
          </span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{goal.shortDescription}</h1>
            <p className="text-sm text-muted-foreground">{goal.fullGoalText}</p>
            <p className="text-sm text-muted-foreground">
              Target: {goal.targetAccuracy}% across {goal.targetConsecutiveSessions} consecutive sessions
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <MaterialIcon icon="edit" size="sm" />
            Edit Goal
          </Button>
        </div>
      </div>

      {/* Goal met banner */}
      {isGoalMet && (
        <GoalMetBanner
          goalId={goal._id}
          targetAccuracy={goal.targetAccuracy}
          targetConsecutiveSessions={goal.targetConsecutiveSessions}
        />
      )}

      {/* Progress chart */}
      <div className="rounded-xl bg-surface-container p-6">
        <h3 className="mb-4 text-sm font-semibold">Progress Chart</h3>
        <ProgressChart data={progressData} targetAccuracy={goal.targetAccuracy} />
      </div>

      {/* Data table */}
      <div className="rounded-xl bg-surface-container p-6">
        <h3 className="mb-4 text-sm font-semibold">Data Points</h3>
        <ProgressDataTable data={progressData} />
      </div>

      {/* Edit dialog */}
      <GoalForm
        patientId={patientId as Id<"patients">}
        open={editOpen}
        onOpenChange={setEditOpen}
        editGoal={goal}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx next build 2>&1 | tail -20`
Expected: No build errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/goals/components/progress-data-table.tsx src/features/goals/components/goal-met-banner.tsx src/features/goals/components/goal-detail.tsx
git commit -m "feat(goals): add progress data table, goal-met banner, and full goal detail page"
```

---

## Phase 3: AI Progress Reports

---

### Task 16: Schema — Add progressReports Table

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add progressReports table**

Add after the `progressData` table definition:

```ts
  progressReports: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    reportType: v.union(
      v.literal("weekly-summary"),
      v.literal("monthly-summary"),
      v.literal("iep-progress-report")
    ),
    periodStart: v.string(),
    periodEnd: v.string(),
    goalSummaries: v.array(v.object({
      goalId: v.string(),
      shortDescription: v.string(),
      domain: v.union(
        v.literal("articulation"),
        v.literal("language-receptive"),
        v.literal("language-expressive"),
        v.literal("fluency"),
        v.literal("voice"),
        v.literal("pragmatic-social"),
        v.literal("aac"),
        v.literal("feeding")
      ),
      accuracyTrend: v.union(
        v.literal("improving"),
        v.literal("stable"),
        v.literal("declining")
      ),
      averageAccuracy: v.number(),
      sessionsCount: v.number(),
      status: v.union(
        v.literal("active"),
        v.literal("met"),
        v.literal("discontinued"),
        v.literal("modified")
      ),
      narrative: v.string(),
    })),
    overallNarrative: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("reviewed"),
      v.literal("signed")
    ),
    signedAt: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_reportType", ["patientId", "reportType"]),
```

- [ ] **Step 2: Verify and commit**

Run: `npx convex dev --once --typecheck=enable 2>&1 | head -20`

```bash
git add convex/schema.ts
git commit -m "feat(goals): add progressReports table to schema"
```

---

### Task 17: Backend — progressReports CRUD + Sign Workflow

**Files:**
- Create: `convex/progressReports.ts`
- Create: `convex/__tests__/progressReports.test.ts`

- [ ] **Step 1: Create convex/progressReports.ts**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { assertSLP } from "./lib/auth";

const domainValidator = v.union(
  v.literal("articulation"),
  v.literal("language-receptive"),
  v.literal("language-expressive"),
  v.literal("fluency"),
  v.literal("voice"),
  v.literal("pragmatic-social"),
  v.literal("aac"),
  v.literal("feeding")
);

const trendValidator = v.union(
  v.literal("improving"),
  v.literal("stable"),
  v.literal("declining")
);

const goalStatusValidator = v.union(
  v.literal("active"),
  v.literal("met"),
  v.literal("discontinued"),
  v.literal("modified")
);

const reportTypeValidator = v.union(
  v.literal("weekly-summary"),
  v.literal("monthly-summary"),
  v.literal("iep-progress-report")
);

const goalSummaryValidator = v.object({
  goalId: v.string(),
  shortDescription: v.string(),
  domain: domainValidator,
  accuracyTrend: trendValidator,
  averageAccuracy: v.number(),
  sessionsCount: v.number(),
  status: goalStatusValidator,
  narrative: v.string(),
});

// ── Queries ─────────────────────────────────────────────────────────────────

export const list = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("progressReports")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { reportId: v.id("progressReports") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    return report;
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    patientId: v.id("patients"),
    reportType: reportTypeValidator,
    periodStart: v.string(),
    periodEnd: v.string(),
    goalSummaries: v.array(goalSummaryValidator),
    overallNarrative: v.string(),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db.insert("progressReports", {
      patientId: args.patientId,
      slpUserId,
      reportType: args.reportType,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      goalSummaries: args.goalSummaries,
      overallNarrative: args.overallNarrative,
      status: "draft",
    });
  },
});

export const updateNarrative = mutation({
  args: {
    reportId: v.id("progressReports"),
    goalSummaries: v.optional(v.array(goalSummaryValidator)),
    overallNarrative: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    if (report.status === "signed") {
      throw new ConvexError("Cannot edit a signed report");
    }

    const updates: Record<string, unknown> = {};
    if (args.goalSummaries !== undefined) updates.goalSummaries = args.goalSummaries;
    if (args.overallNarrative !== undefined) updates.overallNarrative = args.overallNarrative;
    await ctx.db.patch(args.reportId, updates);
  },
});

export const markReviewed = mutation({
  args: { reportId: v.id("progressReports") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    if (report.status !== "draft") {
      throw new ConvexError("Only draft reports can be marked as reviewed");
    }
    await ctx.db.patch(args.reportId, { status: "reviewed" });
  },
});

export const sign = mutation({
  args: { reportId: v.id("progressReports") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    if (report.status !== "reviewed") {
      throw new ConvexError("Only reviewed reports can be signed");
    }
    if (report.goalSummaries.length === 0) {
      throw new ConvexError("Report must contain at least one goal summary");
    }

    const now = Date.now();
    await ctx.db.patch(args.reportId, { status: "signed", signedAt: now });

    await ctx.db.insert("activityLog", {
      patientId: report.patientId,
      actorUserId: slpUserId,
      action: "report-generated",
      details: `Signed ${report.reportType} report (${report.periodStart} to ${report.periodEnd})`,
      timestamp: now,
    });
  },
});

export const unsign = mutation({
  args: { reportId: v.id("progressReports") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError("Report not found");
    if (report.slpUserId !== slpUserId) throw new ConvexError("Not authorized");
    if (report.status !== "signed") {
      throw new ConvexError("Only signed reports can be unsigned");
    }
    await ctx.db.patch(args.reportId, { status: "reviewed", signedAt: undefined });
  },
});
```

- [ ] **Step 2: Write tests for progressReports**

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");
const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

const VALID_GOAL_SUMMARY = {
  goalId: "placeholder",
  shortDescription: "Produce /r/ in initial position",
  domain: "articulation" as const,
  accuracyTrend: "improving" as const,
  averageAccuracy: 75,
  sessionsCount: 5,
  status: "active" as const,
  narrative: "Patient is making steady progress.",
};

async function createReportSetup(t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const reportId = await t.mutation(api.progressReports.create, {
    patientId,
    reportType: "weekly-summary" as const,
    periodStart: "2026-03-21",
    periodEnd: "2026-03-28",
    goalSummaries: [VALID_GOAL_SUMMARY],
    overallNarrative: "Overall good progress this week.",
  });
  return { patientId, reportId };
}

describe("progressReports sign workflow", () => {
  it("creates draft report", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);
    const report = await t.query(api.progressReports.get, { reportId });
    expect(report.status).toBe("draft");
  });

  it("transitions draft → reviewed → signed → unsigned", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);

    await t.mutation(api.progressReports.markReviewed, { reportId });
    let report = await t.query(api.progressReports.get, { reportId });
    expect(report.status).toBe("reviewed");

    await t.mutation(api.progressReports.sign, { reportId });
    report = await t.query(api.progressReports.get, { reportId });
    expect(report.status).toBe("signed");
    expect(report.signedAt).toBeDefined();

    await t.mutation(api.progressReports.unsign, { reportId });
    report = await t.query(api.progressReports.get, { reportId });
    expect(report.status).toBe("reviewed");
    expect(report.signedAt).toBeUndefined();
  });

  it("cannot sign a draft (must review first)", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);
    await expect(
      t.mutation(api.progressReports.sign, { reportId })
    ).rejects.toThrow("Only reviewed reports can be signed");
  });

  it("cannot edit a signed report", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);
    await t.mutation(api.progressReports.markReviewed, { reportId });
    await t.mutation(api.progressReports.sign, { reportId });
    await expect(
      t.mutation(api.progressReports.updateNarrative, {
        reportId, overallNarrative: "Changed",
      })
    ).rejects.toThrow("Cannot edit a signed report");
  });

  it("rejects other SLP access", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { reportId } = await createReportSetup(t);
    const t2 = t.withIdentity(OTHER_SLP);
    await expect(
      t2.query(api.progressReports.get, { reportId })
    ).rejects.toThrow("Not authorized");
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run convex/__tests__/progressReports.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add convex/progressReports.ts convex/__tests__/progressReports.test.ts
git commit -m "feat(goals): add progressReports CRUD with sign workflow and tests"
```

---

### Task 18: AI Report Generation — Prompt + API Route

**Files:**
- Create: `src/features/goals/lib/progress-prompt.ts`
- Create: `src/app/api/generate-report/route.ts`
- Create: `src/features/goals/__tests__/progress-prompt.test.ts`

- [ ] **Step 1: Create progress-prompt.ts**

Follow the pattern from `src/features/session-notes/lib/soap-prompt.ts`:

```ts
interface PatientContext {
  firstName: string;
  lastName: string;
  diagnosis: string;
  communicationLevel?: string;
  interests?: string[];
}

interface GoalWithData {
  goalId: string;
  shortDescription: string;
  domain: string;
  fullGoalText: string;
  targetAccuracy: number;
  status: string;
  dataPoints: Array<{
    date: string;
    accuracy: number;
    trials?: number;
    correct?: number;
    promptLevel?: string;
  }>;
  trend: "improving" | "stable" | "declining";
  streak: number;
  averageAccuracy: number;
}

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

  let prompt = `You are a clinical documentation specialist for speech-language pathology, familiar with ASHA documentation standards and IEP compliance requirements.

Generate a progress report for the following patient and goals.

## Patient
- Name: ${patient.firstName} ${patient.lastName}
- Diagnosis: ${patient.diagnosis}`;

  if (patient.communicationLevel) {
    prompt += `\n- Communication Level: ${patient.communicationLevel}`;
  }
  if (patient.interests?.length) {
    prompt += `\n- Interests: ${patient.interests.join(", ")}`;
  }

  prompt += `\n\n## Report Period: ${periodStart} to ${periodEnd}
## Report Type: ${reportType}

${reportTypeInstructions[reportType]}

## Goals\n`;

  for (const goal of goals) {
    prompt += `\n### ${goal.shortDescription} (${goal.domain})
- Full goal: ${goal.fullGoalText}
- Target accuracy: ${goal.targetAccuracy}%
- Status: ${goal.status}
- Data points in period: ${goal.dataPoints.length}
- Average accuracy: ${goal.averageAccuracy}%
- Trend: ${goal.trend}
- Consecutive sessions at target: ${goal.streak}`;

    if (goal.dataPoints.length > 0) {
      prompt += `\n- Recent data:`;
      for (const dp of goal.dataPoints.slice(0, 10)) {
        prompt += `\n  - ${dp.date}: ${dp.accuracy}%`;
        if (dp.trials) prompt += ` (${dp.correct ?? "?"}/${dp.trials})`;
        if (dp.promptLevel) prompt += ` [${dp.promptLevel}]`;
      }
    }
  }

  if (previousNarrative) {
    prompt += `\n\n## Previous Report Narrative (for continuity)
${previousNarrative}`;
  }

  prompt += `\n\n## Output Format

Respond in the following JSON format:
\`\`\`json
{
  "goalSummaries": [
    {
      "goalId": "<goal ID>",
      "narrative": "<2-4 sentence narrative for this goal>"
    }
  ],
  "overallNarrative": "<3-5 sentence overall summary>"
}
\`\`\`

Write exactly one goalSummary per goal listed above, in the same order. Use the goalId values provided.`;

  return prompt;
}

export interface ParsedReport {
  goalSummaries: Array<{ goalId: string; narrative: string }>;
  overallNarrative: string;
}

export function parseReportResponse(text: string): ParsedReport | null {
  try {
    // Extract JSON from potential markdown code block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const json = jsonMatch[1] ?? jsonMatch[0];
    const parsed = JSON.parse(json);
    if (!parsed.goalSummaries || !parsed.overallNarrative) return null;
    return parsed as ParsedReport;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Write tests for progress-prompt.ts**

```ts
import { describe, expect, it } from "vitest";
import { buildReportPrompt, parseReportResponse } from "../lib/progress-prompt";

describe("buildReportPrompt", () => {
  it("includes patient context", () => {
    const prompt = buildReportPrompt(
      { firstName: "Alex", lastName: "Smith", diagnosis: "articulation" },
      [],
      "weekly-summary",
      "2026-03-21",
      "2026-03-28",
    );
    expect(prompt).toContain("Alex Smith");
    expect(prompt).toContain("articulation");
  });

  it("includes goal data", () => {
    const prompt = buildReportPrompt(
      { firstName: "Alex", lastName: "Smith", diagnosis: "articulation" },
      [{
        goalId: "g1",
        shortDescription: "Produce /r/",
        domain: "articulation",
        fullGoalText: "Test goal",
        targetAccuracy: 80,
        status: "active",
        dataPoints: [{ date: "2026-03-28", accuracy: 75 }],
        trend: "improving",
        streak: 1,
        averageAccuracy: 75,
      }],
      "iep-progress-report",
      "2026-03-01",
      "2026-03-28",
    );
    expect(prompt).toContain("Produce /r/");
    expect(prompt).toContain("IEP progress report");
  });

  it("includes previous narrative when provided", () => {
    const prompt = buildReportPrompt(
      { firstName: "Alex", lastName: "Smith", diagnosis: "articulation" },
      [],
      "weekly-summary",
      "2026-03-21",
      "2026-03-28",
      "Last week was great.",
    );
    expect(prompt).toContain("Last week was great.");
  });
});

describe("parseReportResponse", () => {
  it("parses valid JSON response", () => {
    const response = '```json\n{"goalSummaries": [{"goalId": "g1", "narrative": "Good progress."}], "overallNarrative": "Overall good."}\n```';
    const parsed = parseReportResponse(response);
    expect(parsed).not.toBeNull();
    expect(parsed!.goalSummaries).toHaveLength(1);
    expect(parsed!.overallNarrative).toBe("Overall good.");
  });

  it("returns null for invalid response", () => {
    expect(parseReportResponse("not json")).toBeNull();
  });
});
```

- [ ] **Step 3: Create the API route**

Create `src/app/api/generate-report/route.ts` following the pattern from `src/app/api/generate-soap/route.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

import {
  buildReportPrompt,
  parseReportResponse,
} from "@/features/goals/lib/progress-prompt";
import { calculateStreak, detectTrend } from "../../../../convex/lib/progress";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "../generate/sse";

export const runtime = "nodejs";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate-report");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-report");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request): Promise<Response> {
  const { userId, getToken } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  convex.setAuth(token);

  const { patientId, reportType, periodStart, periodEnd } = (await request.json()) as {
    patientId: string;
    reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report";
    periodStart: string;
    periodEnd: string;
  };

  const pid = patientId as Id<"patients">;

  // Fetch all data in parallel
  const [patient, goals, progressData] = await Promise.all([
    convex.query(api.patients.get, { patientId: pid }),
    convex.query(api.goals.listActive, { patientId: pid }),
    convex.query(api.progressData.listByPatient, { patientId: pid, periodStart, periodEnd }),
  ]);

  if (!patient) {
    return new Response(JSON.stringify({ error: "Patient not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (goals.length === 0) {
    return new Response(JSON.stringify({ error: "No active goals found for this patient" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build per-goal data
  const goalsWithData = goals.map((goal) => {
    const goalData = progressData
      .filter((d) => d.goalId === goal._id)
      .sort((a, b) => (b.date > a.date ? 1 : -1)); // most recent first

    const avgAccuracy = goalData.length > 0
      ? Math.round(goalData.reduce((sum, d) => sum + d.accuracy, 0) / goalData.length)
      : 0;

    return {
      goalId: goal._id as string,
      shortDescription: goal.shortDescription,
      domain: goal.domain,
      fullGoalText: goal.fullGoalText,
      targetAccuracy: goal.targetAccuracy,
      status: goal.status,
      dataPoints: goalData,
      trend: detectTrend(goalData),
      streak: calculateStreak(goalData, goal.targetAccuracy),
      averageAccuracy: avgAccuracy,
    };
  });

  // Get previous report narrative for continuity
  const previousReports = await convex.query(api.progressReports.list, { patientId: pid });
  const previousNarrative = previousReports.length > 0
    ? previousReports[0].overallNarrative
    : undefined;

  const systemPrompt = buildReportPrompt(
    patient,
    goalsWithData,
    reportType,
    periodStart,
    periodEnd,
    previousNarrative,
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const isAborted = () => request.signal.aborted;
      const send = (eventType: string, data: object) => {
        if (isAborted()) return;
        try {
          controller.enqueue(encoder.encode(sseEncode(eventType, data)));
        } catch {}
      };

      try {
        let fullText = "";
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          temperature: 0.3,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: "Generate the progress report based on the data provided.",
            },
          ],
          stream: true,
        });

        for await (const event of response) {
          if (isAborted()) break;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            send("report-chunk", { text: event.delta.text });
          }
        }

        const parsed = parseReportResponse(fullText);
        if (parsed) {
          // Build goal summaries with full data
          const goalSummaries = goalsWithData.map((gwd) => {
            const matchingNarrative = parsed.goalSummaries.find(
              (gs) => gs.goalId === gwd.goalId
            );
            return {
              goalId: gwd.goalId,
              shortDescription: gwd.shortDescription,
              domain: gwd.domain as "articulation" | "language-receptive" | "language-expressive" | "fluency" | "voice" | "pragmatic-social" | "aac" | "feeding",
              accuracyTrend: gwd.trend,
              averageAccuracy: gwd.averageAccuracy,
              sessionsCount: gwd.dataPoints.length,
              status: gwd.status as "active" | "met" | "discontinued" | "modified",
              narrative: matchingNarrative?.narrative ?? "No narrative generated.",
            };
          });

          const reportId = await convex.mutation(api.progressReports.create, {
            patientId: pid,
            reportType,
            periodStart,
            periodEnd,
            goalSummaries,
            overallNarrative: parsed.overallNarrative,
          });

          send("report-complete", { reportId });
        } else {
          send("error", { message: "Failed to parse report response" });
        }
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 4: Run prompt tests**

Run: `npx vitest run src/features/goals/__tests__/progress-prompt.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/goals/lib/progress-prompt.ts src/features/goals/__tests__/progress-prompt.test.ts src/app/api/generate-report/route.ts
git commit -m "feat(goals): add AI progress report generation prompt and API route"
```

---

### Task 19: UI — Report Generation Hook + Generator + Viewer

**Files:**
- Create: `src/features/goals/hooks/use-report-generation.ts`
- Create: `src/features/goals/components/progress-report-generator.tsx`
- Create: `src/features/goals/components/progress-report-viewer.tsx`

- [ ] **Step 1: Create use-report-generation.ts**

Follow the pattern from `src/features/session-notes/hooks/use-soap-generation.ts`:

```ts
"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type ReportStatus = "idle" | "generating" | "complete" | "error";

interface ReportGenerationState {
  status: ReportStatus;
  streamedText: string;
  reportId: Id<"progressReports"> | null;
  error: string | null;
}

export function useReportGeneration() {
  const [state, setState] = useState<ReportGenerationState>({
    status: "idle",
    streamedText: "",
    reportId: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({ status: "idle", streamedText: "", reportId: null, error: null });
  }, []);

  const generate = useCallback(
    async (args: {
      patientId: string;
      reportType: "weekly-summary" | "monthly-summary" | "iep-progress-report";
      periodStart: string;
      periodEnd: string;
    }) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState({ status: "generating", streamedText: "", reportId: null, error: null });

      try {
        const response = await fetch("/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `Server error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("event: ")) {
              const eventType = line.slice(7);
              if (i + 1 < lines.length && lines[i + 1].startsWith("data: ")) {
                const data = JSON.parse(lines[i + 1].slice(6));
                i++;
                if (eventType === "report-chunk") {
                  setState((prev) => ({
                    ...prev,
                    streamedText: prev.streamedText + (data.text as string),
                  }));
                } else if (eventType === "report-complete") {
                  setState((prev) => ({
                    ...prev,
                    status: "complete",
                    reportId: data.reportId as Id<"progressReports">,
                  }));
                } else if (eventType === "error") {
                  setState((prev) => ({
                    ...prev,
                    status: "error",
                    error: (data.message as string) ?? "Unknown error",
                  }));
                }
              }
            }
          }
        }

        setState((prev) => prev.status === "generating" ? { ...prev, status: "complete" } : prev);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      } finally {
        if (abortControllerRef.current === controller) abortControllerRef.current = null;
      }
    },
    [],
  );

  return { ...state, generate, reset };
}

export function useReport(reportId: Id<"progressReports"> | null) {
  return useQuery(api.progressReports.get, reportId ? { reportId } : "skip");
}

export function useReports(patientId: Id<"patients">) {
  return useQuery(api.progressReports.list, { patientId });
}

export function useMarkReportReviewed() {
  return useMutation(api.progressReports.markReviewed);
}

export function useSignReport() {
  return useMutation(api.progressReports.sign);
}

export function useUnsignReport() {
  return useMutation(api.progressReports.unsign);
}

export function useUpdateReportNarrative() {
  return useMutation(api.progressReports.updateNarrative);
}
```

- [ ] **Step 2: Create progress-report-generator.tsx**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { MaterialIcon } from "@/shared/components/material-icon";
import { useReportGeneration } from "../hooks/use-report-generation";
import { ProgressReportViewer } from "./progress-report-viewer";
import type { Id } from "../../../../convex/_generated/dataModel";

type ReportType = "weekly-summary" | "monthly-summary" | "iep-progress-report";

interface ProgressReportGeneratorProps {
  patientId: Id<"patients">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function defaultPeriod(reportType: ReportType): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  switch (reportType) {
    case "weekly-summary":
      start.setDate(end.getDate() - 7);
      break;
    case "monthly-summary":
      start.setMonth(end.getMonth() - 1);
      break;
    case "iep-progress-report":
      start.setMonth(end.getMonth() - 3);
      break;
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function ProgressReportGenerator({
  patientId,
  open,
  onOpenChange,
}: ProgressReportGeneratorProps) {
  const [reportType, setReportType] = useState<ReportType>("weekly-summary");
  const period = defaultPeriod(reportType);
  const [periodStart, setPeriodStart] = useState(period.start);
  const [periodEnd, setPeriodEnd] = useState(period.end);

  const { status, streamedText, reportId, error, generate, reset } = useReportGeneration();

  function handleTypeChange(type: ReportType) {
    setReportType(type);
    const p = defaultPeriod(type);
    setPeriodStart(p.start);
    setPeriodEnd(p.end);
  }

  async function handleGenerate() {
    await generate({
      patientId: patientId as string,
      reportType,
      periodStart,
      periodEnd,
    });
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Generate Progress Report</SheetTitle>
          <SheetDescription>
            AI will generate a progress report based on the goal data for the selected period.
          </SheetDescription>
        </SheetHeader>

        {!reportId && status !== "generating" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => handleTypeChange(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly-summary">Weekly Summary</SelectItem>
                  <SelectItem value="monthly-summary">Monthly Summary</SelectItem>
                  <SelectItem value="iep-progress-report">IEP Progress Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Period Start</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Period End</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button onClick={handleGenerate}>
              <MaterialIcon icon="auto_awesome" size="sm" />
              Generate Report
            </Button>
          </div>
        )}

        {status === "generating" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Generating report...</p>
            </div>
            {streamedText && (
              <pre className="max-h-64 overflow-y-auto rounded-lg bg-muted p-4 text-xs">
                {streamedText}
              </pre>
            )}
          </div>
        )}

        {reportId && (
          <div className="mt-6">
            <ProgressReportViewer reportId={reportId} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Create progress-report-viewer.tsx**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";
import {
  useReport,
  useMarkReportReviewed,
  useSignReport,
  useUnsignReport,
  useUpdateReportNarrative,
} from "../hooks/use-report-generation";
import { domainLabel, domainColor, trendArrow, statusBadgeColor } from "../lib/goal-utils";
import type { Id } from "../../../../convex/_generated/dataModel";

interface ProgressReportViewerProps {
  reportId: Id<"progressReports">;
}

export function ProgressReportViewer({ reportId }: ProgressReportViewerProps) {
  const report = useReport(reportId);
  const markReviewed = useMarkReportReviewed();
  const signReport = useSignReport();
  const unsignReport = useUnsignReport();
  const updateNarrative = useUpdateReportNarrative();
  const [saving, setSaving] = useState(false);

  if (!report) {
    return <p className="text-sm text-muted-foreground">Loading report...</p>;
  }

  const isEditable = report.status === "draft" || report.status === "reviewed";

  async function handleNarrativeChange(index: number, narrative: string) {
    if (!report) return;
    const updated = [...report.goalSummaries];
    updated[index] = { ...updated[index], narrative };
    await updateNarrative({ reportId, goalSummaries: updated });
  }

  async function handleOverallChange(overallNarrative: string) {
    await updateNarrative({ reportId, overallNarrative });
  }

  async function handleAction(action: "review" | "sign" | "unsign") {
    setSaving(true);
    try {
      if (action === "review") await markReviewed({ reportId });
      else if (action === "sign") await signReport({ reportId });
      else await unsignReport({ reportId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      {/* Header — hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <p className="text-sm font-medium capitalize">
            {report.reportType.replace(/-/g, " ")}
          </p>
          <p className="text-xs text-muted-foreground">
            {report.periodStart} to {report.periodEnd}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusBadgeColor(report.status))}>
            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Goal summaries */}
      {report.goalSummaries.map((gs, i) => (
        <div key={gs.goalId} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4 print:break-inside-avoid">
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", domainColor(gs.domain))}>
              {domainLabel(gs.domain)}
            </span>
            <span className="text-sm font-medium">{gs.shortDescription}</span>
            <span className="text-sm">{trendArrow(gs.accuracyTrend)}</span>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Avg: {gs.averageAccuracy}%</span>
            <span>{gs.sessionsCount} session{gs.sessionsCount !== 1 ? "s" : ""}</span>
          </div>
          {isEditable ? (
            <Textarea
              value={gs.narrative}
              onChange={(e) => handleNarrativeChange(i, e.target.value)}
              rows={3}
              className="text-sm"
            />
          ) : (
            <p className="text-sm">{gs.narrative}</p>
          )}
        </div>
      ))}

      {/* Overall narrative */}
      <div className="flex flex-col gap-2 print:break-inside-avoid">
        <h4 className="text-sm font-semibold">Overall Summary</h4>
        {isEditable ? (
          <Textarea
            value={report.overallNarrative}
            onChange={(e) => handleOverallChange(e.target.value)}
            rows={4}
            className="text-sm"
          />
        ) : (
          <p className="text-sm">{report.overallNarrative}</p>
        )}
      </div>

      {/* Actions — hidden in print */}
      <div className="flex items-center gap-2 print:hidden">
        {report.status === "draft" && (
          <Button onClick={() => handleAction("review")} disabled={saving}>
            Mark Reviewed
          </Button>
        )}
        {report.status === "reviewed" && (
          <Button onClick={() => handleAction("sign")} disabled={saving}>
            <MaterialIcon icon="draw" size="sm" />
            Sign Report
          </Button>
        )}
        {report.status === "signed" && (
          <Button variant="outline" onClick={() => handleAction("unsign")} disabled={saving}>
            Unsign
          </Button>
        )}
        <Button variant="outline" onClick={() => window.print()}>
          <MaterialIcon icon="print" size="sm" />
          Print / Export PDF
        </Button>
      </div>

      {/* Print footer */}
      <div className="hidden print:block print:mt-8 print:border-t print:pt-4">
        <p className="text-xs text-muted-foreground">
          Generated by Bridges | {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/goals/hooks/use-report-generation.ts src/features/goals/components/progress-report-generator.tsx src/features/goals/components/progress-report-viewer.tsx
git commit -m "feat(goals): add AI report generation UI with streaming, review, sign, and print"
```

---

### Task 20: Wire Up Report Generation to Goal Detail

**Files:**
- Modify: `src/features/goals/components/goal-detail.tsx`

- [ ] **Step 1: Add "Generate Report" button and report generator to goal-detail.tsx**

Add imports at the top:

```ts
import { ProgressReportGenerator } from "./progress-report-generator";
```

Add state for the sheet:

```ts
const [reportOpen, setReportOpen] = useState(false);
```

Add a "Generate Report" button in the actions area (after the "Edit Goal" button):

```tsx
          <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
            <MaterialIcon icon="auto_awesome" size="sm" />
            Generate Report
          </Button>
```

Add the sheet at the end of the component (before the closing `</div>`):

```tsx
      <ProgressReportGenerator
        patientId={patientId as Id<"patients">}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -20`
Expected: No build errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/goals/components/goal-detail.tsx
git commit -m "feat(goals): wire report generation into goal detail page"
```

---

### Task 20.5: Print Stylesheet for Reports and Goal Detail

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add @media print rules to globals.css**

Add at the end of `src/app/globals.css`:

```css
@media print {
  /* Hide app chrome */
  nav,
  header,
  [data-sidebar],
  [role="navigation"],
  .print\\:hidden {
    display: none !important;
  }

  /* Full width content */
  main {
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100% !important;
  }

  /* Fixed chart width for consistency */
  .recharts-responsive-container {
    width: 700px !important;
    height: 300px !important;
  }

  /* Page breaks */
  .print\\:break-inside-avoid {
    break-inside: avoid;
  }

  .print\\:break-before-page {
    break-before: page;
  }

  /* Clean typography */
  body {
    font-size: 12pt;
    line-height: 1.5;
    color: black;
    background: white;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(goals): add @media print stylesheet for reports and goal detail"
```

---

### Task 21: E2E Test — Goal Tracking Flow

**Files:**
- Create: `tests/e2e/goal-tracking.spec.ts`

- [ ] **Step 1: Create E2E test**

Follow the pattern from existing E2E tests. This test requires a signed-in SLP with at least one patient.

```ts
import { test, expect } from "@playwright/test";

test.describe("Goal Tracking", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in via Clerk email code flow (see CLAUDE.md)
    await page.goto("/sign-in");
    await page.getByRole("textbox", { name: /email/i }).fill("e2e+clerk_test@bridges.ai");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByText("Use another method").click();
    await page.getByText("Email code").click();
    await page.getByRole("textbox").fill("424242");
    await page.waitForURL(/\/(builder|patients|templates)/);
  });

  test("create goal from patient detail via goal bank", async ({ page }) => {
    await page.goto("/patients");
    // Click first patient
    await page.locator("[data-testid='patient-row']").first().click();
    await page.waitForURL(/\/patients\/.+/);

    // Open add goal dialog
    await page.getByRole("button", { name: /add goal/i }).click();
    await page.waitForSelector("[role='dialog']");

    // Select from goal bank
    await page.getByText("Articulation").first().click();
    await page.locator("button").filter({ hasText: "Produce /r/" }).first().click();

    // Verify form pre-filled
    await expect(page.getByLabel("Short Description")).toHaveValue(/\/r\//);

    // Submit
    await page.getByRole("button", { name: /add goal/i }).click();
    await page.waitForSelector("[role='dialog']", { state: "detached" });

    // Verify goal appears in list
    await expect(page.getByText("Produce /r/")).toBeVisible();
  });

  test("navigate to goal detail and see empty state", async ({ page }) => {
    await page.goto("/patients");
    await page.locator("[data-testid='patient-row']").first().click();
    await page.waitForURL(/\/patients\/.+/);

    // Click a goal (assumes one exists from previous test or seed data)
    const goalLink = page.getByText("Produce /r/").first();
    if (await goalLink.isVisible()) {
      await goalLink.click();
      await page.waitForURL(/\/patients\/.+\/goals\/.+/);
      // Verify goal detail page loads
      await expect(page.getByText("Progress")).toBeVisible();
    }
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test tests/e2e/goal-tracking.spec.ts --project=chromium`
Expected: Tests pass (may need seed data or test fixtures).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/goal-tracking.spec.ts
git commit -m "test(goals): add E2E tests for goal tracking flow"
```

---

### Task 22: Run All Tests

**Files:** None (verification only)

- [ ] **Step 1: Run all Convex backend tests**

Run: `npx vitest run convex/__tests__/goals.test.ts convex/__tests__/progress.test.ts convex/__tests__/progressData.test.ts convex/__tests__/progressReports.test.ts`
Expected: All tests pass.

- [ ] **Step 2: Run all frontend tests**

Run: `npx vitest run src/features/goals/__tests__/`
Expected: All tests pass.

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All existing + new tests pass. No regressions.

- [ ] **Step 4: Commit any fixes needed**

If any tests needed fixes, commit them:

```bash
git add -A
git commit -m "fix(goals): address test failures from full suite run"
```
