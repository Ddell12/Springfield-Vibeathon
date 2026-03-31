# SP5: SLP-Native Experience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the last paper workflows from an SLP's daily practice by shipping live trial data collection, a 200+ goal bank, and home program PDF export.
**Architecture:** Three independent feature verticals that share the existing `goals`, `sessionNotes`, and `homePrograms` tables. `sessionTrials` is a new Convex table for per-trial data. `goalBank` is a new table seeded with 200+ goals that replaces the static `goal-bank-data.ts`. Home program print uses `@media print` CSS with no external PDF dependencies.
**Tech Stack:** Convex (schema, queries, mutations), Next.js App Router, React (client components), Tailwind v4 (`@media print`), Vitest + convex-test, shadcn/ui components.

---

## Task Group 1: Live In-Session Trial Data Collection

### Task 1.1 — Schema: Add `sessionTrials` table

**Files:**
- `convex/schema.ts`

- [ ] **Step 1: Add the `sessionTrials` table to the schema**

Add the new table after the `sessionNotes` table definition (after line 299 in `convex/schema.ts`):

```typescript
  sessionTrials: defineTable({
    sessionNoteId: v.optional(v.id("sessionNotes")),
    patientId: v.id("patients"),
    slpUserId: v.string(),
    goalId: v.id("goals"),
    targetDescription: v.string(),
    trials: v.array(v.object({
      correct: v.boolean(),
      cueLevel: v.union(
        v.literal("independent"),
        v.literal("min-cue"),
        v.literal("mod-cue"),
        v.literal("max-cue")
      ),
      timestamp: v.number(),
    })),
    sessionDate: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_patientId_sessionDate", ["patientId", "sessionDate"])
    .index("by_sessionNoteId", ["sessionNoteId"])
    .index("by_goalId", ["goalId"]),
```

- [ ] **Step 2: Verify schema compiles**

```bash
cd /Users/desha/Springfield-Vibeathon && npx convex dev --once --typecheck-only 2>&1 | head -20
```

If the Convex CLI is not available or errors, verify with TypeScript:

```bash
cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit convex/schema.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```
feat(schema): add sessionTrials table for live data collection
```

---

### Task 1.2 — Backend: `convex/sessionTrials.ts`

**Files:**
- `convex/sessionTrials.ts` (new)
- `convex/__tests__/sessionTrials.test.ts` (new)

- [ ] **Step 1: Write failing tests**

Create `convex/__tests__/sessionTrials.test.ts`:

```typescript
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
  fullGoalText: "Alex will produce /r/ in initial position with 80% accuracy across 3 sessions.",
  targetAccuracy: 80,
  targetConsecutiveSessions: 3,
  startDate: today,
};

async function setupPatientAndGoal(t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const goalId = await t.mutation(api.goals.create, { patientId, ...VALID_GOAL });
  return { patientId, goalId };
}

// ── start ──────────────────────────────────────────────────────────────────

describe("sessionTrials.start", () => {
  it("creates a new trial collection for a patient + goal", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    expect(trialId).toBeDefined();
    const trials = await t.query(api.sessionTrials.listByPatientDate, {
      patientId,
      sessionDate: today,
    });
    expect(trials).toHaveLength(1);
    expect(trials[0].trials).toEqual([]);
    expect(trials[0].targetDescription).toBe("Produce /r/ in initial position");
  });

  it("rejects non-owner SLP", async () => {
    const base = convexTest(schema, modules);
    const t1 = base.withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t1);
    const t2 = base.withIdentity(OTHER_SLP);
    await expect(
      t2.mutation(api.sessionTrials.start, { patientId, goalId, sessionDate: today })
    ).rejects.toThrow();
  });
});

// ── recordTrial ────────────────────────────────────────────────────────────

describe("sessionTrials.recordTrial", () => {
  it("appends a trial to the trials array", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    await t.mutation(api.sessionTrials.recordTrial, {
      trialId,
      correct: true,
      cueLevel: "independent" as const,
    });
    await t.mutation(api.sessionTrials.recordTrial, {
      trialId,
      correct: false,
      cueLevel: "min-cue" as const,
    });
    const trials = await t.query(api.sessionTrials.listByPatientDate, {
      patientId,
      sessionDate: today,
    });
    expect(trials[0].trials).toHaveLength(2);
    expect(trials[0].trials[0].correct).toBe(true);
    expect(trials[0].trials[0].cueLevel).toBe("independent");
    expect(trials[0].trials[1].correct).toBe(false);
  });

  it("rejects recording on ended collection", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    await t.mutation(api.sessionTrials.endCollection, { trialId });
    await expect(
      t.mutation(api.sessionTrials.recordTrial, {
        trialId,
        correct: true,
        cueLevel: "independent" as const,
      })
    ).rejects.toThrow("already ended");
  });
});

// ── endCollection ──────────────────────────────────────────────────────────

describe("sessionTrials.endCollection", () => {
  it("sets endedAt timestamp", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    await t.mutation(api.sessionTrials.endCollection, { trialId });
    const trials = await t.query(api.sessionTrials.listByPatientDate, {
      patientId,
      sessionDate: today,
    });
    expect(trials[0].endedAt).toBeDefined();
    expect(typeof trials[0].endedAt).toBe("number");
  });
});

// ── getActiveForPatient ────────────────────────────────────────────────────

describe("sessionTrials.getActiveForPatient", () => {
  it("returns in-progress trial collection (no endedAt)", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    const active = await t.query(api.sessionTrials.getActiveForPatient, { patientId });
    expect(active).toHaveLength(1);
  });

  it("excludes ended collections", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    await t.mutation(api.sessionTrials.endCollection, { trialId });
    const active = await t.query(api.sessionTrials.getActiveForPatient, { patientId });
    expect(active).toHaveLength(0);
  });
});

// ── linkToSessionNote ──────────────────────────────────────────────────────

describe("sessionTrials.linkToSessionNote", () => {
  it("links trial data to session note and populates targetsWorkedOn", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    // Record some trials
    await t.mutation(api.sessionTrials.recordTrial, {
      trialId,
      correct: true,
      cueLevel: "independent" as const,
    });
    await t.mutation(api.sessionTrials.recordTrial, {
      trialId,
      correct: true,
      cueLevel: "independent" as const,
    });
    await t.mutation(api.sessionTrials.recordTrial, {
      trialId,
      correct: false,
      cueLevel: "min-cue" as const,
    });
    await t.mutation(api.sessionTrials.endCollection, { trialId });

    // Create a session note
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      sessionDate: today,
      sessionDuration: 30,
      sessionType: "in-person" as const,
      structuredData: { targetsWorkedOn: [] },
    });

    // Link the trial data
    await t.mutation(api.sessionTrials.linkToSessionNote, {
      noteId,
      trialIds: [trialId],
    });

    // Verify the link
    const linked = await t.query(api.sessionTrials.listBySessionNote, { noteId });
    expect(linked).toHaveLength(1);
    expect(linked[0].sessionNoteId).toBe(noteId);

    // Verify session note targets were populated
    const note = await t.query(api.sessionNotes.get, { noteId });
    expect(note.structuredData.targetsWorkedOn).toHaveLength(1);
    expect(note.structuredData.targetsWorkedOn[0].target).toBe("Produce /r/ in initial position");
    expect(note.structuredData.targetsWorkedOn[0].trials).toBe(3);
    expect(note.structuredData.targetsWorkedOn[0].correct).toBe(2);
    expect(note.structuredData.targetsWorkedOn[0].goalId).toBeDefined();
  });
});
```

- [ ] **Step 2: Verify tests fail** (module not found / function not registered)

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/sessionTrials.test.ts 2>&1 | tail -20
```

- [ ] **Step 3: Implement `convex/sessionTrials.ts`**

