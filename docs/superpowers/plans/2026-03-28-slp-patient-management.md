# SLP Patient Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add patient/caseload management as an independent feature wing — 4 new Convex tables, role-based auth, caseload UI with expandable rows, widget-based patient detail, caregiver invite flow, and material assignment stub.

**Architecture:** New Feature Wing approach. All patient management code lives in `src/features/patients/` and `convex/patients.ts` / `convex/caregivers.ts` / `convex/activityLog.ts` / `convex/patientMaterials.ts`. Existing builder/flashcard features are untouched. Clerk `publicMetadata.role` differentiates SLPs from caregivers, with Convex-side auth helpers for defense in depth.

**Tech Stack:** Next.js 16 (App Router), Convex (backend), Clerk v7 (auth + roles), shadcn/ui, Tailwind v4, Vitest + convex-test + Playwright

**Spec:** `docs/superpowers/specs/2026-03-28-slp-patient-management-design.md`

---

## File Map

### New files — Convex backend
| File | Responsibility |
|---|---|
| `convex/patients.ts` | Patient CRUD: list, get, create, update, updateStatus, getStats |
| `convex/caregivers.ts` | Invite flow: createInvite, getInvite, acceptInvite, revokeInvite, listByPatient, listByCaregiver |
| `convex/activityLog.ts` | Audit trail: log (internal), listByPatient |
| `convex/patientMaterials.ts` | Material assignment: assign, listByPatient, unassign |
| `convex/clerkActions.ts` | Node action: setCaregiverRole via Clerk Backend API |
| `convex/__tests__/patients.test.ts` | Unit tests for patient CRUD |
| `convex/__tests__/caregivers.test.ts` | Unit tests for invite flow |
| `convex/__tests__/activityLog.test.ts` | Unit tests for activity log |
| `convex/__tests__/patientMaterials.test.ts` | Unit tests for material assignment |

### New files — Frontend feature slice
| File | Responsibility |
|---|---|
| `src/features/patients/lib/diagnosis-colors.ts` | Diagnosis → avatar color mapping |
| `src/features/patients/lib/patient-utils.ts` | Age calculation, name formatting, validation |
| `src/features/patients/hooks/use-patients.ts` | Query hooks wrapping Convex patient/activity queries |
| `src/features/patients/hooks/use-invite.ts` | Invite flow state management |
| `src/features/patients/components/patients-page.tsx` | Caseload list with expandable rows |
| `src/features/patients/components/patient-row.tsx` | Single collapsed row |
| `src/features/patients/components/patient-row-expanded.tsx` | Expanded panel (3 columns) |
| `src/features/patients/components/patient-detail-page.tsx` | Widget dashboard |
| `src/features/patients/components/patient-profile-widget.tsx` | Profile card with inline edit |
| `src/features/patients/components/activity-timeline.tsx` | Activity feed widget |
| `src/features/patients/components/assigned-materials.tsx` | Materials list widget |
| `src/features/patients/components/caregiver-info.tsx` | Caregiver status widget |
| `src/features/patients/components/quick-notes.tsx` | Auto-saving notes widget |
| `src/features/patients/components/patient-intake-form.tsx` | Two-step add patient form |
| `src/features/patients/components/invite-landing.tsx` | Invite acceptance page |

### New files — Routes (thin wrappers)
| File | Responsibility |
|---|---|
| `src/app/(app)/patients/page.tsx` | → `patients-page.tsx` |
| `src/app/(app)/patients/[id]/page.tsx` | → `patient-detail-page.tsx` |
| `src/app/(app)/patients/[id]/not-found.tsx` | 404 for invalid patient ID |
| `src/app/(app)/patients/new/page.tsx` | → `patient-intake-form.tsx` |
| `src/app/invite/[token]/page.tsx` | → `invite-landing.tsx` (standalone, no sidebar) |

### Modified files
| File | Change |
|---|---|
| `convex/schema.ts` | Add `patients`, `caregiverLinks`, `patientMaterials`, `activityLog` tables |
| `convex/lib/auth.ts` | Add `getAuthRole`, `assertSLP`, `assertCaregiverAccess` helpers |
| `src/core/routes.ts` | Add `PATIENTS`, `PATIENT_DETAIL`, `PATIENT_NEW`, `INVITE` routes |
| `src/shared/lib/navigation.ts` | Add "Patients" nav item + `isNavActive` branch |
| `src/proxy.ts` | Add `/patients(.*)` to `isProtectedRoute` |

---

## Task 1: Schema — Add 4 New Tables

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add the four new table definitions to schema.ts**

Add after the `flashcards` table definition (before the closing `});`):

```ts
  patients: defineTable({
    slpUserId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    diagnosis: v.union(
      v.literal("articulation"),
      v.literal("language"),
      v.literal("fluency"),
      v.literal("voice"),
      v.literal("aac-complex"),
      v.literal("other")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("on-hold"),
      v.literal("discharged"),
      v.literal("pending-intake")
    ),
    parentEmail: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    communicationLevel: v.optional(
      v.union(
        v.literal("pre-verbal"),
        v.literal("single-words"),
        v.literal("phrases"),
        v.literal("sentences")
      )
    ),
    sensoryNotes: v.optional(v.string()),
    behavioralNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_slpUserId", ["slpUserId"]),

  caregiverLinks: defineTable({
    patientId: v.id("patients"),
    caregiverUserId: v.optional(v.string()),
    email: v.string(),
    inviteToken: v.string(),
    inviteStatus: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked")
    ),
    relationship: v.optional(v.string()),
  }).index("by_patientId", ["patientId"])
    .index("by_caregiverUserId", ["caregiverUserId"])
    .index("by_inviteToken", ["inviteToken"])
    .index("by_email", ["email"]),

  patientMaterials: defineTable({
    patientId: v.id("patients"),
    sessionId: v.optional(v.id("sessions")),
    appId: v.optional(v.id("apps")),
    assignedBy: v.string(),
    assignedAt: v.number(),
    notes: v.optional(v.string()),
  }).index("by_patientId", ["patientId"])
    .index("by_sessionId", ["sessionId"]),

  activityLog: defineTable({
    patientId: v.id("patients"),
    actorUserId: v.string(),
    action: v.union(
      v.literal("patient-created"),
      v.literal("profile-updated"),
      v.literal("material-assigned"),
      v.literal("invite-sent"),
      v.literal("invite-accepted"),
      v.literal("status-changed")
    ),
    details: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_patientId_timestamp", ["patientId", "timestamp"]),
```

- [ ] **Step 2: Verify schema compiles**

Run: `cd /Users/desha/Springfield-Vibeathon && npx convex dev --once 2>&1 | head -20`
Expected: Schema pushed successfully (or "Schema is up to date")

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add patients, caregiverLinks, patientMaterials, activityLog tables"
```

---

## Task 2: Auth Helpers — Role Detection + Access Guards

**Files:**
- Modify: `convex/lib/auth.ts`
- Test: `convex/__tests__/patients.test.ts` (auth tests will be part of patient tests)

- [ ] **Step 1: Add role helpers to convex/lib/auth.ts**

Add below the existing `assertSessionOwner` function:

```ts
export type UserRole = "slp" | "caregiver";

export async function getAuthRole(
  ctx: QueryCtx | MutationCtx,
): Promise<UserRole | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  // Role comes from Clerk publicMetadata, included in JWT via template customization
  const metadata = (identity as Record<string, unknown>).public_metadata as
    | { role?: string }
    | undefined;
  return (metadata?.role as UserRole) ?? null;
}

export async function assertSLP(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const role = await getAuthRole(ctx);
  if (role !== null && role !== "slp") {
    throw new ConvexError("Only SLPs can perform this action");
  }
  // If role is null (no metadata set yet), treat as SLP (default role)
  return userId;
}

export async function assertCaregiverAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<"patients">,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  const link = await ctx.db
    .query("caregiverLinks")
    .withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
    .filter((q) => q.eq(q.field("patientId"), patientId))
    .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
    .first();
  if (!link) throw new ConvexError("Not authorized to access this patient");
  return userId;
}
```

- [ ] **Step 2: Add ConvexError import**

Add at the top of `convex/lib/auth.ts`:

```ts
import { ConvexError } from "convex/values";
```

- [ ] **Step 3: Verify types compile**

Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit --project convex/tsconfig.json 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add convex/lib/auth.ts
git commit -m "feat: add getAuthRole, assertSLP, assertCaregiverAccess auth helpers"
```

---

## Task 3: Activity Log — Internal Mutation + Query

**Files:**
- Create: `convex/activityLog.ts`
- Create: `convex/__tests__/activityLog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `convex/__tests__/activityLog.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_IDENTITY = { subject: "other-user-456", issuer: "clerk" };

