# SP1: Security & Legal Compliance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the LiveKit token auth security gap and build a complete patient intake packet system with HIPAA forms, telehealth consent, and SLP practice profiles.

**Architecture:** Two-phase approach. Phase 1 is a surgical security patch to the LiveKit token route (~30 lines) adding status and authorization checks. Phase 2 adds 2 new Convex tables (`intakeForms`, `practiceProfiles`), extends `caregiverLinks` with `intakeCompletedAt`, creates a new `src/features/intake/` feature slice with form stepper UI, and integrates into the existing patient detail page, family dashboard, call-join flow, and settings page.

**Tech Stack:** Convex (schema + functions), Next.js App Router, Clerk auth, shadcn/ui, Tailwind v4, convex-test, Vitest, React Testing Library

---

## Task 1: LiveKit Token Route — Security Fix Test

**Files:**
- Create: `src/app/api/livekit/token/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/api/livekit/token/__tests__/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock ConvexHttpClient
const mockQuery = vi.fn();
vi.mock("convex/browser", () => ({
  ConvexHttpClient: vi.fn().mockImplementation(() => ({
    setAuth: vi.fn(),
    query: mockQuery,
  })),
}));

// Mock livekit-server-sdk
vi.mock("livekit-server-sdk", () => ({
  AccessToken: vi.fn().mockImplementation(() => ({
    addGrant: vi.fn(),
    toJwt: vi.fn().mockResolvedValue("mock-jwt-token"),
  })),
}));

// Set env vars before importing route
process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud";
process.env.LIVEKIT_API_KEY = "test-key";
process.env.LIVEKIT_API_SECRET = "test-secret";
process.env.NEXT_PUBLIC_LIVEKIT_URL = "wss://test.livekit.cloud";

const { POST } = await import("../route");

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/livekit/token", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/livekit/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when appointment status is cancelled", async () => {
    mockAuth.mockResolvedValue({
      userId: "slp-user-123",
      getToken: vi.fn().mockResolvedValue("mock-convex-token"),
    });
    mockQuery.mockResolvedValue({
      _id: "appt-1",
      slpId: "slp-user-123",
      patientId: "patient-1",
      status: "cancelled",
    });

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("not joinable");
  });

  it("returns 403 when appointment status is completed", async () => {
    mockAuth.mockResolvedValue({
      userId: "slp-user-123",
      getToken: vi.fn().mockResolvedValue("mock-convex-token"),
    });
    mockQuery.mockResolvedValue({
      _id: "appt-1",
      slpId: "slp-user-123",
      patientId: "patient-1",
      status: "completed",
    });

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("not joinable");
  });

  it("returns 403 when user has no relationship to appointment", async () => {
    mockAuth.mockResolvedValue({
      userId: "random-user-999",
      getToken: vi.fn().mockResolvedValue("mock-convex-token"),
    });
    // appointments.get calls assertPatientAccess internally — it throws for
    // unauthorized users. The route's catch block maps this to 403.
    mockQuery.mockRejectedValueOnce(new Error("Not authorized"));

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Not authorized");
  });

  it("returns token when user is the SLP", async () => {
    mockAuth.mockResolvedValue({
      userId: "slp-user-123",
      getToken: vi.fn().mockResolvedValue("mock-convex-token"),
    });
    mockQuery.mockResolvedValue({
      _id: "appt-1",
      slpId: "slp-user-123",
      patientId: "patient-1",
      status: "scheduled",
    });

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBe("mock-jwt-token");
  });

  it("returns token when user is accepted caregiver", async () => {
    mockAuth.mockResolvedValue({
      userId: "caregiver-789",
      getToken: vi.fn().mockResolvedValue("mock-convex-token"),
    });
    mockQuery
      .mockResolvedValueOnce({
        _id: "appt-1",
        slpId: "slp-user-123",
        patientId: "patient-1",
        status: "in-progress",
      })
      .mockResolvedValueOnce({
        _id: "link-1",
        caregiverUserId: "caregiver-789",
        patientId: "patient-1",
        inviteStatus: "accepted",
      });

    const res = await POST(makeRequest({ appointmentId: "appt-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBe("mock-jwt-token");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run src/app/api/livekit/token/__tests__/route.test.ts`
Expected: FAIL — "not joinable" check and caregiver link check do not exist yet

- [ ] **Step 3: Commit test file**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/app/api/livekit/token/__tests__/route.test.ts && git commit -m "test(livekit): add failing tests for token route authorization"`

---

## Task 2: LiveKit Token Route — Implementation

**Files:**
- Modify: `src/app/api/livekit/token/route.ts:1-58`

> **Note:** An earlier draft of this plan created `convex/caregiverLinkQueries.ts`. That approach was abandoned — `api.appointments.get` already calls `assertPatientAccess` which handles authorization. Do NOT create `caregiverLinkQueries.ts`.

- [ ] **Step 1: Create the internal caregiver link query**

```typescript
// convex/caregiverLinkQueries.ts
import { v } from "convex/values";

import { internalQuery } from "./_generated/server";

/** Internal query: check if a user has an accepted caregiver link to a patient.
 *  Used by the LiveKit token route (via ConvexHttpClient) to authorize call join. */
export const getAcceptedLink = internalQuery({
  args: {
    caregiverUserId: v.string(),
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("caregiverLinks")
      .withIndex("by_caregiverUserId_patientId", (q) =>
        q
          .eq("caregiverUserId", args.caregiverUserId)
          .eq("patientId", args.patientId)
      )
      .first();

    if (!link || link.inviteStatus !== "accepted") return null;
    return { _id: link._id, caregiverUserId: link.caregiverUserId, patientId: link.patientId, inviteStatus: link.inviteStatus };
  },
});
```

Note: Internal queries cannot be called from `ConvexHttpClient` (which only reaches public functions). We need a public query here. However, the existing `appointments.get` already does `assertPatientAccess`, which checks both SLP and caregiver. The LiveKit route already calls `appointments.get` which will throw for unauthorized users. The gap is **status checking** and the fact that the existing route catches the error generically. Let's fix the route to use the existing `appointments.get` properly and add status gating:

**Revised approach:** The existing `api.appointments.get` already checks patient access (SLP or accepted caregiver). The security fix needs to:
1. Check appointment status after fetching
2. Not swallow the 403 from `appointments.get` — distinguish "not found" from "not authorized"

- [ ] **Step 1 (revised): Write the implementation**

Replace `src/app/api/livekit/token/route.ts` entirely:

```typescript
// src/app/api/livekit/token/route.ts
import { AccessToken } from "livekit-server-sdk";

import { authenticate } from "@/app/api/generate/lib/authenticate";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

