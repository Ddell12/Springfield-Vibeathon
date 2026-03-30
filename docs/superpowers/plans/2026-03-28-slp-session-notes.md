# SLP AI Session Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-powered session documentation — SLPs capture structured session data via quick-entry form, generate SOAP notes with one Claude API call, and manage a sign/unsign audit trail.

**Architecture:** New feature slice `src/features/session-notes/` alongside existing `src/features/patients/`. One new Convex table (`sessionNotes`), one new API route (`/api/generate-soap`), and integration into the patient detail page. The existing builder pipeline is untouched.

**Tech Stack:** Next.js 16 (App Router), Convex (backend), Clerk v7 (auth), Claude Sonnet via `@anthropic-ai/sdk` (SOAP generation), shadcn/ui, Tailwind v4, Vitest + convex-test + Playwright

**Spec:** `docs/superpowers/specs/2026-03-28-slp-session-notes-design.md`

---

## File Map

### New files — Convex backend
| File | Responsibility |
|---|---|
| `convex/sessionNotes.ts` | Session note CRUD: list, get, getLatestSoap, create, update, updateSoap, saveSoapFromAI, sign, unsign, updateStatus, delete |
| `convex/__tests__/sessionNotes.test.ts` | Unit tests for all session note mutations and queries |

### New files — API route
| File | Responsibility |
|---|---|
| `src/app/api/generate-soap/route.ts` | SSE streaming endpoint: fetches context, calls Claude, streams SOAP, persists result |

### New files — Frontend feature slice
| File | Responsibility |
|---|---|
| `src/features/session-notes/lib/soap-prompt.ts` | System prompt builder for SOAP generation |
| `src/features/session-notes/lib/session-utils.ts` | Duration formatting, accuracy calculation, date helpers |
| `src/features/session-notes/hooks/use-session-notes.ts` | Query hooks wrapping Convex sessionNotes functions |
| `src/features/session-notes/hooks/use-soap-generation.ts` | SSE streaming state management (loading, chunks, complete, error) |
| `src/features/session-notes/components/session-notes-list.tsx` | Per-patient session list widget for patient detail page |
| `src/features/session-notes/components/session-note-card.tsx` | Single session summary card in the list |
| `src/features/session-notes/components/session-note-editor.tsx` | Split view: structured form + SOAP preview |
| `src/features/session-notes/components/structured-data-form.tsx` | Quick-entry form for session data |
| `src/features/session-notes/components/soap-preview.tsx` | SOAP note display with edit capability |
| `src/features/session-notes/components/duration-preset-input.tsx` | Duration input with 30/45/60 presets |
| `src/features/session-notes/components/target-entry.tsx` | Single target row (name, trials, correct, prompt level) |

### New files — Routes (thin wrappers)
| File | Responsibility |
|---|---|
| `src/app/(app)/patients/[id]/sessions/new/page.tsx` | → `session-note-editor.tsx` (create mode) |
| `src/app/(app)/patients/[id]/sessions/[noteId]/page.tsx` | → `session-note-editor.tsx` (edit mode) |
| `src/app/(app)/patients/[id]/sessions/[noteId]/not-found.tsx` | 404 for invalid session note ID |

### New files — Tests
| File | Responsibility |
|---|---|
| `src/features/session-notes/__tests__/session-utils.test.ts` | Unit tests for utility functions |
| `src/features/session-notes/__tests__/soap-prompt.test.ts` | Unit tests for prompt builder |
| `tests/e2e/session-notes.spec.ts` | E2E: full create → generate → sign flow |

### Modified files
| File | Change |
|---|---|
| `convex/schema.ts` | Add `sessionNotes` table; extend `activityLog.action` union with 3 new literals |
| `convex/activityLog.ts` | Extend `action` validator with `session-documented`, `session-signed`, `session-unsigned` |
| `src/features/patients/components/patient-detail-page.tsx` | Add SessionNotesList widget to left column |
| `src/features/patients/components/patient-row-expanded.tsx` | Add "New Session" quick action button |

---

## Task 1: Schema — Add sessionNotes Table and Extend activityLog

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/activityLog.ts`

- [ ] **Step 1: Add sessionNotes table to schema.ts**

Add after the `activityLog` table definition (before the closing `});`):

```ts
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
  })
    .index("by_patientId_sessionDate", ["patientId", "sessionDate"])
    .index("by_slpUserId", ["slpUserId"]),
```

- [ ] **Step 2: Extend activityLog action union in schema.ts**

In the `activityLog` table definition, add three new literals to the `action` union:

```ts
    action: v.union(
      v.literal("patient-created"),
      v.literal("profile-updated"),
      v.literal("material-assigned"),
      v.literal("invite-sent"),
      v.literal("invite-accepted"),
      v.literal("status-changed"),
      v.literal("session-documented"),
      v.literal("session-signed"),
      v.literal("session-unsigned")
    ),
```

- [ ] **Step 3: Extend activityLog.ts action validator**

In `convex/activityLog.ts`, update the `action` validator in the `log` function args to match the schema:

```ts
    action: v.union(
      v.literal("patient-created"),
      v.literal("profile-updated"),
      v.literal("material-assigned"),
      v.literal("invite-sent"),
      v.literal("invite-accepted"),
      v.literal("status-changed"),
      v.literal("session-documented"),
      v.literal("session-signed"),
      v.literal("session-unsigned")
    ),
```

- [ ] **Step 4: Verify schema compiles**

Run: `npx convex dev --once`
Expected: Schema validation passes, no errors.

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/activityLog.ts
git commit -m "feat: add sessionNotes table and extend activityLog actions"
```

---

## Task 2: Convex Functions — sessionNotes.ts

**Files:**
- Create: `convex/sessionNotes.ts`

- [ ] **Step 1: Create convex/sessionNotes.ts with validators and helpers**

```ts
import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { assertSLP, getAuthUserId } from "./lib/auth";

const sessionTypeValidator = v.union(
  v.literal("in-person"),
  v.literal("teletherapy"),
  v.literal("parent-consultation")
);

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("in-progress"),
  v.literal("complete"),
  v.literal("signed")
);

const promptLevelValidator = v.optional(
  v.union(
    v.literal("independent"),
    v.literal("verbal-cue"),
    v.literal("model"),
    v.literal("physical")
  )
);

const targetValidator = v.object({
  target: v.string(),
  goalId: v.optional(v.string()),
  trials: v.optional(v.number()),
  correct: v.optional(v.number()),
  promptLevel: promptLevelValidator,
  notes: v.optional(v.string()),
});

const structuredDataValidator = v.object({
  targetsWorkedOn: v.array(targetValidator),
  behaviorNotes: v.optional(v.string()),
  parentFeedback: v.optional(v.string()),
  homeworkAssigned: v.optional(v.string()),
  nextSessionFocus: v.optional(v.string()),
});

const soapNoteValidator = v.object({
  subjective: v.string(),
  objective: v.string(),
  assessment: v.string(),
  plan: v.string(),
});

function validateSessionDate(date: string): void {
  const d = new Date(date);
  if (isNaN(d.getTime())) throw new ConvexError("Invalid session date");
  const now = new Date();
  if (d > now) throw new ConvexError("Session date cannot be in the future");
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  if (d < oneYearAgo) throw new ConvexError("Session date must be within the last year");
}

function validateSessionDuration(duration: number): void {
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    throw new ConvexError("Session duration must be between 5 and 480 minutes");
  }
}

function validateTargets(targets: Array<{ target: string; trials?: number; correct?: number }>): void {
  if (targets.length > 20) throw new ConvexError("Maximum 20 targets per session");
  for (const t of targets) {
    const trimmed = t.target.trim();
    if (trimmed.length === 0) throw new ConvexError("Target name is required");
    if (trimmed.length > 200) throw new ConvexError("Target name must be 200 characters or less");
    if (t.trials !== undefined) {
      if (!Number.isInteger(t.trials) || t.trials < 1 || t.trials > 1000) {
        throw new ConvexError("Trials must be between 1 and 1000");
      }
    }
    if (t.correct !== undefined) {
      if (!Number.isInteger(t.correct) || t.correct < 0) {
        throw new ConvexError("Correct must be a non-negative integer");
      }
      if (t.trials !== undefined && t.correct > t.trials) {
        throw new ConvexError("Correct cannot exceed trials");
      }
    }
  }
}

function validateSoapNote(soap: { subjective: string; objective: string; assessment: string; plan: string }): void {
  for (const [key, val] of Object.entries(soap)) {
    if (val.trim().length === 0) throw new ConvexError(`SOAP ${key} section cannot be empty`);
    if (val.length > 5000) throw new ConvexError(`SOAP ${key} section must be 5000 characters or less`);
  }
}
```

- [ ] **Step 2: Add list, get, and getLatestSoap queries**

Append to `convex/sessionNotes.ts`:

```ts
export const list = query({
  args: {
    patientId: v.id("patients"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.slpUserId !== userId) {
      throw new ConvexError("Patient not found");
    }
    const limit = args.limit ?? 20;
    return await ctx.db
      .query("sessionNotes")
      .withIndex("by_patientId_sessionDate", (q) =>
        q.eq("patientId", args.patientId)
      )
      .order("desc")
      .take(limit);
  },
});

export const get = query({
  args: {
    sessionNoteId: v.id("sessionNotes"),
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const note = await ctx.db.get(args.sessionNoteId);
    if (!note || note.slpUserId !== userId) return null;
    return note;
  },
});

export const getLatestSoap = query({
  args: {
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.slpUserId !== userId) return null;

    const notes = await ctx.db
      .query("sessionNotes")
      .withIndex("by_patientId_sessionDate", (q) =>
        q.eq("patientId", args.patientId)
      )
      .order("desc")
      .take(10);

    // Find the most recent note with a SOAP note that is complete or signed
    return notes.find(
      (n) => n.soapNote && (n.status === "complete" || n.status === "signed")
    ) ?? null;
  },
});
```