```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

// ── Validators ──────────────────────────────────────────────────────────────

const cueLevelValidator = v.union(
  v.literal("independent"),
  v.literal("min-cue"),
  v.literal("mod-cue"),
  v.literal("max-cue")
);

// ── Helper: map cueLevel to session note promptLevel ────────────────────────

function cueLevelToPromptLevel(
  cueLevel: "independent" | "min-cue" | "mod-cue" | "max-cue"
): "independent" | "verbal-cue" | "model" | "physical" {
  switch (cueLevel) {
    case "independent": return "independent";
    case "min-cue": return "verbal-cue";
    case "mod-cue": return "model";
    case "max-cue": return "physical";
  }
}

/**
 * Find the most frequent cue level in a trials array.
 */
function mostFrequentCueLevel(
  trials: Array<{ cueLevel: "independent" | "min-cue" | "mod-cue" | "max-cue" }>
): "independent" | "min-cue" | "mod-cue" | "max-cue" {
  const counts: Record<string, number> = {};
  for (const t of trials) {
    counts[t.cueLevel] = (counts[t.cueLevel] ?? 0) + 1;
  }
  let max = 0;
  let result: "independent" | "min-cue" | "mod-cue" | "max-cue" = "independent";
  for (const [level, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      result = level as typeof result;
    }
  }
  return result;
}

// ── Mutations ───────────────────────────────────────────────────────────────

export const start = slpMutation({
  args: {
    patientId: v.id("patients"),
    goalId: v.id("goals"),
    sessionDate: v.string(),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (goal.patientId !== args.patientId) throw new ConvexError("Goal does not belong to this patient");

    return await ctx.db.insert("sessionTrials", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      goalId: args.goalId,
      targetDescription: goal.shortDescription,
      trials: [],
      sessionDate: args.sessionDate,
      startedAt: Date.now(),
    });
  },
});

export const recordTrial = slpMutation({
  args: {
    trialId: v.id("sessionTrials"),
    correct: v.boolean(),
    cueLevel: cueLevelValidator,
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.trialId);
    if (!record) throw new ConvexError("Trial collection not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.endedAt !== undefined) throw new ConvexError("Collection already ended");

    const trial = {
      correct: args.correct,
      cueLevel: args.cueLevel,
      timestamp: Date.now(),
    };

    await ctx.db.patch(args.trialId, {
      trials: [...record.trials, trial],
    });
  },
});

export const endCollection = slpMutation({
  args: { trialId: v.id("sessionTrials") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.trialId);
    if (!record) throw new ConvexError("Trial collection not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.endedAt !== undefined) throw new ConvexError("Collection already ended");

    await ctx.db.patch(args.trialId, { endedAt: Date.now() });
  },
});

export const linkToSessionNote = slpMutation({
  args: {
    noteId: v.id("sessionNotes"),
    trialIds: v.array(v.id("sessionTrials")),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (note.status === "signed") throw new ConvexError("Cannot modify a signed session note");

    const targetsWorkedOn = [...note.structuredData.targetsWorkedOn];

    for (const trialId of args.trialIds) {
      const record = await ctx.db.get(trialId);
      if (!record) continue;
      if (record.slpUserId !== ctx.slpUserId) continue;

      // Link the trial to this note
      await ctx.db.patch(trialId, { sessionNoteId: args.noteId });

      // Build target data from trial
      const totalTrials = record.trials.length;
      const correctCount = record.trials.filter((t) => t.correct).length;
      const dominant = mostFrequentCueLevel(
        record.trials.length > 0 ? record.trials : [{ cueLevel: "independent" } as { cueLevel: "independent" | "min-cue" | "mod-cue" | "max-cue" }]
      );

      targetsWorkedOn.push({
        target: record.targetDescription,
        goalId: record.goalId as string,
        trials: totalTrials,
        correct: correctCount,
        promptLevel: cueLevelToPromptLevel(dominant),
      });
    }

    // Update the session note's structured data
    await ctx.db.patch(args.noteId, {
      structuredData: {
        ...note.structuredData,
        targetsWorkedOn,
      },
    });
  },
});

// ── Queries ─────────────────────────────────────────────────────────────────

export const getActiveForPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    const all = await ctx.db
      .query("sessionTrials")
      .withIndex("by_patientId_sessionDate", (q) => q.eq("patientId", args.patientId))
      .collect();

    return all.filter((t) => t.endedAt === undefined);
  },
});

export const listBySessionNote = slpQuery({
  args: { noteId: v.id("sessionNotes") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    return await ctx.db
      .query("sessionTrials")
      .withIndex("by_sessionNoteId", (q) => q.eq("sessionNoteId", args.noteId))
      .collect();
  },
});

export const listByPatientDate = slpQuery({
  args: {
    patientId: v.id("patients"),
    sessionDate: v.string(),
  },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("sessionTrials")
      .withIndex("by_patientId_sessionDate", (q) =>
        q.eq("patientId", args.patientId).eq("sessionDate", args.sessionDate)
      )
      .collect();
  },
});
```

- [ ] **Step 4: Verify tests pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/sessionTrials.test.ts 2>&1 | tail -30
```

- [ ] **Step 5: Commit**

```
feat(sessionTrials): add backend for live trial data collection with TDD
```

---

### Task 1.3 — Frontend: Data Collection Screen

**Files:**
- `src/features/data-collection/components/data-collection-screen.tsx` (new)
- `src/features/data-collection/components/trial-buttons.tsx` (new)
- `src/features/data-collection/components/cue-level-toggle.tsx` (new)
- `src/features/data-collection/components/running-tally.tsx` (new)
- `src/features/data-collection/components/target-selector.tsx` (new)
- `src/features/data-collection/components/session-summary.tsx` (new)
- `src/features/data-collection/hooks/use-data-collection.ts` (new)
- `src/app/(app)/patients/[id]/collect/page.tsx` (new)

- [ ] **Step 1: Create the data collection hook**

Create `src/features/data-collection/hooks/use-data-collection.ts`:

```typescript
"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export type CueLevel = "independent" | "min-cue" | "mod-cue" | "max-cue";

interface ActiveTarget {
  trialId: Id<"sessionTrials">;
  goalId: Id<"goals">;
  targetDescription: string;
  trials: Array<{ correct: boolean; cueLevel: CueLevel; timestamp: number }>;
}

export function useDataCollection(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  const [cueLevel, setCueLevel] = useState<CueLevel>("independent");
  const [phase, setPhase] = useState<"collecting" | "summary">("collecting");

  const startMutation = useMutation(api.sessionTrials.start);
  const recordTrialMutation = useMutation(api.sessionTrials.recordTrial);
  const endCollectionMutation = useMutation(api.sessionTrials.endCollection);

  const activeTrials = useQuery(
    api.sessionTrials.getActiveForPatient,
    isAuthenticated ? { patientId } : "skip"
  );

  const startTarget = useCallback(
    async (goalId: Id<"goals">) => {
      const sessionDate = new Date().toISOString().slice(0, 10);
      return await startMutation({ patientId, goalId, sessionDate });
    },
    [patientId, startMutation]
  );

  const recordTrial = useCallback(
    async (trialId: Id<"sessionTrials">, correct: boolean) => {
      await recordTrialMutation({ trialId, correct, cueLevel });
    },
    [cueLevel, recordTrialMutation]
  );

  const endAll = useCallback(async () => {
    if (!activeTrials) return;
    for (const trial of activeTrials) {
      if (trial.endedAt === undefined) {
        await endCollectionMutation({ trialId: trial._id });
      }
    }
    setPhase("summary");
  }, [activeTrials, endCollectionMutation]);

  return {
    activeTrials: activeTrials ?? [],
    cueLevel,
    setCueLevel,
    phase,
    setPhase,
    startTarget,
    recordTrial,
    endAll,
  };
}
```

- [ ] **Step 2: Create `cue-level-toggle.tsx`**

Create `src/features/data-collection/components/cue-level-toggle.tsx`:

```tsx
"use client";

import { cn } from "@/core/utils";

import type { CueLevel } from "../hooks/use-data-collection";

const CUE_LEVELS: { value: CueLevel; label: string; shortLabel: string }[] = [
  { value: "independent", label: "Independent", shortLabel: "IND" },
  { value: "min-cue", label: "Minimal Cue", shortLabel: "MIN" },
  { value: "mod-cue", label: "Moderate Cue", shortLabel: "MOD" },
  { value: "max-cue", label: "Maximum Cue", shortLabel: "MAX" },
];

interface CueLevelToggleProps {
  value: CueLevel;
  onChange: (level: CueLevel) => void;
}