/** Appointment statuses that allow issuing a LiveKit room token. */
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

  // appointments.get calls assertPatientAccess — only the owning SLP
  // or an accepted caregiver for the patient can read the appointment.
  let appointment;
  try {
    appointment = await convex.query(api.appointments.get, {
      appointmentId: appointmentId as Id<"appointments">,
    });
  } catch (err) {
    console.error(
      "[livekit/token] Convex query failed — userId:",
      userId,
      "appointmentId:",
      appointmentId,
      "error:",
      err,
    );
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (!appointment) {
    return Response.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Status gate: only scheduled or in-progress appointments can be joined.
  if (!JOINABLE_STATUSES.has(appointment.status)) {
    return Response.json(
      {
        error: `Appointment is ${appointment.status} and not joinable`,
      },
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

- [ ] **Step 2: Run tests to verify they pass**
Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run src/app/api/livekit/token/__tests__/route.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 3: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/app/api/livekit/token/route.ts && git commit -m "fix(security): add status + authorization checks to LiveKit token route"`

---

## Task 3: Schema — Add `intakeForms` and `practiceProfiles` tables, extend `caregiverLinks` and `activityLog`

**Files:**
- Modify: `convex/schema.ts:198-214` (caregiverLinks — add `intakeCompletedAt`)
- Modify: `convex/schema.ts:227-251` (activityLog — add `"intake-form-signed"` literal)
- Modify: `convex/schema.ts:596-611` (after `childApps` table, before closing — add new tables)

- [ ] **Step 1: Add `intakeCompletedAt` to `caregiverLinks`**

In `convex/schema.ts`, after `kidModePIN: v.optional(v.string()),` (line 209), add:

```typescript
    intakeCompletedAt: v.optional(v.number()),
```

- [ ] **Step 2: Add `"intake-form-signed"` to `activityLog.action` union**

In `convex/schema.ts`, after `v.literal("home-program-assigned")` (line 247), add:

```typescript
      v.literal("intake-form-signed"),
      v.literal("telehealth-consent-signed"),
```

- [ ] **Step 3: Add `intakeForms` and `practiceProfiles` tables**

In `convex/schema.ts`, before the closing `});` (line 608), add:

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
    metadata: v.optional(v.object({
      thirdPartyName: v.optional(v.string()),
    })),
  })
    .index("by_patientId", ["patientId"])
    .index("by_caregiverUserId", ["caregiverUserId"])
    .index("by_patientId_formType", ["patientId", "formType"]),

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
  }).index("by_userId", ["userId"]),
```

- [ ] **Step 4: Run Convex push to validate schema**
Run: `cd /Users/desha/Springfield-Vibeathon && npx convex dev --once`
Expected: Schema validated, no errors

- [ ] **Step 5: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add convex/schema.ts && git commit -m "schema: add intakeForms, practiceProfiles tables; extend caregiverLinks + activityLog"`

---

## Task 4: Backend — `convex/practiceProfile.ts`

**Files:**
- Create: `convex/practiceProfile.ts`
- Create: `convex/__tests__/practiceProfile.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// convex/__tests__/practiceProfile.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const CAREGIVER_IDENTITY = {
  subject: "caregiver-789",
  issuer: "clerk",
  public_metadata: JSON.stringify({ role: "caregiver" }),
};

describe("practiceProfile.update", () => {
  it("creates a new practice profile for SLP", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.practiceProfile.update, {
      practiceName: "Springfield Speech Center",
      npiNumber: "1234567890",
      credentials: "M.S., CCC-SLP",
    });

    const profile = await slp.query(api.practiceProfile.get, {});
    expect(profile).not.toBeNull();
    expect(profile!.practiceName).toBe("Springfield Speech Center");
    expect(profile!.npiNumber).toBe("1234567890");
    expect(profile!.credentials).toBe("M.S., CCC-SLP");
  });

  it("updates an existing practice profile", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.practiceProfile.update, {
      practiceName: "Old Name",
    });
    await slp.mutation(api.practiceProfile.update, {
      practiceName: "New Name",
      licenseState: "IL",
    });

    const profile = await slp.query(api.practiceProfile.get, {});
    expect(profile!.practiceName).toBe("New Name");
    expect(profile!.licenseState).toBe("IL");
  });

  it("rejects caregiver users", async () => {
    const t = convexTest(schema, modules);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await expect(
      caregiver.mutation(api.practiceProfile.update, {
        practiceName: "Hacker Practice",
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

describe("practiceProfile.getBySlpId", () => {
  it("returns profile for given SLP user ID", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.practiceProfile.update, {
      practiceName: "Springfield Speech Center",
    });

    const profile = await t.query(api.practiceProfile.getBySlpId, {
      slpUserId: "slp-user-123",
    });
    expect(profile).not.toBeNull();
    expect(profile!.practiceName).toBe("Springfield Speech Center");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/practiceProfile.test.ts`
Expected: FAIL — `api.practiceProfile` does not exist

- [ ] **Step 3: Write the implementation**

```typescript
// convex/practiceProfile.ts
import { v } from "convex/values";

import { query } from "./_generated/server";
import { slpMutation, slpQuery } from "./lib/customFunctions";

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
    const existing = await ctx.db
      .query("practiceProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.slpUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("practiceProfiles", {
        userId: ctx.slpUserId,
        ...args,
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

export const getBySlpId = query({
  args: { slpUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("practiceProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.slpUserId))
      .first();
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**
Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/practiceProfile.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Regenerate Convex types**

Run: `cd /Users/desha/Springfield-Vibeathon && npx convex dev --once`
Expected: `practiceProfile` functions registered in `_generated/api.ts`. This is required before any frontend tasks that import `api.practiceProfile`.

- [ ] **Step 6: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add convex/practiceProfile.ts convex/__tests__/practiceProfile.test.ts && git commit -m "feat(backend): add practiceProfile CRUD with tests"`

---

## Task 5: Backend — `convex/intakeForms.ts` (mutations)

**Files:**
- Create: `convex/intakeForms.ts`
- Create: `convex/__tests__/intakeForms.test.ts`

- [ ] **Step 1: Write the failing test for `signForm`**

```typescript
// convex/__tests__/intakeForms.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const CAREGIVER_IDENTITY = { subject: "caregiver-789", issuer: "clerk" };
const UNLINKED_USER = { subject: "random-user-999", issuer: "clerk" };

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

  await t.withIdentity(CAREGIVER_IDENTITY).mutation(api.caregivers.acceptInvite, { token });

  return patientId;
}

describe("intakeForms.signForm", () => {
  it("signs a HIPAA NPP form for a linked patient", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.intakeForms.signForm, {
      patientId,
      formType: "hipaa-npp",
      signerName: "Jane Smith",
    });

    const forms = await caregiver.query(api.intakeForms.getByCaregiver, { patientId });
    expect(forms).toHaveLength(1);
    expect(forms[0].formType).toBe("hipaa-npp");
    expect(forms[0].signerName).toBe("Jane Smith");
  });

  it("rejects unlinked user", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);

    await expect(
      t.withIdentity(UNLINKED_USER).mutation(api.intakeForms.signForm, {
        patientId,
        formType: "hipaa-npp",
        signerName: "Hacker McHackface",
      })
    ).rejects.toThrow("Not authorized");
  });

  it("sets intakeCompletedAt when all 4 required forms are signed", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

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
        signerName: "Jane Smith",
      });
    }

    // Check that intakeCompletedAt was set on the caregiver link
    const links = await t.withIdentity(SLP_IDENTITY).query(api.caregivers.listByPatient, { patientId });
    const acceptedLink = links.find(
      (l: { caregiverUserId?: string }) => l.caregiverUserId === "caregiver-789"
    );
    expect(acceptedLink?.intakeCompletedAt).toBeTypeOf("number");
  });

  it("does not set intakeCompletedAt with only 3 forms signed", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const partialForms = ["hipaa-npp", "consent-treatment", "financial-agreement"] as const;
    for (const formType of partialForms) {
      await caregiver.mutation(api.intakeForms.signForm, {
        patientId,
        formType,
        signerName: "Jane Smith",
      });
    }

    const links = await t.withIdentity(SLP_IDENTITY).query(api.caregivers.listByPatient, { patientId });
    const acceptedLink = links.find(
      (l: { caregiverUserId?: string }) => l.caregiverUserId === "caregiver-789"
    );
    expect(acceptedLink?.intakeCompletedAt).toBeUndefined();
  });
});

describe("intakeForms.signTelehealthConsent", () => {
  it("signs telehealth consent for a linked patient", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.intakeForms.signTelehealthConsent, {
      patientId,
      signerName: "Jane Smith",
    });

    const hasTelehealth = await caregiver.query(api.intakeForms.hasTelehealthConsent, { patientId });
    expect(hasTelehealth).toBe(true);
  });
});