describe("activityLog", () => {
  async function createTestPatient(t: ReturnType<typeof convexTest>) {
    return await t.run(async (ctx) => {
      return await ctx.db.insert("patients", {
        slpUserId: "slp-user-123",
        firstName: "Alex",
        lastName: "Smith",
        dateOfBirth: "2020-01-15",
        diagnosis: "articulation",
        status: "active",
      });
    });
  }

  it("log writes an activity entry", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createTestPatient(t);

    await t.mutation(internal.activityLog.log, {
      patientId,
      actorUserId: "slp-user-123",
      action: "patient-created",
      details: "Created patient Alex Smith",
      timestamp: Date.now(),
    });

    const entries = await t.withIdentity(SLP_IDENTITY).query(
      api.activityLog.listByPatient,
      { patientId }
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("patient-created");
  });

  it("listByPatient respects limit", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createTestPatient(t);
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      await t.mutation(internal.activityLog.log, {
        patientId,
        actorUserId: "slp-user-123",
        action: "profile-updated",
        timestamp: now + i,
      });
    }

    const entries = await t.withIdentity(SLP_IDENTITY).query(
      api.activityLog.listByPatient,
      { patientId, limit: 3 }
    );
    expect(entries).toHaveLength(3);
  });

  it("listByPatient rejects unauthorized user", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createTestPatient(t);

    await expect(
      t.withIdentity(OTHER_IDENTITY).query(
        api.activityLog.listByPatient,
        { patientId }
      )
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/activityLog.test.ts 2>&1 | tail -20`
Expected: FAIL — module `convex/activityLog` not found

- [ ] **Step 3: Implement activityLog.ts**

Create `convex/activityLog.ts`:

```ts
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getAuthUserId } from "./lib/auth";
import { ConvexError } from "convex/values";

export const log = internalMutation({
  args: {
    patientId: v.id("patients"),
    actorUserId: v.string(),
    action: v.union(
      v.literal("patient-created"),
      v.literal("profile-updated"),
      v.literal("material-assigned"),
      v.literal("invite-sent"),
      v.literal("invite-accepted"),
      v.literal("status-changed")
    ),
    details: v.optional(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLog", args);
  },
});

export const listByPatient = query({
  args: {
    patientId: v.id("patients"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Check access: must be the owning SLP or a linked caregiver
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");

    const isSLP = patient.slpUserId === userId;
    if (!isSLP) {
      const link = await ctx.db
        .query("caregiverLinks")
        .withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
        .filter((q) => q.eq(q.field("patientId"), args.patientId))
        .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
        .first();
      if (!link) throw new ConvexError("Not authorized");
    }

    const limit = args.limit ?? 20;
    return await ctx.db
      .query("activityLog")
      .withIndex("by_patientId_timestamp", (q) =>
        q.eq("patientId", args.patientId)
      )
      .order("desc")
      .take(limit);
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/activityLog.test.ts 2>&1 | tail -20`
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add convex/activityLog.ts convex/__tests__/activityLog.test.ts
git commit -m "feat: add activityLog internal mutation and query with tests"
```

---

## Task 4: Patient CRUD — Mutations, Queries, and Tests

**Files:**
- Create: `convex/patients.ts`
- Create: `convex/__tests__/patients.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `convex/__tests__/patients.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };
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

describe("patients.create", () => {
  it("creates a patient with required fields", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const result = await t.mutation(api.patients.create, VALID_PATIENT);
    expect(result.patientId).toBeDefined();
    expect(result.inviteToken).toBeUndefined();

    const patient = await t.query(api.patients.get, { patientId: result.patientId });
    expect(patient?.firstName).toBe("Alex");
    expect(patient?.status).toBe("active");
    expect(patient?.slpUserId).toBe("slp-user-123");
  });

  it("creates patient with invite when parentEmail provided", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const result = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      parentEmail: "parent@example.com",
    });
    expect(result.inviteToken).toBeDefined();
    expect(result.inviteToken).toHaveLength(32);
  });

  it("trims and validates names", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    await expect(
      t.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "" })
    ).rejects.toThrow();
    await expect(
      t.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "a".repeat(101) })
    ).rejects.toThrow();
  });

  it("validates dateOfBirth is in the past and within 21 years", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    await expect(
      t.mutation(api.patients.create, { ...VALID_PATIENT, dateOfBirth: "2099-01-01" })
    ).rejects.toThrow();
    await expect(
      t.mutation(api.patients.create, { ...VALID_PATIENT, dateOfBirth: "2000-01-01" })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.patients.create, VALID_PATIENT)
    ).rejects.toThrow();
  });
});

describe("patients.list", () => {
  it("returns only the SLP's own patients", async () => {
    const t = convexTest(schema, modules);
    const slp1 = t.withIdentity(SLP_IDENTITY);
    const slp2 = t.withIdentity(OTHER_SLP);

    await slp1.mutation(api.patients.create, VALID_PATIENT);
    await slp2.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "Jordan" });

    const list = await slp1.query(api.patients.list, {});
    expect(list).toHaveLength(1);
    expect(list[0].firstName).toBe("Alex");
  });

  it("filters by status", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "Jordan" });
    await t.mutation(api.patients.updateStatus, { patientId, status: "discharged" });

    const active = await t.query(api.patients.list, { status: "active" });
    expect(active).toHaveLength(1);
    expect(active[0].firstName).toBe("Jordan");
  });
});

describe("patients.update", () => {
  it("partial updates work", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.patients.update, {
      patientId,
      interests: ["dinosaurs", "trains"],
    });

    const patient = await t.query(api.patients.get, { patientId });
    expect(patient?.interests).toEqual(["dinosaurs", "trains"]);
    expect(patient?.firstName).toBe("Alex"); // unchanged
  });

  it("rejects unauthorized SLP", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await t.withIdentity(SLP_IDENTITY).mutation(
      api.patients.create, VALID_PATIENT
    );
    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.patients.update, {
        patientId,
        interests: ["hack"],
      })
    ).rejects.toThrow();
  });
});

describe("patients.updateStatus", () => {
  it("changes status and logs activity", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.patients.updateStatus, { patientId, status: "on-hold" });

    const patient = await t.query(api.patients.get, { patientId });
    expect(patient?.status).toBe("on-hold");

    const activity = await t.query(api.activityLog.listByPatient, { patientId });
    const statusChange = activity.find((a: { action: string }) => a.action === "status-changed");
    expect(statusChange).toBeDefined();
    expect(statusChange?.details).toContain("active");
    expect(statusChange?.details).toContain("on-hold");
  });
});

