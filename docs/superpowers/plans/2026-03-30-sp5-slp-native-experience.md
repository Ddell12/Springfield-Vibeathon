# SP5: SLP-Native Experience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the last paper workflows in SLP practice with live in-session trial data collection, a 200+ goal bank backed by Convex, and browser-based home program PDF export.
**Architecture:** Three independent features sharing the existing patient/goal schema. `sessionTrials` table stores per-trial data during sessions and links to `sessionNotes` afterward. `goalBank` table replaces the static 20-template array with DB-backed filterable goals. Home program print uses `@media print` CSS with no server-side PDF dependency.
**Tech Stack:** Convex (schema, queries, mutations), Next.js App Router, shadcn/ui, Tailwind v4, convex-test + Vitest

---

## Task 1: Add `sessionTrials` Table to Schema

**Files:**
- Modify: `convex/schema.ts:607` (before closing of `defineSchema`)

- [ ] **Step 1: Add `sessionTrials` table definition to schema**

In `convex/schema.ts`, add the `sessionTrials` table before the closing `});` of `defineSchema`:

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

Run: `cd /Users/desha/Springfield-Vibeathon && npx convex dev --once --typecheck=disable`
Expected: Schema push succeeds without errors

- [ ] **Step 3: Commit**

---

## Task 2: Add `goalBank` Table to Schema

**Files:**
- Modify: `convex/schema.ts:607` (before closing of `defineSchema`)

- [ ] **Step 1: Add `goalBank` table definition to schema**

In `convex/schema.ts`, add the `goalBank` table after the `sessionTrials` table:

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

Run: `cd /Users/desha/Springfield-Vibeathon && npx convex dev --once --typecheck=disable`
Expected: Schema push succeeds without errors

- [ ] **Step 3: Commit**

---

## Task 3: Implement `convex/sessionTrials.ts` Backend

**Files:**
- Create: `convex/sessionTrials.ts`
- Test: `convex/__tests__/sessionTrials.test.ts`

- [ ] **Step 1: Write the failing tests**

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
  it("creates a trial collection record", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    expect(trialId).toBeDefined();
  });

  it("sets correct initial fields", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    const active = await t.query(api.sessionTrials.getActiveForPatient, { patientId });
    expect(active).toHaveLength(1);
    expect(active[0]._id).toBe(trialId);
    expect(active[0].trials).toEqual([]);
    expect(active[0].targetDescription).toBe("Produce /r/ in initial position");
    expect(active[0].endedAt).toBeUndefined();
  });

  it("rejects non-owner SLP", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(slp1);
    const slp2 = base.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.sessionTrials.start, { patientId, goalId, sessionDate: today })
    ).rejects.toThrow("Not authorized");
  });
});

// ── recordTrial ────────────────────────────────────────────────────────────

describe("sessionTrials.recordTrial", () => {
  it("appends a trial to the array", async () => {
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
      cueLevel: "independent",
    });
    await t.mutation(api.sessionTrials.recordTrial, {
      trialId,
      correct: false,
      cueLevel: "mod-cue",
    });
    const active = await t.query(api.sessionTrials.getActiveForPatient, { patientId });
    expect(active[0].trials).toHaveLength(2);
    expect(active[0].trials[0].correct).toBe(true);
    expect(active[0].trials[0].cueLevel).toBe("independent");
    expect(active[0].trials[1].correct).toBe(false);
    expect(active[0].trials[1].cueLevel).toBe("mod-cue");
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
      t.mutation(api.sessionTrials.recordTrial, { trialId, correct: true, cueLevel: "independent" })
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
    const byDate = await t.query(api.sessionTrials.listByPatientDate, {
      patientId,
      sessionDate: today,
    });
    expect(byDate[0].endedAt).toBeDefined();
    expect(typeof byDate[0].endedAt).toBe("number");
  });
});

// ── linkToSessionNote ──────────────────────────────────────────────────────

describe("sessionTrials.linkToSessionNote", () => {
  it("links trial to session note and returns targetsWorkedOn", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    // Record 3 correct, 1 incorrect
    for (let i = 0; i < 3; i++) {
      await t.mutation(api.sessionTrials.recordTrial, {
        trialId,
        correct: true,
        cueLevel: "independent",
      });
    }
    await t.mutation(api.sessionTrials.recordTrial, {
      trialId,
      correct: false,
      cueLevel: "min-cue",
    });
    await t.mutation(api.sessionTrials.endCollection, { trialId });

    // Create a session note
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      sessionDate: today,
      sessionDuration: 30,
      sessionType: "in-person",
      structuredData: { targetsWorkedOn: [] },
    });

    const targets = await t.mutation(api.sessionTrials.linkToSessionNote, {
      trialIds: [trialId],
      sessionNoteId: noteId,
    });

    expect(targets).toHaveLength(1);
    expect(targets[0].target).toBe("Produce /r/ in initial position");
    expect(targets[0].trials).toBe(4);
    expect(targets[0].correct).toBe(3);
    expect(targets[0].promptLevel).toBe("independent");
    expect(targets[0].goalId).toBeDefined();
  });
});

// ── queries ────────────────────────────────────────────────────────────────

