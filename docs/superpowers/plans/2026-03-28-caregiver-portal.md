# Caregiver Portal & Home Programs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Duolingo-style caregiver dashboard where parents see assigned practice activities, log sessions, track streaks, and message their child's SLP — plus an SLP-side home program management widget.

**Architecture:** Three new Convex tables (`homePrograms`, `practiceLog`, `patientMessages`) with a dual-role auth helper (`assertPatientAccess`) that grants access to both the owning SLP and any linked caregiver. Frontend is a new `src/features/family/` feature slice with `/family/*` routes inside the existing `(app)` layout. The sidebar conditionally renders caregiver nav when `publicMetadata.role === "caregiver"`.

**Tech Stack:** Convex (backend), Next.js 16 App Router, Clerk v7 (auth/roles), shadcn/ui, Tailwind v4, Lucide icons, Vitest + convex-test + RTL (testing)

**Spec:** `docs/superpowers/specs/2026-03-28-caregiver-portal-design.md`

---

## File Map

### New Convex Files (3)
| File | Responsibility |
|---|---|
| `convex/homePrograms.ts` | CRUD for SLP-defined practice activities |
| `convex/practiceLog.ts` | Parent practice logging + streak queries |
| `convex/patientMessages.ts` | Real-time SLP ↔ Parent messaging |

### New Test Files (6)
| File | Tests |
|---|---|
| `convex/__tests__/homePrograms.test.ts` | homePrograms CRUD, auth, activity log |
| `convex/__tests__/practiceLog.test.ts` | Practice logging, streak calculation |
| `convex/__tests__/patientMessages.test.ts` | Messaging, read receipts, unread count |
| `src/features/family/lib/__tests__/streak-utils.test.ts` | Pure streak calculation logic |
| `src/features/family/lib/__tests__/frequency-utils.test.ts` | "Due today" logic |
| `src/features/family/lib/__tests__/encouragement.test.ts` | Message template selection |

### New Feature Files (16)
| File | Responsibility |
|---|---|
| `src/features/family/components/family-landing.tsx` | Child picker / auto-redirect |
| `src/features/family/components/family-dashboard.tsx` | Main dashboard composition |
| `src/features/family/components/streak-tracker.tsx` | Flame + count + weekly dots |
| `src/features/family/components/today-activities.tsx` | Due-today activity list |
| `src/features/family/components/activity-card.tsx` | Single activity with CTAs |
| `src/features/family/components/practice-log-form.tsx` | Dialog: duration, stars, notes |
| `src/features/family/components/weekly-progress.tsx` | "4/7 days" bar |
| `src/features/family/components/celebration-card.tsx` | Dismissible congrats card |
| `src/features/family/components/message-thread.tsx` | Real-time message list + compose |
| `src/features/family/components/message-bubble.tsx` | Single message display |
| `src/features/family/hooks/use-family-data.ts` | Bundled queries for dashboard |
| `src/features/family/hooks/use-practice-log.ts` | Practice log mutation hook |
| `src/features/family/hooks/use-messages.ts` | Message query + mutation hooks |
| `src/features/family/lib/streak-utils.ts` | Streak calculation from date arrays |
| `src/features/family/lib/frequency-utils.ts` | "Due today" logic per frequency |
| `src/features/family/lib/encouragement.ts` | Encouraging message templates |

### New SLP-Side Files (3)
| File | Responsibility |
|---|---|
| `src/features/patients/components/home-programs-widget.tsx` | Widget on patient detail page |
| `src/features/patients/components/home-program-form.tsx` | Create/edit dialog |
| `src/features/patients/components/engagement-summary.tsx` | Parent engagement inline card |

### New Route Files (3)
| File | Responsibility |
|---|---|
| `src/app/(app)/family/page.tsx` | Thin wrapper → `<FamilyLanding />` |
| `src/app/(app)/family/[patientId]/page.tsx` | Thin wrapper → `<FamilyDashboard />` |
| `src/app/(app)/family/[patientId]/messages/page.tsx` | Thin wrapper → `<MessageThread />` |

### Modified Files (6)
| File | Change |
|---|---|
| `convex/schema.ts` | 3 new tables, 3 activity log actions, compound index on `caregiverLinks` |
| `convex/lib/auth.ts` | Add `assertPatientAccess` helper |
| `src/core/routes.ts` | Add `FAMILY`, `FAMILY_CHILD`, `FAMILY_MESSAGES` routes |
| `src/shared/lib/navigation.ts` | Add `CAREGIVER_NAV_ITEMS`, update `isNavActive` |
| `src/features/dashboard/components/dashboard-sidebar.tsx` | Conditional caregiver nav |
| `src/features/patients/components/patient-detail-page.tsx` | Add Home Programs widget |

---