export function CueLevelToggle({ value, onChange }: CueLevelToggleProps) {
  return (
    <div className="flex w-full gap-1 rounded-xl bg-surface-container p-1">
      {CUE_LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          onClick={() => onChange(level.value)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-300",
            value === level.value
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant hover:bg-surface-container-high"
          )}
          aria-pressed={value === level.value}
        >
          <span className="hidden sm:inline">{level.label}</span>
          <span className="sm:hidden">{level.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `trial-buttons.tsx`**

Create `src/features/data-collection/components/trial-buttons.tsx`:

```tsx
"use client";

import { cn } from "@/core/utils";

interface TrialButtonsProps {
  onCorrect: () => void;
  onIncorrect: () => void;
  disabled?: boolean;
}

export function TrialButtons({ onCorrect, onIncorrect, disabled }: TrialButtonsProps) {
  return (
    <div className="flex gap-4 px-4 pb-safe">
      <button
        type="button"
        onClick={onIncorrect}
        disabled={disabled}
        className={cn(
          "flex h-20 flex-1 items-center justify-center rounded-2xl text-3xl font-bold",
          "bg-error-container text-on-error-container",
          "active:scale-95 transition-transform duration-150",
          "disabled:opacity-40",
          "min-h-[80px]"
        )}
        aria-label="Incorrect trial"
      >
        −
      </button>
      <button
        type="button"
        onClick={onCorrect}
        disabled={disabled}
        className={cn(
          "flex h-20 flex-1 items-center justify-center rounded-2xl text-3xl font-bold",
          "bg-success-container text-on-success-container",
          "active:scale-95 transition-transform duration-150",
          "disabled:opacity-40",
          "min-h-[80px]"
        )}
        aria-label="Correct trial"
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create `running-tally.tsx`**

Create `src/features/data-collection/components/running-tally.tsx`:

```tsx
"use client";

interface RunningTallyProps {
  correct: number;
  total: number;
}

export function RunningTally({ correct, total }: RunningTallyProps) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-1 py-4">
      <p className="font-display text-5xl font-bold tracking-tight text-on-surface">
        {correct}/{total}
      </p>
      <p className="text-lg font-medium text-on-surface-variant">
        {total > 0 ? `${accuracy}%` : "No trials yet"}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Create `target-selector.tsx`**

Create `src/features/data-collection/components/target-selector.tsx`:

```tsx
"use client";

import { cn } from "@/core/utils";

interface Target {
  _id: string;
  targetDescription: string;
  trials: Array<{ correct: boolean }>;
}

interface TargetSelectorProps {
  targets: Target[];
  activeTargetId: string | null;
  onSelect: (id: string) => void;
}

export function TargetSelector({ targets, activeTargetId, onSelect }: TargetSelectorProps) {
  if (targets.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
      {targets.map((target) => {
        const total = target.trials.length;
        const correct = target.trials.filter((t) => t.correct).length;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;

        return (
          <button
            key={target._id}
            type="button"
            onClick={() => onSelect(target._id)}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-300",
              activeTargetId === target._id
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant"
            )}
          >
            {target.targetDescription}
            {accuracy !== null && (
              <span className="ml-1.5 opacity-70">{accuracy}%</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: Create `session-summary.tsx`**

Create `src/features/data-collection/components/session-summary.tsx`:

```tsx
"use client";

import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

import type { Id } from "../../../../../convex/_generated/dataModel";

interface TrialRecord {
  _id: Id<"sessionTrials">;
  targetDescription: string;
  goalId: Id<"goals">;
  trials: Array<{ correct: boolean; cueLevel: string }>;
}

interface SessionSummaryProps {
  patientId: Id<"patients">;
  trialRecords: TrialRecord[];
  onStartNote: () => void;
}

export function SessionSummary({ patientId, trialRecords, onStartNote }: SessionSummaryProps) {
  return (
    <div className="flex flex-col gap-6 p-4">
      <h2 className="font-display text-2xl font-bold text-on-surface">Session Summary</h2>

      <div className="flex flex-col gap-3">
        {trialRecords.map((record) => {
          const total = record.trials.length;
          const correct = record.trials.filter((t) => t.correct).length;
          const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

          // Count cue levels
          const cueCounts: Record<string, number> = {};
          for (const t of record.trials) {
            cueCounts[t.cueLevel] = (cueCounts[t.cueLevel] ?? 0) + 1;
          }

          return (
            <Card key={record._id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{record.targetDescription}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-3xl font-bold">{accuracy}%</span>
                  <span className="text-sm text-on-surface-variant">
                    {correct}/{total} trials
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cueCounts).map(([level, count]) => (
                    <span
                      key={level}
                      className="rounded-md bg-surface-container px-2 py-1 text-xs text-on-surface-variant"
                    >
                      {level}: {count}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={onStartNote} className="w-full" size="lg">
          Create Session Note
        </Button>
        <Button asChild variant="outline" className="w-full" size="lg">
          <Link href={`/patients/${patientId}`}>Back to Patient</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create the main `data-collection-screen.tsx`**

Create `src/features/data-collection/components/data-collection-screen.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { useActiveGoals } from "@/features/goals/hooks/use-goals";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { useDataCollection } from "../hooks/use-data-collection";
import { CueLevelToggle } from "./cue-level-toggle";
import { RunningTally } from "./running-tally";
import { SessionSummary } from "./session-summary";
import { TargetSelector } from "./target-selector";
import { TrialButtons } from "./trial-buttons";

interface DataCollectionScreenProps {
  patientId: Id<"patients">;
}

export function DataCollectionScreen({ patientId }: DataCollectionScreenProps) {
  const router = useRouter();
  const activeGoals = useActiveGoals(patientId);
  const {
    activeTrials,
    cueLevel,
    setCueLevel,
    phase,
    startTarget,
    recordTrial,
    endAll,
  } = useDataCollection(patientId);

  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  // Auto-select first target
  const currentTarget = useMemo(() => {
    if (activeTrials.length === 0) return null;
    const id = activeTargetId ?? activeTrials[0]?._id;
    return activeTrials.find((t) => t._id === id) ?? activeTrials[0] ?? null;
  }, [activeTrials, activeTargetId]);

  const handleStartTarget = useCallback(
    async (goalId: Id<"goals">) => {
      try {
        const trialId = await startTarget(goalId);
        setActiveTargetId(trialId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start");
      }
    },
    [startTarget]
  );

  const handleCorrect = useCallback(async () => {
    if (!currentTarget) return;
    try {
      await recordTrial(currentTarget._id as Id<"sessionTrials">, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record");
    }
  }, [currentTarget, recordTrial]);

  const handleIncorrect = useCallback(async () => {
    if (!currentTarget) return;
    try {
      await recordTrial(currentTarget._id as Id<"sessionTrials">, false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record");
    }
  }, [currentTarget, recordTrial]);

  const handleEndSession = useCallback(async () => {
    setEnding(true);
    try {
      await endAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to end");
    } finally {
      setEnding(false);
    }
  }, [endAll]);

  const handleStartNote = useCallback(() => {
    const sessionDate = new Date().toISOString().slice(0, 10);
    // Navigate to new session note with trial data IDs as search params
    const trialIds = activeTrials.map((t) => t._id).join(",");
    router.push(
      `/patients/${patientId}/sessions/new?trialIds=${trialIds}&date=${sessionDate}`
    );
  }, [activeTrials, patientId, router]);

  // Summary phase
  if (phase === "summary") {
    return (
      <SessionSummary
        patientId={patientId}
        trialRecords={activeTrials as any}
        onStartNote={handleStartNote}
      />
    );
  }

  // No active trials yet — show goal picker
  if (activeTrials.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/patients/${patientId}`}>
              <MaterialIcon icon="arrow_back" size="sm" />
              Back
            </Link>
          </Button>
          <h1 className="font-display text-lg font-bold">Start Session</h1>
          <div className="w-16" />
        </div>

        <p className="text-center text-sm text-on-surface-variant">
          Select goals to track during this session
        </p>

        {activeGoals === undefined ? (
          <p className="text-center text-xs text-on-surface-variant">Loading goals...</p>
        ) : activeGoals.length === 0 ? (
          <p className="text-center text-sm text-on-surface-variant">
            No active goals. Add goals first.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {activeGoals.map((goal) => (
              <button
                key={goal._id}
                type="button"
                onClick={() => handleStartTarget(goal._id)}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border border-border p-4 text-left",
                  "transition-colors duration-300 hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <span className="text-sm font-medium">{goal.shortDescription}</span>
                <span className="text-xs text-on-surface-variant">
                  Target: {goal.targetAccuracy}% across {goal.targetConsecutiveSessions} sessions
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Active data collection
  const correct = currentTarget?.trials.filter((t) => t.correct).length ?? 0;
  const total = currentTarget?.trials.length ?? 0;

  return (
    <div className="flex h-dvh flex-col">
      {/* Top bar — minimal */}
      <div className="flex items-center justify-between px-4 pt-safe pb-2">
        <Button variant="ghost" size="sm" onClick={handleEndSession} disabled={ending}>
          End Session
        </Button>
        <p className="text-sm font-medium text-on-surface-variant">
          {currentTarget?.targetDescription}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Add another target
            if (activeGoals) {
              const unused = activeGoals.filter(
                (g) => !activeTrials.some((t) => t.goalId === g._id)
              );
              if (unused.length > 0) {
                handleStartTarget(unused[0]._id);
              } else {
                toast.info("All goals are being tracked");
              }
            }
          }}
        >
          <MaterialIcon icon="add" size="sm" />
        </Button>
      </div>

      {/* Target tabs */}
      <TargetSelector
        targets={activeTrials as any}
        activeTargetId={currentTarget?._id ?? null}
        onSelect={setActiveTargetId}
      />

      {/* Cue level bar */}
      <div className="px-4 py-2">
        <CueLevelToggle value={cueLevel} onChange={setCueLevel} />
      </div>

      {/* Running tally — centered, fills available space */}
      <div className="flex flex-1 items-center justify-center">
        <RunningTally correct={correct} total={total} />
      </div>

      {/* Big tap buttons — bottom, thumb-reachable */}
      <div className="pb-4">
        <TrialButtons
          onCorrect={handleCorrect}
          onIncorrect={handleIncorrect}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Create the route page**

Create `src/app/(app)/patients/[id]/collect/page.tsx`:

```tsx
"use client";

import { DataCollectionScreen } from "@/features/data-collection/components/data-collection-screen";

import type { Id } from "../../../../../../convex/_generated/dataModel";
import { use } from "react";

export default function CollectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DataCollectionScreen patientId={id as Id<"patients">} />;
}
```

- [ ] **Step 9: Add "Start Session" button to patient detail page**

In `src/features/patients/components/patient-detail-page.tsx`, add a Link button next to the existing `CreateMaterialButton`:

After line 51 (`<CreateMaterialButton patientId={patient._id} />`), add:

```tsx
        <Button asChild variant="default" size="sm">
          <Link href={`/patients/${patient._id}/collect`}>
            <MaterialIcon icon="play_arrow" size="sm" />
            Start Session
          </Link>
        </Button>
```

Wrap the two buttons in a flex container:

```tsx
        <div className="flex items-center gap-2">
          <Button asChild variant="default" size="sm">
            <Link href={`/patients/${patient._id}/collect`}>
              Start Session
            </Link>
          </Button>
          <CreateMaterialButton patientId={patient._id} />
        </div>
```

- [ ] **Step 10: Verify the app compiles**

```bash
cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | tail -20
```

- [ ] **Step 11: Commit**

```
feat(data-collection): add touch-optimized trial data collection UI
```

---

## Task Group 2: Goal Bank (200+ Goals)

### Task 2.1 — Schema: Add `goalBank` table

**Files:**
- `convex/schema.ts`

- [ ] **Step 1: Add the `goalBank` table to the schema**

Add after the `goals` table definition (after line 407):

```typescript
  goalBank: defineTable({
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
    ageRange: v.union(
      v.literal("0-3"),
      v.literal("3-5"),
      v.literal("5-8"),
      v.literal("8-12"),
      v.literal("12-18"),
      v.literal("adult")
    ),
    skillLevel: v.string(),
    shortDescription: v.string(),
    fullGoalText: v.string(),
    defaultTargetAccuracy: v.number(),
    defaultConsecutiveSessions: v.number(),
    exampleBaseline: v.optional(v.string()),
    typicalCriterion: v.optional(v.string()),
    isCustom: v.boolean(),
    createdBy: v.optional(v.string()),
  })
    .index("by_domain", ["domain"])
    .index("by_domain_ageRange", ["domain", "ageRange"])
    .index("by_domain_skillLevel", ["domain", "skillLevel"])
    .index("by_createdBy", ["createdBy"]),
```

- [ ] **Step 2: Verify schema compiles**

```bash
cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit convex/schema.ts 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```
feat(schema): add goalBank table for 200+ curated therapy goals
```

---

### Task 2.2 — Seed Data: `convex/lib/goalBankSeed.ts`

**Files:**
- `convex/lib/goalBankSeed.ts` (new)

- [ ] **Step 1: Create the seed data file**

Create `convex/lib/goalBankSeed.ts` with a representative sample. The full 200+ goals should be completed after this initial set. Include 5-10 per domain as instructed:

```typescript
/**
 * Goal Bank Seed Data
 *
 * Representative sample of therapy goals across all 8 domains and 6 age ranges.
 * Full production bank should contain 200+ goals (see domain counts in spec).
 *
 * Domain target counts:
 *   Articulation: 40 | Language-Receptive: 30 | Language-Expressive: 30
 *   Fluency: 15 | Voice: 15 | Pragmatic/Social: 25 | AAC: 25 | Feeding: 20
 *
 * Each goal follows SMART format:
 *   "Given [context], [patient] will [behavior] with {accuracy}% accuracy
 *    across {sessions} consecutive sessions."
 */

export interface GoalBankSeedEntry {
  domain:
    | "articulation"
    | "language-receptive"
    | "language-expressive"
    | "fluency"
    | "voice"
    | "pragmatic-social"
    | "aac"
    | "feeding";
  ageRange: "0-3" | "3-5" | "5-8" | "8-12" | "12-18" | "adult";
  skillLevel: string;
  shortDescription: string;
  fullGoalText: string;
  defaultTargetAccuracy: number;
  defaultConsecutiveSessions: number;
  exampleBaseline?: string;
  typicalCriterion?: string;
}

export const GOAL_BANK_SEED: GoalBankSeedEntry[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ARTICULATION (10 of 40)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "isolation",
    shortDescription: "Produce /s/ in isolation",
    fullGoalText:
      "Given a verbal model, the client will produce /s/ in isolation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently unable to produce /s/ in isolation",
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /s/ in initial position of words",
    fullGoalText:
      "Given a verbal model, the client will produce /s/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently producing /s/ in isolation with 80% accuracy",
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /r/ in initial position of words",
    fullGoalText:
      "Given a verbal model, the client will produce /r/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently producing /w/ for /r/ in all positions",
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "phrase",
    shortDescription: "Produce /r/ in phrases",
    fullGoalText:
      "Given a structured activity, the client will produce /r/ correctly in 3-5 word phrases with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Produce /s/ blends in sentences",
    fullGoalText:
      "Given a picture prompt, the client will produce /s/ blends (sp, st, sk, sm, sn, sl, sw) correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "conversation",
    shortDescription: "Produce /s/ correctly in conversation",
    fullGoalText:
      "During structured conversation, the client will produce /s/ in all word positions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently producing /s/ in sentences with 70% accuracy",
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "syllable",
    shortDescription: "Produce /l/ in CV syllables",
    fullGoalText:
      "Given a verbal model, the client will produce /l/ in consonant-vowel syllables (la, le, li, lo, lu) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce voiced /th/ in words",
    fullGoalText:
      "Given a verbal model, the client will produce voiced /th/ in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "8-12",
    skillLevel: "conversation",
    shortDescription: "Self-correct articulation errors in conversation",
    fullGoalText:
      "During conversational speech, the client will independently self-correct articulation errors with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce final consonants in words",
    fullGoalText:
      "Given a verbal model, the client will produce final consonants in CVC words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently deleting final consonants in 60% of CVC words",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE — RECEPTIVE (8 of 30)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "single-step",
    shortDescription: "Follow single-step directions",
    fullGoalText:
      "Given a familiar routine, the client will follow single-step directions (e.g., 'give me', 'put in') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently follows single-step directions with 40% accuracy",
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "multi-step",
    shortDescription: "Follow 2-step directions",
    fullGoalText:
      "Given a structured activity, the client will follow 2-step directions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "single-step",
    shortDescription: "Identify basic concepts (spatial)",
    fullGoalText:
      "Given a field of objects, the client will identify basic spatial concepts (in, on, under, next to) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 90,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "complex",
    shortDescription: "Answer WH questions about a story",
    fullGoalText:
      "Given a short story read aloud, the client will correctly answer who, what, where, when, and why questions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "multi-step",
    shortDescription: "Follow 3-step directions",
    fullGoalText:
      "Given a classroom-style activity, the client will follow 3-step directions in correct sequence with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "8-12",
    skillLevel: "complex",
    shortDescription: "Identify main idea from a paragraph",
    fullGoalText:
      "Given a grade-level paragraph, the client will identify the main idea with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "single-step",
    shortDescription: "Identify common objects by function",
    fullGoalText:
      "Given a field of 3 objects, the client will identify common objects by function (e.g., 'which one do you drink from?') with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "12-18",
    skillLevel: "complex",
    shortDescription: "Interpret figurative language",
    fullGoalText:
      "Given spoken sentences containing idioms, metaphors, or similes, the client will correctly interpret the figurative meaning with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE — EXPRESSIVE (8 of 30)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domain: "language-expressive",
    ageRange: "0-3",
    skillLevel: "single-word",
    shortDescription: "Use functional single words",
    fullGoalText:
      "Given a motivating activity, the client will use functional single words to make requests with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently communicating primarily through gestures and vocalizations",
  },
  {
    domain: "language-expressive",
    ageRange: "0-3",
    skillLevel: "phrase",
    shortDescription: "Use 2-word combinations",
    fullGoalText:
      "Given a motivating activity, the client will spontaneously use 2-word combinations (agent+action, action+object) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "sentence",
    shortDescription: "Use subject-verb-object sentences",
    fullGoalText:
      "Given a structured activity, the client will produce grammatically correct SVO sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "sentence",
    shortDescription: "Use regular past tense -ed",
    fullGoalText:
      "Given a structured activity with past-tense context, the client will use regular past tense -ed correctly with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Use subject pronouns correctly",
    fullGoalText:
      "Given a structured activity, the client will use subject pronouns (he, she, they) correctly in spontaneous speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "narrative",
    shortDescription: "Retell a story with key elements",
    fullGoalText:
      "Given a short story, the client will retell the story including characters, setting, problem, and resolution with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "8-12",
    skillLevel: "narrative",
    shortDescription: "Generate a coherent narrative",
    fullGoalText:
      "Given a topic or picture sequence, the client will produce a coherent narrative with temporal markers and causal connections with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "12-18",
    skillLevel: "narrative",
    shortDescription: "Use complex sentences in discourse",
    fullGoalText:
      "During structured discourse, the client will use complex sentences with subordinate clauses with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FLUENCY (6 of 15)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domain: "fluency",
    ageRange: "5-8",
    skillLevel: "awareness",
    shortDescription: "Identify moments of stuttering",
    fullGoalText:
      "Given a structured speaking task, the client will identify moments of stuttering (blocks, repetitions, prolongations) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "5-8",
    skillLevel: "modification",
    shortDescription: "Use easy onset in sentences",
    fullGoalText:
      "Given a structured speaking task, the client will use easy onset technique in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "modification",
    shortDescription: "Use pull-out technique during stuttering",
    fullGoalText:
      "During conversational speech, the client will use pull-out technique to modify moments of stuttering with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "modification",
    shortDescription: "Use cancellation after stuttering",
    fullGoalText:
      "During structured conversation, the client will use cancellation technique (pause, rephrase with fluency-enhancing strategy) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "12-18",
    skillLevel: "transfer",
    shortDescription: "Maintain fluency strategies in conversation",
    fullGoalText:
      "During unstructured conversation, the client will independently implement fluency strategies (easy onset, light contact, slow rate) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "12-18",
    skillLevel: "transfer",
    shortDescription: "Self-monitor and self-correct disfluencies",
    fullGoalText:
      "During conversational speech, the client will identify and self-correct disfluencies independently with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE (5 of 15)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domain: "voice",
    ageRange: "5-8",
    skillLevel: "awareness",
    shortDescription: "Identify appropriate vs. inappropriate vocal volume",
    fullGoalText:
      "Given recorded voice samples, the client will identify appropriate vs. inappropriate vocal volume with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "5-8",
    skillLevel: "production",
    shortDescription: "Use appropriate vocal volume in structured tasks",
    fullGoalText:
      "Given a structured activity, the client will use appropriate vocal volume with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "8-12",
    skillLevel: "production",
    shortDescription: "Use appropriate breath support for voicing",
    fullGoalText:
      "Given a structured activity, the client will use appropriate breath support to sustain voicing for age-appropriate duration with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "12-18",
    skillLevel: "carryover",
    shortDescription: "Maintain appropriate pitch in conversation",
    fullGoalText:
      "During unstructured conversation, the client will maintain age- and gender-appropriate pitch with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "adult",
    skillLevel: "carryover",
    shortDescription: "Use resonant voice technique in daily speech",
    fullGoalText:
      "During daily communicative interactions, the client will use resonant voice technique to reduce vocal strain with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRAGMATIC / SOCIAL (7 of 25)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domain: "pragmatic-social",
    ageRange: "3-5",
    skillLevel: "basic",
    shortDescription: "Demonstrate turn-taking in play",
    fullGoalText:
      "Given a structured play activity, the client will demonstrate appropriate turn-taking with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "3-5",
    skillLevel: "basic",
    shortDescription: "Greet peers and adults appropriately",
    fullGoalText:
      "Given an arrival or greeting context, the client will initiate or respond to greetings with peers and adults with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "intermediate",
    shortDescription: "Maintain conversational topic for 3+ turns",
    fullGoalText:
      "Given a peer conversation, the client will maintain the conversational topic for 3 or more exchanges with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "intermediate",
    shortDescription: "Request clarification when confused",
    fullGoalText:
      "Given a structured activity with ambiguous instructions, the client will request clarification using appropriate language with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "intermediate",
    shortDescription: "Recognize and respond to emotions in others",
    fullGoalText:
      "Given social scenarios (role-play or video), the client will identify emotions in others and respond with appropriate comments with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "12-18",
    skillLevel: "advanced",
    shortDescription: "Use appropriate register in different settings",
    fullGoalText:
      "Given role-play scenarios, the client will adjust communication register (formal vs. informal) based on the setting with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "advanced",
    shortDescription: "Interpret nonverbal communication cues",
    fullGoalText:
      "Given video or in-person social scenarios, the client will correctly interpret nonverbal cues (facial expressions, body language, tone) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AAC (7 of 25)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domain: "aac",
    ageRange: "0-3",
    skillLevel: "symbol-recognition",
    shortDescription: "Match symbols to objects",
    fullGoalText:
      "Given a field of 3 symbols, the client will match symbols to corresponding real objects with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "single-symbol",
    shortDescription: "Use single symbols to make requests",
    fullGoalText:
      "Given a motivating activity, the client will independently select a single symbol on their AAC device to make requests with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "multi-symbol",
    shortDescription: "Combine 2 symbols for requests",
    fullGoalText:
      "Given a motivating activity, the client will combine 2 symbols on their AAC device (e.g., 'want + cookie') to make requests with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "multi-symbol",
    shortDescription: "Navigate AAC categories independently",
    fullGoalText:
      "Given a communication need, the client will independently navigate to the correct category on their AAC device with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "sentence-construction",
    shortDescription: "Construct 3-4 symbol sentences on AAC",
    fullGoalText:
      "Given a structured activity, the client will construct 3-4 symbol sentences on their AAC device with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "8-12",
    skillLevel: "sentence-construction",
    shortDescription: "Use AAC for social commenting",
    fullGoalText:
      "Given a peer social activity, the client will use their AAC device to make social comments (not just requests) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "symbol-recognition",
    shortDescription: "Identify core vocabulary symbols",
    fullGoalText:
      "Given a field of symbols, the client will identify core vocabulary symbols (want, more, stop, go, help) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDING (6 of 20)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "oral-motor",
    shortDescription: "Demonstrate adequate lip closure for spoon feeding",
    fullGoalText:
      "Given a spoon presentation, the client will demonstrate adequate lip closure to remove food from the spoon with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "texture-acceptance",
    shortDescription: "Accept puree textures without aversive response",
    fullGoalText:
      "Given presentation of puree foods, the client will accept the food (touch, smell, or taste) without aversive response with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "texture-acceptance",
    shortDescription: "Accept soft-solid textures",
    fullGoalText:
      "Given presentation of soft-solid foods, the client will accept and chew the food with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently accepting only puree textures",
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "self-feeding",
    shortDescription: "Use utensils for self-feeding",
    fullGoalText:
      "Given a meal, the client will independently use a spoon and fork for self-feeding with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "oral-motor",
    shortDescription: "Drink from an open cup with minimal spillage",
    fullGoalText:
      "Given an open cup, the client will drink with adequate lip seal and minimal spillage with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "5-8",
    skillLevel: "texture-acceptance",
    shortDescription: "Accept mixed-texture foods",
    fullGoalText:
      "Given presentation of mixed-texture foods (e.g., soup with chunks, cereal with milk), the client will accept and eat the food with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
];
```

- [ ] **Step 2: Commit**

```
feat(goalBank): add seed data with representative goals across all 8 domains
```

---

### Task 2.3 — Backend: `convex/goalBank.ts`

**Files:**
- `convex/goalBank.ts` (new)
- `convex/__tests__/goalBank.test.ts` (new)

- [ ] **Step 1: Write failing tests**

Create `convex/__tests__/goalBank.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};

// ── seed ────────────────────────────────────────────────────────────────────

describe("goalBank.seed", () => {
  it("seeds the goal bank with entries", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const results = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {});
    expect(results.length).toBeGreaterThan(0);
  });

  it("is idempotent — running twice does not duplicate", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const first = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {});
    await t.mutation(internal.goalBank.seed, {});
    const second = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {});
    expect(first.length).toBe(second.length);
  });
});

// ── search ──────────────────────────────────────────────────────────────────

describe("goalBank.search", () => {
  it("filters by domain", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const results = await slp.query(api.goalBank.search, { domain: "articulation" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((g: { domain: string }) => g.domain === "articulation")).toBe(true);
  });

  it("filters by domain + ageRange", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const results = await slp.query(api.goalBank.search, {
      domain: "articulation",
      ageRange: "3-5" as const,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((g: { ageRange: string }) => g.ageRange === "3-5")).toBe(true);
  });

  it("filters by keyword (substring match)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const results = await slp.query(api.goalBank.search, { keyword: "turn-taking" });
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for non-matching filters", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const results = await slp.query(api.goalBank.search, { keyword: "zzz-nonexistent-zzz" });
    expect(results).toEqual([]);
  });
});

// ── addCustom ───────────────────────────────────────────────────────────────

describe("goalBank.addCustom", () => {
  it("adds a custom goal visible to the creator", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const id = await slp.mutation(api.goalBank.addCustom, {
      domain: "fluency",
      ageRange: "8-12" as const,
      skillLevel: "awareness",
      shortDescription: "Count disfluencies per minute",
      fullGoalText: "Client will count disfluencies per minute with {accuracy}% accuracy across {sessions} consecutive sessions.",
      defaultTargetAccuracy: 80,
      defaultConsecutiveSessions: 3,
    });
    expect(id).toBeDefined();
    const results = await slp.query(api.goalBank.search, { includeCustom: true });
    const custom = results.find((g: { _id: typeof id }) => g._id === id);
    expect(custom).toBeDefined();
    expect(custom.isCustom).toBe(true);
    expect(custom.createdBy).toBe("slp-user-123");
  });

  it("rejects caregiver from adding custom goals", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(CAREGIVER_IDENTITY).mutation(api.goalBank.addCustom, {
        domain: "fluency",
        ageRange: "8-12" as const,
        skillLevel: "awareness",
        shortDescription: "Test",
        fullGoalText: "Test goal with {accuracy}% across {sessions} sessions.",
        defaultTargetAccuracy: 80,
        defaultConsecutiveSessions: 3,
      })
    ).rejects.toThrow();
  });
});

// ── removeCustom ────────────────────────────────────────────────────────────

describe("goalBank.removeCustom", () => {
  it("deletes a custom goal created by the SLP", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const id = await slp.mutation(api.goalBank.addCustom, {
      domain: "fluency",
      ageRange: "8-12" as const,
      skillLevel: "awareness",
      shortDescription: "Custom goal to delete",
      fullGoalText: "Test goal with {accuracy}% across {sessions} sessions.",
      defaultTargetAccuracy: 80,
      defaultConsecutiveSessions: 3,
    });
    await slp.mutation(api.goalBank.removeCustom, { id });
    const results = await slp.query(api.goalBank.search, { includeCustom: true });
    const deleted = results.find((g: { _id: typeof id }) => g._id === id);
    expect(deleted).toBeUndefined();
  });

  it("rejects deleting another SLP's custom goal", async () => {
    const t = convexTest(schema, modules);
    const slp1 = t.withIdentity(SLP_IDENTITY);
    const id = await slp1.mutation(api.goalBank.addCustom, {
      domain: "fluency",
      ageRange: "8-12" as const,
      skillLevel: "awareness",
      shortDescription: "SLP1 goal",
      fullGoalText: "Test goal with {accuracy}% across {sessions} sessions.",
      defaultTargetAccuracy: 80,
      defaultConsecutiveSessions: 3,
    });
    const slp2 = t.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.goalBank.removeCustom, { id })
    ).rejects.toThrow("Not authorized");
  });

  it("rejects deleting a system goal", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const results = await slp.query(api.goalBank.search, {});
    const systemGoal = results.find((g: { isCustom: boolean }) => !g.isCustom);
    if (systemGoal) {
      await expect(
        slp.mutation(api.goalBank.removeCustom, { id: systemGoal._id })
      ).rejects.toThrow("Cannot delete system goals");
    }
  });
});
```

- [ ] **Step 2: Verify tests fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/goalBank.test.ts 2>&1 | tail -20
```