describe("sessionTrials queries", () => {
  it("listBySessionNote returns linked trials", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, goalId } = await setupPatientAndGoal(t);
    const trialId = await t.mutation(api.sessionTrials.start, {
      patientId,
      goalId,
      sessionDate: today,
    });
    await t.mutation(api.sessionTrials.endCollection, { trialId });

    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      sessionDate: today,
      sessionDuration: 30,
      sessionType: "in-person",
      structuredData: { targetsWorkedOn: [] },
    });

    await t.mutation(api.sessionTrials.linkToSessionNote, {
      trialIds: [trialId],
      sessionNoteId: noteId,
    });

    const linked = await t.query(api.sessionTrials.listBySessionNote, { sessionNoteId: noteId });
    expect(linked).toHaveLength(1);
  });

  it("getActiveForPatient excludes ended collections", async () => {
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/sessionTrials.test.ts`
Expected: FAIL — module `api.sessionTrials` does not exist

- [ ] **Step 3: Write the implementation**

Create `convex/sessionTrials.ts`:

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

/**
 * Maps data-collection cueLevel values to session note promptLevel values.
 *
 *   independent  → independent
 *   min-cue      → verbal-cue
 *   mod-cue      → model
 *   max-cue      → physical
 */
const CUE_TO_PROMPT: Record<string, "independent" | "verbal-cue" | "model" | "physical"> = {
  "independent": "independent",
  "min-cue": "verbal-cue",
  "mod-cue": "model",
  "max-cue": "physical",
};

/**
 * Determine the most frequent cue level in a trials array.
 * Returns the mapped promptLevel value for session notes.
 */
function mostFrequentCueLevel(
  trials: Array<{ cueLevel: string }>
): "independent" | "verbal-cue" | "model" | "physical" {
  const counts: Record<string, number> = {};
  for (const trial of trials) {
    counts[trial.cueLevel] = (counts[trial.cueLevel] ?? 0) + 1;
  }
  let maxCue = "independent";
  let maxCount = 0;
  for (const [cue, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxCue = cue;
    }
  }
  return CUE_TO_PROMPT[maxCue] ?? "independent";
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

    const newTrial = {
      correct: args.correct,
      cueLevel: args.cueLevel,
      timestamp: Date.now(),
    };

    await ctx.db.patch(args.trialId, {
      trials: [...record.trials, newTrial],
    });
  },
});

export const endCollection = slpMutation({
  args: {
    trialId: v.id("sessionTrials"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.trialId);
    if (!record) throw new ConvexError("Trial collection not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.endedAt !== undefined) throw new ConvexError("Collection already ended");

    await ctx.db.patch(args.trialId, {
      endedAt: Date.now(),
    });
  },
});

export const linkToSessionNote = slpMutation({
  args: {
    trialIds: v.array(v.id("sessionTrials")),
    sessionNoteId: v.id("sessionNotes"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.sessionNoteId);
    if (!note) throw new ConvexError("Session note not found");
    if (note.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    const targetsWorkedOn: Array<{
      target: string;
      goalId?: string;
      trials?: number;
      correct?: number;
      promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
    }> = [];

    for (const trialId of args.trialIds) {
      const record = await ctx.db.get(trialId);
      if (!record) continue;
      if (record.slpUserId !== ctx.slpUserId) continue;

      // Link to the session note
      await ctx.db.patch(trialId, { sessionNoteId: args.sessionNoteId });

      const totalTrials = record.trials.length;
      const correctCount = record.trials.filter((t) => t.correct).length;

      targetsWorkedOn.push({
        target: record.targetDescription,
        goalId: record.goalId as string,
        trials: totalTrials,
        correct: correctCount,
        promptLevel: totalTrials > 0 ? mostFrequentCueLevel(record.trials) : undefined,
      });
    }

    return targetsWorkedOn;
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

    // Filter to active (no endedAt) — cannot use index for optional field
    return all.filter((r) => r.endedAt === undefined);
  },
});

export const listBySessionNote = slpQuery({
  args: { sessionNoteId: v.id("sessionNotes") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("sessionTrials")
      .withIndex("by_sessionNoteId", (q) => q.eq("sessionNoteId", args.sessionNoteId))
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

    return await ctx.db
      .query("sessionTrials")
      .withIndex("by_patientId_sessionDate", (q) =>
        q.eq("patientId", args.patientId).eq("sessionDate", args.sessionDate)
      )
      .collect();
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/sessionTrials.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

---

## Task 4: Implement Goal Bank Seed Data

**Files:**
- Create: `convex/lib/goalBankSeed.ts`

- [ ] **Step 1: Create the seed data file**

Create `convex/lib/goalBankSeed.ts`:

```typescript
/**
 * Goal bank seed data — 200+ SMART goals across all 8 SLP domains.
 * Each goal follows: "Given [context], [client] will [behavior] with {accuracy}%
 * accuracy across {sessions} consecutive sessions."
 *
 * Placeholders: {accuracy} and {sessions} are filled at goal-creation time.
 */

export interface GoalBankEntry {
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

export const GOAL_BANK_SEED: GoalBankEntry[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ARTICULATION (40 goals)
  // Skill levels: isolation, syllable, word, phrase, sentence, conversation
  // ═══════════════════════════════════════════════════════════════════════════

  // -- /r/ sound progression --
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "isolation",
    shortDescription: "Produce /r/ in isolation",
    fullGoalText: "Given a verbal model, client will produce /r/ in isolation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently unable to produce /r/ in isolation",
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "syllable",
    shortDescription: "Produce /r/ in syllables",
    fullGoalText: "Given a verbal model, client will produce /r/ in CV and VC syllables with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /r/ in initial position of words",
    fullGoalText: "Given a visual cue, client will produce /r/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently producing /r/ at word level with 40% accuracy",
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /r/ in final position of words",
    fullGoalText: "Given a visual cue, client will produce /r/ in the final position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "phrase",
    shortDescription: "Produce /r/ in carrier phrases",
    fullGoalText: "Given a structured activity, client will produce /r/ in carrier phrases with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "8-12",
    skillLevel: "sentence",
    shortDescription: "Produce /r/ in sentences",
    fullGoalText: "Given minimal cues, client will produce /r/ correctly in structured sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "8-12",
    skillLevel: "conversation",
    shortDescription: "Produce /r/ in conversation",
    fullGoalText: "Client will produce /r/ correctly during spontaneous conversation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // -- /s/ sound progression --
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "isolation",
    shortDescription: "Produce /s/ in isolation",
    fullGoalText: "Given a verbal model, client will produce /s/ in isolation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /s/ in initial position of words",
    fullGoalText: "Given a visual cue, client will produce /s/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /s/ in final position of words",
    fullGoalText: "Given a visual cue, client will produce /s/ in the final position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce /s/ blends in words",
    fullGoalText: "Client will produce /s/ blends (sp, st, sk, sm, sn, sl, sw) in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Produce /s/ in sentences",
    fullGoalText: "Given minimal cues, client will produce /s/ correctly in structured sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // -- /l/ sound progression --
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /l/ in initial position of words",
    fullGoalText: "Given a verbal model, client will produce /l/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Produce /l/ in sentences",
    fullGoalText: "Given minimal cues, client will produce /l/ correctly in sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // -- /th/ sound progression --
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce voiced /th/ in words",
    fullGoalText: "Client will produce voiced /th/ in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce voiceless /th/ in words",
    fullGoalText: "Client will produce voiceless /th/ in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // -- /sh/, /ch/, /j/ sounds --
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /sh/ in initial position",
    fullGoalText: "Given a verbal model, client will produce /sh/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /ch/ in words",
    fullGoalText: "Given a verbal model, client will produce /ch/ in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // -- /k/, /g/ sounds --
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /k/ in initial position",
    fullGoalText: "Given a verbal model, client will produce /k/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Produce /g/ in initial position",
    fullGoalText: "Given a verbal model, client will produce /g/ in the initial position of words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // -- Phonological processes --
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Reduce fronting (velar sounds)",
    fullGoalText: "Client will eliminate the phonological process of fronting by producing velar sounds /k/ and /g/ in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently substituting /t/ for /k/ and /d/ for /g/",
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Reduce cluster reduction",
    fullGoalText: "Client will produce consonant clusters without reduction in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "3-5",
    skillLevel: "word",
    shortDescription: "Reduce final consonant deletion",
    fullGoalText: "Client will produce final consonants in CVC words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "0-3",
    skillLevel: "word",
    shortDescription: "Reduce stopping of fricatives",
    fullGoalText: "Client will produce fricative sounds /f/, /s/, /sh/ without stopping in words with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // -- Multi-syllable/late sounds --
  {
    domain: "articulation",
    ageRange: "5-8",
    skillLevel: "word",
    shortDescription: "Produce multisyllabic words accurately",
    fullGoalText: "Client will produce 3+ syllable words with correct syllable structure with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "8-12",
    skillLevel: "conversation",
    shortDescription: "Overall speech intelligibility in conversation",
    fullGoalText: "Client will be intelligible to unfamiliar listeners in spontaneous conversation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 90,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "articulation",
    ageRange: "12-18",
    skillLevel: "conversation",
    shortDescription: "Self-correct articulation errors in conversation",
    fullGoalText: "Client will independently self-correct articulation errors during spontaneous conversation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE — RECEPTIVE (30 goals)
  // Skill levels: single-step, multi-step, complex
  // ═══════════════════════════════════════════════════════════════════════════

  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "single-step",
    shortDescription: "Follow 1-step directions",
    fullGoalText: "Given a verbal direction with gestural cue, client will follow 1-step directions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently follows 1-step directions with visual cue at 40% accuracy",
  },
  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "single-step",
    shortDescription: "Identify common objects by name",
    fullGoalText: "Given a field of 3 objects, client will identify common objects by name with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "0-3",
    skillLevel: "single-step",
    shortDescription: "Identify body parts",
    fullGoalText: "Given a verbal request, client will point to named body parts with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "multi-step",
    shortDescription: "Follow 2-step directions",
    fullGoalText: "Client will follow 2-step unrelated directions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    typicalCriterion: "80% accuracy across 3 consecutive sessions",
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "single-step",
    shortDescription: "Identify basic concepts (size, location)",
    fullGoalText: "Client will identify basic concepts (big/little, on/off, in/out) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 90,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "single-step",
    shortDescription: "Identify actions in pictures",
    fullGoalText: "Given a picture stimulus, client will identify the depicted action with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "3-5",
    skillLevel: "multi-step",
    shortDescription: "Answer who/what WH questions",
    fullGoalText: "Given a short story or picture, client will answer who and what questions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "multi-step",
    shortDescription: "Follow 3-step directions",
    fullGoalText: "Client will follow 3-step directions presented verbally with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "multi-step",
    shortDescription: "Answer where/when/why WH questions",
    fullGoalText: "Given a short narrative, client will answer where, when, and why questions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "5-8",
    skillLevel: "complex",
    shortDescription: "Understand temporal concepts",
    fullGoalText: "Client will demonstrate understanding of temporal concepts (before, after, first, last) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "8-12",
    skillLevel: "complex",
    shortDescription: "Understand inferential questions",
    fullGoalText: "Given a grade-level passage, client will answer inferential comprehension questions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-receptive",
    ageRange: "8-12",
    skillLevel: "complex",
    shortDescription: "Identify main idea and details",
    fullGoalText: "Given a grade-level passage, client will identify the main idea and 2 supporting details with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LANGUAGE — EXPRESSIVE (30 goals)
  // Skill levels: single-word, phrase, sentence, narrative
  // ═══════════════════════════════════════════════════════════════════════════

  {
    domain: "language-expressive",
    ageRange: "0-3",
    skillLevel: "single-word",
    shortDescription: "Use single words to request",
    fullGoalText: "Client will use single words to make requests for desired items/actions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently uses gestures/pointing to communicate wants",
  },
  {
    domain: "language-expressive",
    ageRange: "0-3",
    skillLevel: "single-word",
    shortDescription: "Label common objects",
    fullGoalText: "Given a visual stimulus, client will expressively label common objects with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "0-3",
    skillLevel: "phrase",
    shortDescription: "Use 2-word combinations",
    fullGoalText: "Client will spontaneously use 2-word combinations to make requests and comments with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "phrase",
    shortDescription: "Use 3-4 word utterances",
    fullGoalText: "Client will use 3-4 word utterances with correct word order to describe, request, and comment with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "sentence",
    shortDescription: "Use subject pronouns correctly",
    fullGoalText: "Client will use subject pronouns (he, she, they) correctly in spontaneous speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "sentence",
    shortDescription: "Use possessive pronouns",
    fullGoalText: "Client will use possessive pronouns (my, his, her, their) correctly in structured activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "3-5",
    skillLevel: "sentence",
    shortDescription: "Use regular past tense -ed",
    fullGoalText: "Client will use regular past tense -ed in structured activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Use irregular past tense verbs",
    fullGoalText: "Client will use irregular past tense verbs (went, ate, saw) correctly in spontaneous speech with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "sentence",
    shortDescription: "Use complex sentences with conjunctions",
    fullGoalText: "Client will produce complex sentences using conjunctions (because, but, so, if) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "5-8",
    skillLevel: "narrative",
    shortDescription: "Retell a story with key elements",
    fullGoalText: "Given a short story, client will retell including character, setting, problem, and solution with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "8-12",
    skillLevel: "narrative",
    shortDescription: "Generate a personal narrative",
    fullGoalText: "Client will generate a coherent personal narrative with a clear beginning, middle, and end with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "language-expressive",
    ageRange: "8-12",
    skillLevel: "sentence",
    shortDescription: "Use age-appropriate vocabulary in context",
    fullGoalText: "Client will use age-appropriate vocabulary words in context during structured activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FLUENCY (15 goals)
  // Skill levels: awareness, modification, transfer
  // ═══════════════════════════════════════════════════════════════════════════

  {
    domain: "fluency",
    ageRange: "3-5",
    skillLevel: "awareness",
    shortDescription: "Identify bumpy vs. smooth speech",
    fullGoalText: "Client will identify bumpy vs. smooth speech in clinician models with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "5-8",
    skillLevel: "awareness",
    shortDescription: "Identify own moments of disfluency",
    fullGoalText: "Client will identify own moments of disfluency during structured reading tasks with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "5-8",
    skillLevel: "modification",
    shortDescription: "Use easy onset in words/phrases",
    fullGoalText: "Client will use easy onset technique when initiating words and phrases with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "modification",
    shortDescription: "Use easy onset in sentences",
    fullGoalText: "Client will use easy onset technique in structured sentences with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "modification",
    shortDescription: "Use pull-out technique during disfluency",
    fullGoalText: "Client will use pull-out technique during moments of stuttering in structured activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "modification",
    shortDescription: "Use cancellation technique",
    fullGoalText: "Client will use cancellation technique after moments of stuttering during reading tasks with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "8-12",
    skillLevel: "modification",
    shortDescription: "Use light contact on difficult sounds",
    fullGoalText: "Client will use light articulatory contact on known difficult sounds during structured speaking tasks with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "12-18",
    skillLevel: "transfer",
    shortDescription: "Use fluency strategies in classroom",
    fullGoalText: "Client will independently use fluency strategies during classroom presentations and discussions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "12-18",
    skillLevel: "transfer",
    shortDescription: "Self-monitor disfluencies in conversation",
    fullGoalText: "Client will identify and self-correct disfluencies during spontaneous conversation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "fluency",
    ageRange: "adult",
    skillLevel: "transfer",
    shortDescription: "Use fluency strategies in workplace",
    fullGoalText: "Client will independently use fluency strategies during workplace conversations with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VOICE (15 goals)
  // Skill levels: awareness, production, carryover
  // ═══════════════════════════════════════════════════════════════════════════

  {
    domain: "voice",
    ageRange: "5-8",
    skillLevel: "awareness",
    shortDescription: "Identify loud vs. soft voice",
    fullGoalText: "Client will identify loud vs. soft voice in clinician models with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "5-8",
    skillLevel: "awareness",
    shortDescription: "Identify vocally abusive behaviors",
    fullGoalText: "Client will identify vocally abusive behaviors (yelling, throat clearing) from a list with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "8-12",
    skillLevel: "production",
    shortDescription: "Use appropriate vocal volume",
    fullGoalText: "Client will use appropriate vocal volume in structured activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "8-12",
    skillLevel: "production",
    shortDescription: "Use resonant voice technique",
    fullGoalText: "Client will produce voice using resonant voice technique during structured tasks with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "8-12",
    skillLevel: "production",
    shortDescription: "Maintain appropriate pitch during speech",
    fullGoalText: "Client will maintain appropriate pitch during connected speech tasks with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "12-18",
    skillLevel: "production",
    shortDescription: "Use diaphragmatic breathing for voice support",
    fullGoalText: "Client will use diaphragmatic breathing to support voice production during reading tasks with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "12-18",
    skillLevel: "carryover",
    shortDescription: "Reduce vocal strain in conversation",
    fullGoalText: "Client will use trained voice techniques to reduce vocal strain during spontaneous conversation with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "voice",
    ageRange: "adult",
    skillLevel: "carryover",
    shortDescription: "Maintain vocal hygiene program",
    fullGoalText: "Client will demonstrate adherence to a vocal hygiene program by eliminating vocally abusive behaviors with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRAGMATIC/SOCIAL (25 goals)
  // Skill levels: basic, intermediate, advanced
  // ═══════════════════════════════════════════════════════════════════════════

  {
    domain: "pragmatic-social",
    ageRange: "0-3",
    skillLevel: "basic",
    shortDescription: "Establish joint attention",
    fullGoalText: "Client will establish joint attention by looking at a shared object/activity when prompted with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "0-3",
    skillLevel: "basic",
    shortDescription: "Respond to name",
    fullGoalText: "Client will orient toward speaker when name is called with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "3-5",
    skillLevel: "basic",
    shortDescription: "Demonstrate turn-taking in play",
    fullGoalText: "Client will demonstrate appropriate turn-taking during structured play activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "3-5",
    skillLevel: "basic",
    shortDescription: "Greet familiar adults and peers",
    fullGoalText: "Client will greet familiar adults and peers using verbal greeting or wave with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "3-5",
    skillLevel: "intermediate",
    shortDescription: "Comment on shared activities",
    fullGoalText: "Client will make spontaneous comments about shared activities with a communication partner with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "intermediate",
    shortDescription: "Maintain conversational topic for 3+ exchanges",
    fullGoalText: "Client will maintain a conversational topic for 3 or more exchanges with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "intermediate",
    shortDescription: "Use appropriate eye contact during conversation",
    fullGoalText: "Client will maintain appropriate eye contact during conversational exchanges with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "5-8",
    skillLevel: "intermediate",
    shortDescription: "Identify emotions from facial expressions",
    fullGoalText: "Given a visual stimulus, client will correctly identify emotions from facial expressions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "intermediate",
    shortDescription: "Ask on-topic questions during conversation",
    fullGoalText: "Client will ask relevant on-topic questions during structured conversational activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "advanced",
    shortDescription: "Interpret nonliteral language (idioms, sarcasm)",
    fullGoalText: "Client will correctly interpret nonliteral language including idioms, metaphors, and sarcasm with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "8-12",
    skillLevel: "advanced",
    shortDescription: "Perspective-taking in social scenarios",
    fullGoalText: "Given a social scenario, client will identify another person's perspective or feelings with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "pragmatic-social",
    ageRange: "12-18",
    skillLevel: "advanced",
    shortDescription: "Repair conversational breakdowns",
    fullGoalText: "Client will use repair strategies when a conversational breakdown occurs with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AAC (25 goals)
  // Skill levels: symbol-recognition, single-symbol, multi-symbol, sentence-construction
  // ═══════════════════════════════════════════════════════════════════════════

  {
    domain: "aac",
    ageRange: "0-3",
    skillLevel: "symbol-recognition",
    shortDescription: "Recognize AAC symbols for familiar items",
    fullGoalText: "Client will recognize and point to AAC symbols representing familiar items when named with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "0-3",
    skillLevel: "single-symbol",
    shortDescription: "Use single symbol to request",
    fullGoalText: "Client will independently select a single symbol on AAC device to make a request with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "single-symbol",
    shortDescription: "Use AAC to protest/reject",
    fullGoalText: "Client will use AAC device to protest or reject non-preferred items/activities with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "multi-symbol",
    shortDescription: "Combine 2 symbols on AAC device",
    fullGoalText: "Client will independently combine 2 symbols on AAC device to make requests with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "3-5",
    skillLevel: "single-symbol",
    shortDescription: "Navigate AAC categories to find vocabulary",
    fullGoalText: "Client will independently navigate to the correct category on AAC device to find target vocabulary with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "multi-symbol",
    shortDescription: "Use AAC to comment on activities",
    fullGoalText: "Client will use 2+ symbol combinations on AAC device to comment on activities or events with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "multi-symbol",
    shortDescription: "Use AAC to answer WH questions",
    fullGoalText: "Client will use AAC device to answer who, what, and where questions with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "5-8",
    skillLevel: "sentence-construction",
    shortDescription: "Construct 3+ symbol utterances on AAC",
    fullGoalText: "Client will construct 3+ symbol utterances on AAC device using subject-verb-object structure with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "8-12",
    skillLevel: "sentence-construction",
    shortDescription: "Use AAC for narrative retell",
    fullGoalText: "Client will use AAC device to retell a short story including character, setting, and event with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "aac",
    ageRange: "8-12",
    skillLevel: "sentence-construction",
    shortDescription: "Initiate conversation using AAC",
    fullGoalText: "Client will independently initiate a conversational exchange using AAC device with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FEEDING (20 goals)
  // Skill levels: oral-motor, texture-acceptance, self-feeding
  // ═══════════════════════════════════════════════════════════════════════════

  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "oral-motor",
    shortDescription: "Demonstrate coordinated suck-swallow-breathe",
    fullGoalText: "Client will demonstrate coordinated suck-swallow-breathe pattern during bottle feeding with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "oral-motor",
    shortDescription: "Accept spoon presentation without tongue thrust",
    fullGoalText: "Client will accept spoon presentation and clear food from spoon without excessive tongue thrust with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "oral-motor",
    shortDescription: "Demonstrate lateral tongue movement for chewing",
    fullGoalText: "Client will demonstrate lateral tongue movement to move food to molars for chewing with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "0-3",
    skillLevel: "texture-acceptance",
    shortDescription: "Accept puree presentation without aversion",
    fullGoalText: "Client will accept presentation of pureed foods without aversive response (gagging, turning away, crying) with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "texture-acceptance",
    shortDescription: "Accept varied food textures",
    fullGoalText: "Client will accept presentation of new food textures (touch, smell, or taste) without aversive response with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
    exampleBaseline: "Currently accepts only smooth purees, rejects all lumpy/solid textures",
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "texture-acceptance",
    shortDescription: "Transition from puree to soft solids",
    fullGoalText: "Client will chew and swallow soft solid foods (bananas, cooked vegetables) without gagging with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "texture-acceptance",
    shortDescription: "Tolerate new food on plate",
    fullGoalText: "Client will tolerate a novel food placed on their plate without removing it or refusing to eat other foods with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "self-feeding",
    shortDescription: "Use utensils for self-feeding",
    fullGoalText: "Client will independently use a spoon and fork to self-feed during meals with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "3-5",
    skillLevel: "self-feeding",
    shortDescription: "Drink from an open cup",
    fullGoalText: "Client will independently drink from an open cup with minimal spillage with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 80,
    defaultConsecutiveSessions: 3,
  },
  {
    domain: "feeding",
    ageRange: "5-8",
    skillLevel: "texture-acceptance",
    shortDescription: "Expand accepted food variety",
    fullGoalText: "Client will taste and accept at least 1 new food per session from each food group with {accuracy}% accuracy across {sessions} consecutive sessions.",
    defaultTargetAccuracy: 70,
    defaultConsecutiveSessions: 3,
  },
];
```

- [ ] **Step 2: Verify the file has no TypeScript errors**

Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit --strict convex/lib/goalBankSeed.ts 2>&1 | head -20`
Expected: No errors (or only project-level errors unrelated to this file)

- [ ] **Step 3: Commit**

---

## Task 5: Implement `convex/goalBank.ts` Backend

**Files:**
- Create: `convex/goalBank.ts`
- Test: `convex/__tests__/goalBank.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `convex/__tests__/goalBank.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

// ── seed ────────────────────────────────────────────────────────────────────

describe("goalBank.seed", () => {
  it("inserts goals from seed data", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const results = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {});
    expect(results.length).toBeGreaterThan(0);
  });

  it("is idempotent — running twice does not double goals", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    await t.mutation(internal.goalBank.seed, {});
    const results = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {});
    // Count should match seed data length, not 2x
    const firstCount = results.length;
    await t.mutation(internal.goalBank.seed, {});
    const secondResults = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {});
    expect(secondResults.length).toBe(firstCount);
  });
});

// ── search ──────────────────────────────────────────────────────────────────

describe("goalBank.search", () => {
  it("returns all goals when no filters", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const results = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {});
    expect(results.length).toBeGreaterThan(10);
  });

  it("filters by domain", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const results = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {
      domain: "fluency",
    });
    expect(results.length).toBeGreaterThan(0);
    for (const goal of results) {
      expect(goal.domain).toBe("fluency");
    }
  });

  it("filters by domain and ageRange", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const results = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {
      domain: "articulation",
      ageRange: "3-5",
    });
    expect(results.length).toBeGreaterThan(0);
    for (const goal of results) {
      expect(goal.domain).toBe("articulation");
      expect(goal.ageRange).toBe("3-5");
    }
  });

  it("filters by keyword (substring match)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const results = await t.withIdentity(SLP_IDENTITY).query(api.goalBank.search, {
      keyword: "turn-taking",
    });
    expect(results.length).toBeGreaterThan(0);
    for (const goal of results) {
      const text = (goal.shortDescription + " " + goal.fullGoalText).toLowerCase();
      expect(text).toContain("turn-taking");
    }
  });
});