- [ ] **Step 3: Add create and update mutations**

Append to `convex/sessionNotes.ts`:

```ts
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    sessionDate: v.string(),
    sessionDuration: v.number(),
    sessionType: sessionTypeValidator,
    structuredData: structuredDataValidator,
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.slpUserId !== userId) {
      throw new ConvexError("Patient not found");
    }

    validateSessionDate(args.sessionDate);
    validateSessionDuration(args.sessionDuration);
    validateTargets(args.structuredData.targetsWorkedOn);

    const noteId = await ctx.db.insert("sessionNotes", {
      patientId: args.patientId,
      slpUserId: userId,
      sessionDate: args.sessionDate,
      sessionDuration: args.sessionDuration,
      sessionType: args.sessionType,
      status: "draft",
      structuredData: args.structuredData,
      aiGenerated: false,
    });

    await ctx.runMutation(internal.activityLog.log, {
      patientId: args.patientId,
      actorUserId: userId,
      action: "session-documented",
      details: `Session note created for ${args.sessionDate}`,
      timestamp: Date.now(),
    });

    return noteId;
  },
});

export const update = mutation({
  args: {
    sessionNoteId: v.id("sessionNotes"),
    sessionDate: v.optional(v.string()),
    sessionDuration: v.optional(v.number()),
    sessionType: v.optional(sessionTypeValidator),
    structuredData: v.optional(structuredDataValidator),
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const note = await ctx.db.get(args.sessionNoteId);
    if (!note || note.slpUserId !== userId) {
      throw new ConvexError("Session note not found");
    }
    if (note.status === "signed") {
      throw new ConvexError("Cannot edit a signed note. Unsign first.");
    }

    if (args.sessionDate) validateSessionDate(args.sessionDate);
    if (args.sessionDuration !== undefined) validateSessionDuration(args.sessionDuration);
    if (args.structuredData) validateTargets(args.structuredData.targetsWorkedOn);

    const updates: Record<string, unknown> = {};
    if (args.sessionDate) updates.sessionDate = args.sessionDate;
    if (args.sessionDuration !== undefined) updates.sessionDuration = args.sessionDuration;
    if (args.sessionType) updates.sessionType = args.sessionType;
    if (args.structuredData) updates.structuredData = args.structuredData;

    // Auto-transition draft → in-progress on first edit
    if (note.status === "draft") updates.status = "in-progress";

    await ctx.db.patch(args.sessionNoteId, updates);
  },
});
```

- [ ] **Step 4: Add SOAP mutations (updateSoap, saveSoapFromAI)**

Append to `convex/sessionNotes.ts`:

```ts
export const updateSoap = mutation({
  args: {
    sessionNoteId: v.id("sessionNotes"),
    soapNote: soapNoteValidator,
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const note = await ctx.db.get(args.sessionNoteId);
    if (!note || note.slpUserId !== userId) {
      throw new ConvexError("Session note not found");
    }
    if (note.status === "signed") {
      throw new ConvexError("Cannot edit a signed note. Unsign first.");
    }
    validateSoapNote(args.soapNote);
    await ctx.db.patch(args.sessionNoteId, {
      soapNote: args.soapNote,
      aiGenerated: false,
    });
  },
});

export const saveSoapFromAI = mutation({
  args: {
    sessionNoteId: v.id("sessionNotes"),
    soapNote: soapNoteValidator,
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const note = await ctx.db.get(args.sessionNoteId);
    if (!note || note.slpUserId !== userId) {
      throw new ConvexError("Session note not found");
    }
    if (note.status === "signed") {
      throw new ConvexError("Cannot overwrite a signed note");
    }
    validateSoapNote(args.soapNote);
    await ctx.db.patch(args.sessionNoteId, {
      soapNote: args.soapNote,
      aiGenerated: true,
    });
  },
});
```

- [ ] **Step 5: Add sign, unsign, updateStatus, and delete mutations**

Append to `convex/sessionNotes.ts`:

```ts
export const sign = mutation({
  args: {
    sessionNoteId: v.id("sessionNotes"),
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const note = await ctx.db.get(args.sessionNoteId);
    if (!note || note.slpUserId !== userId) {
      throw new ConvexError("Session note not found");
    }
    if (note.status !== "complete") {
      throw new ConvexError("Note must be complete before signing");
    }
    if (!note.soapNote) {
      throw new ConvexError("Cannot sign without a SOAP note");
    }

    await ctx.db.patch(args.sessionNoteId, {
      status: "signed",
      signedAt: Date.now(),
    });

    await ctx.runMutation(internal.activityLog.log, {
      patientId: note.patientId,
      actorUserId: userId,
      action: "session-signed",
      details: `Session note signed for ${note.sessionDate}`,
      timestamp: Date.now(),
    });
  },
});

export const unsign = mutation({
  args: {
    sessionNoteId: v.id("sessionNotes"),
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const note = await ctx.db.get(args.sessionNoteId);
    if (!note || note.slpUserId !== userId) {
      throw new ConvexError("Session note not found");
    }
    if (note.status !== "signed") {
      throw new ConvexError("Note is not signed");
    }

    await ctx.db.patch(args.sessionNoteId, {
      status: "complete",
      signedAt: undefined,
    });

    await ctx.runMutation(internal.activityLog.log, {
      patientId: note.patientId,
      actorUserId: userId,
      action: "session-unsigned",
      details: `Session note unsigned for ${note.sessionDate}`,
      timestamp: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    sessionNoteId: v.id("sessionNotes"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const note = await ctx.db.get(args.sessionNoteId);
    if (!note || note.slpUserId !== userId) {
      throw new ConvexError("Session note not found");
    }
    if (note.status === "signed" || args.status === "signed") {
      throw new ConvexError("Use sign/unsign mutations for signed status");
    }
    await ctx.db.patch(args.sessionNoteId, { status: args.status });
  },
});

export const remove = mutation({
  args: {
    sessionNoteId: v.id("sessionNotes"),
  },
  handler: async (ctx, args) => {
    const userId = await assertSLP(ctx);
    const note = await ctx.db.get(args.sessionNoteId);
    if (!note || note.slpUserId !== userId) {
      throw new ConvexError("Session note not found");
    }
    if (note.status === "signed") {
      throw new ConvexError("Cannot delete a signed note. Unsign first.");
    }
    await ctx.db.delete(args.sessionNoteId);
  },
});
```

Note: Named `remove` instead of `delete` because `delete` is a reserved keyword.

- [ ] **Step 6: Verify functions compile**

Run: `npx convex dev --once`
Expected: All functions register successfully, no errors.

- [ ] **Step 7: Commit**

```bash
git add convex/sessionNotes.ts
git commit -m "feat: add sessionNotes Convex functions (CRUD, sign/unsign, SOAP)"
```

---

## Task 3: Backend Unit Tests — sessionNotes

**Files:**
- Create: `convex/__tests__/sessionNotes.test.ts`

- [ ] **Step 1: Create test file with shared fixtures**

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

const VALID_SESSION_DATA = {
  sessionDate: new Date().toISOString().split("T")[0],
  sessionDuration: 30,
  sessionType: "in-person" as const,
  structuredData: {
    targetsWorkedOn: [
      {
        target: "/r/ in initial position",
        trials: 20,
        correct: 14,
        promptLevel: "verbal-cue" as const,
      },
    ],
  },
};

const VALID_SOAP = {
  subjective: "Parent reports Alex practiced /r/ sounds at home this week.",
  objective: "Alex produced /r/ in initial position with 70% accuracy (14/20 trials) given verbal cues.",
  assessment: "Alex continues to make progress toward articulation goals.",
  plan: "Continue targeting /r/ in initial position. Introduce /r/ in medial position next session.",
};

async function createPatientAndNote(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
  const noteId = await slp.mutation(api.sessionNotes.create, {
    ...VALID_SESSION_DATA,
    patientId,
  });
  return { slp, patientId, noteId };
}
```

- [ ] **Step 2: Add create tests**

```ts
describe("sessionNotes.create", () => {
  it("creates a session note with required fields", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    const note = await slp.query(api.sessionNotes.get, { sessionNoteId: noteId });
    expect(note).toBeDefined();
    expect(note!.status).toBe("draft");
    expect(note!.aiGenerated).toBe(false);
    expect(note!.slpUserId).toBe("slp-user-123");
    expect(note!.structuredData.targetsWorkedOn).toHaveLength(1);
  });

  it("rejects future session date", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.sessionNotes.create, {
        ...VALID_SESSION_DATA,
        patientId,
        sessionDate: "2099-01-01",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid session duration", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.sessionNotes.create, {
        ...VALID_SESSION_DATA,
        patientId,
        sessionDuration: 2,
      })
    ).rejects.toThrow();
  });

  it("rejects when correct exceeds trials", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      t.mutation(api.sessionNotes.create, {
        patientId,
        sessionDate: VALID_SESSION_DATA.sessionDate,
        sessionDuration: 30,
        sessionType: "in-person",
        structuredData: {
          targetsWorkedOn: [{ target: "/r/", trials: 10, correct: 15 }],
        },
      })
    ).rejects.toThrow("Correct cannot exceed trials");
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.sessionNotes.create, {
        ...VALID_SESSION_DATA,
        patientId: "placeholder" as any,
      })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Add update and status tests**