- [ ] **Step 3: Implement `convex/goalBank.ts`**

```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { internalMutation } from "./_generated/server";
import { GOAL_BANK_SEED } from "./lib/goalBankSeed";
import { slpMutation, slpQuery } from "./lib/customFunctions";

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

const ageRangeValidator = v.union(
  v.literal("0-3"),
  v.literal("3-5"),
  v.literal("5-8"),
  v.literal("8-12"),
  v.literal("12-18"),
  v.literal("adult")
);

// ── Seed (internal) ─────────────────────────────────────────────────────────

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Idempotency: check if system goals already exist
    const existing = await ctx.db
      .query("goalBank")
      .withIndex("by_domain", (q) => q.eq("domain", "articulation"))
      .first();

    if (existing && !existing.isCustom) {
      // Already seeded
      return;
    }

    for (const entry of GOAL_BANK_SEED) {
      await ctx.db.insert("goalBank", {
        ...entry,
        isCustom: false,
      });
    }
  },
});

// ── Queries ─────────────────────────────────────────────────────────────────

export const search = slpQuery({
  args: {
    domain: v.optional(domainValidator),
    ageRange: v.optional(ageRangeValidator),
    skillLevel: v.optional(v.string()),
    keyword: v.optional(v.string()),
    includeCustom: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");

    let results;

    if (args.domain && args.ageRange) {
      results = await ctx.db
        .query("goalBank")
        .withIndex("by_domain_ageRange", (q) =>
          q.eq("domain", args.domain!).eq("ageRange", args.ageRange!)
        )
        .collect();
    } else if (args.domain && args.skillLevel) {
      results = await ctx.db
        .query("goalBank")
        .withIndex("by_domain_skillLevel", (q) =>
          q.eq("domain", args.domain!).eq("skillLevel", args.skillLevel!)
        )
        .collect();
    } else if (args.domain) {
      results = await ctx.db
        .query("goalBank")
        .withIndex("by_domain", (q) => q.eq("domain", args.domain!))
        .collect();
    } else {
      results = await ctx.db.query("goalBank").collect();
    }

    // Filter out custom goals unless requested
    if (!args.includeCustom) {
      results = results.filter((g) => !g.isCustom || g.createdBy === ctx.slpUserId);
    }

    // Keyword filter (substring on shortDescription + fullGoalText)
    if (args.keyword) {
      const kw = args.keyword.toLowerCase();
      results = results.filter(
        (g) =>
          g.shortDescription.toLowerCase().includes(kw) ||
          g.fullGoalText.toLowerCase().includes(kw)
      );
    }

    return results;
  },
});

export const listDomainSkillLevels = slpQuery({
  args: { domain: domainValidator },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    const goals = await ctx.db
      .query("goalBank")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .collect();

    const levels = new Set(goals.map((g) => g.skillLevel));
    return [...levels].sort();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const addCustom = slpMutation({
  args: {
    domain: domainValidator,
    ageRange: ageRangeValidator,
    skillLevel: v.string(),
    shortDescription: v.string(),
    fullGoalText: v.string(),
    defaultTargetAccuracy: v.number(),
    defaultConsecutiveSessions: v.number(),
    exampleBaseline: v.optional(v.string()),
    typicalCriterion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("goalBank", {
      ...args,
      isCustom: true,
      createdBy: ctx.slpUserId,
    });
  },
});

export const removeCustom = slpMutation({
  args: { id: v.id("goalBank") },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.id);
    if (!goal) throw new ConvexError("Goal not found");
    if (!goal.isCustom) throw new ConvexError("Cannot delete system goals");
    if (goal.createdBy !== ctx.slpUserId) throw new ConvexError("Not authorized");

    await ctx.db.delete(args.id);
  },
});
```