describe("patients.getStats", () => {
  it("returns correct counts by status", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "B" });
    const { patientId } = await t.mutation(api.patients.create, { ...VALID_PATIENT, firstName: "C" });
    await t.mutation(api.patients.updateStatus, { patientId, status: "discharged" });

    const stats = await t.query(api.patients.getStats, {});
    expect(stats.active).toBe(2);
    expect(stats.discharged).toBe(1);
    expect(stats.onHold).toBe(0);
    expect(stats.pendingIntake).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/patients.test.ts 2>&1 | tail -20`
Expected: FAIL — module `convex/patients` not found

- [ ] **Step 3: Implement patients.ts**

Create `convex/patients.ts`:

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { getAuthUserId, assertSLP, assertCaregiverAccess } from "./lib/auth";

// Shared validators
const diagnosisValidator = v.union(
  v.literal("articulation"),
  v.literal("language"),
  v.literal("fluency"),
  v.literal("voice"),
  v.literal("aac-complex"),
  v.literal("other")
);

const statusValidator = v.union(
  v.literal("active"),
  v.literal("on-hold"),
  v.literal("discharged"),
  v.literal("pending-intake")
);

const communicationLevelValidator = v.optional(
  v.union(
    v.literal("pre-verbal"),
    v.literal("single-words"),
    v.literal("phrases"),
    v.literal("sentences")
  )
);

// Validation helpers
function validateName(name: string, field: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new ConvexError(`${field} is required`);
  if (trimmed.length > 100) throw new ConvexError(`${field} must be 100 characters or less`);
  return trimmed;
}

function validateDateOfBirth(dob: string): void {
  const date = new Date(dob);
  if (isNaN(date.getTime())) throw new ConvexError("Invalid date of birth");
  const now = new Date();
  if (date >= now) throw new ConvexError("Date of birth must be in the past");
  const twentyOneYearsAgo = new Date();
  twentyOneYearsAgo.setFullYear(twentyOneYearsAgo.getFullYear() - 21);
  if (date < twentyOneYearsAgo) throw new ConvexError("Date of birth must be within the last 21 years");
}

function validateEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ConvexError("Invalid email format");
  }
  return normalized;
}

function generateInviteToken(): string {
  const chars = "0123456789abcdef";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const patients = await ctx.db
      .query("patients")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", userId))
      .collect();

    if (args.status) {
      return patients.filter((p) => p.status === args.status);
    }
    return patients;
  },
});

export const get = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const patient = await ctx.db.get(args.patientId);
    if (!patient) return null;

    // Allow if SLP owner
    if (patient.slpUserId === userId) return patient;

    // Allow if linked caregiver
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
      .filter((q) => q.eq(q.field("patientId"), args.patientId))
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .first();
    if (link) return patient;

    throw new ConvexError("Not authorized");
  },
});

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    diagnosis: diagnosisValidator,
    status: v.optional(statusValidator),
    parentEmail: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    communicationLevel: communicationLevelValidator,
    sensoryNotes: v.optional(v.string()),
    behavioralNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const firstName = validateName(args.firstName, "First name");
    const lastName = validateName(args.lastName, "Last name");
    validateDateOfBirth(args.dateOfBirth);

    if (args.interests && args.interests.length > 20) {
      throw new ConvexError("Maximum 20 interests allowed");
    }
    if (args.interests?.some((i) => i.length > 50)) {
      throw new ConvexError("Each interest must be 50 characters or less");
    }

    const patientId = await ctx.db.insert("patients", {
      slpUserId,
      firstName,
      lastName,
      dateOfBirth: args.dateOfBirth,
      diagnosis: args.diagnosis,
      status: args.status ?? "active",
      parentEmail: args.parentEmail ? validateEmail(args.parentEmail) : undefined,
      interests: args.interests,
      communicationLevel: args.communicationLevel,
      sensoryNotes: args.sensoryNotes,
      behavioralNotes: args.behavioralNotes,
      notes: args.notes,
    });

    const now = Date.now();

    // Log patient creation
    await ctx.db.insert("activityLog", {
      patientId,
      actorUserId: slpUserId,
      action: "patient-created",
      details: `Created patient ${firstName} ${lastName}`,
      timestamp: now,
    });

    // Inline invite creation if parentEmail provided
    let inviteToken: string | undefined;
    if (args.parentEmail) {
      inviteToken = generateInviteToken();
      await ctx.db.insert("caregiverLinks", {
        patientId,
        email: validateEmail(args.parentEmail),
        inviteToken,
        inviteStatus: "pending",
      });
      await ctx.db.insert("activityLog", {
        patientId,
        actorUserId: slpUserId,
        action: "invite-sent",
        details: `Invited ${args.parentEmail}`,
        timestamp: now + 1,
      });
    }

    return { patientId, inviteToken };
  },
});

export const update = mutation({
  args: {
    patientId: v.id("patients"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    diagnosis: v.optional(diagnosisValidator),
    parentEmail: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    communicationLevel: communicationLevelValidator,
    sensoryNotes: v.optional(v.string()),
    behavioralNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    const updates: Record<string, unknown> = {};
    if (args.firstName !== undefined) updates.firstName = validateName(args.firstName, "First name");
    if (args.lastName !== undefined) updates.lastName = validateName(args.lastName, "Last name");
    if (args.dateOfBirth !== undefined) {
      validateDateOfBirth(args.dateOfBirth);
      updates.dateOfBirth = args.dateOfBirth;
    }
    if (args.diagnosis !== undefined) updates.diagnosis = args.diagnosis;
    if (args.parentEmail !== undefined) updates.parentEmail = validateEmail(args.parentEmail);
    if (args.interests !== undefined) {
      if (args.interests.length > 20) throw new ConvexError("Maximum 20 interests allowed");
      if (args.interests.some((i) => i.length > 50)) throw new ConvexError("Each interest must be 50 characters or less");
      updates.interests = args.interests;
    }
    if (args.communicationLevel !== undefined) updates.communicationLevel = args.communicationLevel;
    if (args.sensoryNotes !== undefined) updates.sensoryNotes = args.sensoryNotes;
    if (args.behavioralNotes !== undefined) updates.behavioralNotes = args.behavioralNotes;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.patientId, updates);

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "profile-updated",
      details: `Updated: ${Object.keys(updates).join(", ")}`,
      timestamp: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    patientId: v.id("patients"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    const oldStatus = patient.status;
    await ctx.db.patch(args.patientId, { status: args.status });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "status-changed",
      details: `${oldStatus} → ${args.status}`,
      timestamp: Date.now(),
    });
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { active: 0, onHold: 0, discharged: 0, pendingIntake: 0 };

    const patients = await ctx.db
      .query("patients")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", userId))
      .collect();

    return {
      active: patients.filter((p) => p.status === "active").length,
      onHold: patients.filter((p) => p.status === "on-hold").length,
      discharged: patients.filter((p) => p.status === "discharged").length,
      pendingIntake: patients.filter((p) => p.status === "pending-intake").length,
    };
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/patients.test.ts 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add convex/patients.ts convex/__tests__/patients.test.ts
git commit -m "feat: add patient CRUD mutations and queries with tests"
```

---

## Task 5: Caregiver Flow — Invite, Accept, Revoke

**Files:**
- Create: `convex/caregivers.ts`
- Create: `convex/clerkActions.ts`
- Create: `convex/__tests__/caregivers.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `convex/__tests__/caregivers.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };
const CAREGIVER_IDENTITY = { subject: "caregiver-789", issuer: "clerk" };
const OTHER_CAREGIVER = { subject: "caregiver-other", issuer: "clerk" };

async function createPatient(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });
  return patientId;
}

describe("caregivers.createInvite", () => {
  it("generates invite for existing patient", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });
    expect(token).toHaveLength(32);

    const links = await slp.query(api.caregivers.listByPatient, { patientId });
    expect(links).toHaveLength(1);
    expect(links[0].inviteStatus).toBe("pending");
  });

  it("rejects non-owner SLP", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);

    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.caregivers.createInvite, {
        patientId,
        email: "parent@test.com",
      })
    ).rejects.toThrow();
  });
});

describe("caregivers.getInvite", () => {
  it("returns patient and SLP info for valid pending token", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });

    // getInvite is public (no auth required for invite landing page)
    const info = await t.query(api.caregivers.getInvite, { token });
    expect(info).not.toBeNull();
    expect(info?.patientFirstName).toBe("Alex");
  });

  it("returns null for invalid token", async () => {
    const t = convexTest(schema, modules);
    const info = await t.query(api.caregivers.getInvite, { token: "nonexistent" });
    expect(info).toBeNull();
  });
});

describe("caregivers.acceptInvite", () => {
  it("links caregiver and flips status", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });

    await t.withIdentity(CAREGIVER_IDENTITY).mutation(
      api.caregivers.acceptInvite,
      { token }
    );

    const links = await slp.query(api.caregivers.listByPatient, { patientId });
    expect(links[0].inviteStatus).toBe("accepted");
    expect(links[0].caregiverUserId).toBe("caregiver-789");
  });

  it("is idempotent for same user", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });

    await caregiver.mutation(api.caregivers.acceptInvite, { token });
    // Second accept should not throw
    await caregiver.mutation(api.caregivers.acceptInvite, { token });

    const links = await slp.query(api.caregivers.listByPatient, { patientId });
    expect(links).toHaveLength(1);
  });

  it("rejects already-accepted by different user", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });

    await t.withIdentity(CAREGIVER_IDENTITY).mutation(
      api.caregivers.acceptInvite,
      { token }
    );

    await expect(
      t.withIdentity(OTHER_CAREGIVER).mutation(
        api.caregivers.acceptInvite,
        { token }
      )
    ).rejects.toThrow();
  });
});

describe("caregivers.revokeInvite", () => {
  it("revokes a pending invite", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });

    await slp.mutation(api.caregivers.revokeInvite, { token });

    const info = await t.query(api.caregivers.getInvite, { token });
    expect(info).toBeNull(); // revoked tokens return null
  });
});