describe("intakeForms.getByPatient", () => {
  it("returns all forms for a patient (SLP view)", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    await caregiver.mutation(api.intakeForms.signForm, {
      patientId,
      formType: "hipaa-npp",
      signerName: "Jane Smith",
    });
    await caregiver.mutation(api.intakeForms.signForm, {
      patientId,
      formType: "consent-treatment",
      signerName: "Jane Smith",
    });

    const slp = t.withIdentity(SLP_IDENTITY);
    const forms = await slp.query(api.intakeForms.getByPatient, { patientId });
    expect(forms).toHaveLength(2);
  });
});

describe("intakeForms.hasTelehealthConsent", () => {
  it("returns false when no telehealth consent exists", async () => {
    const t = convexTest(schema, modules);
    const patientId = await setupPatientWithCaregiver(t);
    const caregiver = t.withIdentity(CAREGIVER_IDENTITY);

    const result = await caregiver.query(api.intakeForms.hasTelehealthConsent, { patientId });
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/intakeForms.test.ts`
Expected: FAIL — `api.intakeForms` does not exist

- [ ] **Step 3: Write the implementation**

```typescript
// convex/intakeForms.ts
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { authedQuery, authedMutation } from "./lib/customFunctions";
import { assertCaregiverAccess, assertPatientAccess } from "./lib/auth";

const formTypeValidator = v.union(
  v.literal("hipaa-npp"),
  v.literal("consent-treatment"),
  v.literal("financial-agreement"),
  v.literal("cancellation-policy"),
  v.literal("release-authorization"),
  v.literal("telehealth-consent")
);

/** The 4 forms required for intake completion. */
const REQUIRED_INTAKE_FORMS = [
  "hipaa-npp",
  "consent-treatment",
  "financial-agreement",
  "cancellation-policy",
] as const;

export const signForm = authedMutation({
  args: {
    patientId: v.id("patients"),
    formType: formTypeValidator,
    signerName: v.string(),
    signerIP: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        thirdPartyName: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertCaregiverAccess(ctx, args.patientId);

    const trimmedName = args.signerName.trim();
    if (trimmedName.length < 2) {
      throw new ConvexError("Signer name must be at least 2 characters");
    }

    await ctx.db.insert("intakeForms", {
      patientId: args.patientId,
      caregiverUserId: ctx.userId,
      formType: args.formType,
      signedAt: Date.now(),
      signerName: trimmedName,
      signerIP: args.signerIP,
      formVersion: "1.0",
      metadata: args.metadata,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: ctx.userId,
      action: "intake-form-signed",
      details: `Signed ${args.formType}`,
      timestamp: Date.now(),
    });

    // Check if all 4 required intake forms are now complete for this caregiver + patient
    await checkAndSetIntakeCompletion(ctx, args.patientId, ctx.userId);
  },
});

export const signTelehealthConsent = authedMutation({
  args: {
    patientId: v.id("patients"),
    signerName: v.string(),
    signerIP: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertCaregiverAccess(ctx, args.patientId);

    const trimmedName = args.signerName.trim();
    if (trimmedName.length < 2) {
      throw new ConvexError("Signer name must be at least 2 characters");
    }

    // Check if already signed
    const existing = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId_formType", (q) =>
        q.eq("patientId", args.patientId).eq("formType", "telehealth-consent")
      )
      .first();

    if (existing && existing.caregiverUserId === ctx.userId) {
      return; // idempotent
    }

    await ctx.db.insert("intakeForms", {
      patientId: args.patientId,
      caregiverUserId: ctx.userId,
      formType: "telehealth-consent",
      signedAt: Date.now(),
      signerName: trimmedName,
      signerIP: args.signerIP,
      formVersion: "1.0",
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: ctx.userId,
      action: "telehealth-consent-signed",
      details: "Signed telehealth consent",
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
    await assertCaregiverAccess(ctx, args.patientId);

    const allForms = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    return allForms.filter((f) => f.caregiverUserId === ctx.userId);
  },
});

export const hasTelehealthConsent = authedQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.userId) return false;

    const form = await ctx.db
      .query("intakeForms")
      .withIndex("by_patientId_formType", (q) =>
        q.eq("patientId", args.patientId).eq("formType", "telehealth-consent")
      )
      .first();

    if (!form) return false;
    return form.caregiverUserId === ctx.userId;
  },
});

async function checkAndSetIntakeCompletion(
  ctx: { db: any; userId: string },
  patientId: any,
  caregiverUserId: string,
) {
  const allForms = await ctx.db
    .query("intakeForms")
    .withIndex("by_patientId", (q: any) => q.eq("patientId", patientId))
    .collect();

  const caregiverForms = allForms.filter(
    (f: { caregiverUserId: string }) => f.caregiverUserId === caregiverUserId
  );

  const signedTypes = new Set(
    caregiverForms.map((f: { formType: string }) => f.formType)
  );

  const allRequired = REQUIRED_INTAKE_FORMS.every((ft) => signedTypes.has(ft));
  if (!allRequired) return;

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
```

- [ ] **Step 4: Run tests to verify they pass**
Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/intakeForms.test.ts`
Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add convex/intakeForms.ts convex/__tests__/intakeForms.test.ts && git commit -m "feat(backend): add intakeForms CRUD with intake completion logic and tests"`

---

## Task 6: Form Content Library

**Files:**
- Create: `src/features/intake/lib/form-content.ts`

- [ ] **Step 1: Create the form content module**

```typescript
// src/features/intake/lib/form-content.ts

export interface PracticeInfo {
  practiceName: string;
  practiceAddress: string;
  practicePhone: string;
  slpName: string;
  credentials: string;
}

export interface FormSection {
  heading: string;
  body: string;
}

export interface FormTemplate {
  title: string;
  sections: FormSection[];
  disclaimer: string;
}

const DEFAULT_DISCLAIMER =
  "This is a template document. Consult your legal counsel to ensure compliance with your state's specific requirements.";

export type IntakeFormType =
  | "hipaa-npp"
  | "consent-treatment"
  | "financial-agreement"
  | "cancellation-policy"
  | "release-authorization"
  | "telehealth-consent";

export const REQUIRED_INTAKE_FORMS: IntakeFormType[] = [
  "hipaa-npp",
  "consent-treatment",
  "financial-agreement",
  "cancellation-policy",
];

export function getFormTemplate(
  formType: IntakeFormType,
  practice: PracticeInfo,
  patientName: string,
  thirdPartyName?: string,
): FormTemplate {
  switch (formType) {
    case "hipaa-npp":
      return getHipaaNpp(practice);
    case "consent-treatment":
      return getConsentTreatment(practice, patientName);
    case "financial-agreement":
      return getFinancialAgreement(practice);
    case "cancellation-policy":
      return getCancellationPolicy(practice);
    case "release-authorization":
      return getReleaseAuthorization(practice, patientName, thirdPartyName ?? "[Third Party]");
    case "telehealth-consent":
      return getTelehealthConsent(practice, patientName);
  }
}

export const FORM_LABELS: Record<IntakeFormType, string> = {
  "hipaa-npp": "HIPAA Notice of Privacy Practices",
  "consent-treatment": "Consent for Evaluation and Treatment",
  "financial-agreement": "Financial Agreement",
  "cancellation-policy": "Cancellation Policy",
  "release-authorization": "Release of Information Authorization",
  "telehealth-consent": "Telehealth Informed Consent",
};

function getHipaaNpp(practice: PracticeInfo): FormTemplate {
  return {
    title: "Notice of Privacy Practices (HIPAA)",
    sections: [
      {
        heading: "Your Information. Your Rights. Our Responsibilities.",
        body: `${practice.practiceName} is committed to protecting your health information. This notice describes how medical information about you or your child may be used and disclosed, and how you can access this information.`,
      },
      {
        heading: "How We Use and Disclose Your Information",
        body: "We may use and disclose your protected health information (PHI) for the following purposes: Treatment — to provide and coordinate speech-language pathology services. Payment — to bill and collect payment for services provided. Healthcare Operations — to improve quality of care, train staff, and conduct business planning. We will not use or disclose your PHI for any other purpose without your written authorization.",
      },
      {
        heading: "Your Rights",
        body: "You have the right to: (1) Request a copy of your health records. (2) Request corrections to your health information. (3) Request restrictions on certain uses and disclosures. (4) Request confidential communications. (5) Receive a list of disclosures we have made. (6) File a complaint if you believe your privacy rights have been violated. Complaints may be filed with us or with the U.S. Department of Health and Human Services.",
      },
      {
        heading: "Our Responsibilities",
        body: "We are required by law to: maintain the privacy of your PHI, provide you with this notice of our legal duties and privacy practices, and notify you following a breach of unsecured PHI. We will not use or share your information other than as described here unless you tell us we can in writing.",
      },
      {
        heading: "Contact Information",
        body: `Privacy Officer: ${practice.slpName}, ${practice.credentials}\n${practice.practiceName}\n${practice.practiceAddress}\n${practice.practicePhone}`,
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function getConsentTreatment(practice: PracticeInfo, patientName: string): FormTemplate {
  return {
    title: "Consent for Evaluation and Treatment",
    sections: [
      {
        heading: "Authorization",
        body: `I authorize ${practice.slpName}, ${practice.credentials}, of ${practice.practiceName} to evaluate and provide speech-language pathology services to ${patientName}.`,
      },
      {
        heading: "Scope of Services",
        body: "Services may include, but are not limited to: speech-language evaluation, articulation therapy, language therapy, fluency intervention, voice therapy, augmentative and alternative communication (AAC) assessment and training, feeding/swallowing therapy, and cognitive-communication therapy.",
      },
      {
        heading: "Risks and Benefits",
        body: "Benefits may include improved communication skills. Risks are minimal but may include temporary frustration during challenging tasks. The clinician will use evidence-based practices and adjust treatment as needed.",
      },
      {
        heading: "Right to Withdraw",
        body: "I understand that I may withdraw consent and discontinue treatment at any time by providing written or verbal notice.",
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function getFinancialAgreement(practice: PracticeInfo): FormTemplate {
  return {
    title: "Financial Agreement",
    sections: [
      {
        heading: "Payment Terms",
        body: `${practice.practiceName} provides speech-language pathology services. Payment is due at the time of service unless other arrangements have been made. We accept payment via credit card, debit card, HSA/FSA, and electronic transfer.`,
      },
      {
        heading: "Insurance",
        body: "If you plan to use insurance, you are responsible for verifying your coverage and benefits prior to treatment. We will provide documentation (superbills) to support your insurance claims. You are responsible for any balance not covered by your insurance, including deductibles, co-pays, and co-insurance.",
      },
      {
        heading: "No Surprises Act — Good Faith Estimate",
        body: "Under the No Surprises Act, you have the right to receive a Good Faith Estimate explaining how much your medical care will cost. You can ask your healthcare provider for a Good Faith Estimate before you schedule a service. If you receive a bill that is at least $400 more than your Good Faith Estimate, you can dispute the bill.",
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function getCancellationPolicy(practice: PracticeInfo): FormTemplate {
  return {
    title: "Cancellation and No-Show Policy",
    sections: [
      {
        heading: "Required Notice",
        body: `${practice.practiceName} requires at least 24 hours' notice for cancellations. This allows us to offer the time slot to another family.`,
      },
      {
        heading: "Late Cancellation and No-Show",
        body: "Cancellations with less than 24 hours' notice or no-shows may be subject to a fee. Repeated late cancellations or no-shows may result in schedule changes or discharge from services.",
      },
      {
        heading: "How to Cancel",
        body: `To cancel or reschedule, please contact us at ${practice.practicePhone} or through the Bridges app messaging feature.`,
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function getReleaseAuthorization(
  practice: PracticeInfo,
  patientName: string,
  thirdPartyName: string,
): FormTemplate {
  return {
    title: "Authorization for Release of Information",
    sections: [
      {
        heading: "Authorization",
        body: `I authorize ${practice.practiceName} to exchange information regarding ${patientName}'s speech-language pathology evaluation and treatment with: ${thirdPartyName}.`,
      },
      {
        heading: "Information to be Released",
        body: "This may include: evaluation reports, treatment plans, progress notes, and relevant clinical data pertaining to speech-language services.",
      },
      {
        heading: "Purpose",
        body: "The purpose of this release is to coordinate care and ensure continuity of services for the patient.",
      },
      {
        heading: "Expiration",
        body: "This authorization expires one (1) year from the date of signing. You may revoke this authorization at any time by providing written notice.",
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function getTelehealthConsent(practice: PracticeInfo, patientName: string): FormTemplate {
  return {
    title: "Telehealth Informed Consent",
    sections: [
      {
        heading: "Description of Telehealth",
        body: `Telehealth involves the delivery of speech-language pathology services by ${practice.slpName}, ${practice.credentials}, via live video conferencing technology. This includes evaluation, therapy, and consultation.`,
      },
      {
        heading: "Risks and Limitations",
        body: "Telehealth services may be limited by technology — poor internet connection, audio/video quality, or equipment failure may interrupt sessions. Some assessments and interventions may not be appropriate for telehealth delivery. In such cases, in-person sessions will be recommended.",
      },
      {
        heading: "Technology Requirements",
        body: "You will need a device with a camera, microphone, and speaker, plus a stable internet connection. Sessions will be conducted through the Bridges platform, which uses encrypted video conferencing.",
      },
      {
        heading: "Emergency Protocols",
        body: `In case of a medical or behavioral emergency during a telehealth session, please call 911. Please have your physical address available at the start of each session in case emergency services need to be dispatched. ${patientName} should not be left unattended during telehealth sessions.`,
      },
      {
        heading: "Voluntary Participation",
        body: "Participation in telehealth is voluntary. You may opt out of telehealth services at any time and request in-person sessions instead.",
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}
```

- [ ] **Step 2: Verify the file compiles**
Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit src/features/intake/lib/form-content.ts 2>&1 | head -20`
Expected: No errors (or only unrelated project-wide errors)

- [ ] **Step 3: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/intake/lib/form-content.ts && git commit -m "feat(intake): add parameterized legal form content templates"`

---

## Task 7: Intake Hook — `use-intake-forms.ts`

**Files:**
- Create: `src/features/intake/hooks/use-intake-forms.ts`

- [ ] **Step 1: Write the hook**

```typescript
// src/features/intake/hooks/use-intake-forms.ts
"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { REQUIRED_INTAKE_FORMS, type IntakeFormType } from "../lib/form-content";

export function useIntakeForms(patientId: Id<"patients">) {
  const caregiverForms = useQuery(api.intakeForms.getByCaregiver, { patientId });
  const signFormMutation = useMutation(api.intakeForms.signForm);
  const signTelehealthMutation = useMutation(api.intakeForms.signTelehealthConsent);

  const signedTypes = new Set(
    caregiverForms?.map((f) => f.formType) ?? [],
  );

  const isFormSigned = (formType: IntakeFormType) => signedTypes.has(formType);

  const requiredFormProgress = {
    signed: REQUIRED_INTAKE_FORMS.filter((ft) => signedTypes.has(ft)).length,
    total: REQUIRED_INTAKE_FORMS.length,
    isComplete: REQUIRED_INTAKE_FORMS.every((ft) => signedTypes.has(ft)),
  };

  const nextUnsignedForm = REQUIRED_INTAKE_FORMS.find(
    (ft) => !signedTypes.has(ft),
  );

  async function signForm(
    formType: IntakeFormType,
    signerName: string,
    signerIP?: string,
    metadata?: { thirdPartyName?: string },
  ) {
    await signFormMutation({
      patientId,
      formType,
      signerName,
      signerIP,
      metadata,
    });
  }

  async function signTelehealthConsent(signerName: string, signerIP?: string) {
    await signTelehealthMutation({
      patientId,
      signerName,
      signerIP,
    });
  }

  return {
    forms: caregiverForms ?? [],
    isLoading: caregiverForms === undefined,
    isFormSigned,
    requiredFormProgress,
    nextUnsignedForm,
    signForm,
    signTelehealthConsent,
  };
}

export function useIntakeStatus(patientId: Id<"patients">) {
  const allForms = useQuery(api.intakeForms.getByPatient, { patientId });

  return {
    forms: allForms ?? [],
    isLoading: allForms === undefined,
  };
}

export function useTelehealthConsent(patientId: Id<"patients">) {
  const hasConsent = useQuery(api.intakeForms.hasTelehealthConsent, { patientId });
  const signMutation = useMutation(api.intakeForms.signTelehealthConsent);

  return {
    hasConsent: hasConsent ?? false,
    isLoading: hasConsent === undefined,
    signConsent: async (signerName: string, signerIP?: string) => {
      await signMutation({ patientId, signerName, signerIP });
    },
  };
}
```

- [ ] **Step 2: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/intake/hooks/use-intake-forms.ts && git commit -m "feat(intake): add useIntakeForms, useIntakeStatus, useTelehealthConsent hooks"`

---

## Task 8: Intake Form Renderer Component

**Files:**
- Create: `src/features/intake/components/intake-form-renderer.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/features/intake/components/intake-form-renderer.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import type { FormTemplate } from "../lib/form-content";

interface IntakeFormRendererProps {
  template: FormTemplate;
  alreadySigned: boolean;
  signedAt?: number;
  onSign: (signerName: string) => Promise<void>;
}

export function IntakeFormRenderer({
  template,
  alreadySigned,
  signedAt,
  onSign,
}: IntakeFormRendererProps) {
  const [signerName, setSignerName] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSign = signerName.trim().length >= 2 && acknowledged && !isSubmitting;

  async function handleSign() {
    if (!canSign) return;
    setIsSubmitting(true);
    try {
      await onSign(signerName.trim());
      toast.success("Form signed successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sign form",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (alreadySigned) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="font-headline text-xl font-bold text-foreground">
          {template.title}
        </h2>
        <div className="rounded-xl bg-success/10 p-4 text-sm text-success">
          Signed on{" "}
          {signedAt
            ? new Date(signedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "a previous date"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-headline text-xl font-bold text-foreground">
        {template.title}
      </h2>

      <div className="flex flex-col gap-4 rounded-xl bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
        {template.sections.map((section, i) => (
          <div key={i}>
            <h3 className="mb-1 font-semibold text-foreground">
              {section.heading}
            </h3>
            <p className="whitespace-pre-line text-muted-foreground">
              {section.body}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs italic text-muted-foreground">
        {template.disclaimer}
      </p>

      <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
        <div>
          <Label htmlFor="signer-name" className="text-sm font-medium">
            Full Legal Name
          </Label>
          <Input
            id="signer-name"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Type your full legal name"
            className="mt-1"
          />
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="acknowledge"
            checked={acknowledged}
            onCheckedChange={(checked) =>
              setAcknowledged(checked === true)
            }
          />
          <Label htmlFor="acknowledge" className="text-sm leading-snug">
            I acknowledge that I have read and understand this document, and I agree
            to its terms.
          </Label>
        </div>

        <Button
          onClick={handleSign}
          disabled={!canSign}
          className="w-full bg-gradient-to-br from-primary to-[#0d7377]"
          size="lg"
        >
          {isSubmitting ? "Signing..." : "Sign Document"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/intake/components/intake-form-renderer.tsx && git commit -m "feat(intake): add IntakeFormRenderer component"`

---

## Task 9: Intake Flow Stepper Component

**Files:**
- Create: `src/features/intake/components/intake-flow.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/features/intake/components/intake-flow.tsx
"use client";

import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useIntakeForms } from "../hooks/use-intake-forms";
import {
  FORM_LABELS,
  REQUIRED_INTAKE_FORMS,
  getFormTemplate,
  type IntakeFormType,
  type PracticeInfo,
} from "../lib/form-content";
import { IntakeFormRenderer } from "./intake-form-renderer";

interface IntakeFlowProps {
  patientId: Id<"patients">;
}

const DEFAULT_PRACTICE: PracticeInfo = {
  practiceName: "Your Therapist's Practice",
  practiceAddress: "",
  practicePhone: "",
  slpName: "Your Therapist",
  credentials: "SLP",
};

export function IntakeFlow({ patientId }: IntakeFlowProps) {
  const { isAuthenticated } = useConvexAuth();
  const patient = useQuery(
    api.patients.get,
    isAuthenticated ? { patientId } : "skip",
  );
  const practiceProfile = useQuery(
    api.practiceProfile.getBySlpId,
    patient ? { slpUserId: patient.slpUserId } : "skip",
  );

  const { forms, isLoading, isFormSigned, requiredFormProgress, signForm } =
    useIntakeForms(patientId);

  const [currentIndex, setCurrentIndex] = useState(0);

  if (isLoading || patient === undefined) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (patient === null) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-muted-foreground">Patient not found.</p>
      </div>
    );
  }

  if (requiredFormProgress.isComplete) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <MaterialIcon icon="check_circle" className="text-4xl text-success" />
          </div>
        </div>
        <h1 className="font-headline text-2xl font-bold text-foreground">
          Intake Complete
        </h1>
        <p className="mt-2 text-muted-foreground">
          All required forms for {patient.firstName} have been signed. Thank you!
        </p>
      </div>
    );
  }

  const practice: PracticeInfo = practiceProfile
    ? {
        practiceName: practiceProfile.practiceName ?? DEFAULT_PRACTICE.practiceName,
        practiceAddress: practiceProfile.practiceAddress ?? DEFAULT_PRACTICE.practiceAddress,
        practicePhone: practiceProfile.practicePhone ?? DEFAULT_PRACTICE.practicePhone,
        slpName: DEFAULT_PRACTICE.slpName,
        credentials: practiceProfile.credentials ?? DEFAULT_PRACTICE.credentials,
      }
    : DEFAULT_PRACTICE;

  const patientName = `${patient.firstName} ${patient.lastName}`;
  const currentFormType = REQUIRED_INTAKE_FORMS[currentIndex];
  const template = getFormTemplate(currentFormType, practice, patientName);
  const alreadySigned = isFormSigned(currentFormType);
  const signedForm = forms.find((f) => f.formType === currentFormType);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <h1 className="mb-2 font-headline text-2xl font-bold text-foreground">
        Intake Forms for {patient.firstName}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {requiredFormProgress.signed} of {requiredFormProgress.total} forms completed
      </p>

      {/* Step indicators */}
      <div className="mb-6 flex gap-2">
        {REQUIRED_INTAKE_FORMS.map((ft, i) => {
          const signed = isFormSigned(ft);
          const isCurrent = i === currentIndex;
          return (
            <button
              key={ft}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "flex h-2 flex-1 rounded-full transition-colors duration-300",
                signed
                  ? "bg-success"
                  : isCurrent
                    ? "bg-primary"
                    : "bg-muted",
              )}
              aria-label={`${FORM_LABELS[ft]} — ${signed ? "signed" : "not signed"}`}
            />
          );
        })}
      </div>

      <IntakeFormRenderer
        template={template}
        alreadySigned={alreadySigned}
        signedAt={signedForm?.signedAt}
        onSign={async (signerName) => {
          await signForm(currentFormType, signerName);
          // Auto-advance to next unsigned form
          const nextIndex = REQUIRED_INTAKE_FORMS.findIndex(
            (ft, i) => i > currentIndex && !isFormSigned(ft),
          );
          if (nextIndex !== -1) {
            setCurrentIndex(nextIndex);
          }
        }}
      />

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
        >
          <MaterialIcon icon="arrow_back" size="sm" />
          Previous
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={currentIndex === REQUIRED_INTAKE_FORMS.length - 1}
          onClick={() => setCurrentIndex((i) => i + 1)}
        >
          Next
          <MaterialIcon icon="arrow_forward" size="sm" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/intake/components/intake-flow.tsx && git commit -m "feat(intake): add IntakeFlow 4-step stepper component"`

---

## Task 10: Intake Route Page

**Files:**
- Create: `src/app/intake/[patientId]/page.tsx`

- [ ] **Step 1: Create the route page**

```tsx
// src/app/intake/[patientId]/page.tsx
import type { Metadata } from "next";

import { IntakeFlow } from "@/features/intake/components/intake-flow";
import type { Id } from "../../../../convex/_generated/dataModel";

export const metadata: Metadata = {
  title: "Complete Intake Forms — Bridges",
};

export default function IntakePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  // IntakeFlow is a client component, pass the promise
  return <IntakeFlowWrapper paramsPromise={params} />;
}

async function IntakeFlowWrapper({
  paramsPromise,
}: {
  paramsPromise: Promise<{ patientId: string }>;
}) {
  const { patientId } = await paramsPromise;
  return <IntakeFlow patientId={patientId as Id<"patients">} />;
}
```

Wait — `IntakeFlow` is `"use client"`. A Server Component can render a Client Component and pass props. But we need to await the params Promise in the Server Component. Let me fix:

```tsx
// src/app/intake/[patientId]/page.tsx
import type { Metadata } from "next";

import { IntakeFlow } from "@/features/intake/components/intake-flow";
import type { Id } from "../../../../convex/_generated/dataModel";

export const metadata: Metadata = {
  title: "Complete Intake Forms — Bridges",
};

export default async function IntakePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  return <IntakeFlow patientId={patientId as Id<"patients">} />;
}
```

- [ ] **Step 2: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/app/intake/[patientId]/page.tsx && git commit -m "feat(intake): add /intake/[patientId] caregiver route"`

---

## Task 11: Intake Status Widget (SLP-facing)

**Files:**
- Create: `src/features/intake/components/intake-status-widget.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/features/intake/components/intake-status-widget.tsx
"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useIntakeStatus } from "../hooks/use-intake-forms";
import { FORM_LABELS, REQUIRED_INTAKE_FORMS, type IntakeFormType } from "../lib/form-content";

interface IntakeStatusWidgetProps {
  patientId: Id<"patients">;
}

export function IntakeStatusWidget({ patientId }: IntakeStatusWidgetProps) {
  const { forms, isLoading } = useIntakeStatus(patientId);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return null;

  // Group forms by caregiver
  const signedTypes = new Set(forms.map((f) => f.formType));
  const requiredSigned = REQUIRED_INTAKE_FORMS.filter((ft) =>
    signedTypes.has(ft),
  );
  const isComplete = requiredSigned.length === REQUIRED_INTAKE_FORMS.length;

  const badgeColor = isComplete
    ? "bg-success/10 text-success"
    : "bg-caution/10 text-caution";
  const badgeLabel = isComplete
    ? "Intake complete"
    : `${requiredSigned.length}/${REQUIRED_INTAKE_FORMS.length} forms signed`;

  return (
    <div className="rounded-xl bg-surface-container-low p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon
            icon={isComplete ? "verified" : "pending"}
            className={isComplete ? "text-success" : "text-caution"}
          />
          <h3 className="text-sm font-semibold text-foreground">
            Intake Status
          </h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            badgeColor,
          )}
        >
          {badgeLabel}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide details" : "Show details"}
      </Button>

      {expanded && (
        <ul className="mt-3 flex flex-col gap-2">
          {REQUIRED_INTAKE_FORMS.map((ft) => {
            const form = forms.find((f) => f.formType === ft);
            const signed = !!form;
            return (
              <li key={ft} className="flex items-center gap-2 text-sm">
                <MaterialIcon
                  icon={signed ? "check_circle" : "radio_button_unchecked"}
                  size="sm"
                  className={signed ? "text-success" : "text-muted-foreground"}
                />
                <span className={signed ? "text-foreground" : "text-muted-foreground"}>
                  {FORM_LABELS[ft as IntakeFormType]}
                </span>
                {signed && form && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(form.signedAt).toLocaleDateString()}
                  </span>
                )}
              </li>
            );
          })}

          {/* Show telehealth consent separately if signed */}
          {forms.find((f) => f.formType === "telehealth-consent") && (
            <li className="flex items-center gap-2 text-sm">
              <MaterialIcon icon="check_circle" size="sm" className="text-success" />
              <span className="text-foreground">{FORM_LABELS["telehealth-consent"]}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(
                  forms.find((f) => f.formType === "telehealth-consent")!.signedAt,
                ).toLocaleDateString()}
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/intake/components/intake-status-widget.tsx && git commit -m "feat(intake): add IntakeStatusWidget for SLP patient detail page"`

---

## Task 12: Telehealth Consent Gate Component

**Files:**
- Create: `src/features/intake/components/telehealth-consent-gate.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/features/intake/components/telehealth-consent-gate.tsx
"use client";

import { useConvexAuth, useQuery } from "convex/react";

import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useTelehealthConsent } from "../hooks/use-intake-forms";
import {
  getFormTemplate,
  type PracticeInfo,
} from "../lib/form-content";
import { IntakeFormRenderer } from "./intake-form-renderer";

interface TelehealthConsentGateProps {
  patientId: Id<"patients">;
  children: React.ReactNode;
}

const DEFAULT_PRACTICE: PracticeInfo = {
  practiceName: "Your Therapist's Practice",
  practiceAddress: "",
  practicePhone: "",
  slpName: "Your Therapist",
  credentials: "SLP",
};

export function TelehealthConsentGate({
  patientId,
  children,
}: TelehealthConsentGateProps) {
  const { isAuthenticated } = useConvexAuth();
  const { hasConsent, isLoading, signConsent } =
    useTelehealthConsent(patientId);

  const patient = useQuery(
    api.patients.get,
    isAuthenticated ? { patientId } : "skip",
  );
  const practiceProfile = useQuery(
    api.practiceProfile.getBySlpId,
    patient ? { slpUserId: patient.slpUserId } : "skip",
  );

  if (isLoading || patient === undefined) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  if (hasConsent) {
    return <>{children}</>;
  }

  const practice: PracticeInfo = practiceProfile
    ? {
        practiceName: practiceProfile.practiceName ?? DEFAULT_PRACTICE.practiceName,
        practiceAddress: practiceProfile.practiceAddress ?? DEFAULT_PRACTICE.practiceAddress,
        practicePhone: practiceProfile.practicePhone ?? DEFAULT_PRACTICE.practicePhone,
        slpName: DEFAULT_PRACTICE.slpName,
        credentials: practiceProfile.credentials ?? DEFAULT_PRACTICE.credentials,
      }
    : DEFAULT_PRACTICE;

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "your child";

  const template = getFormTemplate("telehealth-consent", practice, patientName);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <p className="mb-4 text-sm text-muted-foreground">
        Before joining the video call, please review and sign the telehealth
        consent form.
      </p>
      <IntakeFormRenderer
        template={template}
        alreadySigned={false}
        onSign={async (signerName) => {
          await signConsent(signerName);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/intake/components/telehealth-consent-gate.tsx && git commit -m "feat(intake): add TelehealthConsentGate for call-join flow"`

---

## Task 13: Practice Profile Form Component

**Files:**
- Create: `src/features/intake/components/practice-profile-form.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/features/intake/components/practice-profile-form.tsx
"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { api } from "../../../../convex/_generated/api";

interface FormFields {
  practiceName: string;
  practiceAddress: string;
  practicePhone: string;
  npiNumber: string;
  licenseNumber: string;
  licenseState: string;
  taxId: string;
  credentials: string;
}

const EMPTY_FIELDS: FormFields = {
  practiceName: "",
  practiceAddress: "",
  practicePhone: "",
  npiNumber: "",
  licenseNumber: "",
  licenseState: "",
  taxId: "",
  credentials: "",
};

export function PracticeProfileForm() {
  const profile = useQuery(api.practiceProfile.get, {});
  const updateProfile = useMutation(api.practiceProfile.update);
  const [fields, setFields] = useState<FormFields>(EMPTY_FIELDS);
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setFields({
        practiceName: profile.practiceName ?? "",
        practiceAddress: profile.practiceAddress ?? "",
        practicePhone: profile.practicePhone ?? "",
        npiNumber: profile.npiNumber ?? "",
        licenseNumber: profile.licenseNumber ?? "",
        licenseState: profile.licenseState ?? "",
        taxId: profile.taxId ?? "",
        credentials: profile.credentials ?? "",
      });
      setInitialized(true);
    }
    // Initialize with empty if no profile exists
    if (profile === null && !initialized) {
      setInitialized(true);
    }
  }, [profile, initialized]);

  if (profile === undefined) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  function setField(key: keyof FormFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateProfile({
        practiceName: fields.practiceName || undefined,
        practiceAddress: fields.practiceAddress || undefined,
        practicePhone: fields.practicePhone || undefined,
        npiNumber: fields.npiNumber || undefined,
        licenseNumber: fields.licenseNumber || undefined,
        licenseState: fields.licenseState || undefined,
        taxId: fields.taxId || undefined,
        credentials: fields.credentials || undefined,
      });
      toast.success("Practice profile saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const FIELD_CONFIG: { key: keyof FormFields; label: string; placeholder: string }[] = [
    { key: "practiceName", label: "Practice Name", placeholder: "Springfield Speech Center" },
    { key: "practiceAddress", label: "Practice Address", placeholder: "123 Main St, Springfield, IL 62701" },
    { key: "practicePhone", label: "Phone Number", placeholder: "(217) 555-0100" },
    { key: "credentials", label: "Credentials", placeholder: "M.S., CCC-SLP" },
    { key: "npiNumber", label: "NPI Number", placeholder: "1234567890" },
    { key: "licenseNumber", label: "License Number", placeholder: "SLP-12345" },
    { key: "licenseState", label: "License State", placeholder: "IL" },
    { key: "taxId", label: "Tax ID (EIN)", placeholder: "12-3456789" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-headline text-lg font-semibold text-foreground">
          Practice Profile
        </h2>
        <p className="text-sm text-muted-foreground">
          This information appears on patient intake forms and legal documents.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELD_CONFIG.map(({ key, label, placeholder }) => (
          <div key={key} className={key === "practiceAddress" ? "sm:col-span-2" : ""}>
            <Label htmlFor={`practice-${key}`} className="text-sm font-medium">
              {label}
            </Label>
            <Input
              id={`practice-${key}`}
              value={fields[key]}
              onChange={(e) => setField(key, e.target.value)}
              placeholder={placeholder}
              className="mt-1"
            />
          </div>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-fit bg-gradient-to-br from-primary to-[#0d7377]"
      >
        {isSaving ? "Saving..." : "Save Practice Profile"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/intake/components/practice-profile-form.tsx && git commit -m "feat(intake): add PracticeProfileForm settings component"`

---

## Task 14: Integrate IntakeStatusWidget into Patient Detail Page

**Files:**
- Modify: `src/features/patients/components/patient-detail-page.tsx:1-73`

- [ ] **Step 1: Add IntakeStatusWidget import and render**

At the top of `patient-detail-page.tsx`, after the existing imports (line 19), add:

```typescript
import { IntakeStatusWidget } from "@/features/intake/components/intake-status-widget";
```

In the JSX, after `<PatientProfileWidget patient={patient} />` (line 54) and before the grid `<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">` (line 56), add:

```tsx
      <IntakeStatusWidget patientId={patient._id} />
```

- [ ] **Step 2: Verify no TypeScript errors**
Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep -i "patient-detail-page" | head -5`
Expected: No errors related to patient-detail-page

- [ ] **Step 3: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/patients/components/patient-detail-page.tsx && git commit -m "feat(intake): integrate IntakeStatusWidget into patient detail page"`

---

## Task 15: Integrate Intake Banner into Family Dashboard

**Files:**
- Modify: `src/features/family/components/family-dashboard.tsx:1-228`

- [ ] **Step 1: Add intake banner**

At the top of `family-dashboard.tsx`, after the existing imports (line 19, before `import { AppPicker }`), add:

```typescript
import { useIntakeForms } from "@/features/intake/hooks/use-intake-forms";
```

Inside the `FamilyDashboard` component, after the `useFamilyData` hook call (line 47-49) and before `const router = useRouter();` (line 51), add:

```typescript
  const { requiredFormProgress } = useIntakeForms(patientId as Id<"patients">);
```

In the JSX, after the `{/* Header */}` section closing `</div>` (line 99) and before the `{/* Kid Mode entry */}` comment (line 101), add:

```tsx
      {/* Intake banner */}
      {!requiredFormProgress.isComplete && (
        <Link
          href={`/intake/${patientId}`}
          className="flex items-center gap-3 rounded-xl bg-caution/10 p-4 transition-colors hover:bg-caution/15"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-caution/20">
            <MaterialIcon icon="description" className="text-caution" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              Complete intake forms for {childName}
            </p>
            <p className="text-xs text-muted-foreground">
              {requiredFormProgress.signed} of {requiredFormProgress.total} required forms signed
            </p>
          </div>
          <MaterialIcon icon="chevron_right" className="text-muted-foreground" />
        </Link>
      )}
```

- [ ] **Step 2: Verify no TypeScript errors**
Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep -i "family-dashboard" | head -5`
Expected: No errors related to family-dashboard

- [ ] **Step 3: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/family/components/family-dashboard.tsx && git commit -m "feat(intake): add intake banner to family dashboard"`

---

## Task 16: Integrate Telehealth Consent Gate into Call Page

**Files:**
- Modify: `src/features/sessions/components/call-page.tsx:1-70`

- [ ] **Step 1: Add consent gate**

At the top of `call-page.tsx`, after the existing imports (line 10), add:

```typescript
import { useConvexAuth, useQuery } from "convex/react";
import { TelehealthConsentGate } from "@/features/intake/components/telehealth-consent-gate";
```

Inside the `CallPage` component, after `const role = ...` (line 39) and before `const completeSession = ...` (line 41), add:

```typescript
  // Determine if the user is a caregiver — only caregivers need the consent gate
  const isCaregiver = role === "caregiver";

  // Resolve patientId from appointment for the consent gate
  const { isAuthenticated } = useConvexAuth();
  const appointment = useQuery(
    api.appointments.get,
    isAuthenticated ? { appointmentId: id as Id<"appointments"> } : "skip",
  );
```

Note: `useConvexAuth` is already imported via a separate import. We need to check. Looking at the existing file, it does not import `useConvexAuth` or `useQuery`. We need to add these. The file already imports `useMutation` from `convex/react`.

Replace the existing `import { useMutation } from "convex/react";` (line 6) with:

```typescript
import { useConvexAuth, useMutation, useQuery } from "convex/react";
```

After the `api` import line (line 8), ensure the `TelehealthConsentGate` import is present:

```typescript
import { TelehealthConsentGate } from "@/features/intake/components/telehealth-consent-gate";
```

In the JSX return, wrap the `<CallRoom>` with the consent gate for caregivers. Replace:

```tsx
  return (
    <CallRoom
      appointmentId={id}
      isSLP={isSLP}
      onCallEnd={handleCallEnd}
    />
  );
```

With:

```tsx
  if (isCaregiver && appointment?.patientId) {
    return (
      <TelehealthConsentGate patientId={appointment.patientId}>
        <CallRoom
          appointmentId={id}
          isSLP={isSLP}
          onCallEnd={handleCallEnd}
        />
      </TelehealthConsentGate>
    );
  }

  return (
    <CallRoom
      appointmentId={id}
      isSLP={isSLP}
      onCallEnd={handleCallEnd}
    />
  );
```

- [ ] **Step 2: Verify no TypeScript errors**
Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep -i "call-page" | head -5`
Expected: No errors related to call-page

- [ ] **Step 3: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/sessions/components/call-page.tsx && git commit -m "feat(intake): add telehealth consent gate before call lobby for caregivers"`

---

## Task 17: Integrate Practice Profile into Settings Page

**Files:**
- Modify: `src/features/settings/components/settings-page.tsx:1-114`
- Modify: `src/features/settings/components/settings-sidebar.tsx:1-64`

- [ ] **Step 1: Add "practice" section to SettingsSection type and sidebar**

In `settings-page.tsx`, update the `SettingsSection` type (line 16):

Replace:
```typescript
export type SettingsSection = "profile" | "account" | "appearance" | "billing";
```
With:
```typescript
export type SettingsSection = "profile" | "account" | "appearance" | "billing" | "practice";
```

Update `SECTION_LABELS` (lines 18-23):

Replace:
```typescript
const SECTION_LABELS: Record<SettingsSection, string> = {
  profile: "Profile",
  account: "Account",
  appearance: "Appearance",
  billing: "Billing",
};
```
With:
```typescript
const SECTION_LABELS: Record<SettingsSection, string> = {
  profile: "Profile",
  practice: "Practice",
  account: "Account",
  appearance: "Appearance",
  billing: "Billing",
};
```

Add the import at the top of `settings-page.tsx` (after the existing imports, line 11):

```typescript
import { PracticeProfileForm } from "@/features/intake/components/practice-profile-form";
```

In the JSX, after `{section === "billing" ? <BillingSection /> : null}` (line 109), add:

```tsx
          {section === "practice" ? <PracticeProfileForm /> : null}
```

- [ ] **Step 2: Add "practice" entry to sidebar**

In `settings-sidebar.tsx`, update the `SECTIONS` array (lines 11-16):

Replace:
```typescript
const SECTIONS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "account", label: "Account", icon: "shield" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "billing", label: "Billing", icon: "payments" },
];
```
With:
```typescript
const SECTIONS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "practice", label: "Practice", icon: "local_hospital" },
  { id: "account", label: "Account", icon: "shield" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "billing", label: "Billing", icon: "payments" },
];
```

- [ ] **Step 3: Verify no TypeScript errors**
Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | grep -i "settings" | head -5`
Expected: No errors related to settings files

- [ ] **Step 4: Commit**
Run: `cd /Users/desha/Springfield-Vibeathon && git add src/features/settings/components/settings-page.tsx src/features/settings/components/settings-sidebar.tsx && git commit -m "feat(intake): add Practice Profile section to settings page"`

---

## Task 18: Full Test Suite Verification

**Files:** (none — verification only)

- [ ] **Step 1: Run all Convex backend tests**
Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/ 2>&1 | tail -30`
Expected: All tests pass, including new intakeForms and practiceProfile tests

- [ ] **Step 2: Run full Vitest suite**
Run: `cd /Users/desha/Springfield-Vibeathon && npx vitest run 2>&1 | tail -30`
Expected: All tests pass (636+ existing tests plus new ones)

- [ ] **Step 3: Run TypeScript check**
Run: `cd /Users/desha/Springfield-Vibeathon && npx tsc --noEmit 2>&1 | tail -20`
Expected: No errors

- [ ] **Step 4: Run Convex push to validate all backend changes**
Run: `cd /Users/desha/Springfield-Vibeathon && npx convex dev --once`
Expected: Schema and functions deployed successfully

---

## Task Summary

| Task | Component | Files | Est. Time |
|------|-----------|-------|-----------|
| 1 | LiveKit token route tests | 1 create | 5 min |
| 2 | LiveKit token route fix | 1 modify | 5 min |
| 3 | Schema changes | 1 modify (3 locations) | 5 min |
| 4 | `practiceProfile.ts` backend | 1 create + 1 test | 10 min |
| 5 | `intakeForms.ts` backend | 1 create + 1 test | 15 min |
| 6 | Form content library | 1 create | 10 min |
| 7 | `useIntakeForms` hook | 1 create | 5 min |
| 8 | IntakeFormRenderer component | 1 create | 5 min |
| 9 | IntakeFlow stepper component | 1 create | 5 min |
| 10 | `/intake/[patientId]` route | 1 create | 3 min |
| 11 | IntakeStatusWidget | 1 create | 5 min |
| 12 | TelehealthConsentGate | 1 create | 5 min |
| 13 | PracticeProfileForm | 1 create | 5 min |
| 14 | Patient detail integration | 1 modify | 3 min |
| 15 | Family dashboard integration | 1 modify | 3 min |
| 16 | Call page integration | 1 modify | 5 min |
| 17 | Settings page integration | 2 modify | 5 min |
| 18 | Full test suite verification | 0 (verification) | 5 min |
| **Total** | | **13 create, 7 modify** | **~105 min** |
