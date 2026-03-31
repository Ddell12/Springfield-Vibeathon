# SP1: Security & Legal Compliance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the LiveKit token auth security gap and build a complete patient intake packet system with HIPAA forms, telehealth consent, and SLP practice profiles.

**Architecture:** Two-phase approach. Phase 1 is a surgical security patch to the LiveKit token route (~30 lines). Phase 2 adds 2 new Convex tables (`intakeForms`, `practiceProfiles`), extends `caregiverLinks`, creates a new `src/features/intake/` feature slice with form stepper UI, and integrates into the existing patient detail page and call-join flow.

**Tech Stack:** Convex (schema + functions), Next.js App Router, Clerk auth, shadcn/ui, Tailwind v4, convex-test, Vitest, React Testing Library

---

## File Structure

### Phase 1 — Security Fix
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/app/api/livekit/token/route.ts` | Add status + authorization checks before issuing token |

### Phase 2 — Intake System

#### Schema & Backend
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `convex/schema.ts` | Add `intakeForms`, `practiceProfiles` tables; extend `caregiverLinks` with `intakeCompletedAt`; add `"intake-form-signed"` to `activityLog.action` union |
| Create | `convex/intakeForms.ts` | `signForm`, `signTelehealthConsent` mutations; `getByPatient`, `getByCaregiver`, `hasTelehealthConsent` queries |
| Create | `convex/practiceProfile.ts` | `update` mutation (SLP-only); `get`, `getBySlpId` queries |

#### Frontend — New Feature Slice
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/features/intake/lib/form-content.ts` | Parameterized legal text for all 6 form types |
| Create | `src/features/intake/hooks/use-intake-forms.ts` | Hook wrapping Convex intake queries + mutations |
| Create | `src/features/intake/components/intake-form-renderer.tsx` | Single form layout: title, body, typed-name input, checkbox, sign button |
| Create | `src/features/intake/components/intake-flow.tsx` | 4-form stepper for caregiver intake |
| Create | `src/features/intake/components/intake-status-widget.tsx` | SLP-facing badge + detail on patient profile |
| Create | `src/features/intake/components/telehealth-consent-gate.tsx` | Consent form shown before call lobby |
| Create | `src/features/intake/components/practice-profile-form.tsx` | SLP practice profile settings form |

#### Frontend — Integration Points
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/app/intake/[patientId]/page.tsx` | Caregiver intake route (outside `(app)` layout) |
| Modify | `src/features/patients/components/patient-detail-page.tsx` | Add `IntakeStatusWidget` to the SLP detail view |
| Modify | `src/features/family/components/family-dashboard.tsx` | Add intake banner for incomplete intake |
| Modify | `src/features/sessions/components/call-page.tsx` | Insert telehealth consent gate before `CallRoom` |
| Modify | `src/features/settings/components/settings-page.tsx` | Add "Practice" section with `PracticeProfileForm` |

#### Tests
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `convex/__tests__/intakeForms.test.ts` | Convex function tests for intake form signing, completion, and telehealth consent |
| Create | `convex/__tests__/practiceProfile.test.ts` | Convex function tests for practice profile CRUD |
| Create | `src/features/intake/components/__tests__/intake-form-renderer.test.tsx` | Render tests for form signing UI |
| Create | `src/features/intake/components/__tests__/intake-status-widget.test.tsx` | Render tests for status badge |

---

## Task 1: LiveKit Token Authorization Fix

**Files:**
- Modify: `src/app/api/livekit/token/route.ts:1-58`

This is the security hotfix — ship immediately.

- [ ] **Step 1: Add status and authorization checks to the token route**

The existing route already calls `api.appointments.get`, which runs `assertPatientAccess` — so unauthorized users already get a Convex-level rejection. However: (a) status is not checked — cancelled/completed appointments still get tokens, and (b) the authorization is implicit via a catch block. Make it explicit.

Replace the entire file content:

```typescript
import { AccessToken } from "livekit-server-sdk";

import { authenticate } from "@/app/api/generate/lib/authenticate";
import { api, internal } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

const JOINABLE_STATUSES = new Set(["scheduled", "in-progress"]);

export async function POST(req: Request): Promise<Response> {
  const { convex, userId } = await authenticate();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { appointmentId } = body as { appointmentId?: string };

  if (!appointmentId) {
    return Response.json({ error: "appointmentId required" }, { status: 400 });
  }

  let appointment;
  try {
    appointment = await convex.query(api.appointments.get, {
      appointmentId: appointmentId as Id<"appointments">,
    });
  } catch (err) {
    console.error("[livekit/token] Convex query failed — userId:", userId, "appointmentId:", appointmentId, "error:", err);
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (!appointment) {
    return Response.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Reject tokens for non-joinable appointments
  if (!JOINABLE_STATUSES.has(appointment.status)) {
    return Response.json(
      { error: `Cannot join appointment with status "${appointment.status}"` },
      { status: 403 },
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return Response.json({ error: "LiveKit not configured" }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    ttl: "2h",
  });

  at.addGrant({
    roomJoin: true,
    room: `session-${appointmentId}`,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return Response.json({ token, serverUrl });
}
```

- [ ] **Step 2: Verify the fix doesn't break existing call flow**

Run:
```bash
npx vitest run --reporter=verbose 2>&1 | tail -20
```

Expected: All existing tests pass. (There are no unit tests for the API route itself — it's tested via E2E.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/livekit/token/route.ts
git commit -m "fix(security): add status + auth checks to LiveKit token route

Reject tokens for cancelled/completed/no-show appointments.
Authorization already enforced by assertPatientAccess in the Convex query,
but status check was missing entirely."
```

---

## Task 2: Schema Changes — intakeForms, practiceProfiles, caregiverLinks Extension

**Files:**
- Modify: `convex/schema.ts:198-214` (caregiverLinks) and append new tables
- Modify: `convex/schema.ts:227-251` (activityLog action union)

- [ ] **Step 1: Write failing schema test**

Create `convex/__tests__/intakeForms.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

describe("intakeForms schema", () => {
  it("intakeForms table exists in schema", () => {
    expect(schema.tables.intakeForms).toBeDefined();
  });

  it("practiceProfiles table exists in schema", () => {
    expect(schema.tables.practiceProfiles).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/intakeForms.test.ts --reporter=verbose`

Expected: FAIL — `schema.tables.intakeForms` is undefined.

- [ ] **Step 3: Add intakeForms table to schema**

In `convex/schema.ts`, after the `practiceLog` table (line 525), add:

```typescript
  intakeForms: defineTable({
    patientId: v.id("patients"),
    caregiverUserId: v.string(),
    formType: v.union(
      v.literal("hipaa-npp"),
      v.literal("consent-treatment"),
      v.literal("financial-agreement"),
      v.literal("cancellation-policy"),
      v.literal("release-authorization"),
      v.literal("telehealth-consent")
    ),
    signedAt: v.number(),
    signerName: v.string(),
    signerIP: v.optional(v.string()),
    formVersion: v.string(),
    metadata: v.optional(v.any()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_caregiverUserId", ["caregiverUserId"])
    .index("by_patientId_formType", ["patientId", "formType"]),
```

- [ ] **Step 4: Add practiceProfiles table to schema**

After `intakeForms`, add:

```typescript
  practiceProfiles: defineTable({
    userId: v.string(),
    practiceName: v.optional(v.string()),
    practiceAddress: v.optional(v.string()),
    practicePhone: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    taxId: v.optional(v.string()),
    credentials: v.optional(v.string()),
  })
    .index("by_userId", ["userId"]),
```

- [ ] **Step 5: Extend caregiverLinks with intakeCompletedAt**

In `convex/schema.ts`, find the `caregiverLinks` table definition (~line 198). Add after `kidModePIN`:

```typescript
    intakeCompletedAt: v.optional(v.number()),
```

- [ ] **Step 6: Add "intake-form-signed" to activityLog action union**

In `convex/schema.ts`, find the `activityLog.action` union (~line 230). Add a new literal:

```typescript
      v.literal("intake-form-signed"),
```

after the existing `v.literal("home-program-assigned")` line.

- [ ] **Step 7: Run schema test to verify it passes**

Run: `npx vitest run convex/__tests__/intakeForms.test.ts --reporter=verbose`

Expected: PASS

- [ ] **Step 8: Run full test suite to verify no regressions**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add convex/schema.ts convex/__tests__/intakeForms.test.ts
git commit -m "feat(schema): add intakeForms, practiceProfiles tables; extend caregiverLinks

New tables for patient intake forms and SLP practice profiles.
Added intakeCompletedAt to caregiverLinks for denormalized intake status.
Added intake-form-signed to activityLog action union."
```

---

## Task 3: Convex Backend — practiceProfile.ts

**Files:**
- Create: `convex/practiceProfile.ts`
- Create: `convex/__tests__/practiceProfile.test.ts`

- [ ] **Step 1: Write failing tests for practice profile**

Create `convex/__tests__/practiceProfile.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};

describe("practiceProfile.update", () => {
  it("creates a new profile for an SLP", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.practiceProfile.update, {
      practiceName: "Bridges Speech Therapy",
      npiNumber: "1234567890",
      credentials: "M.S., CCC-SLP",
    });

    const profile = await slp.query(api.practiceProfile.get, {});
    expect(profile).not.toBeNull();
    expect(profile!.practiceName).toBe("Bridges Speech Therapy");
    expect(profile!.npiNumber).toBe("1234567890");
    expect(profile!.credentials).toBe("M.S., CCC-SLP");
  });

  it("updates existing profile without overwriting unset fields", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.practiceProfile.update, {
      practiceName: "Old Name",
      npiNumber: "1234567890",
    });

    await slp.mutation(api.practiceProfile.update, {
      practiceName: "New Name",
    });

    const profile = await slp.query(api.practiceProfile.get, {});
    expect(profile!.practiceName).toBe("New Name");
    expect(profile!.npiNumber).toBe("1234567890");
  });

  it("rejects caregiver callers", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(CAREGIVER_IDENTITY).mutation(api.practiceProfile.update, {
        practiceName: "Hack",
      })
    ).rejects.toThrow();
  });
});