```ts
describe("sessionNotes.update", () => {
  it("partial update works on draft note", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    await slp.mutation(api.sessionNotes.update, {
      sessionNoteId: noteId,
      sessionDuration: 45,
    });
    const note = await slp.query(api.sessionNotes.get, { sessionNoteId: noteId });
    expect(note!.sessionDuration).toBe(45);
    expect(note!.status).toBe("in-progress"); // auto-transition
  });

  it("rejects update on signed note", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    // Move to complete, add SOAP, then sign
    await slp.mutation(api.sessionNotes.updateStatus, { sessionNoteId: noteId, status: "complete" });
    await slp.mutation(api.sessionNotes.saveSoapFromAI, { sessionNoteId: noteId, soapNote: VALID_SOAP });
    await slp.mutation(api.sessionNotes.sign, { sessionNoteId: noteId });
    await expect(
      slp.mutation(api.sessionNotes.update, { sessionNoteId: noteId, sessionDuration: 60 })
    ).rejects.toThrow("signed");
  });

  it("rejects update by different SLP", async () => {
    const t = convexTest(schema, modules);
    const { noteId } = await createPatientAndNote(t);
    const other = t.withIdentity(OTHER_SLP);
    await expect(
      other.mutation(api.sessionNotes.update, { sessionNoteId: noteId, sessionDuration: 60 })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Add SOAP, sign/unsign, and delete tests**

```ts
describe("sessionNotes.saveSoapFromAI", () => {
  it("saves AI-generated SOAP and sets aiGenerated true", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    await slp.mutation(api.sessionNotes.saveSoapFromAI, { sessionNoteId: noteId, soapNote: VALID_SOAP });
    const note = await slp.query(api.sessionNotes.get, { sessionNoteId: noteId });
    expect(note!.soapNote).toEqual(VALID_SOAP);
    expect(note!.aiGenerated).toBe(true);
  });
});

describe("sessionNotes.updateSoap", () => {
  it("manual edit sets aiGenerated false", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    await slp.mutation(api.sessionNotes.saveSoapFromAI, { sessionNoteId: noteId, soapNote: VALID_SOAP });
    await slp.mutation(api.sessionNotes.updateSoap, {
      sessionNoteId: noteId,
      soapNote: { ...VALID_SOAP, subjective: "Edited by SLP." },
    });
    const note = await slp.query(api.sessionNotes.get, { sessionNoteId: noteId });
    expect(note!.aiGenerated).toBe(false);
    expect(note!.soapNote!.subjective).toBe("Edited by SLP.");
  });
});

describe("sessionNotes.sign", () => {
  it("signs a complete note with SOAP", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    await slp.mutation(api.sessionNotes.updateStatus, { sessionNoteId: noteId, status: "complete" });
    await slp.mutation(api.sessionNotes.saveSoapFromAI, { sessionNoteId: noteId, soapNote: VALID_SOAP });
    await slp.mutation(api.sessionNotes.sign, { sessionNoteId: noteId });
    const note = await slp.query(api.sessionNotes.get, { sessionNoteId: noteId });
    expect(note!.status).toBe("signed");
    expect(note!.signedAt).toBeDefined();
  });

  it("rejects signing without SOAP", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    await slp.mutation(api.sessionNotes.updateStatus, { sessionNoteId: noteId, status: "complete" });
    await expect(
      slp.mutation(api.sessionNotes.sign, { sessionNoteId: noteId })
    ).rejects.toThrow("SOAP");
  });

  it("rejects signing draft note", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    await slp.mutation(api.sessionNotes.saveSoapFromAI, { sessionNoteId: noteId, soapNote: VALID_SOAP });
    await expect(
      slp.mutation(api.sessionNotes.sign, { sessionNoteId: noteId })
    ).rejects.toThrow("complete");
  });
});

describe("sessionNotes.unsign", () => {
  it("reverts signed note to complete", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    await slp.mutation(api.sessionNotes.updateStatus, { sessionNoteId: noteId, status: "complete" });
    await slp.mutation(api.sessionNotes.saveSoapFromAI, { sessionNoteId: noteId, soapNote: VALID_SOAP });
    await slp.mutation(api.sessionNotes.sign, { sessionNoteId: noteId });
    await slp.mutation(api.sessionNotes.unsign, { sessionNoteId: noteId });
    const note = await slp.query(api.sessionNotes.get, { sessionNoteId: noteId });
    expect(note!.status).toBe("complete");
    expect(note!.signedAt).toBeUndefined();
  });
});

describe("sessionNotes.remove", () => {
  it("deletes a draft note", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    await slp.mutation(api.sessionNotes.remove, { sessionNoteId: noteId });
    const note = await slp.query(api.sessionNotes.get, { sessionNoteId: noteId });
    expect(note).toBeNull();
  });

  it("rejects deleting a signed note", async () => {
    const t = convexTest(schema, modules);
    const { slp, noteId } = await createPatientAndNote(t);
    await slp.mutation(api.sessionNotes.updateStatus, { sessionNoteId: noteId, status: "complete" });
    await slp.mutation(api.sessionNotes.saveSoapFromAI, { sessionNoteId: noteId, soapNote: VALID_SOAP });
    await slp.mutation(api.sessionNotes.sign, { sessionNoteId: noteId });
    await expect(
      slp.mutation(api.sessionNotes.remove, { sessionNoteId: noteId })
    ).rejects.toThrow("signed");
  });
});

describe("sessionNotes.list", () => {
  it("returns notes for patient ordered by date desc", async () => {
    const t = convexTest(schema, modules);
    const { slp, patientId } = await createPatientAndNote(t);
    await slp.mutation(api.sessionNotes.create, {
      ...VALID_SESSION_DATA,
      patientId,
      sessionDate: "2026-03-27",
    });
    const notes = await slp.query(api.sessionNotes.list, { patientId });
    expect(notes.length).toBe(2);
  });

  it("rejects listing for another SLP's patient", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientAndNote(t);
    const other = t.withIdentity(OTHER_SLP);
    await expect(
      other.query(api.sessionNotes.list, { patientId })
    ).rejects.toThrow();
  });
});