describe("caregivers.listByCaregiver", () => {
  it("returns patients linked to the caregiver", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const token = await slp.mutation(api.caregivers.createInvite, {
      patientId,
      email: "parent@test.com",
    });
    await caregiver.mutation(api.caregivers.acceptInvite, { token });

    const patients = await caregiver.query(api.caregivers.listByCaregiver, {});
    expect(patients).toHaveLength(1);
    expect(patients[0].patientId).toBe(patientId);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/caregivers.test.ts 2>&1 | tail -20`
Expected: FAIL — module `convex/caregivers` not found

- [ ] **Step 3: Implement clerkActions.ts (dependency)**

Create `convex/clerkActions.ts`:

```ts
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const setCaregiverRole = internalAction({
  args: { userId: v.string() },
  handler: async (_ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not set in Convex environment");
      return;
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${args.userId}/metadata`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_metadata: { role: "caregiver" },
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `Failed to set caregiver role for ${args.userId}: ${response.status}`
      );
    }
  },
});
```

- [ ] **Step 4: Implement caregivers.ts**

Create `convex/caregivers.ts`:

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { getAuthUserId, assertSLP } from "./lib/auth";

function generateInviteToken(): string {
  const chars = "0123456789abcdef";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function validateEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ConvexError("Invalid email format");
  }
  return normalized;
}

export const createInvite = mutation({
  args: {
    patientId: v.id("patients"),
    email: v.string(),
    relationship: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    const email = validateEmail(args.email);
    const inviteToken = generateInviteToken();

    await ctx.db.insert("caregiverLinks", {
      patientId: args.patientId,
      email,
      inviteToken,
      inviteStatus: "pending",
      relationship: args.relationship,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "invite-sent",
      details: `Invited ${email}`,
      timestamp: Date.now(),
    });

    return inviteToken;
  },
});

export const getInvite = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", args.token))
      .first();

    if (!link || link.inviteStatus !== "pending") return null;

    const patient = await ctx.db.get(link.patientId);
    if (!patient) return null;

    return {
      patientFirstName: patient.firstName,
      inviteStatus: link.inviteStatus,
    };
  },
});

export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", args.token))
      .first();

    if (!link) throw new ConvexError("Invalid invite token");

    // Idempotent: if same user already accepted, treat as success
    if (link.inviteStatus === "accepted" && link.caregiverUserId === userId) {
      return;
    }

    // Reject if already accepted by a different user
    if (link.inviteStatus === "accepted" && link.caregiverUserId !== userId) {
      throw new ConvexError("This invite has already been used");
    }

    if (link.inviteStatus === "revoked") {
      throw new ConvexError("This invite has been revoked");
    }

    await ctx.db.patch(link._id, {
      caregiverUserId: userId,
      inviteStatus: "accepted",
    });

    await ctx.db.insert("activityLog", {
      patientId: link.patientId,
      actorUserId: userId,
      action: "invite-accepted",
      details: `Caregiver accepted invite`,
      timestamp: Date.now(),
    });

    // Schedule Clerk role update (async, non-blocking)
    await ctx.scheduler.runAfter(0, internal.clerkActions.setCaregiverRole, {
      userId,
    });
  },
});

export const revokeInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);

    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_inviteToken", (q) => q.eq("inviteToken", args.token))
      .first();

    if (!link) throw new ConvexError("Invalid invite token");

    const patient = await ctx.db.get(link.patientId);
    if (!patient || patient.slpUserId !== slpUserId) {
      throw new ConvexError("Not authorized");
    }

    await ctx.db.patch(link._id, { inviteStatus: "revoked" });
  },
});

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify access (SLP owner or linked caregiver)
    const patient = await ctx.db.get(args.patientId);
    if (!patient) return [];
    if (patient.slpUserId !== userId) {
      const link = await ctx.db
        .query("caregiverLinks")
        .withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
        .filter((q) => q.eq(q.field("patientId"), args.patientId))
        .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
        .first();
      if (!link) return [];
    }

    return await ctx.db
      .query("caregiverLinks")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

export const listByCaregiver = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const links = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
      .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
      .collect();

    return links;
  },
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/caregivers.test.ts 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add convex/caregivers.ts convex/clerkActions.ts convex/__tests__/caregivers.test.ts
git commit -m "feat: add caregiver invite flow with Clerk role integration and tests"
```

---

## Task 6: Patient Materials — Assignment Stub

**Files:**
- Create: `convex/patientMaterials.ts`
- Create: `convex/__tests__/patientMaterials.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `convex/__tests__/patientMaterials.test.ts`:

```ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

async function setupPatientWithSession(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });
  const sessionId = await slp.mutation(api.sessions.create, {
    title: "AAC Board",
    query: "Make an AAC board",
  });
  return { patientId, sessionId };
}

describe("patientMaterials.assign", () => {
  it("links a session to a patient", async () => {
    const t = convexTest(schema, modules);
    const { patientId, sessionId } = await setupPatientWithSession(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.patientMaterials.assign, {
      patientId,
      sessionId,
      notes: "Practice this AAC board daily",
    });

    const materials = await slp.query(api.patientMaterials.listByPatient, { patientId });
    expect(materials).toHaveLength(1);
    expect(materials[0].sessionId).toBe(sessionId);
    expect(materials[0].notes).toBe("Practice this AAC board daily");
  });

  it("rejects when neither sessionId nor appId provided", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupPatientWithSession(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await expect(
      slp.mutation(api.patientMaterials.assign, { patientId })
    ).rejects.toThrow();
  });

  it("rejects non-owner SLP", async () => {
    const t = convexTest(schema, modules);
    const { patientId, sessionId } = await setupPatientWithSession(t);

    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.patientMaterials.assign, {
        patientId,
        sessionId,
      })
    ).rejects.toThrow();
  });
});

describe("patientMaterials.unassign", () => {
  it("removes a material assignment", async () => {
    const t = convexTest(schema, modules);
    const { patientId, sessionId } = await setupPatientWithSession(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.patientMaterials.assign, { patientId, sessionId });
    const materials = await slp.query(api.patientMaterials.listByPatient, { patientId });
    expect(materials).toHaveLength(1);

    await slp.mutation(api.patientMaterials.unassign, { materialId: materials[0]._id });
    const after = await slp.query(api.patientMaterials.listByPatient, { patientId });
    expect(after).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/patientMaterials.test.ts 2>&1 | tail -20`
Expected: FAIL — module `convex/patientMaterials` not found

- [ ] **Step 3: Implement patientMaterials.ts**

Create `convex/patientMaterials.ts`:

```ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { assertSLP, getAuthUserId } from "./lib/auth";

export const assign = mutation({
  args: {
    patientId: v.id("patients"),
    sessionId: v.optional(v.id("sessions")),
    appId: v.optional(v.id("apps")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== slpUserId) throw new ConvexError("Not authorized");

    if (!args.sessionId && !args.appId) {
      throw new ConvexError("Either sessionId or appId must be provided");
    }

    const now = Date.now();
    await ctx.db.insert("patientMaterials", {
      patientId: args.patientId,
      sessionId: args.sessionId,
      appId: args.appId,
      assignedBy: slpUserId,
      assignedAt: now,
      notes: args.notes,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: slpUserId,
      action: "material-assigned",
      details: args.notes ?? "Material assigned",
      timestamp: now,
    });
  },
});

export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const patient = await ctx.db.get(args.patientId);
    if (!patient) return [];
    if (patient.slpUserId !== userId) {
      // Check caregiver access
      const link = await ctx.db
        .query("caregiverLinks")
        .withIndex("by_caregiverUserId", (q) => q.eq("caregiverUserId", userId))
        .filter((q) => q.eq(q.field("patientId"), args.patientId))
        .filter((q) => q.eq(q.field("inviteStatus"), "accepted"))
        .first();
      if (!link) return [];
    }

    const materials = await ctx.db
      .query("patientMaterials")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    // Join with session/app titles
    return await Promise.all(
      materials.map(async (m) => {
        let title = "Untitled";
        let type: "session" | "app" = "session";
        if (m.sessionId) {
          const session = await ctx.db.get(m.sessionId);
          if (session) title = session.title;
        } else if (m.appId) {
          const app = await ctx.db.get(m.appId);
          if (app) {
            title = app.title;
            type = "app";
          }
        }
        return { ...m, title, type };
      })
    );
  },
});

export const unassign = mutation({
  args: { materialId: v.id("patientMaterials") },
  handler: async (ctx, args) => {
    const slpUserId = await assertSLP(ctx);
    const material = await ctx.db.get(args.materialId);
    if (!material) throw new ConvexError("Material not found");

    const patient = await ctx.db.get(material.patientId);
    if (!patient || patient.slpUserId !== slpUserId) {
      throw new ConvexError("Not authorized");
    }

    await ctx.db.delete(args.materialId);
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/patientMaterials.test.ts 2>&1 | tail -20`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add convex/patientMaterials.ts convex/__tests__/patientMaterials.test.ts
git commit -m "feat: add patient materials assignment with tests"
```

---

## Task 7: Routes, Navigation, and Proxy Configuration

**Files:**
- Modify: `src/core/routes.ts`
- Modify: `src/shared/lib/navigation.ts`
- Modify: `src/proxy.ts`
- Create: `src/app/(app)/patients/page.tsx`
- Create: `src/app/(app)/patients/[id]/page.tsx`
- Create: `src/app/(app)/patients/[id]/not-found.tsx`
- Create: `src/app/(app)/patients/new/page.tsx`
- Create: `src/app/invite/[token]/page.tsx`

- [ ] **Step 1: Add routes to src/core/routes.ts**

Add to the `ROUTES` object:

```ts
  PATIENTS: "/patients",
  PATIENT_DETAIL: (id: string) => `/patients/${id}` as const,
  PATIENT_NEW: "/patients/new",
  INVITE: (token: string) => `/invite/${token}` as const,