describe("practiceProfile.get", () => {
  it("returns null when no profile exists", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);
    const profile = await slp.query(api.practiceProfile.get, {});
    expect(profile).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/practiceProfile.test.ts --reporter=verbose`

Expected: FAIL — module `api.practiceProfile` not found.

- [ ] **Step 3: Implement practiceProfile.ts**

Create `convex/practiceProfile.ts`:

```typescript
import { v } from "convex/values";

import { authedQuery, slpMutation, slpQuery } from "./lib/customFunctions";

export const update = slpMutation({
  args: {
    practiceName: v.optional(v.string()),
    practiceAddress: v.optional(v.string()),
    practicePhone: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    taxId: v.optional(v.string()),
    credentials: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = ctx.slpUserId;

    const existing = await ctx.db
      .query("practiceProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // Filter out undefined values so we only patch what's provided
    const updates: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("practiceProfiles", {
        userId,
        ...updates,
      });
    }
  },
});

export const get = slpQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.slpUserId) return null;
    return await ctx.db
      .query("practiceProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.slpUserId!))
      .first();
  },
});

export const getBySlpId = authedQuery({
  args: { slpId: v.string() },
  handler: async (ctx, args) => {
    if (!ctx.userId) return null;
    return await ctx.db
      .query("practiceProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.slpId))
      .first();
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/practiceProfile.test.ts --reporter=verbose`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add convex/practiceProfile.ts convex/__tests__/practiceProfile.test.ts
git commit -m "feat(backend): add practiceProfile Convex functions

SLP practice profile CRUD — used by intake forms and later by billing."
```

---

## Task 4: Convex Backend — intakeForms.ts

**Files:**
- Create: `convex/intakeForms.ts`
- Modify: `convex/__tests__/intakeForms.test.ts`

- [ ] **Step 1: Write failing tests for intake form signing**

Append to `convex/__tests__/intakeForms.test.ts` (after the existing schema tests):

```typescript
import { suppressSchedulerErrors } from "./testHelpers";

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const CAREGIVER_IDENTITY = { subject: "caregiver-789", issuer: "clerk" };

async function setupPatientWithCaregiver(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });

  const token = await slp.mutation(api.caregivers.createInvite, {
    patientId,
    email: "parent@test.com",
  });

  const caregiver = t.withIdentity(CAREGIVER_IDENTITY);
  await caregiver.mutation(api.caregivers.acceptInvite, { token });

  return { patientId, slp, caregiver };
}

describe("intakeForms.signForm", () => {
  it("signs a HIPAA NPP form and stores it", async () => {
    const t = convexTest(schema, modules);
    const { patientId, caregiver } = await setupPatientWithCaregiver(t);

    await caregiver.mutation(api.intakeForms.signForm, {
      patientId,
      formType: "hipaa-npp",
      signerName: "Jane Doe",
    });

    const forms = await caregiver.query(api.intakeForms.getByCaregiver, { patientId });
    expect(forms).toHaveLength(1);
    expect(forms[0].formType).toBe("hipaa-npp");
    expect(forms[0].signerName).toBe("Jane Doe");
  });

  it("sets intakeCompletedAt after all 4 required forms are signed", async () => {
    const t = convexTest(schema, modules);
    const { patientId, caregiver, slp } = await setupPatientWithCaregiver(t);

    const requiredForms = [
      "hipaa-npp",
      "consent-treatment",
      "financial-agreement",
      "cancellation-policy",
    ] as const;

    for (const formType of requiredForms) {
      await caregiver.mutation(api.intakeForms.signForm, {
        patientId,
        formType,
        signerName: "Jane Doe",
      });
    }

    const links = await slp.query(api.caregivers.listByPatient, { patientId });
    const accepted = links.find((l) => l.inviteStatus === "accepted");
    expect(accepted?.intakeCompletedAt).toBeTypeOf("number");
  });

  it("rejects unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupPatientWithCaregiver(t);

    await expect(
      t.mutation(api.intakeForms.signForm, {
        patientId,
        formType: "hipaa-npp",
        signerName: "Hacker",
      })
    ).rejects.toThrow();
  });

  it("rejects unlinked caregivers", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await setupPatientWithCaregiver(t);

    const unlinked = t.withIdentity({ subject: "stranger-999", issuer: "clerk" });
    await expect(
      unlinked.mutation(api.intakeForms.signForm, {
        patientId,
        formType: "hipaa-npp",
        signerName: "Stranger",
      })
    ).rejects.toThrow();
  });

  it("prevents duplicate signing of the same form type", async () => {
    const t = convexTest(schema, modules);
    const { patientId, caregiver } = await setupPatientWithCaregiver(t);

    await caregiver.mutation(api.intakeForms.signForm, {
      patientId,
      formType: "hipaa-npp",
      signerName: "Jane Doe",
    });

    await expect(
      caregiver.mutation(api.intakeForms.signForm, {
        patientId,
        formType: "hipaa-npp",
        signerName: "Jane Doe",
      })
    ).rejects.toThrow();
  });
});

describe("intakeForms.signTelehealthConsent", () => {
  it("signs telehealth consent and hasTelehealthConsent returns true", async () => {
    const t = convexTest(schema, modules);
    const { patientId, caregiver } = await setupPatientWithCaregiver(t);

    const before = await caregiver.query(api.intakeForms.hasTelehealthConsent, { patientId });
    expect(before).toBe(false);

    await caregiver.mutation(api.intakeForms.signTelehealthConsent, {
      patientId,
      signerName: "Jane Doe",
    });

    const after = await caregiver.query(api.intakeForms.hasTelehealthConsent, { patientId });
    expect(after).toBe(true);
  });
});

describe("intakeForms.getByPatient", () => {
  it("returns forms grouped for SLP view", async () => {
    const t = convexTest(schema, modules);
    const { patientId, caregiver, slp } = await setupPatientWithCaregiver(t);

    await caregiver.mutation(api.intakeForms.signForm, {
      patientId,
      formType: "hipaa-npp",
      signerName: "Jane Doe",
    });

    const forms = await slp.query(api.intakeForms.getByPatient, { patientId });
    expect(forms).toHaveLength(1);
    expect(forms[0].formType).toBe("hipaa-npp");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/intakeForms.test.ts --reporter=verbose`

Expected: FAIL — `api.intakeForms.signForm` not found.

- [ ] **Step 3: Implement intakeForms.ts**

Create `convex/intakeForms.ts`:

```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { assertCaregiverAccess, assertPatientAccess } from "./lib/auth";
import { authedMutation, authedQuery } from "./lib/customFunctions";

const FORM_TYPE_VALIDATOR = v.union(
  v.literal("hipaa-npp"),
  v.literal("consent-treatment"),
  v.literal("financial-agreement"),
  v.literal("cancellation-policy"),
  v.literal("release-authorization"),
  v.literal("telehealth-consent")
);

const REQUIRED_INTAKE_FORMS = [
  "hipaa-npp",
  "consent-treatment",
  "financial-agreement",
  "cancellation-policy",
] as const;

const CURRENT_FORM_VERSION = "1.0";

export const signForm = authedMutation({
  args: {
    patientId: v.id("patients"),
    formType: FORM_TYPE_VALIDATOR,
    signerName: v.string(),
    signerIP: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await assertCaregiverAccess(ctx, args.patientId);

    // Prevent duplicate signing (except release-authorization which is repeatable)
    if (args.formType !== "release-authorization") {
      const existing = await ctx.db
        .query("intakeForms")
        .withIndex("by_patientId_formType", (q) =>
          q.eq("patientId", args.patientId).eq("formType", args.formType)
        )
        .filter((q) => q.eq(q.field("caregiverUserId"), userId))
        .first();

      if (existing) {
        throw new ConvexError(`Form "${args.formType}" has already been signed`);
      }
    }

    await ctx.db.insert("intakeForms", {
      patientId: args.patientId,
      caregiverUserId: userId,
      formType: args.formType,
      signedAt: Date.now(),
      signerName: args.signerName,
      signerIP: args.signerIP,
      formVersion: CURRENT_FORM_VERSION,
      metadata: args.metadata,
    });

    // Log to activity
    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: userId,
      action: "intake-form-signed",
      details: `Signed ${args.formType}`,
      timestamp: Date.now(),
    });

    // Check if all required intake forms are now complete
    await checkIntakeCompletion(ctx, args.patientId, userId);
  },
});

export const signTelehealthConsent = authedMutation({
  args: {
    patientId: v.id("patients"),
    signerName: v.string(),
    signerIP: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await assertCaregiverAccess(ctx, args.patientId);

    // Check if already signed
    const existing = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId_formType", (q) =>
        q.eq("patientId", args.patientId).eq("formType", "telehealth-consent")
      )
      .filter((q) => q.eq(q.field("caregiverUserId"), userId))
      .first();

    if (existing) {
      // Already signed — idempotent, no error
      return;
    }

    await ctx.db.insert("intakeForms", {
      patientId: args.patientId,
      caregiverUserId: userId,
      formType: "telehealth-consent",
      signedAt: Date.now(),
      signerName: args.signerName,
      formVersion: CURRENT_FORM_VERSION,
      signerIP: args.signerIP,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: userId,
      action: "intake-form-signed",
      details: "Signed telehealth-consent",
      timestamp: Date.now(),
    });
  },
});

export const getByPatient = authedQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return [];
    await assertPatientAccess(ctx, args.patientId);

    return await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

export const getByCaregiver = authedQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return [];

    return await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("caregiverUserId"), ctx.userId!))
      .collect();
  },
});

export const hasTelehealthConsent = authedQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return false;

    const consent = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId_formType", (q) =>
        q.eq("patientId", args.patientId).eq("formType", "telehealth-consent")
      )
      .filter((q) => q.eq(q.field("caregiverUserId"), ctx.userId!))
      .first();

    return consent !== null;
  },
});

async function checkIntakeCompletion(
  ctx: { db: any },
  patientId: any,
  caregiverUserId: string
) {
  const signedForms = await ctx.db
    .query("intakeForms")
    .withIndex("by_patientId", (q: any) => q.eq("patientId", patientId))
    .filter((q: any) => q.eq(q.field("caregiverUserId"), caregiverUserId))
    .collect();

  const signedTypes = new Set(signedForms.map((f: any) => f.formType));
  const allComplete = REQUIRED_INTAKE_FORMS.every((t) => signedTypes.has(t));

  if (allComplete) {
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q: any) =>
        q.eq("caregiverUserId", caregiverUserId).eq("patientId", patientId)
      )
      .first();

    if (link && !link.intakeCompletedAt) {
      await ctx.db.patch(link._id, { intakeCompletedAt: Date.now() });
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/intakeForms.test.ts --reporter=verbose`

Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add convex/intakeForms.ts convex/__tests__/intakeForms.test.ts
git commit -m "feat(backend): add intakeForms Convex functions

signForm, signTelehealthConsent mutations with authorization and
duplicate prevention. getByPatient, getByCaregiver, hasTelehealthConsent
queries. Auto-sets intakeCompletedAt on caregiverLinks when all 4
required forms are signed."
```

---

## Task 5: Form Content — Legal Text Templates

**Files:**
- Create: `src/features/intake/lib/form-content.ts`

- [ ] **Step 1: Create the parameterized form content module**

Create `src/features/intake/lib/form-content.ts`:

```typescript
export interface PracticeInfo {
  practiceName?: string;
  practiceAddress?: string;
  practicePhone?: string;
  slpName?: string;
  credentials?: string;
}

export interface FormSection {
  heading: string;
  body: string;
}

export interface FormContent {
  title: string;
  sections: FormSection[];
  disclaimer: string;
}

const DISCLAIMER =
  "This is a template document. Please consult your legal counsel to ensure compliance with your state's specific requirements.";

function p(info: PracticeInfo) {
  return {
    name: info.practiceName || "[Practice Name]",
    address: info.practiceAddress || "[Practice Address]",
    phone: info.practicePhone || "[Practice Phone]",
    slp: info.slpName || "[Clinician Name]",
    cred: info.credentials || "[Credentials]",
  };
}

export function getHipaaNpp(info: PracticeInfo): FormContent {
  const d = p(info);
  return {
    title: "Notice of Privacy Practices",
    sections: [
      {
        heading: "About This Notice",
        body: `${d.name} is committed to protecting the privacy of your health information. This notice describes how medical information about you or your child may be used and disclosed, and how you can access this information. It applies to all records of care generated by ${d.name}.`,
      },
      {
        heading: "How We Use and Disclose Your Information",
        body: "We may use and disclose your protected health information (PHI) for the purposes of treatment (coordinating care with other providers), payment (billing your insurance or providing receipts), and healthcare operations (quality improvement, training). We will not use or disclose your PHI for any other purpose without your written authorization.",
      },
      {
        heading: "Your Rights",
        body: "You have the right to: (1) Request restrictions on how your PHI is used or disclosed. (2) Request confidential communications. (3) Inspect and obtain a copy of your PHI. (4) Request amendments to your PHI. (5) Receive an accounting of disclosures. (6) Obtain a paper copy of this notice. (7) File a complaint with us or the U.S. Department of Health and Human Services if you believe your privacy rights have been violated.",
      },
      {
        heading: "Contact Information",
        body: `Privacy Officer: ${d.slp}, ${d.cred}\nAddress: ${d.address}\nPhone: ${d.phone}`,
      },
    ],
    disclaimer: DISCLAIMER,
  };
}

export function getConsentTreatment(
  info: PracticeInfo,
  patientName: string
): FormContent {
  const d = p(info);
  return {
    title: "Consent for Evaluation and Treatment",
    sections: [
      {
        heading: "Authorization",
        body: `I authorize ${d.slp}, ${d.cred}, at ${d.name} to evaluate and provide speech-language pathology services to ${patientName || "[Patient Name]"}.`,
      },
      {
        heading: "Scope of Services",
        body: "Services may include but are not limited to: speech-language evaluation, individual and/or group therapy, augmentative and alternative communication (AAC) assessment and training, parent/caregiver training, and home program development.",
      },
      {
        heading: "Risks and Benefits",
        body: "I understand that speech-language therapy is generally considered safe. Potential benefits include improved communication skills. I understand that progress is not guaranteed and outcomes vary. I may withdraw consent and discontinue services at any time.",
      },
    ],
    disclaimer: DISCLAIMER,
  };
}

export function getFinancialAgreement(info: PracticeInfo): FormContent {
  const d = p(info);
  return {
    title: "Financial Responsibility Agreement",
    sections: [
      {
        heading: "Payment Terms",
        body: `I understand that I am financially responsible for all charges incurred for services rendered by ${d.name}. Payment is due at the time of service unless other arrangements have been made in advance.`,
      },
      {
        heading: "Insurance",
        body: "If insurance is billed, I understand that I am responsible for any co-pays, deductibles, and charges not covered by my insurance plan. I authorize release of information necessary to process insurance claims.",
      },
      {
        heading: "Good Faith Estimate (No Surprises Act)",
        body: "Under federal law (the No Surprises Act, effective January 2022), you have the right to receive a Good Faith Estimate of expected charges for scheduled services. If you are uninsured or self-pay, you may request a Good Faith Estimate before your appointment. If you receive a bill that is at least $400 more than your Good Faith Estimate, you can dispute the bill.",
      },
    ],
    disclaimer: DISCLAIMER,
  };
}

export function getCancellationPolicy(info: PracticeInfo): FormContent {
  const d = p(info);
  return {
    title: "Cancellation and Attendance Policy",
    sections: [
      {
        heading: "Cancellation Notice",
        body: `${d.name} requires at least 24 hours advance notice if you need to cancel or reschedule an appointment. This allows the time slot to be offered to another patient.`,
      },
      {
        heading: "Late Cancellations and No-Shows",
        body: "Appointments cancelled with less than 24 hours notice or missed without notice (no-shows) may be subject to a cancellation fee. Insurance does not cover missed appointments. Repeated no-shows may result in discharge from services.",
      },
      {
        heading: "How to Cancel",
        body: `To cancel or reschedule, please contact ${d.name} via the Bridges app messaging feature or by phone at ${d.phone}.`,
      },
    ],
    disclaimer: DISCLAIMER,
  };
}

export function getReleaseAuthorization(
  info: PracticeInfo,
  patientName: string,
  thirdPartyName: string
): FormContent {
  const d = p(info);
  return {
    title: "Authorization to Release/Exchange Information",
    sections: [
      {
        heading: "Authorization",
        body: `I authorize ${d.name} to release and/or exchange protected health information about ${patientName || "[Patient Name]"} with: ${thirdPartyName || "[Third Party Name]"}.`,
      },
      {
        heading: "Information to Be Released",
        body: "Information may include: evaluation reports, progress reports, treatment plans, session notes, and other clinical documentation relevant to the coordination of care.",
      },
      {
        heading: "Expiration",
        body: "This authorization will expire one (1) year from the date of signature, unless revoked earlier in writing. I understand that I may revoke this authorization at any time by providing written notice.",
      },
    ],
    disclaimer: DISCLAIMER,
  };
}

export function getTelehealthConsent(
  info: PracticeInfo,
  patientName: string
): FormContent {
  const d = p(info);
  return {
    title: "Telehealth Informed Consent",
    sections: [
      {
        heading: "Nature of Telehealth",
        body: `I consent to participate in telehealth speech-language therapy sessions conducted by ${d.slp}, ${d.cred}, at ${d.name}. Telehealth involves the delivery of healthcare services using interactive audio and video technology.`,
      },
      {
        heading: "Risks and Limitations",
        body: "I understand that: (1) Telehealth sessions require a stable internet connection and may be affected by technology failures. (2) Despite reasonable safeguards, electronic communication carries some risk of unauthorized access. (3) Some assessments and interventions may be less effective via telehealth. (4) My clinician may determine that telehealth is not appropriate and recommend in-person services.",
      },
      {
        heading: "Technology Requirements",
        body: "I will ensure a private, quiet environment for sessions. I will use a device with a camera, microphone, and reliable internet connection. I understand that sessions may need to be rescheduled if technology issues prevent effective communication.",
      },
      {
        heading: "Emergency Protocols",
        body: `In the event of a medical or behavioral emergency during a telehealth session, I will contact local emergency services (911). I will provide my physical location to ${d.slp} at the start of each session so appropriate emergency services can be contacted if needed.`,
      },
      {
        heading: "Voluntary Participation",
        body: `Participation in telehealth is voluntary. I may withdraw consent and discontinue telehealth services at any time. I may request in-person services as an alternative, subject to availability. ${patientName ? `This consent applies to telehealth services for ${patientName}.` : ""}`,
      },
    ],
    disclaimer: DISCLAIMER,
  };
}

export type FormType =
  | "hipaa-npp"
  | "consent-treatment"
  | "financial-agreement"
  | "cancellation-policy"
  | "release-authorization"
  | "telehealth-consent";

export const FORM_LABELS: Record<FormType, string> = {
  "hipaa-npp": "HIPAA Notice of Privacy Practices",
  "consent-treatment": "Consent for Evaluation and Treatment",
  "financial-agreement": "Financial Responsibility Agreement",
  "cancellation-policy": "Cancellation and Attendance Policy",
  "release-authorization": "Authorization to Release Information",
  "telehealth-consent": "Telehealth Informed Consent",
};

export const REQUIRED_INTAKE_FORM_TYPES: FormType[] = [
  "hipaa-npp",
  "consent-treatment",
  "financial-agreement",
  "cancellation-policy",
];
```

- [ ] **Step 2: Commit**

```bash
git add src/features/intake/lib/form-content.ts
git commit -m "feat(intake): add parameterized legal text templates for 6 form types

HIPAA NPP, consent for treatment, financial agreement, cancellation policy,
release authorization, and telehealth consent. All parameterized with
practice profile fields."
```

---

## Task 6: Intake Hook and Form Renderer Component

**Files:**
- Create: `src/features/intake/hooks/use-intake-forms.ts`
- Create: `src/features/intake/components/intake-form-renderer.tsx`
- Create: `src/features/intake/components/__tests__/intake-form-renderer.test.tsx`

- [ ] **Step 1: Create the intake hook**

Create `src/features/intake/hooks/use-intake-forms.ts`:

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useIntakeForms(patientId: Id<"patients">) {
  const forms = useQuery(api.intakeForms.getByCaregiver, { patientId });
  const signForm = useMutation(api.intakeForms.signForm);
  const signTelehealthConsent = useMutation(api.intakeForms.signTelehealthConsent);

  const signedTypes = new Set(forms?.map((f) => f.formType) ?? []);

  return {
    forms,
    signedTypes,
    isLoading: forms === undefined,
    signForm,
    signTelehealthConsent,
  };
}

export function useIntakeStatus(patientId: Id<"patients">) {
  const forms = useQuery(api.intakeForms.getByPatient, { patientId });
  return {
    forms,
    isLoading: forms === undefined,
  };
}

export function useTelehealthConsent(patientId: Id<"patients"> | null) {
  const hasConsent = useQuery(
    api.intakeForms.hasTelehealthConsent,
    patientId ? { patientId } : "skip"
  );
  return {
    hasConsent: hasConsent ?? null,
    isLoading: hasConsent === undefined,
  };
}
```

- [ ] **Step 2: Write failing test for intake-form-renderer**

Create `src/features/intake/components/__tests__/intake-form-renderer.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { IntakeFormRenderer } from "../intake-form-renderer";

const MOCK_CONTENT = {
  title: "Test Form",
  sections: [
    { heading: "Section 1", body: "Body text here." },
    { heading: "Section 2", body: "More body text." },
  ],
  disclaimer: "This is a test disclaimer.",
};

describe("IntakeFormRenderer", () => {
  it("renders form title and sections", () => {
    render(
      <IntakeFormRenderer
        content={MOCK_CONTENT}
        onSign={vi.fn()}
        isSigning={false}
      />
    );

    expect(screen.getByText("Test Form")).toBeInTheDocument();
    expect(screen.getByText("Section 1")).toBeInTheDocument();
    expect(screen.getByText("Body text here.")).toBeInTheDocument();
    expect(screen.getByText("This is a test disclaimer.")).toBeInTheDocument();
  });

  it("disables sign button when name is empty or checkbox unchecked", () => {
    render(
      <IntakeFormRenderer
        content={MOCK_CONTENT}
        onSign={vi.fn()}
        isSigning={false}
      />
    );

    const signButton = screen.getByRole("button", { name: /sign/i });
    expect(signButton).toBeDisabled();
  });

  it("enables sign button when name typed and checkbox checked", () => {
    const onSign = vi.fn();
    render(
      <IntakeFormRenderer
        content={MOCK_CONTENT}
        onSign={onSign}
        isSigning={false}
      />
    );

    const nameInput = screen.getByPlaceholderText(/full legal name/i);
    fireEvent.change(nameInput, { target: { value: "Jane Doe" } });

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    const signButton = screen.getByRole("button", { name: /sign/i });
    expect(signButton).toBeEnabled();

    fireEvent.click(signButton);
    expect(onSign).toHaveBeenCalledWith("Jane Doe");
  });

  it("shows signed state when alreadySigned is true", () => {
    render(
      <IntakeFormRenderer
        content={MOCK_CONTENT}
        onSign={vi.fn()}
        isSigning={false}
        alreadySigned={{ signerName: "Jane Doe", signedAt: Date.now() }}
      />
    );

    expect(screen.getByText(/signed by jane doe/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/intake/components/__tests__/intake-form-renderer.test.tsx --reporter=verbose`

Expected: FAIL — module not found.

- [ ] **Step 4: Implement intake-form-renderer.tsx**

Create `src/features/intake/components/intake-form-renderer.tsx`:

```tsx
"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import type { FormContent } from "../lib/form-content";

interface IntakeFormRendererProps {
  content: FormContent;
  onSign: (signerName: string) => void;
  isSigning: boolean;
  alreadySigned?: { signerName: string; signedAt: number } | null;
}

export function IntakeFormRenderer({
  content,
  onSign,
  isSigning,
  alreadySigned,
}: IntakeFormRendererProps) {
  const [name, setName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const canSign = name.trim().length >= 2 && acknowledged && !isSigning;

  if (alreadySigned) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-on-surface font-headline">
          {content.title}
        </h2>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-800">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">
            Signed by {alreadySigned.signerName} on{" "}
            {new Date(alreadySigned.signedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-on-surface font-headline">
        {content.title}
      </h2>

      <div className="mt-4 space-y-4">
        {content.sections.map((section) => (
          <div key={section.heading}>
            <h3 className="text-sm font-semibold text-on-surface">
              {section.heading}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant whitespace-pre-line">
              {section.body}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs italic text-on-surface-variant">
        {content.disclaimer}
      </p>

      <div className="mt-6 border-t border-border pt-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="signer-name" className="text-sm font-medium">
              Full Legal Name
            </Label>
            <Input
              id="signer-name"
              placeholder="Full legal name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="acknowledge" className="text-sm text-on-surface-variant">
              I have read and understand this document, and I acknowledge and agree
              to its terms.
            </Label>
          </div>

          <Button
            onClick={() => onSign(name.trim())}
            disabled={!canSign}
            className={cn(
              "w-full",
              isSigning && "opacity-60",
            )}
          >
            {isSigning ? "Signing…" : "Sign Document"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/intake/components/__tests__/intake-form-renderer.test.tsx --reporter=verbose`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/intake/hooks/use-intake-forms.ts src/features/intake/components/intake-form-renderer.tsx src/features/intake/components/__tests__/intake-form-renderer.test.tsx
git commit -m "feat(intake): add intake hook and form renderer component

IntakeFormRenderer handles the sign flow — name input, checkbox, sign
button. Shows signed state when already completed. useIntakeForms hook
wraps Convex queries and mutations."
```

---

## Task 7: Intake Flow Stepper

**Files:**
- Create: `src/features/intake/components/intake-flow.tsx`
- Create: `src/app/intake/[patientId]/page.tsx`

- [ ] **Step 1: Create the intake flow stepper**

Create `src/features/intake/components/intake-flow.tsx`:

```tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useIntakeForms } from "../hooks/use-intake-forms";
import {
  type FormType,
  FORM_LABELS,
  REQUIRED_INTAKE_FORM_TYPES,
  getHipaaNpp,
  getConsentTreatment,
  getFinancialAgreement,
  getCancellationPolicy,
  type PracticeInfo,
} from "../lib/form-content";
import { IntakeFormRenderer } from "./intake-form-renderer";

interface IntakeFlowProps {
  patientId: Id<"patients">;
}

export function IntakeFlow({ patientId }: IntakeFlowProps) {
  const { isAuthenticated } = useConvexAuth();
  const patient = useQuery(
    api.patients.get,
    isAuthenticated ? { patientId } : "skip"
  );
  const { forms, signedTypes, isLoading, signForm } = useIntakeForms(patientId);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSigning, setIsSigning] = useState(false);

  // Resolve the SLP's practice profile for form content
  const slpId = patient?.slpUserId;
  const practiceProfile = useQuery(
    api.practiceProfile.getBySlpId,
    slpId ? { slpId } : "skip"
  );

  if (isLoading || patient === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-on-surface-variant">Loading intake forms…</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-on-surface-variant">Patient not found.</p>
      </div>
    );
  }

  const practiceInfo: PracticeInfo = {
    practiceName: practiceProfile?.practiceName ?? undefined,
    practiceAddress: practiceProfile?.practiceAddress ?? undefined,
    practicePhone: practiceProfile?.practicePhone ?? undefined,
    slpName: undefined, // Will come from Clerk user — acceptable as placeholder for now
    credentials: practiceProfile?.credentials ?? undefined,
  };

  const patientName = `${patient.firstName} ${patient.lastName}`;

  const formContents = [
    getHipaaNpp(practiceInfo),
    getConsentTreatment(practiceInfo, patientName),
    getFinancialAgreement(practiceInfo),
    getCancellationPolicy(practiceInfo),
  ];

  const allComplete = REQUIRED_INTAKE_FORM_TYPES.every((t) => signedTypes.has(t));

  if (allComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-on-surface font-headline">
            Intake Complete
          </h1>
          <p className="mt-2 text-on-surface-variant">
            All intake forms for {patientName} have been signed. You&apos;re all set!
          </p>
        </div>
      </div>
    );
  }

  const currentFormType = REQUIRED_INTAKE_FORM_TYPES[currentStep];
  const currentContent = formContents[currentStep];
  const currentSigned = forms?.find((f) => f.formType === currentFormType);

  async function handleSign(signerName: string) {
    setIsSigning(true);
    try {
      await signForm({
        patientId,
        formType: currentFormType,
        signerName,
      });
      toast.success(`${FORM_LABELS[currentFormType]} signed`);
      // Auto-advance to next unsigned form
      if (currentStep < REQUIRED_INTAKE_FORM_TYPES.length - 1) {
        setCurrentStep((s) => s + 1);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sign form"
      );
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-on-surface font-headline">
            Intake Forms for {patientName}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Step {currentStep + 1} of {REQUIRED_INTAKE_FORM_TYPES.length}
          </p>
        </div>

        {/* Step indicators */}
        <div className="mb-6 flex justify-center gap-2">
          {REQUIRED_INTAKE_FORM_TYPES.map((formType, i) => (
            <button
              key={formType}
              type="button"
              onClick={() => setCurrentStep(i)}
              className={cn(
                "h-2 w-8 rounded-full transition-colors duration-300",
                i === currentStep
                  ? "bg-primary"
                  : signedTypes.has(formType)
                    ? "bg-green-400"
                    : "bg-surface-container-high"
              )}
              aria-label={`${FORM_LABELS[formType]}${signedTypes.has(formType) ? " (signed)" : ""}`}
            />
          ))}
        </div>

        <IntakeFormRenderer
          content={currentContent}
          onSign={handleSign}
          isSigning={isSigning}
          alreadySigned={
            currentSigned
              ? { signerName: currentSigned.signerName, signedAt: currentSigned.signedAt }
              : null
          }
        />

        {/* Navigation */}
        <div className="mt-4 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              setCurrentStep((s) =>
                Math.min(REQUIRED_INTAKE_FORM_TYPES.length - 1, s + 1)
              )
            }
            disabled={currentStep === REQUIRED_INTAKE_FORM_TYPES.length - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the intake route page**

Create `src/app/intake/[patientId]/page.tsx`:

```tsx
import { IntakeFlow } from "@/features/intake/components/intake-flow";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function IntakePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  return <IntakeFlowWrapper paramsPromise={params} />;
}

// Client wrapper needed because IntakeFlow uses hooks
import dynamic from "next/dynamic";

const IntakeFlowWrapper = dynamic(
  () =>
    Promise.resolve(function Wrapper({
      paramsPromise,
    }: {
      paramsPromise: Promise<{ patientId: string }>;
    }) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { use } = require("react");
      const { patientId } = use(paramsPromise);
      return (
        <IntakeFlow patientId={patientId as Id<"patients">} />
      );
    }),
  { ssr: false }
);
```

Wait — that pattern is awkward. Let me use the same pattern the codebase uses elsewhere. Looking at the existing code, `CallPage` and `FamilyDashboard` both accept `paramsPromise` and use `use()` directly as client components. Let me redo this:

Replace `src/app/intake/[patientId]/page.tsx` with:

```tsx
"use client";

import { use } from "react";

import { IntakeFlow } from "@/features/intake/components/intake-flow";
import type { Id } from "../../../../convex/_generated/dataModel";

export default function IntakePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  return <IntakeFlow patientId={patientId as Id<"patients">} />;
}
```

Note: This page lives outside the `(app)` layout group — it needs to be wrapped in providers. Check if `src/app/layout.tsx` already provides `ClerkProvider` + `ConvexProviderWithClerk`. If it does, this route will inherit them automatically. If not, a layout.tsx specific to this route may be needed.

- [ ] **Step 3: Commit**

```bash
git add src/features/intake/components/intake-flow.tsx src/app/intake/\[patientId\]/page.tsx
git commit -m "feat(intake): add intake flow stepper and route

4-form sequential stepper with step indicators, auto-advance on sign,
and completion state. Route at /intake/[patientId] outside (app) layout."
```

---

## Task 8: Intake Status Widget (SLP-Facing)

**Files:**
- Create: `src/features/intake/components/intake-status-widget.tsx`
- Create: `src/features/intake/components/__tests__/intake-status-widget.test.tsx`
- Modify: `src/features/patients/components/patient-detail-page.tsx`

- [ ] **Step 1: Write failing test for intake status widget**

Create `src/features/intake/components/__tests__/intake-status-widget.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

import { useQuery } from "convex/react";
import { IntakeStatusWidget } from "../intake-status-widget";

describe("IntakeStatusWidget", () => {
  it("shows loading state", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    render(<IntakeStatusWidget patientId={"patient123" as any} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows complete badge when all 4 forms signed", () => {
    vi.mocked(useQuery).mockReturnValue([
      { formType: "hipaa-npp", signerName: "Jane", signedAt: Date.now() },
      { formType: "consent-treatment", signerName: "Jane", signedAt: Date.now() },
      { formType: "financial-agreement", signerName: "Jane", signedAt: Date.now() },
      { formType: "cancellation-policy", signerName: "Jane", signedAt: Date.now() },
    ]);
    render(<IntakeStatusWidget patientId={"patient123" as any} />);
    expect(screen.getByText(/intake complete/i)).toBeInTheDocument();
  });

  it("shows incomplete count when forms are missing", () => {
    vi.mocked(useQuery).mockReturnValue([
      { formType: "hipaa-npp", signerName: "Jane", signedAt: Date.now() },
    ]);
    render(<IntakeStatusWidget patientId={"patient123" as any} />);
    expect(screen.getByText(/1.*4.*forms signed/i)).toBeInTheDocument();
  });

  it("shows no forms signed state", () => {
    vi.mocked(useQuery).mockReturnValue([]);
    render(<IntakeStatusWidget patientId={"patient123" as any} />);
    expect(screen.getByText(/0.*4.*forms signed/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/intake/components/__tests__/intake-status-widget.test.tsx --reporter=verbose`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement intake-status-widget.tsx**

Create `src/features/intake/components/intake-status-widget.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { useState } from "react";

import { cn } from "@/core/utils";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FORM_LABELS, REQUIRED_INTAKE_FORM_TYPES } from "../lib/form-content";

interface IntakeStatusWidgetProps {
  patientId: Id<"patients">;
}

export function IntakeStatusWidget({ patientId }: IntakeStatusWidgetProps) {
  const forms = useQuery(api.intakeForms.getByPatient, { patientId });
  const [expanded, setExpanded] = useState(false);

  if (forms === undefined) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-sm text-on-surface-variant">Loading intake status…</p>
      </div>
    );
  }

  const signedTypes = new Set(
    forms
      .filter((f) =>
        (REQUIRED_INTAKE_FORM_TYPES as readonly string[]).includes(f.formType)
      )
      .map((f) => f.formType)
  );
  const signedCount = signedTypes.size;
  const total = REQUIRED_INTAKE_FORM_TYPES.length;
  const isComplete = signedCount === total;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              isComplete ? "bg-green-500" : "bg-amber-500"
            )}
          />
          <span className="text-sm font-medium text-on-surface">
            {isComplete
              ? "Intake Complete"
              : `${signedCount} of ${total} forms signed`}
          </span>
        </div>
        <svg
          className={cn(
            "h-4 w-4 text-on-surface-variant transition-transform duration-300",
            expanded && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {REQUIRED_INTAKE_FORM_TYPES.map((formType) => {
            const signed = forms.find((f) => f.formType === formType);
            return (
              <div key={formType} className="flex items-center justify-between text-sm">
                <span className={cn(
                  signed ? "text-on-surface" : "text-on-surface-variant"
                )}>
                  {FORM_LABELS[formType]}
                </span>
                {signed ? (
                  <span className="text-xs text-green-600">
                    {new Date(signed.signedAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-xs text-amber-600">Outstanding</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/intake/components/__tests__/intake-status-widget.test.tsx --reporter=verbose`

Expected: PASS

- [ ] **Step 5: Add IntakeStatusWidget to patient detail page**

In `src/features/patients/components/patient-detail-page.tsx`, add the import at the top:

```typescript
import { IntakeStatusWidget } from "@/features/intake/components/intake-status-widget";
```

Then add the widget in the right column, before `<CaregiverInfo>` (around line 63):

```tsx
          <IntakeStatusWidget patientId={patient._id} />
```

The right column section should look like:

```tsx
        <div className="flex flex-col gap-6">
          <AssignedMaterials patientId={patient._id} />
          <IntakeStatusWidget patientId={patient._id} />
          <CaregiverInfo patientId={patient._id} />
          <HomeProgramsWidget patientId={patient._id} />
          <ChildAppsSection patientId={patient._id} />
        </div>
```

- [ ] **Step 6: Commit**

```bash
git add src/features/intake/components/intake-status-widget.tsx src/features/intake/components/__tests__/intake-status-widget.test.tsx src/features/patients/components/patient-detail-page.tsx
git commit -m "feat(intake): add intake status widget to patient detail page

SLP-facing badge showing intake completion status. Expandable to show
which forms are signed and which are outstanding."
```

---

## Task 9: Telehealth Consent Gate

**Files:**
- Create: `src/features/intake/components/telehealth-consent-gate.tsx`
- Modify: `src/features/sessions/components/call-page.tsx`

- [ ] **Step 1: Create the telehealth consent gate component**

Create `src/features/intake/components/telehealth-consent-gate.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useIntakeForms } from "../hooks/use-intake-forms";
import { getTelehealthConsent, type PracticeInfo } from "../lib/form-content";
import { IntakeFormRenderer } from "./intake-form-renderer";

interface TelehealthConsentGateProps {
  patientId: Id<"patients">;
  patientName: string;
  practiceInfo?: PracticeInfo;
  onConsentGiven: () => void;
}

export function TelehealthConsentGate({
  patientId,
  patientName,
  practiceInfo,
  onConsentGiven,
}: TelehealthConsentGateProps) {
  const { signTelehealthConsent } = useIntakeForms(patientId);
  const [isSigning, setIsSigning] = useState(false);

  const content = getTelehealthConsent(practiceInfo ?? {}, patientName);

  async function handleSign(signerName: string) {
    setIsSigning(true);
    try {
      await signTelehealthConsent({ patientId, signerName });
      toast.success("Telehealth consent signed");
      onConsentGiven();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sign consent"
      );
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-on-surface font-headline">
            Telehealth Consent Required
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Please review and sign this consent form before joining your first
            video session.
          </p>
        </div>
        <IntakeFormRenderer
          content={content}
          onSign={handleSign}
          isSigning={isSigning}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate the gate into call-page.tsx**

Modify `src/features/sessions/components/call-page.tsx`. The gate checks `hasTelehealthConsent` for the patient. If false and the user is a caregiver, show the consent form before the `CallRoom`.

Replace the full file:

```tsx
"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useTelehealthConsent } from "@/features/intake/hooks/use-intake-forms";

const CallRoom = dynamic(
  () => import("./call-room").then((m) => ({ default: m.CallRoom })),
  { ssr: false }
);

const TelehealthConsentGate = dynamic(
  () =>
    import("@/features/intake/components/telehealth-consent-gate").then((m) => ({
      default: m.TelehealthConsentGate,
    })),
  { ssr: false }
);

interface CallPageProps {
  paramsPromise: Promise<{ id: string }>;
}

export function CallPage({ paramsPromise }: CallPageProps) {
  const { id } = use(paramsPromise);
  const { user } = useUser();
  const router = useRouter();
  const [consentDismissed, setConsentDismissed] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/livekit-components.css";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const role = user?.publicMetadata?.role as string | undefined;
  const isSLP = role !== "caregiver";
  const isCaregiver = role === "caregiver";

  const appointment = useQuery(
    api.appointments.get,
    { appointmentId: id as Id<"appointments"> }
  );

  const patientId = appointment?.patientId ?? null;
  const { hasConsent, isLoading: consentLoading } =
    useTelehealthConsent(isCaregiver ? patientId : null);

  const completeSession = useMutation(api.appointments.completeSession);

  const handleCallEnd = useCallback(
    async (durationSeconds: number, interactionLog: string) => {
      if (isSLP) {
        try {
          await completeSession({
            appointmentId: id as Id<"appointments">,
            durationSeconds,
            interactionLog,
          });
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Could not save session record."
          );
        }
      }
      router.push(`/sessions/${id}/notes`);
    },
    [id, isSLP, completeSession, router]
  );

  // Show telehealth consent gate for caregivers who haven't signed
  if (
    isCaregiver &&
    !consentDismissed &&
    hasConsent === false &&
    appointment?.patient
  ) {
    return (
      <TelehealthConsentGate
        patientId={appointment.patientId}
        patientName={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
        onConsentGiven={() => setConsentDismissed(true)}
      />
    );
  }

  // Loading state while checking consent
  if (isCaregiver && !consentDismissed && consentLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F3EE]">
        <p className="text-stone-500">Checking session requirements…</p>
      </div>
    );
  }

  return (
    <CallRoom
      appointmentId={id}
      isSLP={isSLP}
      onCallEnd={handleCallEnd}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/intake/components/telehealth-consent-gate.tsx src/features/sessions/components/call-page.tsx
git commit -m "feat(intake): add telehealth consent gate before video sessions

Caregivers must sign telehealth consent before their first video call.
Gate renders inline at call-page level. One-time per patient."
```

---

## Task 10: Family Dashboard Intake Banner

**Files:**
- Modify: `src/features/family/components/family-dashboard.tsx`

- [ ] **Step 1: Add intake banner to family dashboard**

In `src/features/family/components/family-dashboard.tsx`, add imports at the top:

```typescript
import { useQuery as useConvexQuery } from "convex/react";
```

Wait — `useQuery` is already imported from `convex/react` on line 3. Good. Add this import:

```typescript
import { REQUIRED_INTAKE_FORM_TYPES } from "@/features/intake/lib/form-content";
```

Inside the `FamilyDashboard` component, after the existing queries (~line 58), add:

```typescript
  const intakeForms = useQuery(
    api.intakeForms.getByCaregiver,
    isAuthenticated ? { patientId: patientId as Id<"patients"> } : "skip"
  );

  const intakeComplete = intakeForms !== undefined &&
    REQUIRED_INTAKE_FORM_TYPES.every((t) =>
      intakeForms.some((f) => f.formType === t)
    );
```

Then in the JSX, before the main content area (after the header section), add the banner:

```tsx
      {intakeForms !== undefined && !intakeComplete && (
        <Link
          href={`/intake/${patientId}`}
          className="mx-4 flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-amber-700">
            <MaterialIcon icon="description" size="xs" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              Complete intake forms for {patient?.firstName}
            </p>
            <p className="text-xs text-amber-700">
              {intakeForms.filter((f) =>
                (REQUIRED_INTAKE_FORM_TYPES as readonly string[]).includes(f.formType)
              ).length}{" "}
              of {REQUIRED_INTAKE_FORM_TYPES.length} forms signed
            </p>
          </div>
          <MaterialIcon icon="chevron_right" size="xs" className="text-amber-600" />
        </Link>
      )}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/family/components/family-dashboard.tsx
git commit -m "feat(intake): add intake banner to family dashboard

Shows amber banner with form progress when intake is incomplete.
Links to /intake/[patientId] flow. Disappears when all 4 forms signed."
```

---

## Task 11: Practice Profile Settings Form

**Files:**
- Create: `src/features/intake/components/practice-profile-form.tsx`
- Modify: `src/features/settings/components/settings-page.tsx`

- [ ] **Step 1: Create the practice profile form**

Create `src/features/intake/components/practice-profile-form.tsx`:

```tsx
"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import { api } from "../../../../convex/_generated/api";

export function PracticeProfileForm() {
  const profile = useQuery(api.practiceProfile.get, {});
  const updateProfile = useMutation(api.practiceProfile.update);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<Record<string, string>>({});
  const initialized = profile !== undefined;

  // Merge loaded profile into form state (once)
  const effectiveValues = {
    practiceName: form.practiceName ?? profile?.practiceName ?? "",
    practiceAddress: form.practiceAddress ?? profile?.practiceAddress ?? "",
    practicePhone: form.practicePhone ?? profile?.practicePhone ?? "",
    npiNumber: form.npiNumber ?? profile?.npiNumber ?? "",
    licenseNumber: form.licenseNumber ?? profile?.licenseNumber ?? "",
    licenseState: form.licenseState ?? profile?.licenseState ?? "",
    taxId: form.taxId ?? profile?.taxId ?? "",
    credentials: form.credentials ?? profile?.credentials ?? "",
  };

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const updates: Record<string, string> = {};
      for (const [key, value] of Object.entries(effectiveValues)) {
        if (value.trim()) {
          updates[key] = value.trim();
        }
      }
      await updateProfile(updates);
      toast.success("Practice profile saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile"
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!initialized) {
    return <p className="text-sm text-on-surface-variant">Loading practice profile…</p>;
  }

  const fields = [
    { key: "practiceName", label: "Practice Name", placeholder: "Bridges Speech Therapy" },
    { key: "credentials", label: "Credentials", placeholder: "M.S., CCC-SLP" },
    { key: "npiNumber", label: "NPI Number", placeholder: "1234567890" },
    { key: "licenseNumber", label: "License Number", placeholder: "SLP-12345" },
    { key: "licenseState", label: "License State", placeholder: "IL" },
    { key: "practiceAddress", label: "Practice Address", placeholder: "123 Main St, Springfield, IL 62701" },
    { key: "practicePhone", label: "Practice Phone", placeholder: "(217) 555-0100" },
    { key: "taxId", label: "Tax ID (EIN)", placeholder: "12-3456789" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-on-surface font-headline">
          Practice Profile
        </h2>
        <p className="text-sm text-on-surface-variant">
          This information appears on intake forms, treatment plans, and superbills.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <Label htmlFor={key} className="text-sm font-medium">
              {label}
            </Label>
            <Input
              id={key}
              value={effectiveValues[key as keyof typeof effectiveValues]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              className="mt-1"
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving…" : "Save Practice Profile"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Add Practice section to settings page**

In `src/features/settings/components/settings-page.tsx`:

Add import:
```typescript
import { PracticeProfileForm } from "../../intake/components/practice-profile-form";
```

Update the `SettingsSection` type and `SECTION_LABELS`:
```typescript
export type SettingsSection = "profile" | "practice" | "account" | "appearance" | "billing";

const SECTION_LABELS: Record<SettingsSection, string> = {
  profile: "Profile",
  practice: "Practice",
  account: "Account",
  appearance: "Appearance",
  billing: "Billing",
};
```

Add the render case in the main content area (after the profile section, before account):
```tsx
          {section === "practice" ? <PracticeProfileForm /> : null}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/intake/components/practice-profile-form.tsx src/features/settings/components/settings-page.tsx
git commit -m "feat(intake): add practice profile settings form

New 'Practice' section in settings with fields for practice name,
credentials, NPI, license, address, phone, and tax ID. Auto-populates
intake form headers and will be reused by billing."
```

---

## Task 12: Final Integration Test and Cleanup

**Files:**
- All files from previous tasks

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -40`

Expected: All tests pass.

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit 2>&1 | tail -20`

Expected: No errors.

- [ ] **Step 3: Run Next.js build check**

Run: `npx next build 2>&1 | tail -20`

Expected: Build succeeds. (May need to skip if Turbopack symlink issues are present — check memory notes.)

- [ ] **Step 4: Commit any remaining fixes**

If any type errors or test failures surfaced, fix them and commit:

```bash
git add -A
git commit -m "fix: resolve type errors and test failures from SP1 integration"
```

---

## Task Summary

| Task | Description | Estimated Steps |
|------|-------------|-----------------|
| 1 | LiveKit token auth fix | 3 |
| 2 | Schema changes (intakeForms, practiceProfiles, caregiverLinks) | 9 |
| 3 | practiceProfile.ts backend | 5 |
| 4 | intakeForms.ts backend | 6 |
| 5 | Form content templates | 2 |
| 6 | Intake hook + form renderer | 6 |
| 7 | Intake flow stepper + route | 3 |
| 8 | Intake status widget (SLP) | 6 |
| 9 | Telehealth consent gate | 3 |
| 10 | Family dashboard intake banner | 2 |
| 11 | Practice profile settings | 3 |
| 12 | Final integration test | 4 |