## Task 1: Schema + Auth Foundation

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/lib/auth.ts`
- Create: `convex/__tests__/homePrograms.test.ts` (auth tests only)

- [ ] **Step 1: Write failing test for `assertPatientAccess`**

In `convex/__tests__/homePrograms.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };
// Note: public_metadata is JSON.stringify'd to match how convex-test
// surfaces Clerk custom claims. Matches existing pattern in patients.test.ts.
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};
const STRANGER = { subject: "stranger-000", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

// We'll test assertPatientAccess indirectly via homePrograms.listByPatient
// which requires the schema + auth changes to exist first.
// For now, write a placeholder that will fail.
describe("schema and auth foundation", () => {
  it("homePrograms table exists in schema", async () => {
    const t = convexTest(schema, modules);
    // This will fail until we add the table
    expect(schema.tables.homePrograms).toBeDefined();
    expect(schema.tables.practiceLog).toBeDefined();
    expect(schema.tables.patientMessages).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/homePrograms.test.ts`
Expected: FAIL — `schema.tables.homePrograms` is undefined

- [ ] **Step 3: Add 3 new tables + activity log actions + compound index to schema**

In `convex/schema.ts`, add after the `progressReports` table definition:

```ts
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
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_status", ["patientId", "status"]),

  practiceLog: defineTable({
    homeProgramId: v.id("homePrograms"),
    patientId: v.id("patients"),
    caregiverUserId: v.string(),
    date: v.string(),
    duration: v.optional(v.number()),
    confidence: v.optional(v.number()),
    notes: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_homeProgramId", ["homeProgramId"])
    .index("by_patientId_date", ["patientId", "date"]),

  patientMessages: defineTable({
    patientId: v.id("patients"),
    senderUserId: v.string(),
    senderRole: v.union(v.literal("slp"), v.literal("caregiver")),
    content: v.string(),
    timestamp: v.number(),
    readAt: v.optional(v.number()),
  })
    .index("by_patientId_timestamp", ["patientId", "timestamp"]),
```

Also add 3 new action types to the `activityLog.action` union:

```ts
      v.literal("practice-logged"),
      v.literal("message-sent"),
      v.literal("home-program-assigned"),
```

Also add compound index to `caregiverLinks`:

```ts
    .index("by_caregiverUserId_patientId", ["caregiverUserId", "patientId"])
```

- [ ] **Step 4: Add `assertPatientAccess` to `convex/lib/auth.ts`**

Add after the existing `assertCaregiverAccess` function:

```ts
export async function assertPatientAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<{ userId: string; role: UserRole }> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const patient = await ctx.db.get(patientId);
  if (!patient) throw new ConvexError("Patient not found");
  if (patient.slpUserId === userId) return { userId, role: "slp" };
  const link = await ctx.db
    .query("caregiverLinks")
    .withIndex("by_caregiverUserId_patientId", (q) =>
      q.eq("caregiverUserId", userId).eq("patientId", patientId)
    )
    .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
    .first();
  if (link) return { userId, role: "caregiver" };
  throw new ConvexError("Not authorized");
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/homePrograms.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/lib/auth.ts convex/__tests__/homePrograms.test.ts
git commit -m "feat(schema): add homePrograms, practiceLog, patientMessages tables + assertPatientAccess auth helper"
```

---

## Task 2: Home Programs Backend (CRUD + Tests)

**Files:**
- Create: `convex/homePrograms.ts`
- Modify: `convex/__tests__/homePrograms.test.ts`

- [ ] **Step 1: Write failing tests for homePrograms CRUD**

Expand `convex/__tests__/homePrograms.test.ts` with full test suite:

```ts
async function createPatientWithCaregiver(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
  const token = await slp.mutation(api.caregivers.createInvite, {
    patientId,
    email: "parent@test.com",
  });
  const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
  await caregiver.mutation(api.caregivers.acceptInvite, { token });
  return { patientId, token };
}

const today = new Date().toISOString().slice(0, 10);

const VALID_PROGRAM = {
  title: "Practice /r/ sounds with dinosaur cards",
  instructions: "Have Alex say each word on the card. Give a high five for each try!",
  frequency: "daily" as const,
  startDate: today,
};

describe("homePrograms.create", () => {
  it("creates home program with correct fields", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const id = await slp.mutation(api.homePrograms.create, {
      patientId,
      ...VALID_PROGRAM,
    });
    expect(id).toBeDefined();
  });

  it("rejects non-owner SLP", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithCaregiver(t);

    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.homePrograms.create, {
        patientId,
        ...VALID_PROGRAM,
      })
    ).rejects.toThrow();
  });

  it("rejects caregiver creating program", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithCaregiver(t);

    await expect(
      t.withIdentity(CAREGIVER_IDENTITY).mutation(api.homePrograms.create, {
        patientId,
        ...VALID_PROGRAM,
      })
    ).rejects.toThrow();
  });

  it("logs home-program-assigned to activity log", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });

    const log = await slp.query(api.activityLog.listByPatient, { patientId });
    const assignedEntry = log.find((e: { action: string }) => e.action === "home-program-assigned");
    expect(assignedEntry).toBeDefined();
  });
});

describe("homePrograms.listByPatient", () => {
  it("SLP sees own patient programs", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });

    const programs = await slp.query(api.homePrograms.listByPatient, { patientId });
    expect(programs).toHaveLength(1);
    expect(programs[0].title).toBe(VALID_PROGRAM.title);
  });

  it("caregiver sees linked patient programs", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });

    const programs = await caregiver.query(api.homePrograms.listByPatient, { patientId });
    expect(programs).toHaveLength(1);
  });

  it("stranger gets rejected", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);
    await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });

    await expect(
      t.withIdentity(STRANGER).query(api.homePrograms.listByPatient, { patientId })
    ).rejects.toThrow("Not authorized");
  });
});

