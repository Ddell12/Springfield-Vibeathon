# Speech Coach v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add patient-integrated speech coaching using ElevenLabs Conversational AI, accessible from the caregiver family dashboard as a special home program type.

**Architecture:** SLPs assign speech-coach home programs (with target sounds config) to patients. Caregivers run real-time voice sessions from `/family/[patientId]/speech-coach`. Post-session, Claude analyzes transcripts and writes progress data. Sessions auto-log to `practiceLog` for streak credit and optionally feed into goal tracking.

**Tech Stack:** ElevenLabs Conversational AI (`@elevenlabs/react`), Convex (schema + functions), Anthropic SDK (post-session analysis), Next.js App Router, shadcn/ui, Tailwind v4

**Spec:** `docs/superpowers/specs/2026-03-29-speech-coach-v2-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `convex/speechCoach.ts` | Queries + mutations for speech coach sessions. No `"use node"`. Uses `assertCaregiverAccess` and `assertPatientAccess`. |
| `convex/speechCoachActions.ts` | Actions with `"use node"`: signed URL generation, transcript fetch, Claude analysis, practice log + goal progress writes |
| `convex/__tests__/speechCoach.test.ts` | Backend tests for queries + mutations |
| `src/features/speech-coach/components/session-config.tsx` | Session setup form, pre-filled from SLP defaults |
| `src/features/speech-coach/components/active-session.tsx` | Live coaching screen with ElevenLabs ConversationProvider |
| `src/features/speech-coach/components/session-history.tsx` | Past sessions list with expandable analysis |
| `src/features/speech-coach/components/progress-card.tsx` | Single session analysis display |
| `src/features/speech-coach/components/speech-coach-page.tsx` | Top-level page with tab navigation |
| `src/features/speech-coach/hooks/use-speech-session.ts` | Session lifecycle hook (create → start → end) |
| `src/features/speech-coach/components/__tests__/session-config.test.tsx` | Frontend unit tests |
| `src/features/speech-coach/components/__tests__/progress-card.test.tsx` | Frontend unit tests |
| `src/features/speech-coach/lib/curriculum-data.ts` | Exercise content for ElevenLabs knowledge base |
| `src/app/(app)/family/[patientId]/speech-coach/page.tsx` | Thin route wrapper |
| `scripts/seed-speech-curriculum.ts` | One-time script to upload curriculum to ElevenLabs |

### Modified Files

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `type` + `speechCoachConfig` to `homePrograms`; add `speechCoachSessions` + `speechCoachProgress` tables |
| `convex/homePrograms.ts` | Extend `create`/`update` with `type` + `speechCoachConfig` args + validation |
| `convex/__tests__/homePrograms.test.ts` | Add tests for speech-coach type creation and validation |
| `src/features/family/components/family-dashboard.tsx` | Add Speech Coach card linking to sub-route |
| `src/features/patients/components/patient-detail-page.tsx` | Add speech coach session history in home program detail (SLP view) |
| `package.json` | Add `@elevenlabs/react` |

---

## Task 1: Schema — Extend `homePrograms` + Add Speech Coach Tables

**Files:**
- Modify: `convex/schema.ts:399-421` (homePrograms table)
- Modify: `convex/schema.ts:444` (before closing `});`)

- [ ] **Step 1: Add `type` and `speechCoachConfig` to `homePrograms` table**

In `convex/schema.ts`, find the `homePrograms` table definition (line 399). Add two fields after `endDate`:

```typescript
  homePrograms: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    title: v.string(),
    instructions: v.string(),
    materialId: v.optional(v.id("patientMaterials")),
    goalId: v.optional(v.id("goals")),
    frequency: v.union(
      v.literal("daily"),
      v.literal("3x-week"),
      v.literal("weekly"),
      v.literal("as-needed")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed")
    ),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    type: v.optional(v.union(v.literal("standard"), v.literal("speech-coach"))),
    speechCoachConfig: v.optional(v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      defaultDurationMinutes: v.number(),
    })),
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_status", ["patientId", "status"]),
```

- [ ] **Step 2: Add `speechCoachSessions` and `speechCoachProgress` tables**

Add before the closing `});` (line 445):

```typescript
  speechCoachSessions: defineTable({
    patientId: v.id("patients"),
    homeProgramId: v.id("homePrograms"),
    caregiverUserId: v.string(),
    agentId: v.string(),
    conversationId: v.optional(v.string()),
    status: v.union(
      v.literal("configuring"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("analyzed"),
      v.literal("failed")
    ),
    config: v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      durationMinutes: v.number(),
      focusArea: v.optional(v.string()),
    }),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    transcriptStorageId: v.optional(v.id("_storage")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_patientId_startedAt", ["patientId", "startedAt"])
    .index("by_homeProgramId", ["homeProgramId"]),

  speechCoachProgress: defineTable({
    sessionId: v.id("speechCoachSessions"),
    patientId: v.id("patients"),
    caregiverUserId: v.string(),
    soundsAttempted: v.array(
      v.object({
        sound: v.string(),
        wordsAttempted: v.number(),
        approximateSuccessRate: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        notes: v.string(),
      })
    ),
    overallEngagement: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    recommendedNextFocus: v.array(v.string()),
    summary: v.string(),
    analyzedAt: v.number(),
  })
    .index("by_patientId", ["patientId"])
    .index("by_sessionId", ["sessionId"]),
```

- [ ] **Step 3: Verify schema compiles**

Run: `npx convex dev --once --typecheck=disable 2>&1 | head -20`

If running locally: `npx vitest run convex/__tests__/schema.test.ts` (existing schema test should still pass)

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(speech-coach): extend homePrograms schema + add speechCoachSessions/Progress tables"
```

---

## Task 2: Extend `homePrograms.create` and `update` for Speech Coach Type

**Files:**
- Modify: `convex/homePrograms.ts`
- Modify: `convex/__tests__/homePrograms.test.ts`

- [ ] **Step 1: Write failing tests for speech-coach home program creation**

Append to `convex/__tests__/homePrograms.test.ts`:

```typescript
// ── speech-coach type ───────────────────────────────────────────────────────

describe("homePrograms.create — speech-coach type", () => {
  it("creates speech-coach program with config", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const programId = await slp.mutation(api.homePrograms.create, {
      patientId,
      ...VALID_PROGRAM,
      title: "Speech Coach - /s/ sounds",
      instructions: "Practice /s/ sounds with the speech coach.",
      type: "speech-coach",
      speechCoachConfig: {
        targetSounds: ["/s/", "/z/"],
        ageRange: "2-4" as const,
        defaultDurationMinutes: 5,
      },
    });
    const programs = await slp.query(api.homePrograms.listByPatient, { patientId });
    const program = programs.find((p: { _id: typeof programId }) => p._id === programId);
    expect(program).toBeDefined();
    expect(program.type).toBe("speech-coach");
    expect(program.speechCoachConfig.targetSounds).toEqual(["/s/", "/z/"]);
    expect(program.speechCoachConfig.ageRange).toBe("2-4");
    expect(program.speechCoachConfig.defaultDurationMinutes).toBe(5);
  });

  it("rejects speech-coach type without speechCoachConfig", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      slp.mutation(api.homePrograms.create, {
        patientId,
        ...VALID_PROGRAM,
        type: "speech-coach",
      })
    ).rejects.toThrow("speechCoachConfig is required");
  });

  it("rejects speechCoachConfig on standard type", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      slp.mutation(api.homePrograms.create, {
        patientId,
        ...VALID_PROGRAM,
        type: "standard",
        speechCoachConfig: {
          targetSounds: ["/s/"],
          ageRange: "2-4" as const,
          defaultDurationMinutes: 5,
        },
      })
    ).rejects.toThrow("speechCoachConfig is only valid");
  });

  it("standard program without type field still works (backward compat)", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const programId = await slp.mutation(api.homePrograms.create, {
      patientId,
      ...VALID_PROGRAM,
    });
    const programs = await slp.query(api.homePrograms.listByPatient, { patientId });
    const program = programs.find((p: { _id: typeof programId }) => p._id === programId);
    expect(program).toBeDefined();
    expect(program.type).toBeUndefined();
    expect(program.speechCoachConfig).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/homePrograms.test.ts`
Expected: FAIL — `type` and `speechCoachConfig` are not accepted args

- [ ] **Step 3: Extend `homePrograms.create` mutation**

In `convex/homePrograms.ts`, modify the `create` mutation args and handler:

```typescript
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    title: v.string(),
    instructions: v.string(),
    materialId: v.optional(v.id("patientMaterials")),
    goalId: v.optional(v.id("goals")),
    frequency: frequencyValidator,
    startDate: v.string(),
    endDate: v.optional(v.string()),
    type: v.optional(v.union(v.literal("standard"), v.literal("speech-coach"))),
    speechCoachConfig: v.optional(v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      defaultDurationMinutes: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    validateProgramFields({
      title: args.title,
      instructions: args.instructions,
      startDate: args.startDate,
      endDate: args.endDate,
    });

    // Speech coach type validation
    const programType = args.type;
    if (programType === "speech-coach" && !args.speechCoachConfig) {
      throw new ConvexError("speechCoachConfig is required for speech-coach type");
    }
    if (programType !== "speech-coach" && args.speechCoachConfig) {
      throw new ConvexError("speechCoachConfig is only valid for speech-coach type");
    }

    const programId = await ctx.db.insert("homePrograms", {
      patientId: args.patientId,
      slpUserId,
      title: args.title.trim(),
      instructions: args.instructions.trim(),
      materialId: args.materialId,
      goalId: args.goalId,
      frequency: args.frequency,
      status: "active",
      startDate: args.startDate,
      endDate: args.endDate,
      type: programType,
      speechCoachConfig: args.speechCoachConfig,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "home-program-assigned",
      details: `Home program assigned: ${args.title.trim()}`,
      timestamp: Date.now(),
    });

    return programId;
  },
});
```

- [ ] **Step 4: Extend `homePrograms.update` mutation**

Add `type` and `speechCoachConfig` to the `update` args and handler:

```typescript
export const update = mutation({
  args: {
    id: v.id("homePrograms"),
    title: v.optional(v.string()),
    instructions: v.optional(v.string()),
    frequency: v.optional(frequencyValidator),
    status: v.optional(statusValidator),
    endDate: v.optional(v.string()),
    speechCoachConfig: v.optional(v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      defaultDurationMinutes: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const program = await ctx.db.get(args.id);
    if (!program) throw new ConvexError("Home program not found");

    const patient = await ctx.db.get(program.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    validateProgramFields({
      title: args.title,
      instructions: args.instructions,
      endDate: args.endDate,
    });

    // Only allow speechCoachConfig updates on speech-coach type programs
    if (args.speechCoachConfig && program.type !== "speech-coach") {
      throw new ConvexError("speechCoachConfig is only valid for speech-coach type");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title.trim();
    if (args.instructions !== undefined) updates.instructions = args.instructions.trim();
    if (args.frequency !== undefined) updates.frequency = args.frequency;
    if (args.status !== undefined) updates.status = args.status;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.speechCoachConfig !== undefined) updates.speechCoachConfig = args.speechCoachConfig;

    await ctx.db.patch(args.id, updates);
  },
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/homePrograms.test.ts`
Expected: PASS — all existing tests + 4 new tests green

- [ ] **Step 6: Commit**

```bash
git add convex/homePrograms.ts convex/__tests__/homePrograms.test.ts
git commit -m "feat(speech-coach): extend homePrograms.create/update for speech-coach type"
```

---

## Task 3: Convex Queries & Mutations — `convex/speechCoach.ts`

**Files:**
- Create: `convex/speechCoach.ts`
- Create: `convex/__tests__/speechCoach.test.ts`

- [ ] **Step 1: Write failing tests for mutations and queries**

Create `convex/__tests__/speechCoach.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

const today = new Date().toISOString().slice(0, 10);

async function setupSpeechCoachProgram(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId, inviteToken } = await slp.mutation(api.patients.create, {
    ...VALID_PATIENT,
    parentEmail: "parent@test.com",
  });
  // Accept caregiver invite — use inviteToken from patients.create return value
  // (caregivers.listByPatient strips inviteToken from its response)
  const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
  await caregiver.mutation(api.caregivers.acceptInvite, { token: inviteToken! });

  // Create speech-coach home program
  const programId = await slp.mutation(api.homePrograms.create, {
    patientId,
    title: "Speech Coach - /s/ sounds",
    instructions: "Practice /s/ sounds with the voice coach.",
    frequency: "daily" as const,
    startDate: today,
    type: "speech-coach",
    speechCoachConfig: {
      targetSounds: ["/s/", "/r/"],
      ageRange: "2-4" as const,
      defaultDurationMinutes: 5,
    },
  });

  return { patientId, programId };
}

// ── createSession ───────────────────────────────────────────────────────────

describe("speechCoach.createSession", () => {
  it("caregiver creates session from speech-coach home program", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: {
        targetSounds: ["/s/"],
        ageRange: "2-4" as const,
        durationMinutes: 5,
      },
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session).not.toBeNull();
    expect(session?.status).toBe("configuring");
    expect(session?.patientId).toBe(patientId);
    expect(session?.homeProgramId).toBe(programId);
    expect(session?.caregiverUserId).toBe("caregiver-789");
    expect(session?.config.targetSounds).toEqual(["/s/"]);
  });

  it("rejects unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);

    await expect(
      t.mutation(api.speechCoach.createSession, {
        homeProgramId: programId,
        config: {
          targetSounds: ["/s/"],
          ageRange: "2-4" as const,
          durationMinutes: 5,
        },
      })
    ).rejects.toThrow();
  });

  it("rejects SLP trying to create session", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await expect(
      slp.mutation(api.speechCoach.createSession, {
        homeProgramId: programId,
        config: {
          targetSounds: ["/s/"],
          ageRange: "2-4" as const,
          durationMinutes: 5,
        },
      })
    ).rejects.toThrow();
  });
});

// ── startSession / endSession / failSession ─────────────────────────────────

describe("speechCoach session lifecycle", () => {
  it("startSession sets conversationId and status to active", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });
    await caregiver.mutation(api.speechCoach.startSession, {
      sessionId,
      conversationId: "conv_xyz789",
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("active");
    expect(session?.conversationId).toBe("conv_xyz789");
    expect(session?.startedAt).toBeDefined();
  });

  it("endSession sets status to completed", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });
    await caregiver.mutation(api.speechCoach.startSession, {
      sessionId,
      conversationId: "conv_xyz789",
    });
    await caregiver.mutation(api.speechCoach.endSession, { sessionId });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("completed");
    expect(session?.endedAt).toBeDefined();
  });

  it("failSession sets status to failed with error message", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const sessionId = await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });
    await caregiver.mutation(api.speechCoach.failSession, {
      sessionId,
      errorMessage: "Microphone access denied",
    });

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session?.status).toBe("failed");
    expect(session?.errorMessage).toBe("Microphone access denied");
  });
});

// ── queries ─────────────────────────────────────────────────────────────────

describe("speechCoach queries", () => {
  it("getSessionHistory returns sessions for patient (dual-access)", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupSpeechCoachProgram(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
    const slp = t.withIdentity(SLP_IDENTITY);

    // Create a session
    await caregiver.mutation(api.speechCoach.createSession, {
      homeProgramId: programId,
      config: { targetSounds: ["/s/"], ageRange: "2-4" as const, durationMinutes: 5 },
    });

    // Both caregiver and SLP can see it
    const caregiverHistory = await caregiver.query(api.speechCoach.getSessionHistory, { patientId });
    expect(caregiverHistory).toHaveLength(1);

    const slpHistory = await slp.query(api.speechCoach.getSessionHistory, { patientId });
    expect(slpHistory).toHaveLength(1);
  });

  it("getSessionHistory returns empty for unauthorized user", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupSpeechCoachProgram(t);
    const stranger = t.withIdentity({ subject: "stranger-000", issuer: "clerk" });

    await expect(
      stranger.query(api.speechCoach.getSessionHistory, { patientId })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/speechCoach.test.ts`
Expected: FAIL — `api.speechCoach` does not exist

- [ ] **Step 3: Implement `convex/speechCoach.ts`**

Create `convex/speechCoach.ts`:

```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { internal } from "./_generated/api";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { assertCaregiverAccess, assertPatientAccess } from "./lib/auth";

// ─── Mutations ──────────────────────────────────────────────────────────────

export const createSession = mutation({
  args: {
    homeProgramId: v.id("homePrograms"),
    config: v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      durationMinutes: v.number(),
      focusArea: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.homeProgramId);
    if (!program) throw new ConvexError("Home program not found");
    if (program.type !== "speech-coach") {
      throw new ConvexError("Not a speech coach program");
    }
    if (program.status !== "active") {
      throw new ConvexError("Home program is not active");
    }

    // Derive patientId from program — never trust client
    const caregiverUserId = await assertCaregiverAccess(ctx, program.patientId);

    return await ctx.db.insert("speechCoachSessions", {
      patientId: program.patientId,
      homeProgramId: args.homeProgramId,
      caregiverUserId,
      agentId: "speech-coach", // Placeholder — actual agent ID is only needed by the getSignedUrl action
      status: "configuring",
      config: args.config,
    });
  },
});

export const startSession = mutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    await assertCaregiverAccess(ctx, session.patientId);
    if (session.status !== "configuring") {
      throw new ConvexError("Session is not in configuring state");
    }
    await ctx.db.patch(args.sessionId, {
      conversationId: args.conversationId,
      status: "active",
      startedAt: Date.now(),
    });
  },
});

export const endSession = mutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    await assertCaregiverAccess(ctx, session.patientId);

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      endedAt: Date.now(),
    });

    // Schedule post-session analysis if conversation happened
    if (session.conversationId) {
      await ctx.scheduler.runAfter(
        0,
        internal.speechCoachActions.analyzeSession,
        { sessionId: args.sessionId }
      );
    }
  },
});

export const failSession = mutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    await assertCaregiverAccess(ctx, session.patientId);

    await ctx.db.patch(args.sessionId, {
      status: "failed",
      errorMessage: args.errorMessage,
      endedAt: Date.now(),
    });
  },
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const getSessionHistory = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    const sessions = await ctx.db
      .query("speechCoachSessions")
      .withIndex("by_patientId_startedAt", (q) =>
        q.eq("patientId", args.patientId)
      )
      .collect();
    return sessions.reverse();
  },
});

export const getProgress = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    return await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

export const getSessionDetail = query({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    await assertPatientAccess(ctx, session.patientId);
    const progress = await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    return { session, progress };
  },
});

// ─── Internal (called by actions, not client) ───────────────────────────────

export const getSessionById = internalQuery({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const setTranscriptStorageId = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      transcriptStorageId: args.storageId,
    });
  },
});

export const saveProgress = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    patientId: v.id("patients"),
    caregiverUserId: v.string(),
    soundsAttempted: v.array(
      v.object({
        sound: v.string(),
        wordsAttempted: v.number(),
        approximateSuccessRate: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        notes: v.string(),
      })
    ),
    overallEngagement: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    recommendedNextFocus: v.array(v.string()),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("speechCoachProgress", {
      sessionId: args.sessionId,
      patientId: args.patientId,
      caregiverUserId: args.caregiverUserId,
      soundsAttempted: args.soundsAttempted,
      overallEngagement: args.overallEngagement,
      recommendedNextFocus: args.recommendedNextFocus,
      summary: args.summary,
      analyzedAt: Date.now(),
    });
    await ctx.db.patch(args.sessionId, { status: "analyzed" });
  },
});

export const savePracticeLog = internalMutation({
  args: {
    homeProgramId: v.id("homePrograms"),
    patientId: v.id("patients"),
    caregiverUserId: v.string(),
    date: v.string(),
    duration: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("practiceLog", {
      homeProgramId: args.homeProgramId,
      patientId: args.patientId,
      caregiverUserId: args.caregiverUserId,
      date: args.date,
      duration: args.duration,
      notes: args.notes,
      timestamp: Date.now(),
    });
    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: args.caregiverUserId,
      action: "practice-logged",
      details: args.notes ?? "Speech Coach session completed",
      timestamp: Date.now(),
    });
  },
});

export const saveGoalProgress = internalMutation({
  args: {
    homeProgramId: v.id("homePrograms"),
    patientId: v.id("patients"),
    sessionId: v.string(), // String coercion of Id<"speechCoachSessions">
    accuracy: v.number(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.homeProgramId);
    if (!program?.goalId) return; // No goal linked — skip

    await ctx.db.insert("progressData", {
      goalId: program.goalId,
      patientId: args.patientId,
      source: "in-app-auto",
      sourceId: args.sessionId,
      date: args.date,
      accuracy: args.accuracy,
      timestamp: Date.now(),
    });
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/speechCoach.test.ts`
Expected: PASS — all tests green

Note: `endSession` tests may log a warning about `internal.speechCoachActions.analyzeSession` not existing yet — the scheduler fires asynchronously and convex-test may swallow it. The `suppressSchedulerErrors()` helper handles this.

- [ ] **Step 5: Commit**

```bash
git add convex/speechCoach.ts convex/__tests__/speechCoach.test.ts
git commit -m "feat(speech-coach): add Convex queries, mutations, and internal functions for session lifecycle"
```

---

## Task 4: Convex Actions — `convex/speechCoachActions.ts`

**Files:**
- Create: `convex/speechCoachActions.ts`

This file uses `"use node"` and calls external APIs (ElevenLabs, Anthropic). Cannot be tested with convex-test. Manual testing during integration.

- [ ] **Step 1: Create `convex/speechCoachActions.ts`**

```typescript
"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";

// ─── getSignedUrl — client calls this to get a secure WebSocket URL ─────────

export const getSignedUrl = action({
  args: {},
  handler: async (ctx): Promise<{ signedUrl: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");
    if (!agentId) throw new Error("ELEVENLABS_AGENT_ID not configured");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: { "xi-api-key": apiKey },
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[SpeechCoach] Signed URL error ${response.status}:`, body);
      throw new Error("Failed to start speech coach session. Please try again.");
    }

    const data = (await response.json()) as { signed_url: string };
    return { signedUrl: data.signed_url };
  },
});