- [ ] **Step 4: Verify tests pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/goalBank.test.ts 2>&1 | tail -30
```

- [ ] **Step 5: Commit**

```
feat(goalBank): add goal bank backend with seed, search, custom goals via TDD
```

---

### Task 2.4 — Frontend: Rewrite Goal Bank Picker

**Files:**
- `src/features/goals/components/goal-bank-picker.tsx` (rewrite)
- `src/features/goals/lib/goal-bank-data.ts` (keep for backward compat but mark deprecated)
- `src/features/goals/hooks/use-goals.ts` (add goal bank hooks)
- `src/features/goals/components/goal-form.tsx` (update integration)

- [ ] **Step 1: Add goal bank hooks to `use-goals.ts`**

Append to `src/features/goals/hooks/use-goals.ts`:

```typescript
export function useGoalBankSearch(filters: {
  domain?: string;
  ageRange?: string;
  skillLevel?: string;
  keyword?: string;
  includeCustom?: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.goalBank.search,
    isAuthenticated ? filters as any : "skip"
  );
}

export function useGoalBankSkillLevels(domain: string | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.goalBank.listDomainSkillLevels,
    isAuthenticated && domain ? { domain } as any : "skip"
  );
}

export function useAddCustomGoal() {
  return useMutation(api.goalBank.addCustom);
}