```

- [ ] **Step 2: Add Patients to navigation.ts**

In `src/shared/lib/navigation.ts`, add the nav item between Home and Builder:

```ts
export const NAV_ITEMS = [
  { icon: "home",                 label: "Home",       href: ROUTES.DASHBOARD },
  { icon: "group",                label: "Patients",   href: ROUTES.PATIENTS },
  { icon: "auto_awesome",         label: "Builder",    href: ROUTES.BUILDER },
  // ... rest unchanged
] as const;
```

And add the `isNavActive` branch:

```ts
export function isNavActive(href: string, pathname: string, _tab: string | null): boolean {
  if (href === "/dashboard")  return pathname === "/dashboard";
  if (href === "/patients")   return pathname.startsWith("/patients");
  if (href === "/builder")    return pathname.startsWith("/builder");
  if (href === "/flashcards") return pathname.startsWith("/flashcards");
  return pathname === href;
}
```

- [ ] **Step 3: Add /patients to proxy.ts isProtectedRoute**

In `src/proxy.ts`, update the `isProtectedRoute` array:

```ts
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/my-tools(.*)",
  "/settings(.*)",
  "/patients(.*)",
]);
```

- [ ] **Step 4: Create thin route wrappers**

Create `src/app/(app)/patients/page.tsx`:

```tsx
import { PatientsPage } from "@/features/patients/components/patients-page";

export default function PatientsRoute() {
  return <PatientsPage />;
}
```

Create `src/app/(app)/patients/new/page.tsx`:

```tsx
import { PatientIntakeForm } from "@/features/patients/components/patient-intake-form";

export default function NewPatientRoute() {
  return <PatientIntakeForm />;
}
```

Create `src/app/(app)/patients/[id]/page.tsx`:

```tsx
import { PatientDetailPage } from "@/features/patients/components/patient-detail-page";

export default function PatientDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <PatientDetailPage paramsPromise={params} />;
}
```

Create `src/app/(app)/patients/[id]/not-found.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function PatientNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold text-foreground">Patient not found</h1>
      <p className="text-on-surface-variant">
        This patient doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Button asChild>
        <Link href="/patients">Back to Caseload</Link>
      </Button>
    </div>
  );
}
```

Create `src/app/invite/[token]/page.tsx`:

```tsx
import { InviteLanding } from "@/features/patients/components/invite-landing";

export default function InviteRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return <InviteLanding paramsPromise={params} />;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/core/routes.ts src/shared/lib/navigation.ts src/proxy.ts \
  src/app/\(app\)/patients/ src/app/invite/
git commit -m "feat: add patient routes, navigation, and proxy protection"
```

---

## Task 8: Patient Utilities and Hooks

**Files:**
- Create: `src/features/patients/lib/diagnosis-colors.ts`
- Create: `src/features/patients/lib/patient-utils.ts`
- Create: `src/features/patients/hooks/use-patients.ts`
- Create: `src/features/patients/hooks/use-invite.ts`

- [ ] **Step 1: Create diagnosis-colors.ts**

Create `src/features/patients/lib/diagnosis-colors.ts`:

```ts
export const DIAGNOSIS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  articulation: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Articulation" },
  language: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Language" },
  fluency: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "Fluency" },
  voice: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", label: "Voice" },
  "aac-complex": { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300", label: "AAC/Complex" },
  other: { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-300", label: "Other" },
};

export const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Active" },
  "on-hold": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "On Hold" },
  discharged: { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-300", label: "Discharged" },
  "pending-intake": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Pending Intake" },
};

export function getInitialsColor(diagnosis: string): string {
  const colors: Record<string, string> = {
    articulation: "bg-emerald-500",
    language: "bg-blue-500",
    fluency: "bg-amber-500",
    voice: "bg-purple-500",
    "aac-complex": "bg-rose-500",
    other: "bg-gray-500",
  };
  return colors[diagnosis] ?? "bg-gray-500";
}
```

- [ ] **Step 2: Create patient-utils.ts**

Create `src/features/patients/lib/patient-utils.ts`:

```ts
export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function formatAge(dateOfBirth: string): string {
  const age = calculateAge(dateOfBirth);
  if (age < 2) {
    const dob = new Date(dateOfBirth);
    const months = (new Date().getFullYear() - dob.getFullYear()) * 12 +
      (new Date().getMonth() - dob.getMonth());
    return `${months}mo`;
  }
  return `${age}y`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}
```

- [ ] **Step 3: Create use-patients.ts hook**

Create `src/features/patients/hooks/use-patients.ts`:

```ts
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function usePatients(status?: string) {
  return useQuery(api.patients.list, status ? { status } : {});
}

export function usePatient(patientId: Id<"patients">) {
  return useQuery(api.patients.get, { patientId });
}

export function usePatientStats() {
  return useQuery(api.patients.getStats, {});
}

export function usePatientActivity(patientId: Id<"patients">, limit?: number) {
  return useQuery(api.activityLog.listByPatient, { patientId, limit });
}

export function usePatientMaterials(patientId: Id<"patients">) {
  return useQuery(api.patientMaterials.listByPatient, { patientId });
}

export function useCaregiverLinks(patientId: Id<"patients">) {
  return useQuery(api.caregivers.listByPatient, { patientId });
}
```

- [ ] **Step 4: Create use-invite.ts hook**

Create `src/features/patients/hooks/use-invite.ts`:

```ts
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export function useInviteInfo(token: string) {
  return useQuery(api.caregivers.getInvite, { token });
}