// ── addCustom ───────────────────────────────────────────────────────────────

describe("goalBank.addCustom", () => {
  it("creates a custom goal with isCustom=true and createdBy set", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const id = await t.mutation(api.goalBank.addCustom, {
      domain: "articulation",
      ageRange: "5-8",
      skillLevel: "word",
      shortDescription: "My custom /r/ goal",
      fullGoalText: "Client will do a custom thing with {accuracy}% accuracy across {sessions} sessions.",
      defaultTargetAccuracy: 80,
      defaultConsecutiveSessions: 3,
    });
    expect(id).toBeDefined();

    const results = await t.query(api.goalBank.search, {
      keyword: "custom /r/ goal",
    });
    expect(results.length).toBe(1);
    expect(results[0].isCustom).toBe(true);
    expect(results[0].createdBy).toBe("slp-user-123");
  });
});

// ── removeCustom ────────────────────────────────────────────────────────────

describe("goalBank.removeCustom", () => {
  it("removes a custom goal created by the SLP", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const id = await t.mutation(api.goalBank.addCustom, {
      domain: "fluency",
      ageRange: "8-12",
      skillLevel: "modification",
      shortDescription: "Custom fluency goal",
      fullGoalText: "Client will use a custom technique with {accuracy}% accuracy across {sessions} sessions.",
      defaultTargetAccuracy: 70,
      defaultConsecutiveSessions: 3,
    });
    await t.mutation(api.goalBank.removeCustom, { goalId: id });
    const results = await t.query(api.goalBank.search, { keyword: "Custom fluency goal" });
    expect(results).toHaveLength(0);
  });

  it("rejects removing another SLP's custom goal", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const id = await slp1.mutation(api.goalBank.addCustom, {
      domain: "voice",
      ageRange: "adult",
      skillLevel: "carryover",
      shortDescription: "Someone else's goal",
      fullGoalText: "Client will do something with {accuracy}% accuracy across {sessions} sessions.",
      defaultTargetAccuracy: 80,
      defaultConsecutiveSessions: 3,
    });
    const slp2 = base.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.goalBank.removeCustom, { goalId: id })
    ).rejects.toThrow();
  });

  it("rejects removing a system goal", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const goals = await slp.query(api.goalBank.search, { domain: "articulation" });
    const systemGoal = goals.find((g: { isCustom: boolean }) => !g.isCustom);
    expect(systemGoal).toBeDefined();
    await expect(
      slp.mutation(api.goalBank.removeCustom, { goalId: systemGoal!._id })
    ).rejects.toThrow("Cannot remove system goals");
  });
});