// ─── analyzeSession — internal, called by endSession scheduler ──────────────

export const analyzeSession = internalAction({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    // 1. Get the session
    const session = await ctx.runQuery(internal.speechCoach.getSessionById, {
      sessionId: args.sessionId,
    });
    if (!session || !session.conversationId) {
      console.warn("[SpeechCoach] No conversationId, skipping analysis");
      return;
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || !anthropicKey) {
      console.error("[SpeechCoach] Missing API keys for analysis");
      return;
    }

    // 2. Fetch transcript from ElevenLabs
    let transcript: string;
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${session.conversationId}`,
        {
          method: "GET",
          headers: { "xi-api-key": apiKey },
        }
      );
      if (!response.ok) {
        console.error(`[SpeechCoach] Transcript fetch error ${response.status}`);
        return;
      }
      const data = await response.json();
      transcript = JSON.stringify(data.transcript ?? data, null, 2);
    } catch (error) {
      console.error("[SpeechCoach] Transcript fetch failed:", error);
      return;
    }

    // Skip analysis for very short sessions
    if (transcript.length < 100) {
      console.warn("[SpeechCoach] Transcript too short, skipping analysis");
      return;
    }

    // 3. Store transcript in Convex file storage
    const transcriptBlob = new Blob([transcript], { type: "text/plain" });
    const storageId = await ctx.storage.store(transcriptBlob);
    await ctx.runMutation(internal.speechCoach.setTranscriptStorageId, {
      sessionId: args.sessionId,
      storageId,
    });

    // 4. Analyze with Claude
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const targetSounds = session.config.targetSounds.join(", ");
    const ageRange = session.config.ageRange;

    const analysisPrompt = `You are analyzing a speech therapy session transcript between a voice coach and a child (age range: ${ageRange}).

The session targeted these sounds: ${targetSounds}
${session.config.focusArea ? `Focus area: ${session.config.focusArea}` : ""}

From the transcript below, determine:
1. Which sounds were actually practiced and how many words were attempted per sound
2. For each sound: approximate success rate (high/medium/low) based on whether the child's responses match target words
3. Overall engagement level (high/medium/low)
4. What sounds should be focused on next session
5. A 2-3 sentence parent-friendly summary. Be encouraging.

TRANSCRIPT:
${transcript}

Respond with a JSON object matching this exact shape:
{
  "soundsAttempted": [{ "sound": "/s/", "wordsAttempted": 8, "approximateSuccessRate": "high", "notes": "..." }],
  "overallEngagement": "high",
  "recommendedNextFocus": ["/r/"],
  "summary": "..."
}`;

    let analysis: {
      soundsAttempted: Array<{
        sound: string;
        wordsAttempted: number;
        approximateSuccessRate: "high" | "medium" | "low";
        notes: string;
      }>;
      overallEngagement: "high" | "medium" | "low";
      recommendedNextFocus: string[];
      summary: string;
    };

    try {
      analysis = await callClaude(anthropic, analysisPrompt);
    } catch (error) {
      console.error("[SpeechCoach] Claude analysis failed, retrying:", error);
      try {
        analysis = await callClaude(anthropic, analysisPrompt);
      } catch (retryError) {
        console.error("[SpeechCoach] Retry also failed:", retryError);
        return; // Transcript is stored — analysis can be retried manually
      }
    }

    // 5. Write progress to Convex
    await ctx.runMutation(internal.speechCoach.saveProgress, {
      sessionId: args.sessionId,
      patientId: session.patientId,
      caregiverUserId: session.caregiverUserId,
      soundsAttempted: analysis.soundsAttempted,
      overallEngagement: analysis.overallEngagement,
      recommendedNextFocus: analysis.recommendedNextFocus,
      summary: analysis.summary,
    });

    // 6. Auto-log practice
    const sessionDuration = session.startedAt && session.endedAt
      ? Math.round((session.endedAt - session.startedAt) / 60000)
      : undefined;
    const soundsList = analysis.soundsAttempted.map((s) => s.sound).join(", ");

    try {
      await ctx.runMutation(internal.speechCoach.savePracticeLog, {
        homeProgramId: session.homeProgramId,
        patientId: session.patientId,
        caregiverUserId: session.caregiverUserId,
        date: new Date().toISOString().slice(0, 10),
        duration: sessionDuration,
        notes: `Speech Coach session — practiced ${soundsList}`,
      });
    } catch (error) {
      console.error("[SpeechCoach] Practice log write failed:", error);
    }

    // 7. Optional goal progress
    const avgAccuracy = computeAverageAccuracy(analysis.soundsAttempted);
    try {
      await ctx.runMutation(internal.speechCoach.saveGoalProgress, {
        homeProgramId: session.homeProgramId,
        patientId: session.patientId,
        sessionId: args.sessionId as string,
        accuracy: avgAccuracy,
        date: new Date().toISOString().slice(0, 10),
      });
    } catch (error) {
      console.error("[SpeechCoach] Goal progress write failed:", error);
    }
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function callClaude(
  anthropic: Anthropic,
  prompt: string
) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonStr = textBlock.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1];
  return JSON.parse(jsonStr.trim());
}

function computeAverageAccuracy(
  sounds: Array<{ approximateSuccessRate: "high" | "medium" | "low" }>
): number {
  if (sounds.length === 0) return 0;
  const rateMap = { high: 85, medium: 60, low: 30 };
  const total = sounds.reduce((sum, s) => sum + rateMap[s.approximateSuccessRate], 0);
  return Math.round(total / sounds.length);
}
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `npx vitest run convex/__tests__/speechCoach.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add convex/speechCoachActions.ts
git commit -m "feat(speech-coach): add Convex actions — signed URL + post-session analysis pipeline"
```

---

## Task 5: Install `@elevenlabs/react` + Session Config Component

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/features/speech-coach/components/session-config.tsx`
- Create: `src/features/speech-coach/components/__tests__/session-config.test.tsx`

- [ ] **Step 1: Install dependency**

```bash
npm install @elevenlabs/react
```

- [ ] **Step 2: Write failing test for SessionConfig**

Create `src/features/speech-coach/components/__tests__/session-config.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SessionConfig } from "../session-config";

const DEFAULT_CONFIG = {
  targetSounds: ["/s/", "/r/"],
  ageRange: "2-4" as const,
  defaultDurationMinutes: 5,
};

describe("SessionConfig", () => {
  it("renders target sound checkboxes", () => {
    render(<SessionConfig speechCoachConfig={DEFAULT_CONFIG} onStart={vi.fn()} />);
    expect(screen.getByLabelText("/s/ & /z/")).toBeInTheDocument();
    expect(screen.getByLabelText("/r/")).toBeInTheDocument();
    expect(screen.getByLabelText("/l/")).toBeInTheDocument();
  });

  it("pre-selects sounds from SLP config", () => {
    render(<SessionConfig speechCoachConfig={DEFAULT_CONFIG} onStart={vi.fn()} />);
    // /s/ and /r/ should be pre-selected from config
    const sCheckbox = screen.getByLabelText("/s/ & /z/");
    expect(sCheckbox).toBeChecked();
    const rCheckbox = screen.getByLabelText("/r/");
    expect(rCheckbox).toBeChecked();
  });

  it("calls onStart with config when Start Session is clicked", () => {
    const onStart = vi.fn();
    render(<SessionConfig speechCoachConfig={DEFAULT_CONFIG} onStart={onStart} />);
    fireEvent.click(screen.getByText("Start Session"));
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        targetSounds: expect.arrayContaining(["/s/"]),
        ageRange: "2-4",
        durationMinutes: 5,
      })
    );
  });

  it("disables Start button when no sounds selected", () => {
    render(
      <SessionConfig
        speechCoachConfig={{ ...DEFAULT_CONFIG, targetSounds: [] }}
        onStart={vi.fn()}
      />
    );
    expect(screen.getByText("Start Session")).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/speech-coach/components/__tests__/session-config.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 4: Implement SessionConfig**

Create `src/features/speech-coach/components/session-config.tsx`:

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";

const TARGET_SOUNDS = [
  { id: "/s/", label: "/s/ & /z/" },
  { id: "/r/", label: "/r/" },
  { id: "/l/", label: "/l/" },
  { id: "/th/", label: "/th/" },
  { id: "/ch/", label: "/ch/ & /sh/" },
  { id: "/f/", label: "/f/ & /v/" },
  { id: "/k/", label: "/k/ & /g/" },
  { id: "blends", label: "Blends" },
] as const;

type SpeechCoachConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  defaultDurationMinutes: number;
};

type SessionConfigData = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

type Props = {
  speechCoachConfig: SpeechCoachConfig;
  onStart: (config: SessionConfigData) => void;
  lastRecommended?: string[];
  isLoading?: boolean;
};

export function SessionConfig({ speechCoachConfig, onStart, lastRecommended, isLoading }: Props) {
  const [selectedSounds, setSelectedSounds] = useState<string[]>(
    lastRecommended ?? speechCoachConfig.targetSounds
  );
  const [ageRange, setAgeRange] = useState<"2-4" | "5-7">(speechCoachConfig.ageRange);
  const [duration, setDuration] = useState<5 | 10>(
    speechCoachConfig.defaultDurationMinutes <= 5 ? 5 : 10
  );
  const [focusArea, setFocusArea] = useState("");

  const toggleSound = (id: string) => {
    setSelectedSounds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    onStart({
      targetSounds: selectedSounds,
      ageRange,
      durationMinutes: duration,
      focusArea: focusArea.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Target sounds */}
      <div>
        <h3 className="font-manrope text-lg font-semibold text-foreground">
          What sounds should we practice?
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {TARGET_SOUNDS.map((sound) => (
            <label
              key={sound.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
                selectedSounds.includes(sound.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selectedSounds.includes(sound.id)}
                onChange={() => toggleSound(sound.id)}
                aria-label={sound.label}
              />
              {sound.label}
            </label>
          ))}
        </div>
        {lastRecommended && lastRecommended.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Based on the last session, we recommend practicing these sounds.
          </p>
        )}
      </div>

      {/* Age range */}
      <div>
        <h3 className="font-manrope text-lg font-semibold text-foreground">
          How old is your child?
        </h3>
        <div className="mt-3 flex gap-3">
          {(["2-4", "5-7"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setAgeRange(range)}
              className={cn(
                "rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-300",
                ageRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Ages {range}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <h3 className="font-manrope text-lg font-semibold text-foreground">
          How long?
        </h3>
        <div className="mt-3 flex gap-3">
          {([5, 10] as const).map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setDuration(mins)}
              className={cn(
                "rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-300",
                duration === mins
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {mins} minutes
            </button>
          ))}
        </div>
      </div>

      {/* Focus area */}
      <div>
        <h3 className="font-manrope text-lg font-semibold text-foreground">
          Anything specific to practice?
        </h3>
        <input
          type="text"
          placeholder="e.g. animal names, colors, friend's names"
          value={focusArea}
          onChange={(e) => setFocusArea(e.target.value)}
          className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Tip */}
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Sit with your child in a quiet space. The coach will guide the session with fun word games and lots of encouragement!
        </p>
      </div>

      {/* Start */}
      <Button
        onClick={handleStart}
        disabled={selectedSounds.length === 0 || isLoading}
        className="w-full bg-gradient-to-br from-[#00595c] to-[#0d7377] py-6 text-lg font-semibold"
      >
        {isLoading ? "Connecting..." : "Start Session"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/speech-coach/components/__tests__/session-config.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/features/speech-coach/components/session-config.tsx src/features/speech-coach/components/__tests__/session-config.test.tsx
git commit -m "feat(speech-coach): install @elevenlabs/react + session config component"
```

---

## Task 6: `useSpeechSession` Hook + Active Session Component

**Files:**
- Create: `src/features/speech-coach/hooks/use-speech-session.ts`
- Create: `src/features/speech-coach/components/active-session.tsx`

- [ ] **Step 1: Implement `useSpeechSession` hook**

Create `src/features/speech-coach/hooks/use-speech-session.ts`:

```typescript
"use client";

import { useMutation, useAction } from "convex/react";
import { useState, useCallback } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type SessionConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

type SessionPhase = "idle" | "connecting" | "active" | "ending" | "done" | "error";

export function useSpeechSession(homeProgramId: Id<"homePrograms">) {
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [sessionId, setSessionId] = useState<Id<"speechCoachSessions"> | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(5);

  const createSession = useMutation(api.speechCoach.createSession);
  const startSession = useMutation(api.speechCoach.startSession);
  const endSessionMutation = useMutation(api.speechCoach.endSession);
  const failSessionMutation = useMutation(api.speechCoach.failSession);
  const getSignedUrl = useAction(api.speechCoachActions.getSignedUrl);

  const begin = useCallback(async (config: SessionConfig) => {
    let id: Id<"speechCoachSessions"> | undefined;
    try {
      setPhase("connecting");
      setError(null);

      // Check mic permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        setError("We need your microphone so the coach can hear your child. Please allow microphone access and try again.");
        setPhase("error");
        return;
      }

      // Create session record
      id = await createSession({ homeProgramId, config });
      setSessionId(id);
      setDurationMinutes(config.durationMinutes);

      // Get signed URL
      const { signedUrl: url } = await getSignedUrl({});
      setSignedUrl(url);
      setPhase("active");

      return { sessionId: id, signedUrl: url };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      setError(msg);
      setPhase("error");
      if (id) {
        await failSessionMutation({ sessionId: id, errorMessage: msg }).catch(() => {});
      }
    }
  }, [createSession, getSignedUrl, failSessionMutation, homeProgramId]);

  const markActive = useCallback(async (conversationId: string) => {
    if (!sessionId) return;
    await startSession({ sessionId, conversationId });
  }, [sessionId, startSession]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    setPhase("ending");
    try {
      await endSessionMutation({ sessionId });
      setPhase("done");
    } catch (err) {
      console.error("[SpeechCoach] End session error:", err);
      setPhase("done");
    }
  }, [sessionId, endSessionMutation]);

  const reset = useCallback(() => {
    setPhase("idle");
    setSessionId(null);
    setSignedUrl(null);
    setError(null);
  }, []);

  return { phase, sessionId, signedUrl, error, durationMinutes, begin, markActive, endSession, reset };
}
```

- [ ] **Step 2: Implement ActiveSession component**

Create `src/features/speech-coach/components/active-session.tsx`:

```tsx
"use client";

import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";

type Props = {
  signedUrl: string;
  onConversationStarted: (conversationId: string) => void;
  onEnd: () => void;
  durationMinutes: number;
};

export function ActiveSession({ signedUrl, onConversationStarted, onEnd, durationMinutes }: Props) {
  return (
    <ConversationProvider signedUrl={signedUrl}>
      <ActiveSessionInner
        onConversationStarted={onConversationStarted}
        onEnd={onEnd}
        durationMinutes={durationMinutes}
      />
    </ConversationProvider>
  );
}

function ActiveSessionInner({
  onConversationStarted,
  onEnd,
  durationMinutes,
}: Omit<Props, "signedUrl">) {
  const hasStarted = useRef(false);
  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();

  const isSpeaking = status === "speaking";
  const isConnected = status === "connected" || status === "speaking" || status === "listening";

  // Start conversation on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startSession({
      onConnect: ({ conversationId }) => {
        onConversationStarted(conversationId);
      },
      onError: (message) => {
        console.error("[SpeechCoach] Conversation error:", message);
        onEnd();
      },
    });
  }, [startSession, onConversationStarted, onEnd]);

  // Detect disconnection
  useEffect(() => {
    if (hasStarted.current && status === "disconnected") {
      onEnd();
    }
  }, [status, onEnd]);

  // Auto-stop after duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      endSession();
    }, durationMinutes * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [durationMinutes, endSession]);

  const handleStop = useCallback(() => {
    endSession();
  }, [endSession]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8">
      {/* Animated indicator */}
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "h-32 w-32 rounded-full transition-all duration-500",
            isSpeaking
              ? "scale-110 bg-primary/20 shadow-lg shadow-primary/10"
              : "scale-100 bg-muted/50"
          )}
        />
        <div
          className={cn(
            "absolute h-20 w-20 rounded-full transition-all duration-500",
            isSpeaking
              ? "scale-110 bg-primary/40"
              : "scale-95 bg-muted"
          )}
        />
        <span className="absolute text-4xl" aria-hidden="true">
          {isSpeaking ? "\uD83D\uDDE3\uFE0F" : "\uD83D\uDC42"}
        </span>
      </div>

      {/* Status text */}
      <p className="text-center text-lg text-muted-foreground">
        {!isConnected ? "Connecting..." : isSpeaking ? "Coach is talking..." : "Listening..."}
      </p>

      {/* Stop button */}
      <Button
        onClick={handleStop}
        variant="outline"
        size="lg"
        className="mt-8"
        disabled={!isConnected}
      >
        Stop Session
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/speech-coach/hooks/use-speech-session.ts src/features/speech-coach/components/active-session.tsx
git commit -m "feat(speech-coach): add useSpeechSession hook + ActiveSession component"
```

---

## Task 7: Progress Card + Session History Components

**Files:**
- Create: `src/features/speech-coach/components/progress-card.tsx`
- Create: `src/features/speech-coach/components/session-history.tsx`
- Create: `src/features/speech-coach/components/__tests__/progress-card.test.tsx`

- [ ] **Step 1: Write failing test for ProgressCard**

Create `src/features/speech-coach/components/__tests__/progress-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressCard } from "../progress-card";

const MOCK_PROGRESS = {
  summary: "Great session! Practiced /s/ sounds with strong results.",
  soundsAttempted: [
    { sound: "/s/", wordsAttempted: 8, approximateSuccessRate: "high" as const, notes: "Strong initial /s/" },
    { sound: "/r/", wordsAttempted: 4, approximateSuccessRate: "low" as const, notes: "Needs more practice" },
  ],
  overallEngagement: "high" as const,
  recommendedNextFocus: ["/r/", "/l/"],
};

describe("ProgressCard", () => {
  it("renders summary text", () => {
    render(<ProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Great session! Practiced /s/ sounds with strong results.")).toBeInTheDocument();
  });

  it("renders sounds attempted with word counts", () => {
    render(<ProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("/s/")).toBeInTheDocument();
    expect(screen.getByText("8 words")).toBeInTheDocument();
    expect(screen.getByText("4 words")).toBeInTheDocument();
  });

  it("renders recommended next focus", () => {
    render(<ProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Next time, try:")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/speech-coach/components/__tests__/progress-card.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ProgressCard**

Create `src/features/speech-coach/components/progress-card.tsx`:

```tsx
import { cn } from "@/core/utils";

type SoundAttempt = {
  sound: string;
  wordsAttempted: number;
  approximateSuccessRate: "high" | "medium" | "low";
  notes: string;
};

type ProgressData = {
  summary: string;
  soundsAttempted: SoundAttempt[];
  overallEngagement: "high" | "medium" | "low";
  recommendedNextFocus: string[];
};

const RATE_STYLES = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const ENGAGEMENT_LABELS = {
  high: "Very engaged",
  medium: "Somewhat engaged",
  low: "Needs encouragement",
};

export function ProgressCard({ progress }: { progress: ProgressData }) {
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-muted/30 p-5">
      <p className="text-sm leading-relaxed text-foreground">{progress.summary}</p>

      <div className="flex flex-col gap-2">
        <h4 className="font-manrope text-sm font-semibold text-foreground">Sounds Practiced</h4>
        {progress.soundsAttempted.map((attempt) => (
          <div key={attempt.sound} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-foreground">{attempt.sound}</span>
              <span className="text-xs text-muted-foreground">{attempt.wordsAttempted} words</span>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RATE_STYLES[attempt.approximateSuccessRate])}>
              {attempt.approximateSuccessRate}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Engagement:</span>
        <span className="text-xs font-medium text-foreground">
          {ENGAGEMENT_LABELS[progress.overallEngagement]}
        </span>
      </div>

      {progress.recommendedNextFocus.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground">Next time, try:</span>
          <div className="mt-1 flex gap-1.5">
            {progress.recommendedNextFocus.map((sound) => (
              <span key={sound} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {sound}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement SessionHistory**

Create `src/features/speech-coach/components/session-history.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ProgressCard } from "./progress-card";

const STATUS_STYLES = {
  configuring: "bg-muted text-muted-foreground",
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  analyzed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS = {
  configuring: "Setting up",
  active: "In progress",
  completed: "Reviewing",
  analyzed: "Complete",
  failed: "Failed",
};

function formatDuration(startedAt?: number, endedAt?: number): string {
  if (!startedAt || !endedAt) return "\u2014";
  const seconds = Math.round((endedAt - startedAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "\u2014";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SessionHistory({ patientId }: { patientId: Id<"patients"> }) {
  const sessions = useQuery(api.speechCoach.getSessionHistory, { patientId });
  const [expandedId, setExpandedId] = useState<Id<"speechCoachSessions"> | null>(null);

  if (!sessions) {
    return <div className="p-6 text-muted-foreground">Loading sessions...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-lg font-medium text-foreground">No sessions yet</p>
        <p className="text-sm text-muted-foreground">
          Your session history will appear here after your first coaching session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      {sessions.map((session) => (
        <div key={session._id} className="rounded-xl bg-muted/20">
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === session._id ? null : session._id)}
            className="flex w-full items-center justify-between gap-4 p-4 text-left"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                {formatDate(session.startedAt ?? session._creationTime)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {session.config.targetSounds.map((sound) => (
                  <span key={sound} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {sound}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {formatDuration(session.startedAt, session.endedAt)}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[session.status as keyof typeof STATUS_STYLES])}>
                {STATUS_LABELS[session.status as keyof typeof STATUS_LABELS]}
              </span>
            </div>
          </button>

          {expandedId === session._id && (
            <ExpandedDetail sessionId={session._id} />
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandedDetail({ sessionId }: { sessionId: Id<"speechCoachSessions"> }) {
  const detail = useQuery(api.speechCoach.getSessionDetail, { sessionId });

  if (!detail) return <div className="px-4 pb-4 text-sm text-muted-foreground">Loading...</div>;
  if (!detail.progress) {
    return (
      <div className="px-4 pb-4 text-sm text-muted-foreground">
        {detail.session?.status === "failed"
          ? detail.session.errorMessage ?? "Session did not complete."
          : "Session is still being reviewed."}
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <ProgressCard progress={detail.progress} />
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/features/speech-coach/components/__tests__/progress-card.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/speech-coach/components/progress-card.tsx src/features/speech-coach/components/session-history.tsx src/features/speech-coach/components/__tests__/progress-card.test.tsx
git commit -m "feat(speech-coach): add ProgressCard + SessionHistory components"
```

---

## Task 8: Speech Coach Page + Route

**Files:**
- Create: `src/features/speech-coach/components/speech-coach-page.tsx`
- Create: `src/app/(app)/family/[patientId]/speech-coach/page.tsx`

- [ ] **Step 1: Implement SpeechCoachPage**

Create `src/features/speech-coach/components/speech-coach-page.tsx`:

```tsx
"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ActiveSession } from "./active-session";
import { SessionConfig } from "./session-config";
import { SessionHistory } from "./session-history";
import { useSpeechSession } from "../hooks/use-speech-session";

type Tab = "new" | "history";

type Props = {
  patientId: Id<"patients">;
  homeProgramId: Id<"homePrograms">;
};

export function SpeechCoachPage({ patientId, homeProgramId }: Props) {
  const { isAuthenticated } = useConvexAuth();
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const session = useSpeechSession(homeProgramId);

  // Get the home program for config defaults
  const programs = useQuery(
    api.homePrograms.listByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
  const program = programs?.find((p) => p._id === homeProgramId);

  // Get last recommendation for quick-start
  const progress = useQuery(
    api.speechCoach.getProgress,
    isAuthenticated ? { patientId } : "skip"
  );
  const lastRecommended = progress?.[progress.length - 1]?.recommendedNextFocus;

  if (!isAuthenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="font-manrope text-2xl font-bold text-foreground">Speech Coach</h2>
        <p className="text-muted-foreground">Sign in to start a speech coaching session.</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Active session takes over the whole screen
  if (session.phase === "active" && session.signedUrl) {
    return (
      <ActiveSession
        signedUrl={session.signedUrl}
        onConversationStarted={(id) => session.markActive(id)}
        onEnd={() => session.endSession()}
        durationMinutes={session.durationMinutes}
      />
    );
  }

  // Post-session screen
  if (session.phase === "ending" || session.phase === "done") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
        <p className="text-4xl" aria-hidden="true">{"\uD83C\uDF89"}</p>
        <h2 className="font-manrope text-2xl font-bold text-foreground">Great job!</h2>
        <p className="text-muted-foreground">
          {session.phase === "ending" ? "Reviewing the session..." : "Session complete!"}
        </p>
        {session.phase === "done" && (
          <button
            type="button"
            onClick={() => {
              session.reset();
              setActiveTab("history");
            }}
            className="text-sm font-medium text-primary underline"
          >
            View results
          </button>
        )}
      </div>
    );
  }

  // Error state
  if (session.phase === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="font-manrope text-xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{session.error}</p>
        <button
          type="button"
          onClick={session.reset}
          className="text-sm font-medium text-primary underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Tab view
  const TABS: { id: Tab; label: string }[] = [
    { id: "new", label: "New Session" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/50 px-6 pt-6 pb-4">
        <h1 className="font-manrope text-2xl font-bold text-foreground">Speech Coach</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactive voice sessions to help practice speech sounds
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 px-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "new" && program.speechCoachConfig && (
          <div className="mx-auto max-w-lg p-6">
            <SessionConfig
              speechCoachConfig={program.speechCoachConfig}
              onStart={session.begin}
              lastRecommended={lastRecommended}
              isLoading={session.phase === "connecting"}
            />
          </div>
        )}
        {activeTab === "history" && <SessionHistory patientId={patientId} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create route page**

Create `src/app/(app)/family/[patientId]/speech-coach/page.tsx`:

```tsx
"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { ErrorBoundary } from "react-error-boundary";

import { SpeechCoachPage } from "@/features/speech-coach/components/speech-coach-page";
import { Button } from "@/shared/components/ui/button";
import type { Id } from "../../../../../convex/_generated/dataModel";

function ErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface text-on-surface">
      <p className="text-lg font-semibold">Something went wrong</p>
      <Button variant="outline" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const searchParams = useSearchParams();
  const programId = searchParams.get("program");

  if (!programId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-medium text-foreground">No program selected</p>
        <p className="text-sm text-muted-foreground">
          Go back to the dashboard and select a Speech Coach program.
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <SpeechCoachPage
        patientId={patientId as Id<"patients">}
        homeProgramId={programId as Id<"homePrograms">}
      />
    </ErrorBoundary>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run dev` — navigate to `/family/<patientId>/speech-coach?program=<programId>`. Verify the page loads without errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/speech-coach/components/speech-coach-page.tsx src/app/\(app\)/family/\[patientId\]/speech-coach/page.tsx
git commit -m "feat(speech-coach): add SpeechCoachPage + route at /family/[patientId]/speech-coach"
```

---

## Task 9: Family Dashboard — Speech Coach Card

**Files:**
- Modify: `src/features/family/components/family-dashboard.tsx`

- [ ] **Step 1: Add Speech Coach card to family dashboard**

In `src/features/family/components/family-dashboard.tsx`, add a Speech Coach section between `TodayActivities` and the `Separator` before `WeeklyProgress` (around line 88).

First add the import at the top:

```tsx
import { MaterialIcon } from "@/shared/components/material-icon";
```

Then add the Speech Coach section. Find the line `{/* Today's Activities */}` and add after the `<TodayActivities>` component and before the next `<Separator />`:

```tsx
      {/* Speech Coach programs */}
      <SpeechCoachCards patientId={patientId as Id<"patients">} />

      <Separator />
```

Then add the `SpeechCoachCards` component at the bottom of the file (before the closing export or as a separate function):

```tsx
function SpeechCoachCards({ patientId }: { patientId: Id<"patients"> }) {
  const programs = useQuery(api.homePrograms.getActiveByPatient, { patientId });

  if (!programs) return null;

  const speechCoachPrograms = programs.filter(
    (p: { type?: string }) => p.type === "speech-coach"
  );

  if (speechCoachPrograms.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-headline text-lg font-semibold text-foreground">Speech Coach</h2>
      {speechCoachPrograms.map((program) => (
        <Link
          key={program._id}
          href={`/family/${patientId}/speech-coach?program=${program._id}`}
          className="flex items-center gap-4 rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted/70"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MaterialIcon name="record_voice_over" className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{program.title}</p>
            <p className="text-xs text-muted-foreground">
              {(program as { speechCoachConfig?: { targetSounds?: string[] } }).speechCoachConfig?.targetSounds?.join(", ") ?? "Voice coaching"}
            </p>
          </div>
          <MaterialIcon name="chevron_right" className="text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run: `npm run dev` — navigate to `/family/<patientId>`. If there are speech-coach programs, the card should appear. If not, create one first via the SLP patient detail.

- [ ] **Step 3: Commit**

```bash
git add src/features/family/components/family-dashboard.tsx
git commit -m "feat(speech-coach): add Speech Coach card to family dashboard"
```

---

## Task 10: Curriculum Data + Seed Script

**Files:**
- Create: `src/features/speech-coach/lib/curriculum-data.ts`
- Create: `scripts/seed-speech-curriculum.ts`

- [ ] **Step 1: Create curriculum data**

Create `src/features/speech-coach/lib/curriculum-data.ts` with the full exercise curriculum for all 8 sound groups across both age ranges. The full content is in the v1 plan at `docs/superpowers/plans/2026-03-27-speech-coach.md` Task 10 (lines 2083-2172+). Copy the complete `SoundExercise` type and `SOUND_EXERCISES` array from there, including all 8 entries (/s/ & /z/, /r/, /l/, /th/, /ch/ & /sh/, /f/ & /v/, /k/ & /g/, blends) plus the session management phrases (`SESSION_OPENERS`, `TRANSITION_PHRASES`, `WIND_DOWN_SCRIPTS`, `ENGAGEMENT_RECOVERY`).

- [ ] **Step 2: Create seed script**

Create `scripts/seed-speech-curriculum.ts`:

```typescript
/**
 * One-time script to upload speech curriculum to ElevenLabs knowledge base.
 *
 * Usage: npx tsx scripts/seed-speech-curriculum.ts
 *
 * Requires: ELEVENLABS_API_KEY in .env.local
 *           ELEVENLABS_AGENT_ID in .env.local (or pass as CLI arg)
 */

import { SOUND_EXERCISES, SESSION_OPENERS, TRANSITION_PHRASES, WIND_DOWN_SCRIPTS, ENGAGEMENT_RECOVERY } from "../src/features/speech-coach/lib/curriculum-data";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID ?? process.argv[2];

  if (!apiKey) {
    console.error("Missing ELEVENLABS_API_KEY in .env.local");
    process.exit(1);
  }
  if (!agentId) {
    console.error("Missing ELEVENLABS_AGENT_ID — set in .env.local or pass as CLI arg");
    process.exit(1);
  }

  // Compile curriculum into a structured text document
  let doc = "# Speech Therapy Exercise Curriculum\n\n";
  doc += "Use these exercises when coaching children on speech sounds.\n\n";

  for (const exercise of SOUND_EXERCISES) {
    doc += `## ${exercise.sound}\n\n`;
    doc += `**Articulation Cue:** ${exercise.articulationCue}\n\n`;
    doc += `### Ages 2-4\n`;
    doc += `- Beginner words: ${exercise.ages24.beginnerWords.join(", ")}\n`;
    doc += `- Modeling script: ${exercise.ages24.modelingScript}\n`;
    doc += `- Praise: ${exercise.ages24.praiseVariants.join(" | ")}\n\n`;
    doc += `### Ages 5-7\n`;
    doc += `- Beginner words: ${exercise.ages57.beginnerWords.join(", ")}\n`;
    doc += `- Intermediate words: ${exercise.ages57.intermediateWords.join(", ")}\n`;
    doc += `- Advanced phrases: ${exercise.ages57.advancedPhrases.join(" | ")}\n`;
    doc += `- Modeling script: ${exercise.ages57.modelingScript}\n\n`;
  }

  doc += "## Session Management\n\n";
  doc += `### Openers\n${SESSION_OPENERS.join("\n")}\n\n`;
  doc += `### Transitions\n${TRANSITION_PHRASES.join("\n")}\n\n`;
  doc += `### Wind-down\n${WIND_DOWN_SCRIPTS.join("\n")}\n\n`;
  doc += `### Engagement Recovery\n${ENGAGEMENT_RECOVERY.join("\n")}\n`;

  console.log(`Compiled curriculum: ${doc.length} characters`);

  // Upload as knowledge base document
  const formData = new FormData();
  formData.append("file", new Blob([doc], { type: "text/plain" }), "speech-curriculum.txt");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}/add-to-knowledge-base`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: formData,
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`Upload failed (${response.status}):`, body);
    process.exit(1);
  }

  console.log("Curriculum uploaded successfully!");
}

main().catch(console.error);
```

- [ ] **Step 3: Commit**

```bash
git add src/features/speech-coach/lib/curriculum-data.ts scripts/seed-speech-curriculum.ts
git commit -m "feat(speech-coach): add curriculum data + ElevenLabs seed script"
```

---

## Task 11: SLP View — Speech Coach in Home Programs Widget

**Files:**
- Modify: `src/features/patients/components/home-programs-widget.tsx`

The `HomeProgramsWidget` already lists all home programs. For speech-coach type programs, add a visual distinction and a link to view session results.

- [ ] **Step 1: Add speech-coach indicator to program rows**

In `src/features/patients/components/home-programs-widget.tsx`, modify the program list item rendering. Find the `programs.map(` block (line 63) and update the type annotation and rendering:

```tsx
{programs.map(
  (program: {
    _id: string;
    title: string;
    frequency: string;
    status: string;
    type?: string;
    speechCoachConfig?: {
      targetSounds: string[];
    };
  }) => (
    <div
      key={program._id}
      className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {program.title}
        </p>
        {program.type === "speech-coach" && program.speechCoachConfig && (
          <p className="truncate text-xs text-muted-foreground">
            {program.speechCoachConfig.targetSounds.join(", ")}
          </p>
        )}
      </div>
      {program.type === "speech-coach" && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Voice
        </Badge>
      )}
      <Badge variant="secondary" className="shrink-0 text-[10px]">
        {frequencyLabels[program.frequency] ?? program.frequency}
      </Badge>
      <Badge
        variant={statusVariant[program.status] ?? "outline"}
        className="shrink-0 text-[10px] capitalize"
      >
        {program.status}
      </Badge>
    </div>
  )
)}
```

- [ ] **Step 2: Verify it renders**

Run: `npm run dev` — navigate to a patient detail page. Speech-coach programs should show a "Voice" badge and target sounds.

- [ ] **Step 3: Commit**

```bash
git add src/features/patients/components/home-programs-widget.tsx
git commit -m "feat(speech-coach): add speech-coach visual indicator in SLP home programs widget"
```

---

## Task 12: Run Full Test Suite

- [ ] **Step 1: Run all Convex tests**

Run: `npx vitest run convex/__tests__/`
Expected: PASS — all existing tests + new speechCoach and homePrograms tests green

- [ ] **Step 2: Run all frontend tests**

Run: `npx vitest run src/`
Expected: PASS — all existing tests + new component tests green

- [ ] **Step 3: Run full suite**

Run: `npm test -- --run`
Expected: PASS — zero regressions

- [ ] **Step 4: Commit any fixes if needed**

---

## Notes

- **`@elevenlabs/react` API:** The plan assumes `useConversationStatus()` returns `{ status }`. If the installed version returns a string directly, adjust `active-session.tsx` accordingly — destructure as `const status = useConversationStatus()` instead of `const { status } = useConversationStatus()`.
- **Curriculum data:** Task 10 references curriculum structure from the v1 plan. The `SESSION_OPENERS` and `WIND_DOWN_SCRIPTS` exports may be objects keyed by age range (`"2-4"`, `"5-7"`), not flat arrays. If so, update the seed script to iterate keys: `Object.entries(SESSION_OPENERS).flatMap(([age, lines]) => ...)`.
- **Patient detail page:** Task 11 adds a minimal speech-coach indicator. A richer SLP view (clickable session history, progress chart integration) can be added as a follow-up after the core flow works end-to-end.