export function useAcceptInvite() {
  return useMutation(api.caregivers.acceptInvite);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/patients/
git commit -m "feat: add patient utilities, diagnosis colors, and query hooks"
```

---

## Task 9: Patient Intake Form

**Files:**
- Create: `src/features/patients/components/patient-intake-form.tsx`

- [ ] **Step 1: Implement the two-step intake form**

Create `src/features/patients/components/patient-intake-form.tsx`:

```tsx
"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { MaterialIcon } from "@/shared/components/material-icon";
import { toast } from "sonner";

const DIAGNOSES = [
  { value: "articulation", label: "Articulation" },
  { value: "language", label: "Language" },
  { value: "fluency", label: "Fluency" },
  { value: "voice", label: "Voice" },
  { value: "aac-complex", label: "AAC/Complex Communication" },
  { value: "other", label: "Other" },
] as const;

const COMMUNICATION_LEVELS = [
  { value: "pre-verbal", label: "Pre-verbal" },
  { value: "single-words", label: "Single Words" },
  { value: "phrases", label: "Phrases" },
  { value: "sentences", label: "Sentences" },
] as const;

type Diagnosis = (typeof DIAGNOSES)[number]["value"];
type CommLevel = (typeof COMMUNICATION_LEVELS)[number]["value"];

export function PatientIntakeForm() {
  const router = useRouter();
  const createPatient = useMutation(api.patients.create);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | "">("");
  const [showOptional, setShowOptional] = useState(false);
  const [communicationLevel, setCommunicationLevel] = useState<CommLevel | "">("");
  const [parentEmail, setParentEmail] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [sensoryNotes, setSensoryNotes] = useState("");
  const [behavioralNotes, setBehavioralNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Success state
  const [createdResult, setCreatedResult] = useState<{
    patientId: string;
    inviteToken?: string;
  } | null>(null);

  function addInterest() {
    const trimmed = interestInput.trim();
    if (trimmed && interests.length < 20 && trimmed.length <= 50) {
      setInterests([...interests, trimmed]);
      setInterestInput("");
    }
  }

  function removeInterest(index: number) {
    setInterests(interests.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (!diagnosis) newErrors.diagnosis = "Diagnosis is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createPatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        diagnosis: diagnosis as Diagnosis,
        ...(communicationLevel ? { communicationLevel: communicationLevel as CommLevel } : {}),
        ...(parentEmail.trim() ? { parentEmail: parentEmail.trim() } : {}),
        ...(interests.length > 0 ? { interests } : {}),
        ...(sensoryNotes.trim() ? { sensoryNotes: sensoryNotes.trim() } : {}),
        ...(behavioralNotes.trim() ? { behavioralNotes: behavioralNotes.trim() } : {}),
      });
      setCreatedResult(result);
      toast.success("Patient added to your caseload");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create patient";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Success screen
  if (createdResult) {
    const inviteUrl = createdResult.inviteToken
      ? `${window.location.origin}/invite/${createdResult.inviteToken}`
      : null;

    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <MaterialIcon icon="check_circle" size="lg" className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {firstName} has been added
        </h1>

        {inviteUrl && (
          <div className="w-full rounded-xl bg-surface-container p-4">
            <p className="mb-2 text-sm font-medium text-foreground">
              Share this invite link with the caregiver:
            </p>
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly className="text-sm" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast.success("Link copied");
                }}
              >
                <MaterialIcon icon="content_copy" size="sm" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/patients")}>
            View Caseload
          </Button>
          <Button onClick={() => {
            setCreatedResult(null);
            setFirstName("");
            setLastName("");
            setDateOfBirth("");
            setDiagnosis("");
            setShowOptional(false);
            setCommunicationLevel("");
            setParentEmail("");
            setInterests([]);
            setSensoryNotes("");
            setBehavioralNotes("");
          }}>
            Add Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Add Patient</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Step 1: Required fields */}
        <div className="flex flex-col gap-4 rounded-xl bg-surface-container p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={cn(errors.firstName && "border-destructive")}
              />
              {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={cn(errors.lastName && "border-destructive")}
              />
              {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={cn(errors.dateOfBirth && "border-destructive")}
            />
            {errors.dateOfBirth && <p className="mt-1 text-xs text-destructive">{errors.dateOfBirth}</p>}
          </div>

          <div>
            <Label htmlFor="diagnosis">Primary diagnosis</Label>
            <Select value={diagnosis} onValueChange={(v) => setDiagnosis(v as Diagnosis)}>
              <SelectTrigger id="diagnosis" className={cn(errors.diagnosis && "border-destructive")}>
                <SelectValue placeholder="Select diagnosis" />
              </SelectTrigger>
              <SelectContent>
                {DIAGNOSES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.diagnosis && <p className="mt-1 text-xs text-destructive">{errors.diagnosis}</p>}
          </div>
        </div>

        {/* Step 2: Optional (collapsible) */}
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-foreground transition-colors"
        >
          <MaterialIcon
            icon={showOptional ? "expand_less" : "expand_more"}
            size="sm"
          />
          Additional details (optional)
        </button>

        {showOptional && (
          <div className="flex flex-col gap-4 rounded-xl bg-surface-container p-6">
            <div>
              <Label>Communication level</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMMUNICATION_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setCommunicationLevel(
                      communicationLevel === level.value ? "" : level.value
                    )}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      communicationLevel === level.value
                        ? "bg-primary text-white"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                    )}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="interests">Interests & themes</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  id="interests"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addInterest(); }
                  }}
                  placeholder="Type and press Enter"
                />
                <Button type="button" variant="outline" size="sm" onClick={addInterest}>
                  Add
                </Button>
              </div>
              {interests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {interests.map((interest, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {interest}
                      <button type="button" onClick={() => removeInterest(i)} className="hover:text-destructive">
                        <MaterialIcon icon="close" size="sm" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="parentEmail">Caregiver email</Label>
              <Input
                id="parentEmail"
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
              />
              <p className="mt-1 text-xs text-on-surface-variant">
                An invite link will be generated for them to connect.
              </p>
            </div>

            <div>
              <Label htmlFor="sensory">Sensory notes</Label>
              <Textarea
                id="sensory"
                value={sensoryNotes}
                onChange={(e) => setSensoryNotes(e.target.value)}
                placeholder="Any sensory sensitivities or preferences..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="behavioral">Behavioral notes</Label>
              <Textarea
                id="behavioral"
                value={behavioralNotes}
                onChange={(e) => setBehavioralNotes(e.target.value)}
                placeholder="Relevant behavioral observations..."
                rows={2}
              />
            </div>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Adding..." : "Add Patient"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/desha/Springfield-Vibeathon && npx next build 2>&1 | tail -20`
Expected: Compiles (may have unresolved page references until other components exist — that's fine)

- [ ] **Step 3: Commit**

```bash
git add src/features/patients/components/patient-intake-form.tsx
git commit -m "feat: add two-step patient intake form with validation and invite"
```

---

## Task 10: Caseload Page — List with Expandable Rows

**Files:**
- Create: `src/features/patients/components/patients-page.tsx`
- Create: `src/features/patients/components/patient-row.tsx`
- Create: `src/features/patients/components/patient-row-expanded.tsx`

- [ ] **Step 1: Create patient-row.tsx (collapsed row)**

Create `src/features/patients/components/patient-row.tsx`:

```tsx
"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { DIAGNOSIS_COLORS, STATUS_COLORS, getInitialsColor } from "../lib/diagnosis-colors";
import { formatAge, getInitials } from "../lib/patient-utils";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface PatientRowProps {
  patient: Doc<"patients">;
  isExpanded: boolean;
  onToggle: () => void;
}

export function PatientRow({ patient, isExpanded, onToggle }: PatientRowProps) {
  const diagnosis = DIAGNOSIS_COLORS[patient.diagnosis] ?? DIAGNOSIS_COLORS.other;
  const status = STATUS_COLORS[patient.status] ?? STATUS_COLORS.active;

  return (
    <button
      onClick={onToggle}
      aria-expanded={isExpanded}
      className="flex w-full items-center gap-4 rounded-xl bg-surface-container px-4 py-3 text-left transition-all duration-300 hover:bg-surface-container-high"
    >
      {/* Avatar */}
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", getInitialsColor(patient.diagnosis))}>
        {getInitials(patient.firstName, patient.lastName)}
      </div>

      {/* Name + Age */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {patient.firstName} {patient.lastName}
        </p>
        <p className="text-xs text-on-surface-variant">{formatAge(patient.dateOfBirth)}</p>
      </div>

      {/* Diagnosis chip */}
      <span className={cn("hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-block", diagnosis.bg, diagnosis.text)}
        aria-label={`Diagnosis: ${diagnosis.label}`}
      >
        {diagnosis.label}
      </span>

      {/* Status chip */}
      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.bg, status.text)}
        aria-label={`Status: ${status.label}`}
      >
        {status.label}
      </span>

      {/* Expand chevron */}
      <MaterialIcon
        icon={isExpanded ? "expand_less" : "expand_more"}
        size="sm"
        className="text-on-surface-variant transition-transform duration-300"
      />
    </button>
  );
}
```

- [ ] **Step 2: Create patient-row-expanded.tsx**

Create `src/features/patients/components/patient-row-expanded.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface PatientRowExpandedProps {
  patient: Doc<"patients">;
}

export function PatientRowExpanded({ patient }: PatientRowExpandedProps) {
  const activity = useQuery(api.activityLog.listByPatient, {
    patientId: patient._id,
    limit: 5,
  });
  const caregivers = useQuery(api.caregivers.listByPatient, {
    patientId: patient._id,
  });

  return (
    <div className="grid grid-cols-1 gap-4 rounded-b-xl bg-surface-container/50 px-4 pb-4 pt-2 sm:grid-cols-3">
      {/* Left: Quick profile */}
      <div className="flex flex-col gap-2">
        {patient.communicationLevel && (
          <p className="text-xs text-on-surface-variant">
            <span className="font-medium">Level:</span>{" "}
            {patient.communicationLevel.replace("-", " ")}
          </p>
        )}
        {patient.interests && patient.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {patient.interests.map((i, idx) => (
              <span key={idx} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {i}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-on-surface-variant">
          <span className="font-medium">Caregiver:</span>{" "}
          {caregivers === undefined
            ? "..."
            : caregivers.length > 0
              ? `${caregivers.filter((c) => c.inviteStatus === "accepted").length} linked`
              : "None"}
        </p>
      </div>

      {/* Center: Recent activity */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-on-surface-variant">Recent Activity</p>
        {activity === undefined ? (
          <p className="text-xs text-on-surface-variant">Loading...</p>
        ) : activity.length === 0 ? (
          <p className="text-xs text-on-surface-variant">No activity yet</p>
        ) : (
          activity.slice(0, 5).map((entry) => (
            <p key={entry._id} className="truncate text-xs text-on-surface-variant">
              {entry.details ?? entry.action.replace(/-/g, " ")}
            </p>
          ))
        )}
      </div>

      {/* Right: Quick actions */}
      <div className="flex flex-col gap-2">
        <Button asChild size="sm" variant="outline" className="justify-start">
          <Link href={`/patients/${patient._id}`}>
            <MaterialIcon icon="person" size="sm" />
            View Full Profile
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="justify-start" disabled>
          <MaterialIcon icon="assignment" size="sm" />
          Assign Material
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create patients-page.tsx**

Create `src/features/patients/components/patients-page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatients, usePatientStats } from "../hooks/use-patients";
import { PatientRow } from "./patient-row";
import { PatientRowExpanded } from "./patient-row-expanded";

const FILTERS = [
  { value: undefined, label: "All" },
  { value: "active", label: "Active" },
  { value: "on-hold", label: "On Hold" },
  { value: "pending-intake", label: "Pending" },
  { value: "discharged", label: "Discharged" },
] as const;

export function PatientsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const patients = usePatients(statusFilter);
  const stats = usePatientStats();

  const filtered = patients?.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(term) ||
      p.lastName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Caseload</h1>
          {stats && (
            <p className="text-sm text-on-surface-variant">
              {stats.active} active patient{stats.active !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/patients/new">
            <MaterialIcon icon="add" size="sm" />
            Add Patient
          </Link>
        </Button>
      </div>

      {/* Filter pills + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-primary text-white"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      {/* Patient list */}
      {patients === undefined ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-on-surface-variant">Loading caseload...</p>
        </div>
      ) : filtered && filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container">
            <MaterialIcon icon="group" size="lg" className="text-on-surface-variant" />
          </div>
          <p className="text-lg font-medium text-foreground">
            {search ? "No patients match your search" : "No patients yet"}
          </p>
          {!search && (
            <Button asChild>
              <Link href="/patients/new">Add your first patient</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered?.map((patient) => (
            <div key={patient._id}>
              <PatientRow
                patient={patient}
                isExpanded={expandedId === patient._id}
                onToggle={() =>
                  setExpandedId(expandedId === patient._id ? null : patient._id)
                }
              />
              {expandedId === patient._id && (
                <PatientRowExpanded patient={patient} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/patients/components/patients-page.tsx \
  src/features/patients/components/patient-row.tsx \
  src/features/patients/components/patient-row-expanded.tsx
git commit -m "feat: add caseload page with expandable patient rows"
```

---

## Task 11: Patient Detail Page — Widget Dashboard

**Files:**
- Create: `src/features/patients/components/patient-detail-page.tsx`
- Create: `src/features/patients/components/patient-profile-widget.tsx`
- Create: `src/features/patients/components/activity-timeline.tsx`
- Create: `src/features/patients/components/assigned-materials.tsx`
- Create: `src/features/patients/components/caregiver-info.tsx`
- Create: `src/features/patients/components/quick-notes.tsx`

- [ ] **Step 1: Create patient-profile-widget.tsx**

Create `src/features/patients/components/patient-profile-widget.tsx`:

```tsx
"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { MaterialIcon } from "@/shared/components/material-icon";
import { DIAGNOSIS_COLORS, STATUS_COLORS, getInitialsColor } from "../lib/diagnosis-colors";
import { formatAge, getInitials } from "../lib/patient-utils";
import { toast } from "sonner";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface PatientProfileWidgetProps {
  patient: Doc<"patients">;
}

export function PatientProfileWidget({ patient }: PatientProfileWidgetProps) {
  const updatePatient = useMutation(api.patients.update);
  const [isEditing, setIsEditing] = useState(false);
  const [interestInput, setInterestInput] = useState("");
  const [editInterests, setEditInterests] = useState<string[]>(patient.interests ?? []);

  const diagnosis = DIAGNOSIS_COLORS[patient.diagnosis] ?? DIAGNOSIS_COLORS.other;
  const status = STATUS_COLORS[patient.status] ?? STATUS_COLORS.active;

  async function saveInterests() {
    try {
      await updatePatient({ patientId: patient._id, interests: editInterests });
      setIsEditing(false);
      toast.success("Interests updated");
    } catch {
      toast.error("Failed to update interests");
    }
  }

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <div className="flex items-start gap-4">
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white", getInitialsColor(patient.diagnosis))}>
          {getInitials(patient.firstName, patient.lastName)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-foreground">
            {patient.firstName} {patient.lastName}
          </h2>
          <p className="text-sm text-on-surface-variant">{formatAge(patient.dateOfBirth)} old</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", diagnosis.bg, diagnosis.text)}
              aria-label={`Diagnosis: ${diagnosis.label}`}>
              {diagnosis.label}
            </span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.bg, status.text)}
              aria-label={`Status: ${status.label}`}>
              {status.label}
            </span>
            {patient.communicationLevel && (
              <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
                {patient.communicationLevel.replace("-", " ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-on-surface-variant">Interests</Label>
          <Button variant="ghost" size="sm" onClick={() => {
            setIsEditing(!isEditing);
            setEditInterests(patient.interests ?? []);
          }}>
            <MaterialIcon icon={isEditing ? "close" : "edit"} size="sm" />
          </Button>
        </div>
        {isEditing ? (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = interestInput.trim();
                    if (trimmed && editInterests.length < 20) {
                      setEditInterests([...editInterests, trimmed]);
                      setInterestInput("");
                    }
                  }
                }}
                placeholder="Add interest..."
                className="text-sm"
              />
              <Button size="sm" onClick={saveInterests}>Save</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {editInterests.map((interest, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {interest}
                  <button onClick={() => setEditInterests(editInterests.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                    <MaterialIcon icon="close" size="sm" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {patient.interests && patient.interests.length > 0 ? (
              patient.interests.map((interest, i) => (
                <span key={i} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {interest}
                </span>
              ))
            ) : (
              <p className="text-xs text-on-surface-variant italic">No interests added yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create activity-timeline.tsx**

Create `src/features/patients/components/activity-timeline.tsx`:

```tsx
"use client";

import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatientActivity } from "../hooks/use-patients";
import type { Id } from "../../../../convex/_generated/dataModel";

const ACTION_ICONS: Record<string, string> = {
  "patient-created": "person_add",
  "profile-updated": "edit",
  "material-assigned": "assignment",
  "invite-sent": "send",
  "invite-accepted": "how_to_reg",
  "status-changed": "swap_horiz",
};

interface ActivityTimelineProps {
  patientId: Id<"patients">;
}

export function ActivityTimeline({ patientId }: ActivityTimelineProps) {
  const activity = usePatientActivity(patientId);

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Activity</h3>

      {activity === undefined ? (
        <p className="text-xs text-on-surface-variant">Loading...</p>
      ) : activity.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic">No activity yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {activity.map((entry) => (
            <div key={entry._id} className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
                <MaterialIcon
                  icon={ACTION_ICONS[entry.action] ?? "info"}
                  size="sm"
                  className="text-on-surface-variant"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  {entry.details ?? entry.action.replace(/-/g, " ")}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {new Date(entry.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create assigned-materials.tsx**

Create `src/features/patients/components/assigned-materials.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatientMaterials } from "../hooks/use-patients";
import type { Id } from "../../../../convex/_generated/dataModel";

interface AssignedMaterialsProps {
  patientId: Id<"patients">;
}

export function AssignedMaterials({ patientId }: AssignedMaterialsProps) {
  const materials = usePatientMaterials(patientId);

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Assigned Materials</h3>

      {materials === undefined ? (
        <p className="text-xs text-on-surface-variant">Loading...</p>
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-on-surface-variant">No materials assigned yet</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/builder">
              <MaterialIcon icon="auto_awesome" size="sm" />
              Build one
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((m) => (
            <div key={m._id} className="flex items-center gap-3 rounded-lg bg-surface-container-high p-3">
              <MaterialIcon
                icon={m.type === "app" ? "web" : "auto_awesome"}
                size="sm"
                className="text-on-surface-variant"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                {m.notes && (
                  <p className="truncate text-xs text-on-surface-variant">{m.notes}</p>
                )}
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {m.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create caregiver-info.tsx**

Create `src/features/patients/components/caregiver-info.tsx`:

```tsx
"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { MaterialIcon } from "@/shared/components/material-icon";
import { useCaregiverLinks } from "../hooks/use-patients";
import { toast } from "sonner";
import type { Id } from "../../../../convex/_generated/dataModel";

interface CaregiverInfoProps {
  patientId: Id<"patients">;
}

export function CaregiverInfo({ patientId }: CaregiverInfoProps) {
  const links = useCaregiverLinks(patientId);
  const createInvite = useMutation(api.caregivers.createInvite);
  const revokeInvite = useMutation(api.caregivers.revokeInvite);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setIsInviting(true);
    try {
      const token = await createInvite({ patientId, email: email.trim() });
      setInviteUrl(`${window.location.origin}/invite/${token}`);
      setEmail("");
      toast.success("Invite created");
    } catch {
      toast.error("Failed to create invite");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRevoke(token: string) {
    try {
      await revokeInvite({ token });
      toast.success("Invite revoked");
    } catch {
      toast.error("Failed to revoke invite");
    }
  }

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Caregivers</h3>

      {links === undefined ? (
        <p className="text-xs text-on-surface-variant">Loading...</p>
      ) : links.length === 0 && !showForm ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-on-surface-variant">No caregivers linked</p>
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <MaterialIcon icon="person_add" size="sm" />
            Invite a caregiver
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {links?.map((link) => (
            <div key={link._id} className="flex items-center gap-3 rounded-lg bg-surface-container-high p-3">
              <MaterialIcon
                icon={link.inviteStatus === "accepted" ? "how_to_reg" : "pending"}
                size="sm"
                className="text-on-surface-variant"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{link.email}</p>
                <p className="text-xs text-on-surface-variant capitalize">
                  {link.relationship ?? "caregiver"} — {link.inviteStatus}
                </p>
              </div>
              {link.inviteStatus === "pending" && (
                <Button size="sm" variant="ghost" onClick={() => handleRevoke(link.inviteToken)}>
                  <MaterialIcon icon="close" size="sm" />
                </Button>
              )}
            </div>
          ))}

          {!showForm && (
            <Button size="sm" variant="outline" className="self-start" onClick={() => setShowForm(true)}>
              <MaterialIcon icon="person_add" size="sm" />
              Add another
            </Button>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleInvite} className="mt-3 flex flex-col gap-2">
          <Label htmlFor="caregiverEmail" className="text-xs">Caregiver email</Label>
          <div className="flex gap-2">
            <Input
              id="caregiverEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              className="text-sm"
            />
            <Button type="submit" size="sm" disabled={isInviting}>
              {isInviting ? "..." : "Invite"}
            </Button>
          </div>
        </form>
      )}

      {inviteUrl && (
        <div className="mt-3 rounded-lg bg-surface-container-high p-3">
          <p className="mb-1 text-xs font-medium text-foreground">Share this link:</p>
          <div className="flex gap-2">
            <Input value={inviteUrl} readOnly className="text-xs" />
            <Button size="sm" variant="outline" onClick={() => {
              navigator.clipboard.writeText(inviteUrl);
              toast.success("Link copied");
            }}>
              <MaterialIcon icon="content_copy" size="sm" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create quick-notes.tsx**

Create `src/features/patients/components/quick-notes.tsx`:

```tsx
"use client";

import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { toast } from "sonner";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface QuickNotesProps {
  patient: Doc<"patients">;
}

export function QuickNotes({ patient }: QuickNotesProps) {
  const updatePatient = useMutation(api.patients.update);
  const [notes, setNotes] = useState(patient.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync when patient data changes externally
  useEffect(() => {
    setNotes(patient.notes ?? "");
  }, [patient.notes]);

  const saveNotes = useCallback(async () => {
    if (notes === (patient.notes ?? "")) return;
    setIsSaving(true);
    try {
      await updatePatient({ patientId: patient._id, notes });
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  }, [notes, patient._id, patient.notes, updatePatient]);

  return (
    <div className="rounded-xl bg-surface-container p-6">
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor="quickNotes" className="text-sm font-semibold text-foreground">
          Notes
        </Label>
        {isSaving && (
          <span className="text-xs text-on-surface-variant">Saving...</span>
        )}
      </div>
      <Textarea
        id="quickNotes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Add clinical notes, observations, or reminders..."
        rows={4}
        className="resize-y"
      />
    </div>
  );
}
```

- [ ] **Step 6: Create patient-detail-page.tsx (assembles all widgets)**

Create `src/features/patients/components/patient-detail-page.tsx`:

```tsx
"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { usePatient } from "../hooks/use-patients";
import { PatientProfileWidget } from "./patient-profile-widget";
import { ActivityTimeline } from "./activity-timeline";
import { AssignedMaterials } from "./assigned-materials";
import { CaregiverInfo } from "./caregiver-info";
import { QuickNotes } from "./quick-notes";
import type { Id } from "../../../../convex/_generated/dataModel";

interface PatientDetailPageProps {
  paramsPromise: Promise<{ id: string }>;
}

export function PatientDetailPage({ paramsPromise }: PatientDetailPageProps) {
  const { id } = use(paramsPromise);
  const patient = usePatient(id as Id<"patients">);

  if (patient === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (patient === null) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/patients">
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to Caseload
        </Link>
      </Button>

      {/* Profile card (full width) */}
      <PatientProfileWidget patient={patient} />

      {/* Two-column widget grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <ActivityTimeline patientId={patient._id} />

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <AssignedMaterials patientId={patient._id} />
          <CaregiverInfo patientId={patient._id} />
        </div>
      </div>

      {/* Notes (full width) */}
      <QuickNotes patient={patient} />
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/features/patients/components/patient-detail-page.tsx \
  src/features/patients/components/patient-profile-widget.tsx \
  src/features/patients/components/activity-timeline.tsx \
  src/features/patients/components/assigned-materials.tsx \
  src/features/patients/components/caregiver-info.tsx \
  src/features/patients/components/quick-notes.tsx
git commit -m "feat: add patient detail page with widget dashboard"
```

---

## Task 12: Invite Landing Page

**Files:**
- Create: `src/features/patients/components/invite-landing.tsx`

- [ ] **Step 1: Implement invite-landing.tsx**

Create `src/features/patients/components/invite-landing.tsx`:

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";
import { useInviteInfo, useAcceptInvite } from "../hooks/use-invite";
import { toast } from "sonner";

interface InviteLandingProps {
  paramsPromise: Promise<{ token: string }>;
}

export function InviteLanding({ paramsPromise }: InviteLandingProps) {
  const { token } = use(paramsPromise);
  const inviteInfo = useInviteInfo(token);
  const acceptInvite = useAcceptInvite();
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);

  // Auto-accept if user is already signed in (came back from sign-up)
  useEffect(() => {
    if (isLoaded && isSignedIn && inviteInfo && !isAccepting) {
      setIsAccepting(true);
      acceptInvite({ token })
        .then(() => {
          toast.success("You're connected!");
          router.push("/dashboard");
        })
        .catch(() => {
          toast.error("Failed to accept invite");
          setIsAccepting(false);
        });
    }
  }, [isLoaded, isSignedIn, inviteInfo, token, acceptInvite, router, isAccepting]);

  // Loading state
  if (inviteInfo === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  // Invalid/expired token
  if (inviteInfo === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <MaterialIcon icon="error" size="lg" className="text-destructive" />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-foreground">
            Invite not found
          </h1>
          <p className="text-sm text-on-surface-variant">
            This invite is no longer valid. Ask your therapist to send a new one.
          </p>
        </div>
      </div>
    );
  }

  // Accepting state (signed-in user)
  if (isAccepting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-on-surface-variant">Connecting you...</p>
      </div>
    );
  }

  // Main invite card (not signed in)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-sm rounded-2xl bg-surface-container p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container">
          <span className="text-2xl font-bold text-white">B</span>
        </div>

        <h1 className="mb-2 text-xl font-semibold text-foreground">
          You&apos;re invited
        </h1>
        <p className="mb-6 text-sm text-on-surface-variant">
          You&apos;ve been invited to connect with{" "}
          <span className="font-medium text-foreground">
            {inviteInfo.patientFirstName}&apos;s
          </span>{" "}
          speech therapy on Bridges.
        </p>

        <div className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href={`/sign-up?redirect_url=/invite/${token}`}>
              Accept &amp; Sign Up
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Learn More</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/patients/components/invite-landing.tsx
git commit -m "feat: add invite landing page with auto-accept flow"
```

---

## Task 13: Run Full Test Suite

- [ ] **Step 1: Run all Convex backend tests**

Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/ 2>&1 | tail -30`
Expected: All tests pass (existing + new)

- [ ] **Step 2: Run the full project test suite**

Run: `cd /Users/desha/Springfield-Vibeathon && npm test 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 3: Verify the app builds**

Run: `cd /Users/desha/Springfield-Vibeathon && npx next build 2>&1 | tail -30`
Expected: Build succeeds with no errors

- [ ] **Step 4: Fix any failing tests or build errors**

If any tests fail or the build errors, fix the issues before proceeding.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve test/build issues from patient management integration"
```

---

## Task 14: Manual Smoke Test Checklist

Before marking complete, verify these flows manually with `next dev`:

- [ ] **Step 1: Navigate to /patients**

Expected: Empty caseload with "Add your first patient" CTA

- [ ] **Step 2: Click "Add Patient" → fill Step 1 → submit**

Expected: Patient created, success screen shown, patient appears in caseload

- [ ] **Step 3: Click patient row → verify it expands**

Expected: Expanded panel shows quick profile, activity, and action buttons

- [ ] **Step 4: Click "View Full Profile" → verify widget dashboard**

Expected: Profile card, activity timeline, materials (empty), caregiver info, notes all render

- [ ] **Step 5: Edit interests on profile widget**

Expected: Inline edit works, saves on "Save" click, toast confirms

- [ ] **Step 6: Type in Quick Notes → click away**

Expected: Notes auto-save on blur

- [ ] **Step 7: Verify /invite/invalid-token shows error**

Expected: "This invite is no longer valid" message

- [ ] **Step 8: Commit any final fixes**

```bash
git add -A
git commit -m "fix: smoke test fixes for patient management"
```

---

## Prerequisites Checklist (Manual Configuration)

These steps require dashboard/manual configuration and cannot be automated:

1. **Clerk JWT Template:** In Clerk Dashboard → JWT Templates → Convex template, add `"public_metadata": "{{user.public_metadata}}"` to the claims. Without this, role detection returns null.

2. **Convex Environment Variable:** In Convex Dashboard → Settings → Environment Variables, add `CLERK_SECRET_KEY` with the same value as in `.env.local`. Required for the `setCaregiverRole` action.

3. **Set default SLP role:** For existing users who signed up before role metadata was added, they'll have `role: null`. The `assertSLP` helper treats null as SLP (default role), so this is non-breaking.