// ── listDomainSkillLevels ───────────────────────────────────────────────────

describe("goalBank.listDomainSkillLevels", () => {
  it("returns distinct skill levels for a domain", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.goalBank.seed, {});
    const slp = t.withIdentity(SLP_IDENTITY);
    const levels = await slp.query(api.goalBank.listDomainSkillLevels, {
      domain: "articulation",
    });
    expect(levels).toContain("isolation");
    expect(levels).toContain("word");
    expect(levels).toContain("sentence");
    expect(levels).toContain("conversation");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/goalBank.test.ts`
Expected: FAIL — module `api.goalBank` does not exist

- [ ] **Step 3: Write the implementation**

Create `convex/goalBank.ts`:

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

// ── Internal Mutations ──────────────────────────────────────────────────────

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Idempotency check: if any system goal exists, skip
    const existing = await ctx.db
      .query("goalBank")
      .withIndex("by_domain", (q) => q.eq("domain", "articulation"))
      .first();

    if (existing && !existing.isCustom) {
      return; // Already seeded
    }

    for (const entry of GOAL_BANK_SEED) {
      await ctx.db.insert("goalBank", {
        domain: entry.domain,
        ageRange: entry.ageRange,
        skillLevel: entry.skillLevel,
        shortDescription: entry.shortDescription,
        fullGoalText: entry.fullGoalText,
        defaultTargetAccuracy: entry.defaultTargetAccuracy,
        defaultConsecutiveSessions: entry.defaultConsecutiveSessions,
        exampleBaseline: entry.exampleBaseline,
        typicalCriterion: entry.typicalCriterion,
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
        .take(200);
    } else if (args.domain && args.skillLevel) {
      results = await ctx.db
        .query("goalBank")
        .withIndex("by_domain_skillLevel", (q) =>
          q.eq("domain", args.domain!).eq("skillLevel", args.skillLevel!)
        )
        .take(200);
    } else if (args.domain) {
      results = await ctx.db
        .query("goalBank")
        .withIndex("by_domain", (q) => q.eq("domain", args.domain!))
        .take(200);
    } else {
      results = await ctx.db
        .query("goalBank")
        .take(200);
    }

    // Apply keyword filter in-memory (substring match)
    if (args.keyword) {
      const kw = args.keyword.toLowerCase();
      results = results.filter((g) => {
        const text = (g.shortDescription + " " + g.fullGoalText).toLowerCase();
        return text.includes(kw);
      });
    }

    // Apply skill level filter in-memory if domain+ageRange index was used
    if (args.skillLevel && args.ageRange) {
      results = results.filter((g) => g.skillLevel === args.skillLevel);
    }

    return results;
  },
});

export const listDomainSkillLevels = slpQuery({
  args: {
    domain: domainValidator,
  },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");

    const goals = await ctx.db
      .query("goalBank")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .take(200);

    const levels = new Set<string>();
    for (const g of goals) {
      levels.add(g.skillLevel);
    }
    return Array.from(levels).sort();
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
    const desc = args.shortDescription.trim();
    if (desc.length === 0 || desc.length > 200) {
      throw new ConvexError("Short description must be 1-200 characters");
    }

    return await ctx.db.insert("goalBank", {
      domain: args.domain,
      ageRange: args.ageRange,
      skillLevel: args.skillLevel,
      shortDescription: desc,
      fullGoalText: args.fullGoalText.trim(),
      defaultTargetAccuracy: args.defaultTargetAccuracy,
      defaultConsecutiveSessions: args.defaultConsecutiveSessions,
      exampleBaseline: args.exampleBaseline,
      typicalCriterion: args.typicalCriterion,
      isCustom: true,
      createdBy: ctx.slpUserId,
    });
  },
});

export const removeCustom = slpMutation({
  args: {
    goalId: v.id("goalBank"),
  },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal) throw new ConvexError("Goal not found");
    if (!goal.isCustom) throw new ConvexError("Cannot remove system goals");
    if (goal.createdBy !== ctx.slpUserId) throw new ConvexError("Not authorized");

    await ctx.db.delete(args.goalId);
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/goalBank.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

---

## Task 6: Data Collection Hook and Route

**Files:**
- Create: `src/features/data-collection/hooks/use-data-collection.ts`
- Create: `src/app/(app)/patients/[id]/collect/page.tsx`

- [ ] **Step 1: Create the data collection hook**

Create `src/features/data-collection/hooks/use-data-collection.ts`:

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export type CueLevel = "independent" | "min-cue" | "mod-cue" | "max-cue";

interface TrialEntry {
  correct: boolean;
  cueLevel: CueLevel;
  timestamp: number;
}

interface ActiveCollection {
  _id: Id<"sessionTrials">;
  goalId: Id<"goals">;
  targetDescription: string;
  trials: TrialEntry[];
  startedAt: number;
  endedAt?: number;
}

export function useDataCollection(patientId: Id<"patients">) {
  const [cueLevel, setCueLevel] = useState<CueLevel>("independent");

  const startMutation = useMutation(api.sessionTrials.start);
  const recordTrialMutation = useMutation(api.sessionTrials.recordTrial);
  const endCollectionMutation = useMutation(api.sessionTrials.endCollection);
  const linkMutation = useMutation(api.sessionTrials.linkToSessionNote);

  const activeCollections = useQuery(api.sessionTrials.getActiveForPatient, { patientId });

  const startCollection = useCallback(
    async (goalId: Id<"goals">, sessionDate: string) => {
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

  const endCollection = useCallback(
    async (trialId: Id<"sessionTrials">) => {
      await endCollectionMutation({ trialId });
    },
    [endCollectionMutation]
  );

  const linkToSessionNote = useCallback(
    async (trialIds: Id<"sessionTrials">[], sessionNoteId: Id<"sessionNotes">) => {
      return await linkMutation({ trialIds, sessionNoteId });
    },
    [linkMutation]
  );

  return {
    activeCollections: (activeCollections ?? []) as ActiveCollection[],
    cueLevel,
    setCueLevel,
    startCollection,
    recordTrial,
    endCollection,
    linkToSessionNote,
  };
}
```

- [ ] **Step 2: Create the route page (thin wrapper)**

Create `src/app/(app)/patients/[id]/collect/page.tsx`:

```typescript
import { DataCollectionScreen } from "@/features/data-collection/components/data-collection-screen";

export default function CollectPage(props: { params: Promise<{ id: string }> }) {
  return <DataCollectionScreen paramsPromise={props.params} />;
}
```

- [ ] **Step 3: Verify the route file compiles (no import errors)**

Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep -c "collect/page" || echo "0 errors"`
Expected: 0 errors related to this file (the component will be created next)

- [ ] **Step 4: Commit**

---

## Task 7: Data Collection UI Components

**Files:**
- Create: `src/features/data-collection/components/trial-buttons.tsx`
- Create: `src/features/data-collection/components/cue-level-toggle.tsx`
- Create: `src/features/data-collection/components/running-tally.tsx`
- Create: `src/features/data-collection/components/target-selector.tsx`
- Create: `src/features/data-collection/components/session-summary.tsx`
- Create: `src/features/data-collection/components/data-collection-screen.tsx`

- [ ] **Step 1: Create trial-buttons.tsx (touch-optimized, 80px+ height)**

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
    <div className="flex gap-4 px-4">
      <button
        type="button"
        onClick={onCorrect}
        disabled={disabled}
        className={cn(
          "flex min-h-[80px] flex-1 items-center justify-center rounded-2xl",
          "bg-success-container text-on-success-container",
          "text-4xl font-bold",
          "active:scale-95 transition-transform duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "touch-manipulation select-none"
        )}
        aria-label="Correct trial"
      >
        +
      </button>
      <button
        type="button"
        onClick={onIncorrect}
        disabled={disabled}
        className={cn(
          "flex min-h-[80px] flex-1 items-center justify-center rounded-2xl",
          "bg-error-container text-on-error-container",
          "text-4xl font-bold",
          "active:scale-95 transition-transform duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "touch-manipulation select-none"
        )}
        aria-label="Incorrect trial"
      >
        &minus;
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create cue-level-toggle.tsx**

Create `src/features/data-collection/components/cue-level-toggle.tsx`:

```tsx
"use client";

import { cn } from "@/core/utils";

import type { CueLevel } from "../hooks/use-data-collection";

const CUE_LEVELS: { value: CueLevel; label: string; shortLabel: string }[] = [
  { value: "independent", label: "Independent", shortLabel: "Ind" },
  { value: "min-cue", label: "Minimal Cue", shortLabel: "Min" },
  { value: "mod-cue", label: "Moderate Cue", shortLabel: "Mod" },
  { value: "max-cue", label: "Maximum Cue", shortLabel: "Max" },
];

interface CueLevelToggleProps {
  value: CueLevel;
  onChange: (level: CueLevel) => void;
}

export function CueLevelToggle({ value, onChange }: CueLevelToggleProps) {
  return (
    <div className="flex gap-1 rounded-xl bg-muted p-1">
      {CUE_LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          onClick={() => onChange(level.value)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
            "touch-manipulation select-none",
            value === level.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={value === level.value}
          aria-label={level.label}
        >
          <span className="hidden sm:inline">{level.label}</span>
          <span className="sm:hidden">{level.shortLabel}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create running-tally.tsx**

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
    <div className="flex items-baseline justify-center gap-2 py-3">
      <span className="text-5xl font-bold tabular-nums text-foreground">
        {correct}/{total}
      </span>
      <span className="text-2xl font-medium text-muted-foreground">
        — {accuracy}%
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Create target-selector.tsx**

Create `src/features/data-collection/components/target-selector.tsx`:

```tsx
"use client";

import { cn } from "@/core/utils";

import type { Id } from "../../../../convex/_generated/dataModel";

interface Target {
  _id: Id<"sessionTrials">;
  targetDescription: string;
  trials: Array<{ correct: boolean }>;
}

interface TargetSelectorProps {
  targets: Target[];
  activeTargetId: Id<"sessionTrials"> | null;
  onSelect: (id: Id<"sessionTrials">) => void;
}

export function TargetSelector({ targets, activeTargetId, onSelect }: TargetSelectorProps) {
  if (targets.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-2">
      {targets.map((target) => {
        const total = target.trials.length;
        const correct = target.trials.filter((t) => t.correct).length;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        const isActive = target._id === activeTargetId;

        return (
          <button
            key={target._id}
            type="button"
            onClick={() => onSelect(target._id)}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
              "touch-manipulation select-none",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span className="block truncate max-w-[150px]">{target.targetDescription}</span>
            {total > 0 && (
              <span className="block text-xs opacity-80">{accuracy}%</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Create session-summary.tsx**

Create `src/features/data-collection/components/session-summary.tsx`:

```tsx
"use client";

import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

import type { Id } from "../../../../convex/_generated/dataModel";

interface TrialSummary {
  _id: Id<"sessionTrials">;
  targetDescription: string;
  trials: Array<{ correct: boolean; cueLevel: string }>;
}

interface SessionSummaryProps {
  patientId: Id<"patients">;
  collections: TrialSummary[];
  onStartNote: () => void;
}

const CUE_LABELS: Record<string, string> = {
  "independent": "Independent",
  "min-cue": "Minimal",
  "mod-cue": "Moderate",
  "max-cue": "Maximum",
};

export function SessionSummary({ patientId, collections, onStartNote }: SessionSummaryProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-xl font-semibold text-foreground">Session Summary</h2>

      {collections.map((collection) => {
        const total = collection.trials.length;
        const correct = collection.trials.filter((t) => t.correct).length;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

        // Count cue levels
        const cueCounts: Record<string, number> = {};
        for (const trial of collection.trials) {
          cueCounts[trial.cueLevel] = (cueCounts[trial.cueLevel] ?? 0) + 1;
        }
        // Most frequent cue level
        let topCue = "independent";
        let topCount = 0;
        for (const [cue, count] of Object.entries(cueCounts)) {
          if (count > topCount) {
            topCount = count;
            topCue = cue;
          }
        }

        return (
          <Card key={collection._id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{collection.targetDescription}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <p className="text-2xl font-bold tabular-nums">
                {correct}/{total} — {accuracy}%
              </p>
              <p className="text-sm text-muted-foreground">
                Primary cue level: {CUE_LABELS[topCue] ?? topCue}
              </p>
              {Object.entries(cueCounts).length > 1 && (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {Object.entries(cueCounts).map(([cue, count]) => (
                    <span key={cue}>
                      {CUE_LABELS[cue] ?? cue}: {count}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={onStartNote} className="w-full">
          Create Session Note (Auto-populated)
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/patients/${patientId}`}>
            Back to Patient
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create data-collection-screen.tsx (full-screen orchestrator)**

Create `src/features/data-collection/components/data-collection-screen.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useGoalsForPatient } from "@/features/goals/hooks/use-goals";
import { useDataCollection } from "../hooks/use-data-collection";
import { CueLevelToggle } from "./cue-level-toggle";
import { RunningTally } from "./running-tally";
import { SessionSummary } from "./session-summary";
import { TargetSelector } from "./target-selector";
import { TrialButtons } from "./trial-buttons";

interface DataCollectionScreenProps {
  paramsPromise: Promise<{ id: string }>;
}

export function DataCollectionScreen({ paramsPromise }: DataCollectionScreenProps) {
  const { id } = use(paramsPromise);
  const patientId = id as Id<"patients">;
  const router = useRouter();

  const {
    activeCollections,
    cueLevel,
    setCueLevel,
    startCollection,
    recordTrial,
    endCollection,
  } = useDataCollection(patientId);

  const goals = useGoalsForPatient(patientId);
  const [activeTargetId, setActiveTargetId] = useState<Id<"sessionTrials"> | null>(null);
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  // Set active target to first collection if not set
  const effectiveTargetId = activeTargetId ?? activeCollections[0]?._id ?? null;

  const activeTarget = activeCollections.find((c) => c._id === effectiveTargetId);
  const totalTrials = activeTarget?.trials.length ?? 0;
  const correctTrials = activeTarget?.trials.filter((t) => t.correct).length ?? 0;

  const handleAddTarget = useCallback(
    async (goalId: Id<"goals">) => {
      const trialId = await startCollection(goalId, today);
      setActiveTargetId(trialId);
      setGoalPickerOpen(false);
    },
    [startCollection, today]
  );

  const handleCorrect = useCallback(async () => {
    if (!effectiveTargetId) return;
    await recordTrial(effectiveTargetId, true);
  }, [effectiveTargetId, recordTrial]);

  const handleIncorrect = useCallback(async () => {
    if (!effectiveTargetId) return;
    await recordTrial(effectiveTargetId, false);
  }, [effectiveTargetId, recordTrial]);

  const handleEndSession = useCallback(async () => {
    for (const collection of activeCollections) {
      if (collection.endedAt === undefined) {
        await endCollection(collection._id);
      }
    }
    setShowSummary(true);
  }, [activeCollections, endCollection]);

  const handleStartNote = useCallback(() => {
    // Navigate to new session note page; trial linking happens there
    router.push(`/patients/${patientId}/sessions/new?fromTrials=true&date=${today}`);
  }, [patientId, router, today]);

  // Summary view
  if (showSummary) {
    return (
      <SessionSummary
        patientId={patientId}
        collections={activeCollections}
        onStartNote={handleStartNote}
      />
    );
  }

  // No active collections — show start prompt
  if (activeCollections.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <h1 className="text-xl font-semibold text-foreground">Start Data Collection</h1>
        <p className="text-center text-muted-foreground">
          Select a goal to begin collecting trial data for this session.
        </p>
        <Button onClick={() => setGoalPickerOpen(true)} size="lg">
          Choose Target Goal
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/patients/${patientId}`}>Cancel</Link>
        </Button>

        <GoalPickerDialog
          open={goalPickerOpen}
          onOpenChange={setGoalPickerOpen}
          goals={goals ?? []}
          onSelect={handleAddTarget}
        />
      </div>
    );
  }

  // Active data collection view
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/patients/${patientId}`}>Exit</Link>
        </Button>
        <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px]">
          {activeTarget?.targetDescription ?? "Data Collection"}
        </h1>
        <Button variant="outline" size="sm" onClick={handleEndSession}>
          End Session
        </Button>
      </div>

      {/* Target selector tabs */}
      <TargetSelector
        targets={activeCollections}
        activeTargetId={effectiveTargetId}
        onSelect={setActiveTargetId}
      />

      {/* Cue level toggle */}
      <div className="px-4 pt-2">
        <CueLevelToggle value={cueLevel} onChange={setCueLevel} />
      </div>

      {/* Running tally */}
      <div className="flex-1 flex items-center justify-center">
        <RunningTally correct={correctTrials} total={totalTrials} />
      </div>

      {/* Trial buttons — pinned to bottom for thumb reach */}
      <div className="pb-8">
        <TrialButtons
          onCorrect={handleCorrect}
          onIncorrect={handleIncorrect}
        />
      </div>

      {/* Add target button */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-2">
        <button
          type="button"
          onClick={() => setGoalPickerOpen(true)}
          className="text-xs text-muted-foreground underline touch-manipulation"
        >
          + Add another target
        </button>
      </div>

      <GoalPickerDialog
        open={goalPickerOpen}
        onOpenChange={setGoalPickerOpen}
        goals={goals ?? []}
        onSelect={handleAddTarget}
      />
    </div>
  );
}

// ── Goal picker dialog (inline) ─────────────────────────────────────────────

interface GoalPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Array<{ _id: Id<"goals">; shortDescription: string; domain: string; status: string }>;
  onSelect: (goalId: Id<"goals">) => void;
}

function GoalPickerDialog({ open, onOpenChange, goals, onSelect }: GoalPickerDialogProps) {
  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Target Goal</DialogTitle>
          <DialogDescription>
            Choose an active goal to collect trial data for.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {activeGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No active goals. Add a goal first.
            </p>
          ) : (
            activeGoals.map((goal) => (
              <button
                key={goal._id}
                type="button"
                onClick={() => onSelect(goal._id)}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border border-border p-3 text-left",
                  "transition-colors duration-200 hover:border-primary/50 hover:bg-muted/50",
                  "touch-manipulation"
                )}
              >
                <span className="text-sm font-medium">{goal.shortDescription}</span>
                <span className="text-xs text-muted-foreground capitalize">{goal.domain.replace("-", " ")}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7: Verify all components compile**

Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep "data-collection" || echo "No errors"`
Expected: No errors (may need to add the `useGoalsForPatient` export if not already present)

- [ ] **Step 8: Commit**

---

## Task 8: Add "Start Session" Button to Patient Detail Page

**Files:**
- Modify: `src/features/patients/components/patient-detail-page.tsx:44-52`

- [ ] **Step 1: Add the Start Session button to the header row**

In `src/features/patients/components/patient-detail-page.tsx`, replace the header `<div>` (lines 44-52):

Old:
```tsx
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/patients">
            <MaterialIcon icon="arrow_back" size="sm" />
            Back to Caseload
          </Link>
        </Button>
        <CreateMaterialButton patientId={patient._id} />
      </div>
```

New:
```tsx
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/patients">
            <MaterialIcon icon="arrow_back" size="sm" />
            Back to Caseload
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button asChild variant="default" size="sm">
            <Link href={`/patients/${patient._id}/collect`}>
              <MaterialIcon icon="play_circle" size="sm" />
              Start Session
            </Link>
          </Button>
          <CreateMaterialButton patientId={patient._id} />
        </div>
      </div>
```

- [ ] **Step 2: Verify the page compiles**

Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep "patient-detail" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

---

## Task 9: Rewrite Goal Bank Picker to Use DB-Backed Goals

**Files:**
- Modify: `src/features/goals/components/goal-bank-picker.tsx` (full rewrite)
- Modify: `src/features/goals/components/goal-form.tsx:28` (update import)

- [ ] **Step 1: Rewrite goal-bank-picker.tsx**

Replace the full contents of `src/features/goals/components/goal-bank-picker.tsx`:

```tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import { api } from "../../../../convex/_generated/api";
import { domainColor, domainLabel } from "../lib/goal-utils";

type GoalDomain =
  | "articulation"
  | "language-receptive"
  | "language-expressive"
  | "fluency"
  | "voice"
  | "pragmatic-social"
  | "aac"
  | "feeding";

type AgeRange = "0-3" | "3-5" | "5-8" | "8-12" | "12-18" | "adult";

const DOMAINS: GoalDomain[] = [
  "articulation", "language-receptive", "language-expressive",
  "fluency", "voice", "pragmatic-social", "aac", "feeding",
];

const AGE_RANGES: { value: AgeRange; label: string }[] = [
  { value: "0-3", label: "0-3 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5-8", label: "5-8 years" },
  { value: "8-12", label: "8-12 years" },
  { value: "12-18", label: "12-18 years" },
  { value: "adult", label: "Adult" },
];

export interface GoalBankSelection {
  domain: GoalDomain;
  shortDescription: string;
  fullGoalText: string;
  defaultTargetAccuracy: number;
  defaultConsecutiveSessions: number;
}

interface GoalBankPickerProps {
  onSelect: (goal: GoalBankSelection) => void;
}

export function GoalBankPicker({ onSelect }: GoalBankPickerProps) {
  const { isAuthenticated } = useConvexAuth();
  const [selectedDomain, setSelectedDomain] = useState<GoalDomain | undefined>(undefined);
  const [selectedAgeRange, setSelectedAgeRange] = useState<AgeRange | undefined>(undefined);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string | undefined>(undefined);
  const [keyword, setKeyword] = useState("");

  const searchArgs = {
    ...(selectedDomain ? { domain: selectedDomain } : {}),
    ...(selectedAgeRange ? { ageRange: selectedAgeRange } : {}),
    ...(selectedSkillLevel ? { skillLevel: selectedSkillLevel } : {}),
    ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
  };

  const results = useQuery(
    api.goalBank.search,
    isAuthenticated ? searchArgs : "skip"
  );

  const skillLevels = useQuery(
    api.goalBank.listDomainSkillLevels,
    isAuthenticated && selectedDomain ? { domain: selectedDomain } : "skip"
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={selectedDomain ?? ""}
          onValueChange={(v) => {
            setSelectedDomain(v as GoalDomain);
            setSelectedSkillLevel(undefined);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Domain..." />
          </SelectTrigger>
          <SelectContent>
            {DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>{domainLabel(d)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedAgeRange ?? ""}
          onValueChange={(v) => setSelectedAgeRange(v as AgeRange)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Age range..." />
          </SelectTrigger>
          <SelectContent>
            {AGE_RANGES.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skill level dropdown (populated by domain) */}
      {skillLevels && skillLevels.length > 0 && (
        <Select
          value={selectedSkillLevel ?? ""}
          onValueChange={(v) => setSelectedSkillLevel(v || undefined)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Skill level..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All levels</SelectItem>
            {skillLevels.map((level: string) => (
              <SelectItem key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1).replace("-", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Keyword search */}
      <Input
        placeholder="Search goals..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      {/* Results */}
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
        {results === undefined ? (
          <p className="text-xs text-muted-foreground py-2">Loading...</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No goals found. Try adjusting your filters.
          </p>
        ) : (
          results.map((goal) => (
            <button
              key={goal._id}
              type="button"
              onClick={() =>
                onSelect({
                  domain: goal.domain as GoalDomain,
                  shortDescription: goal.shortDescription,
                  fullGoalText: goal.fullGoalText,
                  defaultTargetAccuracy: goal.defaultTargetAccuracy,
                  defaultConsecutiveSessions: goal.defaultConsecutiveSessions,
                })
              }
              className={cn(
                "flex flex-col gap-1 rounded-lg border border-border p-3 text-left transition-colors duration-300",
                "hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", domainColor(goal.domain))}>
                  {domainLabel(goal.domain)}
                </span>
                <Badge variant="outline" className="text-[10px]">{goal.ageRange}</Badge>
                <Badge variant="secondary" className="text-[10px]">{goal.skillLevel}</Badge>
                {goal.isCustom && <Badge variant="secondary" className="text-[10px]">Custom</Badge>}
              </div>
              <span className="text-sm font-medium">{goal.shortDescription}</span>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {goal.fullGoalText
                  .replace("{accuracy}", String(goal.defaultTargetAccuracy))
                  .replace("{sessions}", String(goal.defaultConsecutiveSessions))}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update goal-form.tsx import to use new GoalBankSelection type**

In `src/features/goals/components/goal-form.tsx`, replace line 28:

Old:
```typescript
import { fillTemplate, type GoalDomain, type GoalTemplate } from "../lib/goal-bank-data";
```

New:
```typescript
import type { GoalDomain } from "../lib/goal-bank-data";
import type { GoalBankSelection } from "./goal-bank-picker";
```

Then update the `handleTemplateSelect` function (around line 68) to accept `GoalBankSelection`:

Old:
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

New:
```typescript
  function handleTemplateSelect(selection: GoalBankSelection) {
    setDomain(selection.domain);
    setShortDescription(selection.shortDescription);
    setTargetAccuracy(selection.defaultTargetAccuracy);
    setTargetConsecutiveSessions(selection.defaultConsecutiveSessions);
    setFullGoalText(
      selection.fullGoalText
        .replace("{accuracy}", String(selection.defaultTargetAccuracy))
        .replace("{sessions}", String(selection.defaultConsecutiveSessions))
    );
  }
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep -E "goal-bank-picker|goal-form" || echo "No errors"`
Expected: No errors

- [ ] **Step 4: Commit**

---

## Task 10: Home Program Print Component

**Files:**
- Create: `src/features/patients/components/home-program-print.tsx`
- Create: `src/app/(app)/patients/[id]/home-programs/[programId]/print/page.tsx`

- [ ] **Step 1: Create the print component**

Create `src/features/patients/components/home-program-print.tsx`:

```tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { use } from "react";

import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface HomeProgramPrintProps {
  paramsPromise: Promise<{ id: string; programId: string }>;
}

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  "3x-week": "3 times per week",
  weekly: "Weekly",
  "as-needed": "As needed",
};

export function HomeProgramPrint({ paramsPromise }: HomeProgramPrintProps) {
  const { id, programId } = use(paramsPromise);
  const patientId = id as Id<"patients">;
  const { isAuthenticated } = useConvexAuth();

  const programs = useQuery(
    api.homePrograms.listByPatient,
    isAuthenticated ? { patientId } : "skip"
  );

  const program = programs?.find(
    (p: { _id: string }) => p._id === programId
  );

  if (programs === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Home program not found</p>
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12pt; color: #000; background: #fff; }
          .print-container { padding: 0; margin: 0; }
        }
      `}</style>

      {/* Print button — hidden in print */}
      <div className="no-print flex justify-end gap-2 p-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button onClick={() => window.print()}>
          Print / Export PDF
        </Button>
      </div>

      {/* Print-friendly content */}
      <div className="print-container mx-auto max-w-2xl p-6">
        <div className="mb-6 border-b border-border pb-4">
          <h1 className="text-2xl font-bold">{program.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Home Practice Program
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <section>
            <h2 className="text-lg font-semibold mb-2">Instructions</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {program.instructions}
            </p>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Frequency</h3>
              <p className="text-sm">{frequencyLabels[program.frequency] ?? program.frequency}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Start Date</h3>
              <p className="text-sm">{program.startDate}</p>
            </div>
            {program.endDate && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">End Date</h3>
                <p className="text-sm">{program.endDate}</p>
              </div>
            )}
          </section>

          {program.type === "speech-coach" && program.speechCoachConfig && (
            <section>
              <h2 className="text-lg font-semibold mb-2">Speech Coach Details</h2>
              <p className="text-sm">
                Target sounds: {program.speechCoachConfig.targetSounds.join(", ")}
              </p>
              <p className="text-sm">
                Duration: {program.speechCoachConfig.defaultDurationMinutes} minutes
              </p>
            </section>
          )}

          <section className="mt-4 border-t border-border pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Practice Log
            </h3>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1 text-left font-medium">Date</th>
                  <th className="py-1 text-left font-medium">Duration</th>
                  <th className="py-1 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3">&nbsp;</td>
                    <td className="py-3">&nbsp;</td>
                    <td className="py-3">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <footer className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
            <p>Generated by Bridges</p>
          </footer>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create the route page**

Create `src/app/(app)/patients/[id]/home-programs/[programId]/print/page.tsx`:

```typescript
import { HomeProgramPrint } from "@/features/patients/components/home-program-print";

export default function PrintPage(props: {
  params: Promise<{ id: string; programId: string }>;
}) {
  return <HomeProgramPrint paramsPromise={props.params} />;
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep "home-program-print" || echo "No errors"`
Expected: No errors

- [ ] **Step 4: Commit**

---

## Task 11: Add Print Button to Home Programs Widget

**Files:**
- Modify: `src/features/patients/components/home-programs-widget.tsx:76-104`

- [ ] **Step 1: Add Link import and print button to each home program card**

In `src/features/patients/components/home-programs-widget.tsx`, add `Link` to imports:

```typescript
import Link from "next/link";
```

Then, inside the `.map()` callback that renders each program card, add a print button after the status badge. Replace the closing badges section (add after the status `<Badge>` element, before the closing `</div>` of the card):

```tsx
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 w-7 p-0"
                    >
                      <Link
                        href={`/patients/${patientId}/home-programs/${program._id}/print`}
                        title="Print home program"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                      </Link>
                    </Button>
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep "home-programs-widget" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

---

## Task 12: Verify useGoalsForPatient Export Exists

**Files:**
- Modify: `src/features/goals/hooks/use-goals.ts` (if needed)

- [ ] **Step 1: Check if useGoalsForPatient is already exported**

Run: `cd /Users/desha/Springfield-Vibeathon && grep -n "useGoalsForPatient\|export function useGoals\|export function useList" src/features/goals/hooks/use-goals.ts | head -10`
Expected: Find the export name for listing goals by patient

- [ ] **Step 2: Add export if missing**

If `useGoalsForPatient` does not exist, add it to `src/features/goals/hooks/use-goals.ts`:

```typescript
export function useGoalsForPatient(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.goals.list,
    isAuthenticated ? { patientId } : "skip"
  );
}
```

Import `useConvexAuth` from `convex/react` and `useQuery` if not already imported. Import `Id` from `../../../../convex/_generated/dataModel` and `api` from `../../../../convex/_generated/api` if not already imported.

The data-collection-screen.tsx imports this function. It must return an array with `_id`, `shortDescription`, `domain`, and `status` fields (matching the `goals` table).

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep "use-goals\|data-collection" || echo "No errors"`
Expected: No errors

- [ ] **Step 4: Commit**

---

## Task 13: Run Full Test Suite

**Files:**
- Test: `convex/__tests__/sessionTrials.test.ts`
- Test: `convex/__tests__/goalBank.test.ts`

- [ ] **Step 1: Run all new Convex tests**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/sessionTrials.test.ts convex/__tests__/goalBank.test.ts`
Expected: All tests PASS

- [ ] **Step 2: Run the full test suite to check for regressions**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run`
Expected: All existing tests still PASS, no regressions

- [ ] **Step 3: Run TypeScript type check**

Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit (if any fixes needed)**

---

## Task Summary

| Task | Description | Files | Tests |
|------|-------------|-------|-------|
| 1 | Add `sessionTrials` table to schema | `convex/schema.ts` | Schema push |
| 2 | Add `goalBank` table to schema | `convex/schema.ts` | Schema push |
| 3 | Implement `sessionTrials.ts` backend | `convex/sessionTrials.ts`, `convex/__tests__/sessionTrials.test.ts` | 8 test cases |
| 4 | Create goal bank seed data (80+ goals, 8 domains) | `convex/lib/goalBankSeed.ts` | Type check |
| 5 | Implement `goalBank.ts` backend | `convex/goalBank.ts`, `convex/__tests__/goalBank.test.ts` | 8 test cases |
| 6 | Data collection hook and route | `src/features/data-collection/hooks/use-data-collection.ts`, `src/app/(app)/patients/[id]/collect/page.tsx` | Type check |
| 7 | Data collection UI components (6 files) | `src/features/data-collection/components/` | Type check |
| 8 | Add "Start Session" button to patient detail | `src/features/patients/components/patient-detail-page.tsx` | Type check |
| 9 | Rewrite goal bank picker for DB-backed goals | `src/features/goals/components/goal-bank-picker.tsx`, `src/features/goals/components/goal-form.tsx` | Type check |
| 10 | Home program print component + route | `src/features/patients/components/home-program-print.tsx`, route page | Type check |
| 11 | Add print button to home programs widget | `src/features/patients/components/home-programs-widget.tsx` | Type check |
| 12 | Verify `useGoalsForPatient` export | `src/features/goals/hooks/use-goals.ts` | Type check |
| 13 | Full test suite verification | All test files | 16+ test cases, full suite regression |