describe("sessionNotes.getLatestSoap", () => {
  it("returns most recent note with SOAP, skips drafts", async () => {
    const t = convexTest(schema, modules);
    const { slp, patientId, noteId } = await createPatientAndNote(t);
    // Complete first note with SOAP
    await slp.mutation(api.sessionNotes.updateStatus, { sessionNoteId: noteId, status: "complete" });
    await slp.mutation(api.sessionNotes.saveSoapFromAI, { sessionNoteId: noteId, soapNote: VALID_SOAP });
    // Create a second note (draft, no SOAP)
    await slp.mutation(api.sessionNotes.create, {
      ...VALID_SESSION_DATA,
      patientId,
      sessionDate: "2026-03-27",
    });
    const latest = await slp.query(api.sessionNotes.getLatestSoap, { patientId });
    expect(latest).toBeDefined();
    expect(latest!.soapNote).toEqual(VALID_SOAP);
  });

  it("returns null when no SOAP notes exist", async () => {
    const t = convexTest(schema, modules);
    const { slp, patientId } = await createPatientAndNote(t);
    const latest = await slp.query(api.sessionNotes.getLatestSoap, { patientId });
    expect(latest).toBeNull();
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run convex/__tests__/sessionNotes.test.ts`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add convex/__tests__/sessionNotes.test.ts
git commit -m "test: add sessionNotes backend unit tests"
```

---

## Task 4: Utility Functions and Prompt Builder

**Files:**
- Create: `src/features/session-notes/lib/session-utils.ts`
- Create: `src/features/session-notes/lib/soap-prompt.ts`
- Create: `src/features/session-notes/__tests__/session-utils.test.ts`
- Create: `src/features/session-notes/__tests__/soap-prompt.test.ts`

- [ ] **Step 1: Create session-utils.ts**

```ts
/**
 * Formats a duration in minutes to a human-readable string.
 * Examples: 30 → "30 min", 75 → "1h 15min", 120 → "2h"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}

/**
 * Calculates accuracy percentage from correct/trials.
 * Returns null if trials is 0 or undefined.
 */
export function calculateAccuracy(
  correct?: number,
  trials?: number
): number | null {
  if (!trials || trials === 0) return null;
  if (correct === undefined || correct === null) return null;
  return Math.round((correct / trials) * 100);
}

/**
 * Returns the accuracy color class based on percentage.
 * Green >= 80%, Yellow >= 60%, Red < 60%
 */
export function accuracyColor(accuracy: number | null): string {
  if (accuracy === null) return "text-muted-foreground";
  if (accuracy >= 80) return "text-green-600 dark:text-green-400";
  if (accuracy >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Returns accuracy label with check/x indicator for accessibility.
 */
export function accuracyLabel(accuracy: number | null): string {
  if (accuracy === null) return "—";
  return accuracy >= 80 ? `${accuracy}% ✓` : `${accuracy}%`;
}
```

- [ ] **Step 2: Create session-utils tests**

```ts
import { describe, expect, it } from "vitest";
import {
  formatDuration,
  calculateAccuracy,
  accuracyColor,
  accuracyLabel,
} from "../lib/session-utils";

describe("formatDuration", () => {
  it("formats minutes under 60", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(5)).toBe("5 min");
  });

  it("formats exact hours", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(120)).toBe("2h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(75)).toBe("1h 15min");
    expect(formatDuration(90)).toBe("1h 30min");
  });
});

describe("calculateAccuracy", () => {
  it("calculates percentage", () => {
    expect(calculateAccuracy(14, 20)).toBe(70);
    expect(calculateAccuracy(20, 20)).toBe(100);
  });

  it("returns null for zero or undefined trials", () => {
    expect(calculateAccuracy(0, 0)).toBeNull();
    expect(calculateAccuracy(5, undefined)).toBeNull();
    expect(calculateAccuracy(undefined, 10)).toBeNull();
  });

  it("rounds to nearest integer", () => {
    expect(calculateAccuracy(1, 3)).toBe(33);
  });
});

describe("accuracyColor", () => {
  it("returns green for >= 80", () => {
    expect(accuracyColor(80)).toContain("green");
    expect(accuracyColor(100)).toContain("green");
  });

  it("returns yellow for >= 60", () => {
    expect(accuracyColor(60)).toContain("yellow");
    expect(accuracyColor(79)).toContain("yellow");
  });

  it("returns red for < 60", () => {
    expect(accuracyColor(59)).toContain("red");
    expect(accuracyColor(0)).toContain("red");
  });

  it("returns muted for null", () => {
    expect(accuracyColor(null)).toContain("muted");
  });
});

describe("accuracyLabel", () => {
  it("shows check for >= 80", () => {
    expect(accuracyLabel(80)).toBe("80% ✓");
  });

  it("shows plain percentage for < 80", () => {
    expect(accuracyLabel(50)).toBe("50%");
  });

  it("shows dash for null", () => {
    expect(accuracyLabel(null)).toBe("—");
  });
});
```

- [ ] **Step 3: Run session-utils tests**

Run: `npx vitest run src/features/session-notes/__tests__/session-utils.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Create soap-prompt.ts**

```ts
interface PatientContext {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosis: string;
  communicationLevel?: string;
  sensoryNotes?: string;
  behavioralNotes?: string;
}

interface TargetData {
  target: string;
  trials?: number;
  correct?: number;
  promptLevel?: string;
  notes?: string;
}

interface SessionContext {
  sessionDate: string;
  sessionDuration: number;
  sessionType: string;
  structuredData: {
    targetsWorkedOn: TargetData[];
    behaviorNotes?: string;
    parentFeedback?: string;
    homeworkAssigned?: string;
    nextSessionFocus?: string;
  };
}

interface PreviousSoap {
  sessionDate: string;
  soapNote: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function formatTargetLine(t: TargetData): string {
  const parts = [`  - ${t.target}`];
  if (t.trials !== undefined && t.correct !== undefined) {
    const accuracy = Math.round((t.correct / t.trials) * 100);
    parts.push(`: ${t.correct}/${t.trials} (${accuracy}%)`);
  }
  if (t.promptLevel) {
    parts.push(`, prompt level: ${t.promptLevel.replace("-", " ")}`);
  }
  if (t.notes) {
    parts.push(`\n    ${t.notes}`);
  }
  return parts.join("");
}

export function buildSoapPrompt(
  patient: PatientContext,
  session: SessionContext,
  previousSoap: PreviousSoap | null
): string {
  const age = calculateAge(patient.dateOfBirth);

  const patientLines = [
    `- Name: ${patient.firstName} ${patient.lastName}`,
    `- Age: ${age}`,
    `- Diagnosis: ${patient.diagnosis}`,
  ];
  if (patient.communicationLevel) {
    patientLines.push(`- Communication Level: ${patient.communicationLevel.replace("-", " ")}`);
  }
  if (patient.sensoryNotes) {
    patientLines.push(`- Sensory Notes: ${patient.sensoryNotes}`);
  }
  if (patient.behavioralNotes) {
    patientLines.push(`- Behavioral Notes: ${patient.behavioralNotes}`);
  }

  const prevSection = previousSoap
    ? `PREVIOUS SESSION (${previousSoap.sessionDate}):\nSubjective: ${previousSoap.soapNote.subjective}\nObjective: ${previousSoap.soapNote.objective}\nAssessment: ${previousSoap.soapNote.assessment}\nPlan: ${previousSoap.soapNote.plan}`
    : "PREVIOUS SESSION:\nNo previous session documented.";

  const targetLines = session.structuredData.targetsWorkedOn
    .map(formatTargetLine)
    .join("\n");

  const additionalFields: string[] = [];
  if (session.structuredData.behaviorNotes) {
    additionalFields.push(`Behavior Notes: ${session.structuredData.behaviorNotes}`);
  }
  if (session.structuredData.parentFeedback) {
    additionalFields.push(`Parent Feedback: ${session.structuredData.parentFeedback}`);
  }
  if (session.structuredData.homeworkAssigned) {
    additionalFields.push(`Homework Assigned: ${session.structuredData.homeworkAssigned}`);
  }
  if (session.structuredData.nextSessionFocus) {
    additionalFields.push(`Next Session Focus: ${session.structuredData.nextSessionFocus}`);
  }

  return `You are a clinical documentation assistant for speech-language pathologists.
You write SOAP notes following ASHA documentation standards.

PATIENT CONTEXT:
${patientLines.join("\n")}

${prevSection}

CURRENT SESSION (${session.sessionDate}, ${session.sessionDuration} min, ${session.sessionType}):
Targets Worked On:
${targetLines}
${additionalFields.length > 0 ? "\n" + additionalFields.join("\n") : ""}

INSTRUCTIONS:
Write a SOAP note with exactly four sections. Use clinical language appropriate
for insurance documentation. Reference specific data points from the session.
Include continuity language referencing the previous session when available.

Format your response exactly as:
SUBJECTIVE:
{content}

OBJECTIVE:
{content}

ASSESSMENT:
{content}

PLAN:
{content}`;
}

/**
 * Parses a SOAP response from Claude into the four sections.
 * Expects sections delimited by SUBJECTIVE:, OBJECTIVE:, ASSESSMENT:, PLAN: headers.
 */
export function parseSoapResponse(text: string): {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
} | null {
  const sections: Record<string, string> = {};
  const headers = ["SUBJECTIVE", "OBJECTIVE", "ASSESSMENT", "PLAN"];

  for (let i = 0; i < headers.length; i++) {
    const start = text.indexOf(`${headers[i]}:`);
    if (start === -1) return null;
    const contentStart = start + headers[i].length + 1;
    const nextHeader = i < headers.length - 1 ? text.indexOf(`${headers[i + 1]}:`) : text.length;
    if (nextHeader === -1) return null;
    sections[headers[i].toLowerCase()] = text.slice(contentStart, nextHeader).trim();
  }

  if (!sections.subjective || !sections.objective || !sections.assessment || !sections.plan) {
    return null;
  }

  return {
    subjective: sections.subjective,
    objective: sections.objective,
    assessment: sections.assessment,
    plan: sections.plan,
  };
}
```

- [ ] **Step 5: Create soap-prompt tests**

```ts
import { describe, expect, it } from "vitest";
import { buildSoapPrompt, parseSoapResponse } from "../lib/soap-prompt";

const PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-06-15",
  diagnosis: "articulation",
  communicationLevel: "single-words" as const,
};

const SESSION = {
  sessionDate: "2026-03-28",
  sessionDuration: 30,
  sessionType: "in-person",
  structuredData: {
    targetsWorkedOn: [
      { target: "/r/ in initial position", trials: 20, correct: 14, promptLevel: "verbal-cue" as const },
    ],
    behaviorNotes: "Cooperative and engaged.",
  },
};

describe("buildSoapPrompt", () => {
  it("includes patient context", () => {
    const prompt = buildSoapPrompt(PATIENT, SESSION, null);
    expect(prompt).toContain("Alex Smith");
    expect(prompt).toContain("articulation");
    expect(prompt).toContain("single words");
  });

  it("includes session data with accuracy", () => {
    const prompt = buildSoapPrompt(PATIENT, SESSION, null);
    expect(prompt).toContain("/r/ in initial position");
    expect(prompt).toContain("14/20 (70%)");
    expect(prompt).toContain("verbal cue");
  });

  it("shows no previous session when null", () => {
    const prompt = buildSoapPrompt(PATIENT, SESSION, null);
    expect(prompt).toContain("No previous session documented.");
  });

  it("includes previous SOAP when provided", () => {
    const prev = {
      sessionDate: "2026-03-21",
      soapNote: {
        subjective: "Previous subjective.",
        objective: "Previous objective.",
        assessment: "Previous assessment.",
        plan: "Previous plan.",
      },
    };
    const prompt = buildSoapPrompt(PATIENT, SESSION, prev);
    expect(prompt).toContain("Previous subjective.");
    expect(prompt).toContain("2026-03-21");
  });

  it("omits optional fields when missing", () => {
    const minPatient = {
      firstName: "Alex",
      lastName: "Smith",
      dateOfBirth: "2020-06-15",
      diagnosis: "articulation",
    };
    const prompt = buildSoapPrompt(minPatient, SESSION, null);
    expect(prompt).not.toContain("Sensory Notes");
    expect(prompt).not.toContain("Communication Level");
  });
});

describe("parseSoapResponse", () => {
  it("parses valid SOAP response", () => {
    const text = `SUBJECTIVE:
Patient's mother reports they practiced sounds at home.

OBJECTIVE:
Produced /r/ with 70% accuracy across 20 trials.

ASSESSMENT:
Continuing to make progress.

PLAN:
Continue /r/ in initial position.`;

    const result = parseSoapResponse(text);
    expect(result).not.toBeNull();
    expect(result!.subjective).toContain("practiced sounds");
    expect(result!.objective).toContain("70% accuracy");
    expect(result!.assessment).toContain("progress");
    expect(result!.plan).toContain("Continue");
  });

  it("returns null for missing sections", () => {
    expect(parseSoapResponse("Just some text without headers")).toBeNull();
    expect(parseSoapResponse("SUBJECTIVE:\nStuff\nOBJECTIVE:\nStuff")).toBeNull();
  });
});
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/features/session-notes/__tests__/`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/session-notes/lib/ src/features/session-notes/__tests__/
git commit -m "feat: add session-notes utility functions and SOAP prompt builder"
```

---

## Task 5: API Route — /api/generate-soap

**Files:**
- Create: `src/app/api/generate-soap/route.ts`

- [ ] **Step 1: Create the SSE streaming route**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { buildSoapPrompt, parseSoapResponse } from "@/features/session-notes/lib/soap-prompt";
import { sseEncode } from "../generate/sse";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate-soap");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-soap");
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const runtime = "nodejs";

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request): Promise<Response> {
  // Require authentication (unlike /api/generate, SOAP always needs auth)
  const { userId, getToken } = await auth();
  if (!userId) return jsonError("Not authenticated", 401);

  const token = await getToken({ template: "convex" });
  if (!token) return jsonError("Failed to get Convex auth token", 401);
  convex.setAuth(token);

  let body: { sessionNoteId?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  if (!body.sessionNoteId) {
    return jsonError("sessionNoteId is required", 400);
  }

  const sessionNoteId = body.sessionNoteId as Id<"sessionNotes">;

  // Fetch session note, patient, and previous SOAP in parallel
  let note, patient, previousNote;
  try {
    note = await convex.query(api.sessionNotes.get, { sessionNoteId });
    if (!note) return jsonError("Session note not found", 404);

    [patient, previousNote] = await Promise.all([
      convex.query(api.patients.get, { patientId: note.patientId }),
      convex.query(api.sessionNotes.getLatestSoap, { patientId: note.patientId }),
    ]);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to fetch context", 500);
  }

  if (!patient) return jsonError("Patient not found", 404);
  if (note.status === "signed") return jsonError("Cannot regenerate SOAP for a signed note", 400);

  // Build the prompt
  const previousSoap = previousNote && previousNote._id !== sessionNoteId
    ? {
        sessionDate: previousNote.sessionDate,
        soapNote: previousNote.soapNote!,
      }
    : null;

  const systemPrompt = buildSoapPrompt(patient, note, previousSoap);

  // Stream the response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const isAborted = () => request.signal.aborted;
      const send = (eventType: string, data: object) => {
        if (isAborted()) return;
        try {
          controller.enqueue(encoder.encode(sseEncode(eventType, data)));
        } catch {
          // Client disconnected
        }
      };

      try {
        let fullText = "";

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6-20250514",
          max_tokens: 1024,
          temperature: 0.3,
          system: systemPrompt,
          messages: [{ role: "user", content: "Generate the SOAP note." }],
          stream: true,
        });

        for await (const event of response) {
          if (isAborted()) break;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            send("soap-chunk", { text: event.delta.text });
          }
        }

        // Parse the complete response into SOAP sections
        const parsed = parseSoapResponse(fullText);

        if (parsed) {
          // Persist to Convex
          try {
            await convex.mutation(api.sessionNotes.saveSoapFromAI, {
              sessionNoteId,
              soapNote: parsed,
            });
          } catch (e) {
            send("error", {
              message: "SOAP generated but failed to save. You can copy the text and save manually.",
            });
            controller.close();
            return;
          }
          send("soap-complete", { soapNote: parsed });
        } else {
          send("error", {
            message: "Could not parse SOAP sections from AI response. Please try again.",
            partialText: fullText,
          });
        }
      } catch (e) {
        send("error", {
          message: e instanceof Error ? e.message : "SOAP generation failed",
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

- [ ] **Step 2: Verify the route compiles**

Run: `npx next build --no-lint 2>&1 | head -30`
Expected: No TypeScript errors in the route file. (Full build may show unrelated warnings.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate-soap/route.ts
git commit -m "feat: add /api/generate-soap SSE streaming route"
```

---

## Task 6: Frontend Hooks

**Files:**
- Create: `src/features/session-notes/hooks/use-session-notes.ts`
- Create: `src/features/session-notes/hooks/use-soap-generation.ts`

- [ ] **Step 1: Create use-session-notes.ts**

```ts
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useSessionNotes(patientId: Id<"patients">, limit?: number) {
  return useQuery(api.sessionNotes.list, { patientId, limit });
}

export function useSessionNote(sessionNoteId: Id<"sessionNotes"> | null) {
  return useQuery(
    api.sessionNotes.get,
    sessionNoteId ? { sessionNoteId } : "skip"
  );
}

export function useCreateSessionNote() {
  return useMutation(api.sessionNotes.create);
}

export function useUpdateSessionNote() {
  return useMutation(api.sessionNotes.update);
}

export function useUpdateSoap() {
  return useMutation(api.sessionNotes.updateSoap);
}

export function useUpdateSessionNoteStatus() {
  return useMutation(api.sessionNotes.updateStatus);
}

export function useSignSessionNote() {
  return useMutation(api.sessionNotes.sign);
}

export function useUnsignSessionNote() {
  return useMutation(api.sessionNotes.unsign);
}

export function useDeleteSessionNote() {
  return useMutation(api.sessionNotes.remove);
}
```

- [ ] **Step 2: Create use-soap-generation.ts**

```ts
"use client";

import { useCallback, useRef, useState } from "react";

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SoapGenerationState {
  status: "idle" | "generating" | "complete" | "error";
  streamedText: string;
  soapNote: SoapNote | null;
  error: string | null;
}

export function useSoapGeneration() {
  const [state, setState] = useState<SoapGenerationState>({
    status: "idle",
    streamedText: "",
    soapNote: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (sessionNoteId: string) => {
    // Abort any in-progress generation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: "generating", streamedText: "", soapNote: null, error: null });

    try {
      const response = await fetch("/api/generate-soap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionNoteId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }));
        setState((s) => ({ ...s, status: "error", error: err.error }));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setState((s) => ({ ...s, status: "error", error: "No response stream" }));
        return;
      }

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
            // Next line should be "data: ..."
            if (i + 1 < lines.length && lines[i + 1].startsWith("data: ")) {
              const data = JSON.parse(lines[i + 1].slice(6));
              i++; // skip the data line
              if (eventType === "soap-chunk") {
                setState((s) => ({
                  ...s,
                  streamedText: s.streamedText + data.text,
                }));
              } else if (eventType === "soap-complete") {
                setState((s) => ({
                  ...s,
                  status: "complete",
                  soapNote: data.soapNote,
                }));
              } else if (eventType === "error") {
                setState((s) => ({
                  ...s,
                  status: "error",
                  error: data.message,
                }));
              }
            }
          }
        }
      }

      // If we finished reading without a soap-complete event, mark as error
      setState((s) =>
        s.status === "generating"
          ? { ...s, status: "error", error: "Generation ended unexpectedly" }
          : s
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState((s) => ({
        ...s,
        status: "error",
        error: (e as Error).message,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: "idle", streamedText: "", soapNote: null, error: null });
  }, []);

  return { ...state, generate, reset };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/session-notes/hooks/
git commit -m "feat: add session-notes query hooks and SOAP generation hook"
```

---

## Task 7: UI Components — Target Entry and Duration Preset

**Files:**
- Create: `src/features/session-notes/components/target-entry.tsx`
- Create: `src/features/session-notes/components/duration-preset-input.tsx`

- [ ] **Step 1: Create target-entry.tsx**

```tsx
"use client";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { MaterialIcon } from "@/shared/components/material-icon";
import { calculateAccuracy, accuracyColor, accuracyLabel } from "../lib/session-utils";

interface TargetData {
  target: string;
  trials?: number;
  correct?: number;
  promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
  notes?: string;
}

interface TargetEntryProps {
  data: TargetData;
  onChange: (data: TargetData) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function TargetEntry({ data, onChange, onRemove, disabled }: TargetEntryProps) {
  const accuracy = calculateAccuracy(data.correct, data.trials);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      {/* Row 1: Target name + remove */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Target (e.g., /r/ in initial position)"
          value={data.target}
          onChange={(e) => onChange({ ...data, target: e.target.value })}
          disabled={disabled}
          className="flex-1"
        />
        <Button variant="ghost" size="icon" onClick={onRemove} disabled={disabled} aria-label="Remove target">
          <MaterialIcon icon="delete" size="sm" />
        </Button>
      </div>

      {/* Row 2: Trials, Correct, Prompt Level, Accuracy */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <label className="text-xs text-muted-foreground">Trials</label>
          <Input
            type="number"
            value={data.trials ?? ""}
            onChange={(e) => onChange({ ...data, trials: e.target.value ? parseInt(e.target.value) : undefined })}
            disabled={disabled}
            className="w-20"
            min={1}
            max={1000}
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-muted-foreground">Correct</label>
          <Input
            type="number"
            value={data.correct ?? ""}
            onChange={(e) => onChange({ ...data, correct: e.target.value ? parseInt(e.target.value) : undefined })}
            disabled={disabled}
            className="w-20"
            min={0}
            max={data.trials ?? 1000}
          />
        </div>
        <Select
          value={data.promptLevel ?? ""}
          onValueChange={(val) => onChange({ ...data, promptLevel: val as TargetData["promptLevel"] || undefined })}
          disabled={disabled}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Prompt level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="independent">Independent</SelectItem>
            <SelectItem value="verbal-cue">Verbal Cue</SelectItem>
            <SelectItem value="model">Model</SelectItem>
            <SelectItem value="physical">Physical</SelectItem>
          </SelectContent>
        </Select>
        {accuracy !== null && (
          <span className={`text-sm font-medium ${accuracyColor(accuracy)}`}>
            {accuracyLabel(accuracy)}
          </span>
        )}
      </div>

      {/* Row 3: Notes */}
      <Input
        placeholder="Notes (optional)"
        value={data.notes ?? ""}
        onChange={(e) => onChange({ ...data, notes: e.target.value || undefined })}
        disabled={disabled}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create duration-preset-input.tsx**

```tsx
"use client";

import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";

interface DurationPresetInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const PRESETS = [30, 45, 60];

export function DurationPresetInput({ value, onChange, disabled }: DurationPresetInputProps) {
  return (
    <div className="flex items-center gap-2">
      {PRESETS.map((preset) => (
        <Button
          key={preset}
          variant="outline"
          size="sm"
          onClick={() => onChange(preset)}
          disabled={disabled}
          className={cn(
            "min-w-[3rem]",
            value === preset && "border-primary bg-primary/10 text-primary"
          )}
        >
          {preset}
        </Button>
      ))}
      <Input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        disabled={disabled}
        className="w-20"
        min={5}
        max={480}
        aria-label="Duration in minutes"
      />
      <span className="text-xs text-muted-foreground">min</span>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/session-notes/components/target-entry.tsx src/features/session-notes/components/duration-preset-input.tsx
git commit -m "feat: add target-entry and duration-preset-input components"
```

---

## Task 8: UI Components — SOAP Preview and Session Note Card

**Files:**
- Create: `src/features/session-notes/components/soap-preview.tsx`
- Create: `src/features/session-notes/components/session-note-card.tsx`

- [ ] **Step 1: Create soap-preview.tsx**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { MaterialIcon } from "@/shared/components/material-icon";
import { cn } from "@/core/utils";

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface SoapPreviewProps {
  soapNote: SoapNote | null;
  streamedText: string;
  status: "idle" | "generating" | "complete" | "error";
  error: string | null;
  aiGenerated: boolean;
  disabled?: boolean;
  onEdit: (soap: SoapNote) => void;
  onRegenerate: () => void;
}

const SECTIONS = [
  { key: "subjective" as const, label: "Subjective", icon: "person" },
  { key: "objective" as const, label: "Objective", icon: "analytics" },
  { key: "assessment" as const, label: "Assessment", icon: "psychology" },
  { key: "plan" as const, label: "Plan", icon: "checklist" },
];

export function SoapPreview({
  soapNote,
  streamedText,
  status,
  error,
  aiGenerated,
  disabled,
  onEdit,
  onRegenerate,
}: SoapPreviewProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedSoap, setEditedSoap] = useState<SoapNote | null>(null);

  // Idle / empty state
  if (status === "idle" && !soapNote) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-8">
        <p className="text-center text-sm text-muted-foreground">
          Fill in session data and click Generate SOAP Note to create documentation
        </p>
      </div>
    );
  }

  // Generating state
  if (status === "generating") {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="text-sm font-medium">Generating SOAP note...</span>
        </div>
        <pre className="whitespace-pre-wrap text-sm text-foreground">{streamedText}</pre>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{error}</p>
        {streamedText && (
          <>
            <p className="text-xs text-muted-foreground">
              Partial text was generated. You can edit it manually or regenerate.
            </p>
            <pre className="whitespace-pre-wrap text-sm text-foreground">{streamedText}</pre>
          </>
        )}
        <Button variant="outline" size="sm" onClick={onRegenerate} className="w-fit">
          <MaterialIcon icon="refresh" size="sm" />
          Try Again
        </Button>
      </div>
    );
  }

  // Generated / existing SOAP display
  const soap = editedSoap ?? soapNote;
  if (!soap) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">SOAP Note</span>
          {aiGenerated && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              AI Generated
            </span>
          )}
          {editedSoap && (
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-600">
              edited
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={disabled}>
          <MaterialIcon icon="refresh" size="sm" />
          Regenerate
        </Button>
      </div>

      {SECTIONS.map(({ key, label, icon }) => (
        <div key={key} className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <MaterialIcon icon={icon} size="sm" className="text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </h3>
          </div>
          {editingSection === key ? (
            <div className="flex flex-col gap-1">
              <Textarea
                value={soap[key]}
                onChange={(e) => {
                  const updated = { ...soap, [key]: e.target.value };
                  setEditedSoap(updated);
                }}
                className="min-h-[80px] text-sm"
                autoFocus
              />
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingSection(null);
                    if (editedSoap) onEdit(editedSoap);
                  }}
                >
                  Done
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingSection(null);
                    setEditedSoap(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p
              className={cn(
                "cursor-pointer rounded-md p-2 text-sm text-foreground transition-colors hover:bg-muted/50",
                disabled && "cursor-default hover:bg-transparent"
              )}
              onClick={() => !disabled && setEditingSection(key)}
            >
              {soap[key]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create session-note-card.tsx**

```tsx
"use client";

import Link from "next/link";
import { MaterialIcon } from "@/shared/components/material-icon";
import { formatDuration, calculateAccuracy, accuracyLabel, accuracyColor } from "../lib/session-utils";
import { cn } from "@/core/utils";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface SessionNoteCardProps {
  note: Doc<"sessionNotes">;
  patientId: string;
}

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-muted text-muted-foreground", label: "Draft" },
  "in-progress": { color: "bg-yellow-500/10 text-yellow-600", label: "In Progress" },
  complete: { color: "bg-blue-500/10 text-blue-600", label: "Complete" },
  signed: { color: "bg-green-500/10 text-green-600", label: "Signed" },
};

const TYPE_ICONS: Record<string, string> = {
  "in-person": "person",
  teletherapy: "videocam",
  "parent-consultation": "group",
};

export function SessionNoteCard({ note, patientId }: SessionNoteCardProps) {
  const statusStyle = STATUS_STYLES[note.status] ?? STATUS_STYLES.draft;
  const typeIcon = TYPE_ICONS[note.sessionType] ?? "description";
  const firstTarget = note.structuredData.targetsWorkedOn[0];
  const accuracy = firstTarget
    ? calculateAccuracy(firstTarget.correct, firstTarget.trials)
    : null;

  const formattedDate = new Date(note.sessionDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/patients/${patientId}/sessions/${note._id}`}
      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
    >
      {/* Left: Date + duration + type */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm font-medium">{formattedDate}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MaterialIcon icon={typeIcon} size="sm" />
          <span>{formatDuration(note.sessionDuration)}</span>
        </div>
      </div>

      {/* Center: First target + accuracy */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        {firstTarget ? (
          <>
            <span className="truncate text-sm">{firstTarget.target}</span>
            {accuracy !== null && (
              <span className={cn("text-xs font-medium", accuracyColor(accuracy))}>
                {accuracyLabel(accuracy)}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">No targets</span>
        )}
      </div>

      {/* Right: Status chip */}
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusStyle.color)}>
        {note.status === "signed" && <MaterialIcon icon="check" size="sm" className="mr-0.5 inline" />}
        {statusStyle.label}
      </span>
    </Link>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/session-notes/components/soap-preview.tsx src/features/session-notes/components/session-note-card.tsx
git commit -m "feat: add SOAP preview and session note card components"
```

---

## Task 9: UI Components — Structured Data Form

**Files:**
- Create: `src/features/session-notes/components/structured-data-form.tsx`

- [ ] **Step 1: Create structured-data-form.tsx**

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { MaterialIcon } from "@/shared/components/material-icon";
import { TargetEntry } from "./target-entry";
import { DurationPresetInput } from "./duration-preset-input";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface TargetData {
  target: string;
  goalId?: string;
  trials?: number;
  correct?: number;
  promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
  notes?: string;
}

interface StructuredData {
  targetsWorkedOn: TargetData[];
  behaviorNotes?: string;
  parentFeedback?: string;
  homeworkAssigned?: string;
  nextSessionFocus?: string;
}

interface StructuredDataFormProps {
  patient: Doc<"patients">;
  sessionDate: string;
  sessionDuration: number;
  sessionType: "in-person" | "teletherapy" | "parent-consultation";
  structuredData: StructuredData;
  disabled?: boolean;
  onSessionDateChange: (date: string) => void;
  onSessionDurationChange: (duration: number) => void;
  onSessionTypeChange: (type: "in-person" | "teletherapy" | "parent-consultation") => void;
  onStructuredDataChange: (data: StructuredData) => void;
}

function calculateAge(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

export function StructuredDataForm({
  patient,
  sessionDate,
  sessionDuration,
  sessionType,
  structuredData,
  disabled,
  onSessionDateChange,
  onSessionDurationChange,
  onSessionTypeChange,
  onStructuredDataChange,
}: StructuredDataFormProps) {
  const updateTarget = (index: number, data: TargetData) => {
    const updated = [...structuredData.targetsWorkedOn];
    updated[index] = data;
    onStructuredDataChange({ ...structuredData, targetsWorkedOn: updated });
  };

  const addTarget = () => {
    if (structuredData.targetsWorkedOn.length >= 20) return;
    onStructuredDataChange({
      ...structuredData,
      targetsWorkedOn: [...structuredData.targetsWorkedOn, { target: "" }],
    });
  };

  const removeTarget = (index: number) => {
    onStructuredDataChange({
      ...structuredData,
      targetsWorkedOn: structuredData.targetsWorkedOn.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Patient context header */}
      <div className="rounded-lg bg-muted/50 p-3">
        <p className="text-sm font-medium">
          {patient.firstName} {patient.lastName}
          <span className="ml-2 text-muted-foreground">
            Age {calculateAge(patient.dateOfBirth)} &middot; {patient.diagnosis}
          </span>
        </p>
      </div>

      {/* Session metadata */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="session-date">Date</Label>
          <Input
            id="session-date"
            type="date"
            value={sessionDate}
            onChange={(e) => onSessionDateChange(e.target.value)}
            disabled={disabled}
            className="w-40"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label>Duration</Label>
          <DurationPresetInput value={sessionDuration} onChange={onSessionDurationChange} disabled={disabled} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Session Type</Label>
        <RadioGroup
          value={sessionType}
          onValueChange={(v) => onSessionTypeChange(v as "in-person" | "teletherapy" | "parent-consultation")}
          className="flex gap-4"
          disabled={disabled}
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="in-person" id="type-in-person" />
            <Label htmlFor="type-in-person" className="text-sm font-normal">In-Person</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="teletherapy" id="type-teletherapy" />
            <Label htmlFor="type-teletherapy" className="text-sm font-normal">Teletherapy</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="parent-consultation" id="type-parent" />
            <Label htmlFor="type-parent" className="text-sm font-normal">Parent Consultation</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Targets */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Targets Worked On</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={addTarget}
            disabled={disabled || structuredData.targetsWorkedOn.length >= 20}
          >
            <MaterialIcon icon="add" size="sm" />
            Add Target
          </Button>
        </div>
        {structuredData.targetsWorkedOn.map((target, i) => (
          <TargetEntry
            key={i}
            data={target}
            onChange={(data) => updateTarget(i, data)}
            onRemove={() => removeTarget(i)}
            disabled={disabled}
          />
        ))}
        {structuredData.targetsWorkedOn.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add at least one target to enable SOAP generation.
          </p>
        )}
      </div>

      {/* Additional fields */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="behavior-notes">Behavior Notes</Label>
          <Textarea
            id="behavior-notes"
            placeholder="How was the child's behavior during the session?"
            value={structuredData.behaviorNotes ?? ""}
            onChange={(e) => onStructuredDataChange({ ...structuredData, behaviorNotes: e.target.value || undefined })}
            disabled={disabled}
            rows={2}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="parent-feedback">Parent Feedback</Label>
          <Textarea
            id="parent-feedback"
            placeholder="What did the parent report?"
            value={structuredData.parentFeedback ?? ""}
            onChange={(e) => onStructuredDataChange({ ...structuredData, parentFeedback: e.target.value || undefined })}
            disabled={disabled}
            rows={2}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="homework">Homework Assigned</Label>
          <Textarea
            id="homework"
            placeholder="What should they practice at home?"
            value={structuredData.homeworkAssigned ?? ""}
            onChange={(e) => onStructuredDataChange({ ...structuredData, homeworkAssigned: e.target.value || undefined })}
            disabled={disabled}
            rows={2}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="next-focus">Next Session Focus</Label>
          <Textarea
            id="next-focus"
            placeholder="What to focus on next session?"
            value={structuredData.nextSessionFocus ?? ""}
            onChange={(e) => onStructuredDataChange({ ...structuredData, nextSessionFocus: e.target.value || undefined })}
            disabled={disabled}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/session-notes/components/structured-data-form.tsx
git commit -m "feat: add structured data form component"
```

---

## Task 10: UI Components — Session Note Editor (Main Page)

**Files:**
- Create: `src/features/session-notes/components/session-note-editor.tsx`

- [ ] **Step 1: Create session-note-editor.tsx**

```tsx
"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatient } from "@/features/patients/hooks/use-patients";
import {
  useSessionNote,
  useCreateSessionNote,
  useUpdateSessionNote,
  useUpdateSoap,
  useUpdateSessionNoteStatus,
  useSignSessionNote,
  useUnsignSessionNote,
} from "../hooks/use-session-notes";
import { useSoapGeneration } from "../hooks/use-soap-generation";
import { StructuredDataForm } from "./structured-data-form";
import { SoapPreview } from "./soap-preview";
import type { Id } from "../../../../convex/_generated/dataModel";

interface SessionNoteEditorProps {
  patientId: string;
  noteId?: string; // undefined = create mode
}

export function SessionNoteEditor({ patientId, noteId }: SessionNoteEditorProps) {
  const router = useRouter();
  const patient = usePatient(patientId as Id<"patients">);
  const existingNote = useSessionNote(noteId ? (noteId as Id<"sessionNotes">) : null);

  const createNote = useCreateSessionNote();
  const updateNote = useUpdateSessionNote();
  const updateSoap = useUpdateSoap();
  const updateStatus = useUpdateSessionNoteStatus();
  const signNote = useSignSessionNote();
  const unsignNote = useUnsignSessionNote();
  const soap = useSoapGeneration();

  // Local form state
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionDuration, setSessionDuration] = useState(30);
  const [sessionType, setSessionType] = useState<"in-person" | "teletherapy" | "parent-consultation">("in-person");
  const [structuredData, setStructuredData] = useState({
    targetsWorkedOn: [{ target: "" }] as Array<{
      target: string;
      goalId?: string;
      trials?: number;
      correct?: number;
      promptLevel?: "independent" | "verbal-cue" | "model" | "physical";
      notes?: string;
    }>,
    behaviorNotes: undefined as string | undefined,
    parentFeedback: undefined as string | undefined,
    homeworkAssigned: undefined as string | undefined,
    nextSessionFocus: undefined as string | undefined,
  });

  const [currentNoteId, setCurrentNoteId] = useState<Id<"sessionNotes"> | null>(
    noteId ? (noteId as Id<"sessionNotes">) : null
  );
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialized = useRef(false);

  // Initialize form from existing note
  useEffect(() => {
    if (existingNote && !hasInitialized.current) {
      hasInitialized.current = true;
      setSessionDate(existingNote.sessionDate);
      setSessionDuration(existingNote.sessionDuration);
      setSessionType(existingNote.sessionType);
      setStructuredData(existingNote.structuredData);
    }
  }, [existingNote]);

  // Auto-save on blur via debounced timer
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!currentNoteId) {
        // Create the note first time
        try {
          const id = await createNote({
            patientId: patientId as Id<"patients">,
            sessionDate,
            sessionDuration,
            sessionType,
            structuredData,
          });
          setCurrentNoteId(id);
          router.replace(`/patients/${patientId}/sessions/${id}`);
        } catch (e) {
          toast.error("Failed to save draft");
        }
      } else {
        // Update existing note
        try {
          await updateNote({
            sessionNoteId: currentNoteId,
            sessionDate,
            sessionDuration,
            sessionType,
            structuredData,
          });
        } catch (e) {
          toast.error("Changes not saved — retrying...");
        }
      }
    }, 1000);
  }, [currentNoteId, patientId, sessionDate, sessionDuration, sessionType, structuredData, createNote, updateNote, router]);

  // Trigger auto-save when form data changes (after initial load)
  useEffect(() => {
    if (hasInitialized.current || !noteId) {
      scheduleAutoSave();
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [sessionDate, sessionDuration, sessionType, structuredData, scheduleAutoSave]);

  const isSigned = existingNote?.status === "signed";
  const hasTargets = structuredData.targetsWorkedOn.some((t) => t.target.trim() !== "");
  const hasSoap = existingNote?.soapNote || soap.soapNote;
  const isComplete = existingNote?.status === "complete" || existingNote?.status === "signed";

  if (patient === undefined) return <p className="p-8 text-muted-foreground">Loading...</p>;
  if (patient === null) notFound();
  if (noteId && existingNote === null) notFound();

  const handleGenerate = () => {
    if (!currentNoteId) return;
    soap.generate(currentNoteId);
  };

  const handleSoapEdit = async (soapNote: { subjective: string; objective: string; assessment: string; plan: string }) => {
    if (!currentNoteId) return;
    try {
      await updateSoap({ sessionNoteId: currentNoteId, soapNote });
    } catch (e) {
      toast.error("Failed to save SOAP edits");
    }
  };

  const handleMarkComplete = async () => {
    if (!currentNoteId) return;
    try {
      await updateStatus({ sessionNoteId: currentNoteId, status: "complete" });
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleSign = async () => {
    if (!currentNoteId) return;
    try {
      await signNote({ sessionNoteId: currentNoteId });
      toast.success("Note signed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to sign");
    }
  };

  const handleUnsign = async () => {
    if (!currentNoteId) return;
    try {
      await unsignNote({ sessionNoteId: currentNoteId });
      toast.success("Note unsigned — you can now edit");
    } catch (e) {
      toast.error("Failed to unsign");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={`/patients/${patientId}`}>
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to Patient
        </Link>
      </Button>

      <h1 className="font-heading text-xl font-semibold">
        {noteId ? "Edit Session Note" : "New Session Note"}
      </h1>

      {/* Split view */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Structured form */}
        <div className="flex flex-col gap-4">
          <StructuredDataForm
            patient={patient}
            sessionDate={sessionDate}
            sessionDuration={sessionDuration}
            sessionType={sessionType}
            structuredData={structuredData}
            disabled={isSigned}
            onSessionDateChange={setSessionDate}
            onSessionDurationChange={setSessionDuration}
            onSessionTypeChange={setSessionType}
            onStructuredDataChange={setStructuredData}
          />

          {/* Form footer */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isSigned || !hasTargets || !currentNoteId || soap.status === "generating"}
              title={!hasTargets ? "Add at least one target first" : undefined}
            >
              <MaterialIcon icon="auto_awesome" size="sm" />
              {soap.status === "generating" ? "Generating..." : "Generate SOAP Note"}
            </Button>
          </div>
        </div>

        {/* Right: SOAP preview */}
        <div className="flex flex-col gap-4">
          <SoapPreview
            soapNote={existingNote?.soapNote ?? soap.soapNote}
            streamedText={soap.streamedText}
            status={soap.status}
            error={soap.error}
            aiGenerated={existingNote?.aiGenerated ?? true}
            disabled={isSigned}
            onEdit={handleSoapEdit}
            onRegenerate={handleGenerate}
          />

          {/* Status footer */}
          <div className="flex flex-wrap items-center gap-2">
            {existingNote && (
              <span className="text-sm text-muted-foreground">
                Status: {existingNote.status}
              </span>
            )}
            {existingNote && !isComplete && hasSoap && (
              <Button variant="outline" size="sm" onClick={handleMarkComplete}>
                Mark Complete
              </Button>
            )}
            {existingNote?.status === "complete" && hasSoap && (
              <Button size="sm" onClick={handleSign}>
                <MaterialIcon icon="verified" size="sm" />
                Sign Note
              </Button>
            )}
            {isSigned && (
              <Button variant="ghost" size="sm" onClick={handleUnsign}>
                Unsign
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/session-notes/components/session-note-editor.tsx
git commit -m "feat: add session note editor with split view and auto-save"
```

---

## Task 11: UI Components — Session Notes List Widget

**Files:**
- Create: `src/features/session-notes/components/session-notes-list.tsx`

- [ ] **Step 1: Create session-notes-list.tsx**

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { useSessionNotes } from "../hooks/use-session-notes";
import { SessionNoteCard } from "./session-note-card";
import type { Id } from "../../../../convex/_generated/dataModel";

interface SessionNotesListProps {
  patientId: Id<"patients">;
}

export function SessionNotesList({ patientId }: SessionNotesListProps) {
  const notes = useSessionNotes(patientId, 5);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-container/30 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Session Notes</h2>
        <Button asChild size="sm">
          <Link href={`/patients/${patientId}/sessions/new`}>
            <MaterialIcon icon="add" size="sm" />
            New Session
          </Link>
        </Button>
      </div>

      {notes === undefined ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <MaterialIcon icon="description" size="lg" className="text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No sessions documented yet</p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/patients/${patientId}/sessions/new`}>
              Document First Session
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <SessionNoteCard key={note._id} note={note} patientId={patientId} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/session-notes/components/session-notes-list.tsx
git commit -m "feat: add session notes list widget"
```

---

## Task 12: Route Pages and Integration

**Files:**
- Create: `src/app/(app)/patients/[id]/sessions/new/page.tsx`
- Create: `src/app/(app)/patients/[id]/sessions/[noteId]/page.tsx`
- Create: `src/app/(app)/patients/[id]/sessions/[noteId]/not-found.tsx`
- Modify: `src/features/patients/components/patient-detail-page.tsx`
- Modify: `src/features/patients/components/patient-row-expanded.tsx`

- [ ] **Step 1: Create route page for new session**

```tsx
import { SessionNoteEditor } from "@/features/session-notes/components/session-note-editor";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionNoteEditor patientId={id} />;
}
```

- [ ] **Step 2: Create route page for edit session**

```tsx
import { SessionNoteEditor } from "@/features/session-notes/components/session-note-editor";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const { id, noteId } = await params;
  return <SessionNoteEditor patientId={id} noteId={noteId} />;
}
```

- [ ] **Step 3: Create not-found page**

```tsx
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function SessionNoteNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold">Session note not found</h2>
      <p className="text-sm text-muted-foreground">
        This session note doesn't exist or you don't have access.
      </p>
      <Button asChild variant="outline">
        <Link href="/patients">Back to Caseload</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Add SessionNotesList widget to patient detail page**

In `src/features/patients/components/patient-detail-page.tsx`, add the import at the top:

```tsx
import { SessionNotesList } from "@/features/session-notes/components/session-notes-list";
```

Then in the two-column grid, add `<SessionNotesList>` below `<ActivityTimeline>` in the left column:

```tsx
      {/* Two-column widget grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <SessionNotesList patientId={patient._id} />
          <ActivityTimeline patientId={patient._id} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <AssignedMaterials patientId={patient._id} />
          <CaregiverInfo patientId={patient._id} />
        </div>
      </div>
```

Note: The left column now wraps `SessionNotesList` and `ActivityTimeline` in a flex column div.

- [ ] **Step 5: Add "New Session" quick action to patient row expanded**

In `src/features/patients/components/patient-row-expanded.tsx`, add a "New Session" button in the quick actions section (right column), between "View Full Profile" and "Assign Material":

```tsx
        <Button asChild size="sm" variant="outline" className="justify-start">
          <Link href={`/patients/${patient._id}/sessions/new`}>
            <MaterialIcon icon="description" size="sm" />
            New Session
          </Link>
        </Button>
```

- [ ] **Step 6: Verify the build compiles**

Run: `npx next build --no-lint 2>&1 | tail -20`
Expected: Build succeeds or only shows unrelated warnings.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(app\)/patients/\[id\]/sessions/ src/features/patients/components/patient-detail-page.tsx src/features/patients/components/patient-row-expanded.tsx
git commit -m "feat: add session note routes and integrate into patient detail"
```

---

## Task 13: E2E Test — Full Create → Generate → Sign Flow

**Files:**
- Create: `tests/e2e/session-notes.spec.ts`

- [ ] **Step 1: Create the E2E test**

```ts
import { test, expect } from "@playwright/test";

// Uses the Clerk email code flow for headless sign-in
// See CLAUDE.md: Test User Sign-In section
async function signInAsSlp(page: any) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("e2e+clerk_test@bridges.ai");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Use another method").click();
  await page.getByText("Email code").click();
  await page.getByLabel("Enter verification code").fill("424242");
  await page.waitForURL("**/dashboard**");
}

test.describe("Session Notes", () => {
  test("SLP creates session note, generates SOAP, signs", async ({ page }) => {
    await signInAsSlp(page);

    // Navigate to patients
    await page.goto("/patients");
    await page.waitForSelector("[data-testid='patient-row']", { timeout: 10000 }).catch(() => {
      // If no patients exist, create one first
    });

    // Open first patient (or navigate to a known test patient)
    const firstPatient = page.locator("a[href*='/patients/']").first();
    if (await firstPatient.isVisible()) {
      await firstPatient.click();
    }

    // Click "New Session" in the session notes widget
    await page.getByRole("link", { name: /New Session/i }).first().click();
    await expect(page).toHaveURL(/\/sessions\/new/);

    // Fill structured data
    const targetInput = page.getByPlaceholder(/Target/);
    await targetInput.fill("/r/ in initial position");

    // Fill trials and correct
    await page.locator('input[type="number"]').nth(0).fill("20");
    await page.locator('input[type="number"]').nth(1).fill("14");

    // Click Generate SOAP Note
    await page.getByRole("button", { name: /Generate SOAP/i }).click();

    // Wait for SOAP to appear (streaming)
    await expect(page.getByText(/SUBJECTIVE|Subjective/i)).toBeVisible({ timeout: 30000 });

    // Wait for generation to complete
    await expect(page.getByText(/AI Generated/i)).toBeVisible({ timeout: 30000 });

    // Mark complete
    await page.getByRole("button", { name: /Mark Complete/i }).click();

    // Sign
    await page.getByRole("button", { name: /Sign Note/i }).click();
    await expect(page.getByText("Signed")).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/session-notes.spec.ts
git commit -m "test: add E2E test for session notes create-generate-sign flow"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass (existing + new session notes tests).

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Verify Convex functions deploy**

Run: `npx convex dev --once`
Expected: All functions register, schema validates.

- [ ] **Step 4: Visual smoke test**

Start dev server: `npm run dev`
Navigate to a patient → verify Session Notes widget appears → click New Session → verify form renders with patient context → verify "Generate SOAP Note" button is visible.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address final verification issues"
```