describe("homePrograms.getActiveByPatient", () => {
  it("returns only active programs", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const id1 = await slp.mutation(api.homePrograms.create, { patientId, ...VALID_PROGRAM });
    await slp.mutation(api.homePrograms.create, {
      patientId,
      ...VALID_PROGRAM,
      title: "Story time",
    });
    await slp.mutation(api.homePrograms.update, { id: id1, status: "paused" });

    const active = await slp.query(api.homePrograms.getActiveByPatient, { patientId });
    expect(active).toHaveLength(1);
    expect(active[0].title).toBe("Story time");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/homePrograms.test.ts`
Expected: FAIL — `api.homePrograms` doesn't exist yet

- [ ] **Step 3: Implement `convex/homePrograms.ts`**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { assertSLP, assertPatientAccess } from "./lib/auth";

const frequencyValidator = v.union(
  v.literal("daily"),
  v.literal("3x-week"),
  v.literal("weekly"),
  v.literal("as-needed")
);

const statusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed")
);

function validateHomeProgram(args: { title: string; instructions: string; startDate: string; endDate?: string }) {
  const title = args.title.trim();
  if (title.length === 0 || title.length > 200) {
    throw new ConvexError("Title must be 1-200 characters");
  }
  const instructions = args.instructions.trim();
  if (instructions.length === 0 || instructions.length > 2000) {
    throw new ConvexError("Instructions must be 1-2000 characters");
  }
  if (isNaN(new Date(args.startDate).getTime())) {
    throw new ConvexError("Invalid start date");
  }
  if (args.endDate !== undefined && isNaN(new Date(args.endDate).getTime())) {
    throw new ConvexError("Invalid end date");
  }
}

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
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    validateHomeProgram(args);

    const id = await ctx.db.insert("homePrograms", {
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
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "home-program-assigned",
      details: `Assigned: ${args.title.trim()}`,
      timestamp: Date.now(),
    });

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("homePrograms"),
    title: v.optional(v.string()),
    instructions: v.optional(v.string()),
    frequency: v.optional(frequencyValidator),
    status: v.optional(statusValidator),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const program = await ctx.db.get(args.id);
    if (!program) throw new ConvexError("Home program not found");

    const patient = await ctx.db.get(program.patientId);
    if (!patient || patient.slpUserId !== slpUserId) {
      throw new ConvexError("Not authorized");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) {
      const title = args.title.trim();
      if (title.length === 0 || title.length > 200) throw new ConvexError("Title must be 1-200 characters");
      updates.title = title;
    }
    if (args.instructions !== undefined) {
      const instructions = args.instructions.trim();
      if (instructions.length === 0 || instructions.length > 2000) throw new ConvexError("Instructions must be 1-2000 characters");
      updates.instructions = instructions;
    }
    if (args.frequency !== undefined) updates.frequency = args.frequency;
    if (args.status !== undefined) updates.status = args.status;
    if (args.endDate !== undefined) updates.endDate = args.endDate;

    await ctx.db.patch(args.id, updates);
  },
});

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    return await ctx.db
      .query("homePrograms")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

export const getActiveByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    return await ctx.db
      .query("homePrograms")
      .withIndex("by_patientId_status", (q) =>
        q.eq("patientId", args.patientId).eq("status", "active")
      )
      .collect();
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/homePrograms.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add convex/homePrograms.ts convex/__tests__/homePrograms.test.ts
git commit -m "feat(homePrograms): CRUD mutations + queries with dual-role auth and tests"
```

---

## Task 3: Practice Log Backend + Streak Query

**Files:**
- Create: `convex/practiceLog.ts`
- Create: `convex/__tests__/practiceLog.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
// Note: public_metadata is JSON.stringify'd to match how convex-test
// surfaces Clerk custom claims. Matches existing pattern in patients.test.ts.
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};
const STRANGER = { subject: "stranger-000", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

const today = new Date().toISOString().slice(0, 10);

async function setupProgramWithCaregiver(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
  const token = await slp.mutation(api.caregivers.createInvite, {
    patientId,
    email: "parent@test.com",
  });
  await t.withIdentity(CAREGIVER_IDENTITY).mutation(api.caregivers.acceptInvite, { token });
  const programId = await slp.mutation(api.homePrograms.create, {
    patientId,
    title: "Practice /r/ sounds",
    instructions: "Say each word on the card",
    frequency: "daily" as const,
    startDate: today,
  });
  return { patientId, programId };
}

describe("practiceLog.log", () => {
  it("caregiver can log practice", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const id = await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: today,
      duration: 10,
      confidence: 4,
    });
    expect(id).toBeDefined();
  });

  it("stranger cannot log practice", async () => {
    const t = convexTest(schema, modules);
    const { programId } = await setupProgramWithCaregiver(t);

    await expect(
      t.withIdentity(STRANGER).mutation(api.practiceLog.log, {
        homeProgramId: programId,
        date: today,
      })
    ).rejects.toThrow();
  });

  it("logs practice-logged to activity log", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.practiceLog.log, { homeProgramId: programId, date: today });

    const slp = t.withIdentity(SLP_IDENTITY);
    const log = await slp.query(api.activityLog.listByPatient, { patientId });
    const entry = log.find((e: { action: string }) => e.action === "practice-logged");
    expect(entry).toBeDefined();
  });
});

describe("practiceLog.getStreakData", () => {
  it("returns 0 streak with no logs", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const streak = await caregiver.query(api.practiceLog.getStreakData, { patientId });
    expect(streak.currentStreak).toBe(0);
    expect(streak.weeklyPracticeDays).toBe(0);
  });

  it("counts consecutive days as streak", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    // Log 3 consecutive days ending today
    const d = new Date();
    for (let i = 2; i >= 0; i--) {
      const date = new Date(d);
      date.setDate(date.getDate() - i);
      await caregiver.mutation(api.practiceLog.log, {
        homeProgramId: programId,
        date: date.toISOString().slice(0, 10),
      });
    }

    const streak = await caregiver.query(api.practiceLog.getStreakData, { patientId });
    expect(streak.currentStreak).toBe(3);
  });

  it("gap in days resets streak", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    // Log today and 3 days ago (gap of 1 day)
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: today,
    });
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    await caregiver.mutation(api.practiceLog.log, {
      homeProgramId: programId,
      date: threeDaysAgo.toISOString().slice(0, 10),
    });

    const streak = await caregiver.query(api.practiceLog.getStreakData, { patientId });
    expect(streak.currentStreak).toBe(1); // Only today counts
  });

  it("multiple logs same day count as 1", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.practiceLog.log, { homeProgramId: programId, date: today });
    await caregiver.mutation(api.practiceLog.log, { homeProgramId: programId, date: today });

    const streak = await caregiver.query(api.practiceLog.getStreakData, { patientId });
    expect(streak.currentStreak).toBe(1);
  });
});

describe("practiceLog.listByPatientDateRange", () => {
  it("returns logs within date range", async () => {
    const t = convexTest(schema, modules);
    const { patientId, programId } = await setupProgramWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.practiceLog.log, { homeProgramId: programId, date: today, duration: 10 });

    const logs = await caregiver.query(api.practiceLog.listByPatientDateRange, {
      patientId,
      startDate: today,
      endDate: today,
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].duration).toBe(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/practiceLog.test.ts`
Expected: FAIL — `api.practiceLog` doesn't exist

- [ ] **Step 3: Implement `convex/practiceLog.ts`**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { assertCaregiverAccess, assertPatientAccess } from "./lib/auth";

export const log = mutation({
  args: {
    homeProgramId: v.id("homePrograms"),
    date: v.string(),
    duration: v.optional(v.number()),
    confidence: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.homeProgramId);
    if (!program) throw new ConvexError("Home program not found");

    const userId = await assertCaregiverAccess(ctx, program.patientId);

    if (args.confidence !== undefined && (args.confidence < 1 || args.confidence > 5)) {
      throw new ConvexError("Confidence must be between 1 and 5");
    }
    if (args.duration !== undefined && args.duration < 0) {
      throw new ConvexError("Duration must be positive");
    }

    const id = await ctx.db.insert("practiceLog", {
      homeProgramId: args.homeProgramId,
      patientId: program.patientId,
      caregiverUserId: userId,
      date: args.date,
      duration: args.duration,
      confidence: args.confidence,
      notes: args.notes?.trim() || undefined,
      timestamp: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      patientId: program.patientId,
      actorUserId: userId,
      action: "practice-logged",
      details: `Practiced: ${program.title}`,
      timestamp: Date.now(),
    });

    return id;
  },
});

export const listByProgram = query({
  args: { homeProgramId: v.id("homePrograms") },
  handler: async (ctx, args) => {
    const program = await ctx.db.get(args.homeProgramId);
    if (!program) return [];
    await assertPatientAccess(ctx, program.patientId);
    return await ctx.db
      .query("practiceLog")
      .withIndex("by_homeProgramId", (q) => q.eq("homeProgramId", args.homeProgramId))
      .collect();
  },
});

export const listByPatientDateRange = query({
  args: {
    patientId: v.id("patients"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    return await ctx.db
      .query("practiceLog")
      .withIndex("by_patientId_date", (q) =>
        q.eq("patientId", args.patientId).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();
  },
});

export const getStreakData = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);

    // Get all logs for last 30 days to calculate streak + weekly
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().slice(0, 10);

    const logs = await ctx.db
      .query("practiceLog")
      .withIndex("by_patientId_date", (q) =>
        q.eq("patientId", args.patientId).gte("date", startDate)
      )
      .collect();

    // Deduplicate by date
    const practiceDates = [...new Set(logs.map((l) => l.date))].sort().reverse();

    // Calculate streak (consecutive days backwards from today or yesterday)
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let streak = 0;
    // Start from today if logged, otherwise yesterday
    let checkDate = practiceDates.includes(today) ? today : yesterdayStr;
    if (!practiceDates.includes(checkDate)) {
      // No recent practice
    } else {
      const d = new Date(checkDate);
      while (practiceDates.includes(d.toISOString().slice(0, 10))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
    }

    // Weekly practice days (current Mon-Sun week)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    const mondayStr = monday.toISOString().slice(0, 10);

    const weeklyPracticeDays = practiceDates.filter((d) => d >= mondayStr && d <= today).length;

    return {
      currentStreak: streak,
      weeklyPracticeDays,
      weeklyTarget: 7,
    };
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/practiceLog.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add convex/practiceLog.ts convex/__tests__/practiceLog.test.ts
git commit -m "feat(practiceLog): practice logging mutations + streak query with tests"
```

---

## Task 4: Patient Messages Backend

**Files:**
- Create: `convex/patientMessages.ts`
- Create: `convex/__tests__/patientMessages.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
// Note: public_metadata is JSON.stringify'd to match how convex-test
// surfaces Clerk custom claims. Matches existing pattern in patients.test.ts.
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};
const STRANGER = { subject: "stranger-000", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

async function setupWithCaregiver(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
  const token = await slp.mutation(api.caregivers.createInvite, {
    patientId,
    email: "parent@test.com",
  });
  await t.withIdentity(CAREGIVER_IDENTITY).mutation(api.caregivers.acceptInvite, { token });
  return { patientId };
}

describe("patientMessages.send", () => {
  it("SLP can send message with role=slp", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const id = await slp.mutation(api.patientMessages.send, {
      patientId,
      content: "Great progress this week!",
    });
    expect(id).toBeDefined();

    const messages = await slp.query(api.patientMessages.list, { patientId });
    expect(messages).toHaveLength(1);
    expect(messages[0].senderRole).toBe("slp");
    expect(messages[0].content).toBe("Great progress this week!");
  });

  it("caregiver can send message with role=caregiver", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.patientMessages.send, {
      patientId,
      content: "Alex loved the dinosaur cards!",
    });

    const messages = await caregiver.query(api.patientMessages.list, { patientId });
    expect(messages).toHaveLength(1);
    expect(messages[0].senderRole).toBe("caregiver");
  });

  it("stranger cannot send", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);

    await expect(
      t.withIdentity(STRANGER).mutation(api.patientMessages.send, {
        patientId,
        content: "Hello",
      })
    ).rejects.toThrow("Not authorized");
  });

  it("logs message-sent to activity log", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.patientMessages.send, { patientId, content: "Hello" });

    const log = await slp.query(api.activityLog.listByPatient, { patientId });
    expect(log.find((e: { action: string }) => e.action === "message-sent")).toBeDefined();
  });
});