export function useRemoveCustomGoal() {
  return useMutation(api.goalBank.removeCustom);
}
```

- [ ] **Step 2: Rewrite `goal-bank-picker.tsx`**

Replace the entire content of `src/features/goals/components/goal-bank-picker.tsx`:

```tsx
"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

import {
  useAddCustomGoal,
  useGoalBankSearch,
  useGoalBankSkillLevels,
  useRemoveCustomGoal,
} from "../hooks/use-goals";
import { domainColor, domainLabel } from "../lib/goal-utils";

const DOMAINS = [
  "articulation",
  "language-receptive",
  "language-expressive",
  "fluency",
  "voice",
  "pragmatic-social",
  "aac",
  "feeding",
] as const;

type Domain = (typeof DOMAINS)[number];

const AGE_RANGES = [
  { value: "0-3", label: "0–3 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "5-8", label: "5–8 years" },
  { value: "8-12", label: "8–12 years" },
  { value: "12-18", label: "12–18 years" },
  { value: "adult", label: "Adult" },
] as const;

type AgeRange = (typeof AGE_RANGES)[number]["value"];

interface GoalBankEntry {
  _id: string;
  domain: Domain;
  ageRange: AgeRange;
  skillLevel: string;
  shortDescription: string;
  fullGoalText: string;
  defaultTargetAccuracy: number;
  defaultConsecutiveSessions: number;
  isCustom: boolean;
}

interface GoalBankPickerProps {
  onSelect: (entry: {
    domain: Domain;
    shortDescription: string;
    fullGoalText: string;
    defaultTargetAccuracy: number;
    defaultConsecutiveSessions: number;
  }) => void;
}

export function GoalBankPicker({ onSelect }: GoalBankPickerProps) {
  const [selectedDomain, setSelectedDomain] = useState<Domain | "">("");
  const [selectedAgeRange, setSelectedAgeRange] = useState<AgeRange | "">("");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>("");
  const [keyword, setKeyword] = useState("");

  const domain = selectedDomain || undefined;
  const ageRange = selectedAgeRange || undefined;
  const skillLevel = selectedSkillLevel || undefined;
  const kw = keyword.trim() || undefined;

  const results = useGoalBankSearch({
    domain,
    ageRange: ageRange as any,
    skillLevel,
    keyword: kw,
    includeCustom: true,
  });

  const skillLevels = useGoalBankSkillLevels(domain ?? null);

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select
          value={selectedDomain}
          onValueChange={(v) => {
            setSelectedDomain(v as Domain);
            setSelectedSkillLevel("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All domains" />
          </SelectTrigger>
          <SelectContent>
            {DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>
                {domainLabel(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedAgeRange}
          onValueChange={(v) => setSelectedAgeRange(v as AgeRange)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All ages" />
          </SelectTrigger>
          <SelectContent>
            {AGE_RANGES.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {domain && skillLevels && skillLevels.length > 0 && (
          <Select
            value={selectedSkillLevel}
            onValueChange={setSelectedSkillLevel}
          >
            <SelectTrigger>
              <SelectValue placeholder="All skill levels" />
            </SelectTrigger>
            <SelectContent>
              {skillLevels.map((sl: string) => (
                <SelectItem key={sl} value={sl}>
                  {sl}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          placeholder="Search goals..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {/* Results */}
      {results === undefined ? (
        <p className="text-center text-xs text-muted-foreground">Loading goals...</p>
      ) : results.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No goals found. Try different filters.
        </p>
      ) : (
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {results.map((entry: GoalBankEntry) => (
            <button
              key={entry._id}
              type="button"
              onClick={() =>
                onSelect({
                  domain: entry.domain,
                  shortDescription: entry.shortDescription,
                  fullGoalText: entry.fullGoalText,
                  defaultTargetAccuracy: entry.defaultTargetAccuracy,
                  defaultConsecutiveSessions: entry.defaultConsecutiveSessions,
                })
              }
              className={cn(
                "flex flex-col gap-1 rounded-lg border border-border p-3 text-left transition-colors duration-300",
                "hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    domainColor(entry.domain)
                  )}
                >
                  {domainLabel(entry.domain)}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {entry.ageRange}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {entry.skillLevel}
                </Badge>
                {entry.isCustom && (
                  <Badge variant="secondary" className="text-[10px]">
                    My Goal
                  </Badge>
                )}
                <span className="text-sm font-medium">{entry.shortDescription}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {entry.fullGoalText
                  .replace("{accuracy}", String(entry.defaultTargetAccuracy))
                  .replace("{sessions}", String(entry.defaultConsecutiveSessions))}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `goal-form.tsx` to accept the new picker shape**

In `src/features/goals/components/goal-form.tsx`, update the `handleTemplateSelect` function signature and the import. The new picker's `onSelect` already returns `{ domain, shortDescription, fullGoalText, defaultTargetAccuracy, defaultConsecutiveSessions }` which is compatible. Update the import:

Replace:
```typescript
import { fillTemplate, type GoalDomain, type GoalTemplate } from "../lib/goal-bank-data";
```

With:
```typescript
import type { GoalDomain } from "../lib/goal-bank-data";
```

Update the `handleTemplateSelect` function:

Replace:
```typescript
  function handleTemplateSelect(template: GoalTemplate) {
    setDomain(template.domain);
    setShortDescription(template.shortDescription);
    setTargetAccuracy(template.defaultTargetAccuracy);
    setTargetConsecutiveSessions(template.defaultConsecutiveSessions);
    setFullGoalText(
      fillTemplate(template, template.defaultTargetAccuracy, template.defaultConsecutiveSessions)
    );
  }
```

With:
```typescript
  function handleTemplateSelect(template: {
    domain: GoalDomain;
    shortDescription: string;
    fullGoalText: string;
    defaultTargetAccuracy: number;
    defaultConsecutiveSessions: number;
  }) {
    setDomain(template.domain);
    setShortDescription(template.shortDescription);
    setTargetAccuracy(template.defaultTargetAccuracy);
    setTargetConsecutiveSessions(template.defaultConsecutiveSessions);
    setFullGoalText(
      template.fullGoalText
        .replace("{accuracy}", String(template.defaultTargetAccuracy))
        .replace("{sessions}", String(template.defaultConsecutiveSessions))
    );
  }
```

- [ ] **Step 4: Add deprecation note to `goal-bank-data.ts`**

Add at the top of `src/features/goals/lib/goal-bank-data.ts`:

```typescript
/**
 * @deprecated This static goal bank is replaced by the Convex-backed goalBank table.
 * Kept for backward compatibility with any direct references.
 * Use `api.goalBank.search` instead.
 */
```

- [ ] **Step 5: Verify the app compiles**

```bash
cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | tail -20
```

- [ ] **Step 6: Run existing goal tests to confirm no regressions**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/goals.test.ts 2>&1 | tail -20
```

- [ ] **Step 7: Commit**

```
feat(goals): rewrite goal bank picker to use Convex-backed 200+ goal bank
```

---

## Task Group 3: Home Program PDF Export

### Task 3.1 — Frontend: Print-Friendly Component

**Files:**
- `src/features/patients/components/home-program-print.tsx` (new)
- `src/app/(app)/patients/[id]/home-programs/[programId]/print/page.tsx` (new)
- `src/features/patients/components/home-programs-widget.tsx` (modify)
- `src/app/globals.css` (add print styles)

- [ ] **Step 1: Add print CSS to globals.css**

Append to the end of `src/app/globals.css`:

```css
/* ── Print styles for home program export ──────────────────────────────── */
@media print {
  /* Hide everything except the printable content */
  body > *:not(#print-root) {
    display: none !important;
  }

  /* Reset backgrounds for paper */
  body {
    background: white !important;
    color: black !important;
    font-size: 12pt;
    line-height: 1.5;
  }

  /* Hide interactive elements */
  .no-print,
  nav,
  header,
  aside,
  button:not(.print-trigger) {
    display: none !important;
  }

  /* Print-friendly spacing */
  .print-content {
    padding: 0 !important;
    margin: 0 auto !important;
    max-width: 100% !important;
  }

  /* Ensure page breaks work */
  .print-page-break {
    page-break-before: always;
  }

  /* Remove shadows and borders for clean print */
  .print-content * {
    box-shadow: none !important;
  }

  /* Force link URLs to show */
  .print-content a[href]::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
  }
}
```

- [ ] **Step 2: Create `home-program-print.tsx`**

Create `src/features/patients/components/home-program-print.tsx`:

```tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useCallback } from "react";

import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface HomeProgramPrintProps {
  patientId: Id<"patients">;
  programId: Id<"homePrograms">;
}

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  "3x-week": "3 times per week",
  weekly: "Weekly",
  "as-needed": "As needed",
};

export function HomeProgramPrint({ patientId, programId }: HomeProgramPrintProps) {
  const { isAuthenticated } = useConvexAuth();

  const programs = useQuery(
    api.homePrograms.listByPatient,
    isAuthenticated ? { patientId } : "skip"
  );

  const program = programs?.find(
    (p: { _id: Id<"homePrograms"> }) => p._id === programId
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (programs === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-on-surface-variant">Home program not found.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Print button — hidden in print */}
      <div className="no-print flex items-center justify-between border-b border-border p-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button onClick={handlePrint}>
          Print / Export PDF
        </Button>
      </div>

      {/* Printable content */}
      <div id="print-root" className="print-content mx-auto max-w-2xl p-8">
        {/* Header */}
        <div className="mb-8 border-b-2 border-primary pb-4">
          <h1 className="font-display text-2xl font-bold text-on-surface">
            Home Program
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Bridges Therapy Platform
          </p>
        </div>

        {/* Program details */}
        <div className="mb-6">
          <h2 className="mb-2 font-display text-xl font-semibold text-on-surface">
            {program.title}
          </h2>
          <div className="flex gap-4 text-sm text-on-surface-variant">
            <span>
              <strong>Frequency:</strong>{" "}
              {frequencyLabels[program.frequency] ?? program.frequency}
            </span>
            <span>
              <strong>Status:</strong>{" "}
              <span className="capitalize">{program.status}</span>
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-8">
          <h3 className="mb-2 text-base font-semibold text-on-surface">
            Instructions
          </h3>
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface-container p-4 text-sm leading-relaxed text-on-surface">
            {program.instructions}
          </div>
        </div>

        {/* Speech coach config if applicable */}
        {program.type === "speech-coach" && program.speechCoachConfig && (
          <div className="mb-8">
            <h3 className="mb-2 text-base font-semibold text-on-surface">
              Speech Coach Details
            </h3>
            <div className="rounded-lg border border-border p-4 text-sm">
              <p>
                <strong>Target Sounds:</strong>{" "}
                {program.speechCoachConfig.targetSounds.join(", ")}
              </p>
              <p>
                <strong>Age Range:</strong> {program.speechCoachConfig.ageRange}
              </p>
              <p>
                <strong>Duration:</strong>{" "}
                {program.speechCoachConfig.defaultDurationMinutes} minutes
              </p>
            </div>
          </div>
        )}

        {/* Practice tracking section (blank for parent to fill out) */}
        <div className="mb-8">
          <h3 className="mb-2 text-base font-semibold text-on-surface">
            Practice Log
          </h3>
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-surface-container">
                <th className="border border-border p-2 text-left">Date</th>
                <th className="border border-border p-2 text-left">Duration</th>
                <th className="border border-border p-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 7 }).map((_, i) => (
                <tr key={i}>
                  <td className="border border-border p-2">&nbsp;</td>
                  <td className="border border-border p-2">&nbsp;</td>
                  <td className="border border-border p-2">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 text-xs text-on-surface-variant">
          <p>
            Generated by Bridges Therapy Platform on{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="mt-1">
            Questions? Contact your speech-language pathologist.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the print route**

Create `src/app/(app)/patients/[id]/home-programs/[programId]/print/page.tsx`:

```tsx
"use client";

import { use } from "react";

import { HomeProgramPrint } from "@/features/patients/components/home-program-print";

import type { Id } from "../../../../../../../../convex/_generated/dataModel";

export default function HomeProgramPrintPage({
  params,
}: {
  params: Promise<{ id: string; programId: string }>;
}) {
  const { id, programId } = use(params);
  return (
    <HomeProgramPrint
      patientId={id as Id<"patients">}
      programId={programId as Id<"homePrograms">}
    />
  );
}
```

- [ ] **Step 4: Add print button to `home-programs-widget.tsx`**

In `src/features/patients/components/home-programs-widget.tsx`, add a print link to each program card. Add the import:

```typescript
import Link from "next/link";
import { MaterialIcon } from "@/shared/components/material-icon";
```

Then in the program card render (after the status badge inside the `.map`), add a print link:

```tsx
                    <Link
                      href={`/patients/${patientId}/home-programs/${program._id}/print`}
                      className="shrink-0 rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container"
                      title="Print home program"
                    >
                      <MaterialIcon icon="print" size="sm" />
                    </Link>
```

- [ ] **Step 5: Verify the app compiles**

```bash
cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```
feat(home-programs): add print-friendly PDF export via @media print CSS
```

---

## Verification

- [ ] **Final step: Run all tests**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/sessionTrials.test.ts convex/__tests__/goalBank.test.ts convex/__tests__/goals.test.ts convex/__tests__/homePrograms.test.ts 2>&1 | tail -40
```

---

## Task Summary

| # | Task | Type | Files | Est. |
|---|------|------|-------|------|
| 1.1 | Schema: `sessionTrials` table | Schema | `convex/schema.ts` | 10m |
| 1.2 | Backend: `sessionTrials.ts` with TDD | Backend | `convex/sessionTrials.ts`, `convex/__tests__/sessionTrials.test.ts` | 30m |
| 1.3 | Frontend: Data collection screen | Frontend | 8 files in `src/features/data-collection/` + route + patient detail mod | 45m |
| 2.1 | Schema: `goalBank` table | Schema | `convex/schema.ts` | 10m |
| 2.2 | Seed data: 57 representative goals | Data | `convex/lib/goalBankSeed.ts` | 15m |
| 2.3 | Backend: `goalBank.ts` with TDD | Backend | `convex/goalBank.ts`, `convex/__tests__/goalBank.test.ts` | 30m |
| 2.4 | Frontend: Rewrite goal bank picker | Frontend | 4 files in `src/features/goals/` | 30m |
| 3.1 | Home program print: component + CSS + route | Frontend | 4 files: print component, route, widget mod, globals.css | 30m |

**Total estimated time: ~3.5 hours**

**Dependencies between tasks:**
- 1.1 must complete before 1.2 (schema needed for backend)
- 1.2 must complete before 1.3 (API needed for frontend)
- 2.1 must complete before 2.2 and 2.3 (schema needed)
- 2.2 must complete before 2.3 (seed data needed)
- 2.3 must complete before 2.4 (API needed for frontend)
- Task groups 1, 2, and 3 are independent and can run in parallel (ideal for subagent-driven-development)