describe("patientMessages.markRead", () => {
  it("recipient can mark message as read", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await slp.mutation(api.patientMessages.send, { patientId, content: "Hello" });
    const messages = await caregiver.query(api.patientMessages.list, { patientId });
    expect(messages[0].readAt).toBeUndefined();

    await caregiver.mutation(api.patientMessages.markRead, { messageId: messages[0]._id });

    const updated = await caregiver.query(api.patientMessages.list, { patientId });
    expect(updated[0].readAt).toBeDefined();
  });

  it("sender cannot mark own message as read", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.patientMessages.send, { patientId, content: "Hello" });
    const messages = await slp.query(api.patientMessages.list, { patientId });

    await expect(
      slp.mutation(api.patientMessages.markRead, { messageId: messages[0]._id })
    ).rejects.toThrow("Cannot mark your own message as read");
  });
});

describe("patientMessages.getUnreadCount", () => {
  it("returns correct unread count", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupWithCaregiver(t);
    const slp = t.withIdentity(SLP_IDENTITY);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await slp.mutation(api.patientMessages.send, { patientId, content: "Msg 1" });
    await slp.mutation(api.patientMessages.send, { patientId, content: "Msg 2" });

    const count = await caregiver.query(api.patientMessages.getUnreadCount, { patientId });
    expect(count).toBe(2);

    // Mark one as read
    const messages = await caregiver.query(api.patientMessages.list, { patientId });
    await caregiver.mutation(api.patientMessages.markRead, { messageId: messages[0]._id });

    const updatedCount = await caregiver.query(api.patientMessages.getUnreadCount, { patientId });
    expect(updatedCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/patientMessages.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `convex/patientMessages.ts`**

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { assertPatientAccess } from "./lib/auth";

export const send = mutation({
  args: {
    patientId: v.id("patients"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const content = args.content.trim();
    if (content.length === 0 || content.length > 5000) {
      throw new ConvexError("Message must be 1-5000 characters");
    }

    const { userId, role } = await assertPatientAccess(ctx, args.patientId);

    const id = await ctx.db.insert("patientMessages", {
      patientId: args.patientId,
      senderUserId: userId,
      senderRole: role,
      content,
      timestamp: Date.now(),
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: userId,
      action: "message-sent",
      details: `Message from ${role}`,
      timestamp: Date.now(),
    });

    return id;
  },
});

export const list = query({
  args: {
    patientId: v.id("patients"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertPatientAccess(ctx, args.patientId);
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("patientMessages")
      .withIndex("by_patientId_timestamp", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(limit);
  },
});

export const markRead = mutation({
  args: { messageId: v.id("patientMessages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new ConvexError("Message not found");

    const { userId } = await assertPatientAccess(ctx, message.patientId);

    if (message.senderUserId === userId) {
      throw new ConvexError("Cannot mark your own message as read");
    }

    await ctx.db.patch(args.messageId, { readAt: Date.now() });
  },
});

export const getUnreadCount = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const { userId } = await assertPatientAccess(ctx, args.patientId);

    const messages = await ctx.db
      .query("patientMessages")
      .withIndex("by_patientId_timestamp", (q) => q.eq("patientId", args.patientId))
      .collect();

    return messages.filter(
      (m) => m.senderUserId !== userId && m.readAt === undefined
    ).length;
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/patientMessages.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add convex/patientMessages.ts convex/__tests__/patientMessages.test.ts
git commit -m "feat(patientMessages): real-time SLP-parent messaging with read receipts and tests"
```

---

## Task 5: Frontend Utility Libraries + Tests

**Files:**
- Create: `src/features/family/lib/streak-utils.ts`
- Create: `src/features/family/lib/frequency-utils.ts`
- Create: `src/features/family/lib/encouragement.ts`
- Create: `src/features/family/lib/__tests__/streak-utils.test.ts`
- Create: `src/features/family/lib/__tests__/frequency-utils.test.ts`
- Create: `src/features/family/lib/__tests__/encouragement.test.ts`

- [ ] **Step 1: Write failing tests for streak-utils**

```ts
// src/features/family/lib/__tests__/streak-utils.test.ts
import { describe, expect, it } from "vitest";
import { calculateStreak, getWeeklyPracticeDays } from "../streak-utils";

describe("calculateStreak", () => {
  it("returns 0 for empty dates", () => {
    expect(calculateStreak([], "2026-03-28")).toBe(0);
  });

  it("returns 1 for today only", () => {
    expect(calculateStreak(["2026-03-28"], "2026-03-28")).toBe(1);
  });

  it("counts consecutive days", () => {
    expect(calculateStreak(["2026-03-26", "2026-03-27", "2026-03-28"], "2026-03-28")).toBe(3);
  });

  it("allows starting from yesterday", () => {
    expect(calculateStreak(["2026-03-26", "2026-03-27"], "2026-03-28")).toBe(2);
  });

  it("gap resets streak", () => {
    expect(calculateStreak(["2026-03-25", "2026-03-28"], "2026-03-28")).toBe(1);
  });

  it("deduplicates dates", () => {
    expect(calculateStreak(["2026-03-28", "2026-03-28"], "2026-03-28")).toBe(1);
  });
});

describe("getWeeklyPracticeDays", () => {
  it("counts unique days in current week", () => {
    // Week of 2026-03-23 (Mon) to 2026-03-29 (Sun)
    expect(getWeeklyPracticeDays(["2026-03-23", "2026-03-25", "2026-03-28"], "2026-03-28")).toBe(3);
  });

  it("excludes dates outside current week", () => {
    expect(getWeeklyPracticeDays(["2026-03-22", "2026-03-28"], "2026-03-28")).toBe(1);
  });
});
```

- [ ] **Step 2: Write failing tests for frequency-utils**

```ts
// src/features/family/lib/__tests__/frequency-utils.test.ts
import { describe, expect, it } from "vitest";
import { isDueToday } from "../frequency-utils";

describe("isDueToday", () => {
  it("daily is always due", () => {
    expect(isDueToday("daily", 0)).toBe(true);
    expect(isDueToday("daily", 5)).toBe(true);
  });

  it("3x-week is due when fewer than 3 this week", () => {
    expect(isDueToday("3x-week", 0)).toBe(true);
    expect(isDueToday("3x-week", 2)).toBe(true);
    expect(isDueToday("3x-week", 3)).toBe(false);
  });

  it("weekly is due when 0 this week", () => {
    expect(isDueToday("weekly", 0)).toBe(true);
    expect(isDueToday("weekly", 1)).toBe(false);
  });

  it("as-needed is always due", () => {
    expect(isDueToday("as-needed", 0)).toBe(true);
  });
});
```

- [ ] **Step 3: Write failing tests for encouragement**

```ts
// src/features/family/lib/__tests__/encouragement.test.ts
import { describe, expect, it } from "vitest";
import { getCelebrationMessage, type CelebrationTrigger } from "../encouragement";

describe("getCelebrationMessage", () => {
  it("returns message for streak-3", () => {
    const msg = getCelebrationMessage({ type: "streak", value: 3 }, "Alex");
    expect(msg).toContain("3-day streak");
  });

  it("returns message for streak-7", () => {
    const msg = getCelebrationMessage({ type: "streak", value: 7 }, "Alex");
    expect(msg).toContain("week");
  });

  it("returns message for weekly-complete", () => {
    const msg = getCelebrationMessage({ type: "weekly-complete" }, "Alex");
    expect(msg).toContain("complete");
  });

  it("returns message for goal-met", () => {
    const msg = getCelebrationMessage({ type: "goal-met", goalDescription: "/r/ sounds" }, "Alex");
    expect(msg).toContain("/r/ sounds");
  });

  it("returns null for non-milestone streak", () => {
    const msg = getCelebrationMessage({ type: "streak", value: 2 }, "Alex");
    expect(msg).toBeNull();
  });
});
```

- [ ] **Step 4: Run all tests to verify they fail**

Run: `npx vitest run src/features/family/lib/__tests__/`
Expected: FAIL — modules don't exist

- [ ] **Step 5: Implement streak-utils.ts**

```ts
// src/features/family/lib/streak-utils.ts

/** Calculate current streak from an array of ISO date strings. */
export function calculateStreak(dates: string[], today: string): number {
  const unique = [...new Set(dates)].sort().reverse();
  if (unique.length === 0) return 0;

  // Start from today, or yesterday if today not logged
  const yesterday = offsetDate(today, -1);
  let current = unique.includes(today) ? today : yesterday;
  if (!unique.includes(current)) return 0;

  let streak = 0;
  while (unique.includes(current)) {
    streak++;
    current = offsetDate(current, -1);
  }
  return streak;
}

/** Count unique practice dates in the current Mon-Sun week. */
export function getWeeklyPracticeDays(dates: string[], today: string): number {
  const d = new Date(today + "T00:00:00");
  const dayOfWeek = d.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setDate(monday.getDate() - mondayOffset);
  const mondayStr = monday.toISOString().slice(0, 10);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sundayStr = sunday.toISOString().slice(0, 10);

  const unique = [...new Set(dates)];
  return unique.filter((date) => date >= mondayStr && date <= sundayStr).length;
}

function offsetDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
```

- [ ] **Step 6: Implement frequency-utils.ts**

```ts
// src/features/family/lib/frequency-utils.ts

type Frequency = "daily" | "3x-week" | "weekly" | "as-needed";

/** Whether an activity is due today based on how many times it's been done this week. */
export function isDueToday(frequency: Frequency, timesThisWeek: number): boolean {
  switch (frequency) {
    case "daily":
    case "as-needed":
      return true;
    case "3x-week":
      return timesThisWeek < 3;
    case "weekly":
      return timesThisWeek < 1;
  }
}

/** Sort priority: scheduled items first, as-needed last. */
export function frequencySortOrder(frequency: Frequency): number {
  switch (frequency) {
    case "daily": return 0;
    case "3x-week": return 1;
    case "weekly": return 2;
    case "as-needed": return 3;
  }
}
```

- [ ] **Step 7: Implement encouragement.ts**

```ts
// src/features/family/lib/encouragement.ts

export type CelebrationTrigger =
  | { type: "streak"; value: number }
  | { type: "weekly-complete" }
  | { type: "goal-met"; goalDescription: string };

const STREAK_MILESTONES: Record<number, string> = {
  3: "{name} has a 3-day streak! You're building a great routine.",
  7: "One full week! {name} is lucky to have you.",
  14: "Two weeks strong! Your consistency is making a real difference for {name}.",
  30: "30 days! You and {name} are an incredible team.",
};

/** Returns a celebration message or null if no milestone was hit. */
export function getCelebrationMessage(
  trigger: CelebrationTrigger,
  childName: string,
): string | null {
  switch (trigger.type) {
    case "streak": {
      const template = STREAK_MILESTONES[trigger.value];
      return template ? template.replace("{name}", childName) : null;
    }
    case "weekly-complete":
      return "All activities complete this week! Great job!";
    case "goal-met":
      return `${childName} met their ${trigger.goalDescription} goal! Your practice helped make this happen.`;
  }
}
```

- [ ] **Step 8: Run all tests to verify they pass**

Run: `npx vitest run src/features/family/lib/__tests__/`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add src/features/family/lib/
git commit -m "feat(family): add streak, frequency, and encouragement utility libraries with tests"
```

---

## Task 6: Routes + Navigation + Conditional Sidebar

**Files:**
- Modify: `src/core/routes.ts`
- Modify: `src/shared/lib/navigation.ts`
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
- Create: `src/app/(app)/family/page.tsx`
- Create: `src/app/(app)/family/[patientId]/page.tsx`
- Create: `src/app/(app)/family/[patientId]/messages/page.tsx`

- [ ] **Step 1: Add family routes to `src/core/routes.ts`**

Add to the `ROUTES` object:

```ts
  FAMILY: "/family",
  FAMILY_CHILD: (patientId: string) => `/family/${patientId}` as const,
  FAMILY_MESSAGES: (patientId: string) => `/family/${patientId}/messages` as const,
```

- [ ] **Step 2: Add caregiver nav items to `src/shared/lib/navigation.ts`**

```ts
import { ROUTES } from "@/core/routes";

export const NAV_ITEMS = [
  // ... existing items unchanged
] as const;

export const CAREGIVER_NAV_ITEMS = [
  { icon: "home", label: "Home", href: ROUTES.FAMILY },
  { icon: "settings", label: "Settings", href: ROUTES.SETTINGS },
] as const;
// Note: Messages is accessible from the dashboard (not sidebar) since
// the href requires a patientId which varies by active child.

export function isNavActive(
  href: string,
  pathname: string,
  _tab: string | null
): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/patients")  return pathname.startsWith("/patients");
  if (href === "/builder")   return pathname.startsWith("/builder");
  if (href === "/flashcards") return pathname.startsWith("/flashcards");
  if (href === "/family")    return pathname.startsWith("/family");
  return pathname === href;
}
```

- [ ] **Step 3: Add conditional sidebar rendering**

In `src/features/dashboard/components/dashboard-sidebar.tsx`, add the role-aware nav:

```tsx
"use client";

import { Show, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { isNavActive, NAV_ITEMS, CAREGIVER_NAV_ITEMS } from "@/shared/lib/navigation";

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const { user } = useUser();
  const router = useRouter();

  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  const isCaregiver = role === "caregiver";
  const navItems = isCaregiver ? CAREGIVER_NAV_ITEMS : NAV_ITEMS;

  // Redirect caregivers away from SLP-only routes
  useEffect(() => {
    if (isCaregiver && !pathname.startsWith("/family") && !pathname.startsWith("/settings")) {
      router.replace("/family");
    }
  }, [isCaregiver, pathname, router]);

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-20 md:flex flex-col items-center bg-surface-container py-6">
      {/* Logo */}
      <div className="mb-10">
        <Link
          href={isCaregiver ? "/family" : "/dashboard"}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container text-lg font-bold text-white shadow-sm"
        >
          B
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex flex-1 flex-col items-center gap-6">
        {navItems.map((item) => {
          const isActive = isNavActive(item.href, pathname, tab);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group relative rounded-xl p-3 transition-all duration-300 active:scale-90",
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              <MaterialIcon icon={item.icon} filled={isActive} size="md" />
              <span className="pointer-events-none absolute left-16 rounded-lg bg-primary px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User menu */}
      <div className="mt-auto flex flex-col items-center gap-6">
        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <Link
            href="/sign-in"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container text-white shadow-sm transition-all hover:shadow-md active:scale-90"
          >
            <MaterialIcon icon="login" size="md" />
          </Link>
        </Show>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Create route files (thin wrappers)**

`src/app/(app)/family/page.tsx`:
```tsx
import { FamilyLanding } from "@/features/family/components/family-landing";

export default function FamilyPage() {
  return <FamilyLanding />;
}
```

`src/app/(app)/family/[patientId]/page.tsx`:
```tsx
import { FamilyDashboard } from "@/features/family/components/family-dashboard";

export default function FamilyChildPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  return <FamilyDashboard paramsPromise={params} />;
}
```

`src/app/(app)/family/[patientId]/messages/page.tsx`:
```tsx
import { MessageThread } from "@/features/family/components/message-thread";

export default function FamilyMessagesPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  return <MessageThread paramsPromise={params} />;
}
```

- [ ] **Step 5: Create placeholder components so routes don't crash**

Create minimal placeholder versions of `family-landing.tsx`, `family-dashboard.tsx`, and `message-thread.tsx` that render "Coming soon" text. These will be replaced in subsequent tasks.

- [ ] **Step 6: Verify the app builds and routes render**

Run: `npm run build` (or `npx next build`)
Expected: Build succeeds. Routes `/family`, `/family/[id]`, `/family/[id]/messages` resolve.

- [ ] **Step 7: Commit**

```bash
git add src/core/routes.ts src/shared/lib/navigation.ts \
  src/features/dashboard/components/dashboard-sidebar.tsx \
  src/app/\(app\)/family/ \
  src/features/family/components/family-landing.tsx \
  src/features/family/components/family-dashboard.tsx \
  src/features/family/components/message-thread.tsx
git commit -m "feat(family): add caregiver routes, conditional sidebar nav, and route placeholders"
```

---

## Task 7: Family Landing + Dashboard Components

**Files:**
- Create/replace: `src/features/family/components/family-landing.tsx`
- Create/replace: `src/features/family/components/family-dashboard.tsx`
- Create: `src/features/family/hooks/use-family-data.ts`
- Create: `src/features/family/components/streak-tracker.tsx`
- Create: `src/features/family/components/weekly-progress.tsx`
- Create: `src/features/family/components/celebration-card.tsx`

- [ ] **Step 1: Implement `use-family-data.ts` hook**

```tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useFamilyData(patientId: Id<"patients">) {
  const activePrograms = useQuery(api.homePrograms.getActiveByPatient, { patientId });
  const streakData = useQuery(api.practiceLog.getStreakData, { patientId });
  const unreadCount = useQuery(api.patientMessages.getUnreadCount, { patientId });

  return {
    activePrograms,
    streakData,
    unreadCount,
    isLoading: activePrograms === undefined || streakData === undefined,
  };
}
```

- [ ] **Step 2: Implement `family-landing.tsx`**

Queries `caregivers.listByCaregiver` to get linked children. **Important:** `listByCaregiver` returns `caregiverLinks` (link records), not patient data. For each link, fetch the patient via `useQuery(api.patients.get, { id: link.patientId })` to get child names for the picker grid. If one child, auto-redirect via `router.replace`. If multiple, render a child picker grid. If none, show empty state ("No children linked yet — ask your therapist for an invite link").

- [ ] **Step 3: Implement `streak-tracker.tsx`**

Renders flame icon (🔥 at 3+, ✨ at 0), streak count number, and a row of 7 dots (Mon-Sun) filled for practice days.

- [ ] **Step 4: Implement `weekly-progress.tsx`**

Renders "Practiced X/7 days" with a simple progress bar and best-session highlight.

- [ ] **Step 5: Implement `celebration-card.tsx`**

Checks streak milestones and goal-met status. Renders a warm-colored dismissible card. Dismissal stored in `localStorage` keyed by `celebration-{type}-{value}`.

- [ ] **Step 6: Implement `family-dashboard.tsx`**

Composes: patient name header, `<StreakTracker>`, `<TodayActivities>` (placeholder for now), `<WeeklyProgress>`, `<CelebrationCard>`, messages preview link.

- [ ] **Step 7: Verify rendering**

Start dev server, navigate to `/family` as a caregiver user (or test with mock data). Verify components render without errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/family/
git commit -m "feat(family): landing page, dashboard, streak tracker, weekly progress, celebration cards"
```

---

## Task 8: Today's Activities + Practice Log Form

**Files:**
- Create: `src/features/family/components/today-activities.tsx`
- Create: `src/features/family/components/activity-card.tsx`
- Create: `src/features/family/components/practice-log-form.tsx`
- Create: `src/features/family/hooks/use-practice-log.ts`

- [ ] **Step 1: Implement `use-practice-log.ts`**

```tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function usePracticeLog(patientId: Id<"patients">) {
  const logPractice = useMutation(api.practiceLog.log);

  const today = new Date().toISOString().slice(0, 10);
  const monday = getMonday(new Date()).toISOString().slice(0, 10);

  const weeklyLogs = useQuery(api.practiceLog.listByPatientDateRange, {
    patientId,
    startDate: monday,
    endDate: today,
  });

  return { logPractice, weeklyLogs };
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setDate(monday.getDate() - diff);
  return monday;
}
```

- [ ] **Step 2: Implement `activity-card.tsx`**

Renders a card with title, instructions, frequency badge. Shows "Start Practice" CTA if not yet logged today (for this program), or "Logged" state with checkmark. "Start Practice" opens the linked material if available, otherwise shows the practice log form directly.

- [ ] **Step 3: Implement `practice-log-form.tsx`**

A shadcn `Dialog` with:
- Duration: shadcn `Slider` (0-60 minutes, step 5)
- Confidence: 5 clickable star icons (1-5)
- Notes: optional `Textarea`
- Submit button calls `logPractice` mutation, shows toast on success, closes dialog

- [ ] **Step 4: Implement `today-activities.tsx`**

Lists active home programs filtered by `isDueToday()`, sorted by `frequencySortOrder()`. Renders `<ActivityCard>` for each. Shows "All done for today!" when all activities are logged.

- [ ] **Step 5: Verify the practice flow works**

Dev server: navigate to dashboard, see activities, tap "Log Practice", fill form, submit. Verify streak increments.

- [ ] **Step 6: Commit**

```bash
git add src/features/family/
git commit -m "feat(family): today's activities list, activity cards, and practice log form"
```

---

## Task 9: Messaging Components

**Files:**
- Create: `src/features/family/components/message-bubble.tsx`
- Create/replace: `src/features/family/components/message-thread.tsx`
- Create: `src/features/family/hooks/use-messages.ts`

- [ ] **Step 1: Implement `use-messages.ts`**

```tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useMessages(patientId: Id<"patients">) {
  const messages = useQuery(api.patientMessages.list, { patientId });
  const unreadCount = useQuery(api.patientMessages.getUnreadCount, { patientId });
  const sendMessage = useMutation(api.patientMessages.send);
  const markRead = useMutation(api.patientMessages.markRead);

  return { messages, unreadCount, sendMessage, markRead };
}
```

- [ ] **Step 2: Implement `message-bubble.tsx`**

Renders a single message with role-based alignment (caregiver = right, SLP = left), timestamp, read indicator (double check for read messages).

- [ ] **Step 3: Implement `message-thread.tsx`**

Full message thread component:
- Renders message list (reversed from API desc order to show oldest first)
- Auto-scrolls to bottom on new messages
- Compose input with send button (enter to send)
- On mount, calls `markRead` for all unread messages from the other party
- Uses Convex reactive queries for real-time updates

- [ ] **Step 4: Verify messaging works**

Dev server: open messages page, send a message, verify it appears in real-time.

- [ ] **Step 5: Commit**

```bash
git add src/features/family/
git commit -m "feat(family): real-time messaging thread with bubbles, compose input, and read receipts"
```

---

## Task 10: SLP-Side Home Programs Widget

**Files:**
- Create: `src/features/patients/components/home-programs-widget.tsx`
- Create: `src/features/patients/components/home-program-form.tsx`
- Create: `src/features/patients/components/engagement-summary.tsx`
- Modify: `src/features/patients/components/patient-detail-page.tsx`

- [ ] **Step 1: Implement `home-program-form.tsx`**

A shadcn `Dialog` with form fields:
- Title (Input)
- Instructions (Textarea, with hint: "Write in parent-friendly language — no jargon")
- Link Material (Select dropdown from `patientMaterials` query, optional)
- Link Goal (Select dropdown from active `goals` query, optional)
- Frequency (Select: daily, 3x/week, weekly, as needed)
- Start Date (Input type=date)
- End Date (Input type=date, optional)

Submit calls `homePrograms.create` mutation.

- [ ] **Step 2: Implement `engagement-summary.tsx`**

Small inline card showing:
- "Parent practiced X/7 days this week"
- "Avg confidence: X.X/5" (computed from `practiceLog.listByPatientDateRange` for current week)
- Subtle alert if no practice in 5+ days: "No practice logged recently"

- [ ] **Step 3: Implement `home-programs-widget.tsx`**

Widget card with:
- Header: "Home Programs" + "Assign" button (opens `<HomeProgramForm>`)
- List of active programs with engagement summary per program
- For each program: title, frequency badge, last practiced date, parent confidence
- `<EngagementSummary>` at the bottom

- [ ] **Step 4: Add widget to patient detail page**

In `src/features/patients/components/patient-detail-page.tsx`, import and add `<HomeProgramsWidget>` to the right column:

```tsx
import { HomeProgramsWidget } from "./home-programs-widget";

// In the right column div, add after CaregiverInfo:
<HomeProgramsWidget patientId={patient._id} />
```

- [ ] **Step 5: Verify SLP flow**

Dev server: navigate to patient detail, see home programs widget, create a program, verify it appears in the list.

- [ ] **Step 6: Commit**

```bash
git add src/features/patients/components/home-programs-widget.tsx \
  src/features/patients/components/home-program-form.tsx \
  src/features/patients/components/engagement-summary.tsx \
  src/features/patients/components/patient-detail-page.tsx
git commit -m "feat(patients): SLP-side home programs widget with engagement tracking"
```

---

## Task 11: Component Tests (RTL)

**Files:**
- Create: `src/features/family/components/__tests__/streak-tracker.test.tsx`
- Create: `src/features/family/components/__tests__/practice-log-form.test.tsx`
- Create: `src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx`

- [ ] **Step 1: Write streak-tracker tests**

Test that:
- Renders "Start your streak!" when streak is 0
- Shows flame icon and count when streak >= 3
- Renders 7 weekly dots, filled ones matching `weeklyPracticeDays`

- [ ] **Step 2: Write practice-log-form tests**

Test that:
- Duration slider renders and updates value
- Star rating buttons are clickable (1-5)
- Submit button calls the `onSubmit` callback with `{ duration, confidence, notes }`
- Form stays open if submit fails (mock mutation rejection)

- [ ] **Step 3: Write sidebar caregiver nav tests**

Test that:
- When `useUser` returns `publicMetadata.role === "caregiver"`, sidebar shows "Home" and "Settings" only
- When `useUser` returns no role, sidebar shows the full SLP nav items
- Caregiver nav does NOT show Patients, Builder, Templates, etc.

- [ ] **Step 4: Run component tests**

Run: `npx vitest run src/features/family/components/__tests__/ src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/family/components/__tests__/ src/features/dashboard/components/__tests__/dashboard-sidebar-caregiver.test.tsx
git commit -m "test(family): add component tests for streak tracker, practice log form, and caregiver sidebar"
```

---

## Task 12: Run Full Test Suite + Fix Regressions

**Files:** None new — fix any failing tests

- [ ] **Step 1: Run all Convex tests**

Run: `npx vitest run convex/__tests__/`
Expected: ALL PASS (including existing tests — schema changes must not break them)

- [ ] **Step 2: Run all frontend tests**

Run: `npx vitest run src/`
Expected: ALL PASS (sidebar test may need updating for new nav structure)

- [ ] **Step 3: Fix any failures**

Common issues:
- Existing sidebar tests may snapshot-match the old nav — update snapshots
- Schema changes may affect tests that count tables or validate the full schema
- Activity log tests may need the new action types in their fixtures

- [ ] **Step 4: Run full suite one final time**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 5: Commit any fixes**

```bash
git add -u
git commit -m "fix: update existing tests for Subsystem 4 schema and sidebar changes"
```

---

## Task Summary

| # | Task | Files | Commits |
|---|---|---|---|
| 1 | Schema + Auth Foundation | 3 | 1 |
| 2 | Home Programs Backend | 2 | 1 |
| 3 | Practice Log Backend | 2 | 1 |
| 4 | Patient Messages Backend | 2 | 1 |
| 5 | Frontend Utility Libraries | 6 | 1 |
| 6 | Routes + Navigation + Sidebar | 7 | 1 |
| 7 | Dashboard Components | 6 | 1 |
| 8 | Activities + Practice Log UI | 4 | 1 |
| 9 | Messaging Components | 3 | 1 |
| 10 | SLP Home Programs Widget | 4 | 1 |
| 11 | Component Tests (RTL) | 3 | 1 |
| 12 | Full Test Suite Verification | 0 | 0-1 |
| **Total** | | **~42** | **11-12** |
