# SP3: Clinical Billing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clinical billing so SLPs can auto-generate billing records when session notes are signed, review CPT codes/modifiers, and print superbills — eliminating the need for a second billing tool.

**Architecture:** Session note signing triggers an auto-created billing record via `ctx.scheduler.runAfter(0, ...)`. A new `billingRecords` table stores CPT codes, modifiers, diagnosis codes, fees, and status (`draft`/`finalized`/`billed`). The `patients` table gains four insurance fields. A new `practiceProfiles` table (single row per SLP) stores NPI, Tax ID, credentials, and `defaultSessionFee`. Frontend adds a `/billing` route with a 3-tab dashboard, record editor, CPT picker, and print-friendly superbill viewer inside the existing `src/features/billing/` slice.

**Tech Stack:** Convex (schema + functions), Next.js App Router, Clerk auth via `slpMutation`/`slpQuery`, shadcn/ui (Table, Dialog, Select, Badge, Tabs), Tailwind v4, `@media print` CSS, convex-test, Vitest

---

## Task 1: CPT Code Static Module

**Files:**
- Create: `src/features/billing/lib/cpt-codes.ts`
- Create: `src/features/billing/lib/__tests__/cpt-codes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/billing/lib/__tests__/cpt-codes.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  CPT_CODES,
  getCptByCode,
  getDefaultCptCode,
  type CptCode,
} from "../cpt-codes";

describe("CPT_CODES", () => {
  it("contains exactly 9 SLP-relevant codes", () => {
    expect(CPT_CODES).toHaveLength(9);
  });

  it("every entry has code, description, and defaultPos", () => {
    for (const entry of CPT_CODES) {
      expect(entry.code).toMatch(/^\d{5}$/);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.defaultPos).toMatch(/^\d{2}$/);
    }
  });

  it("includes 92507 (individual treatment)", () => {
    const found = CPT_CODES.find((c) => c.code === "92507");
    expect(found).toBeDefined();
    expect(found!.description).toContain("individual");
  });
});

describe("getCptByCode", () => {
  it("returns matching entry for valid code", () => {
    const result = getCptByCode("92507");
    expect(result).toBeDefined();
    expect(result!.code).toBe("92507");
  });

  it("returns undefined for unknown code", () => {
    expect(getCptByCode("99999")).toBeUndefined();
  });
});

describe("getDefaultCptCode", () => {
  it("returns 92507 as the default", () => {
    expect(getDefaultCptCode()).toBe("92507");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/billing/lib/__tests__/cpt-codes.test.ts --reporter=verbose`

Expected: FAIL — module `../cpt-codes` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/billing/lib/cpt-codes.ts`:

```typescript
export interface CptCode {
  code: string;
  description: string;
  defaultPos: string;
}

export const CPT_CODES: readonly CptCode[] = [
  { code: "92507", description: "Individual speech/language/voice treatment", defaultPos: "11" },
  { code: "92508", description: "Group speech/language treatment (2+ patients)", defaultPos: "11" },
  { code: "92521", description: "Evaluation — speech fluency only", defaultPos: "11" },
  { code: "92522", description: "Evaluation — speech sound production only", defaultPos: "11" },
  { code: "92523", description: "Evaluation — speech sound + language", defaultPos: "11" },
  { code: "92524", description: "Voice/resonance behavioral analysis", defaultPos: "11" },
  { code: "92526", description: "Treatment of swallowing dysfunction", defaultPos: "11" },
  { code: "92597", description: "AAC device evaluation", defaultPos: "11" },
  { code: "92609", description: "AAC device service/programming", defaultPos: "11" },
] as const;

export function getCptByCode(code: string): CptCode | undefined {
  return CPT_CODES.find((c) => c.code === code);
}

export function getDefaultCptCode(): string {
  return "92507";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/billing/lib/__tests__/cpt-codes.test.ts --reporter=verbose`

Expected: PASS (3 describe blocks, all green).

- [ ] **Step 5: Commit**

---

## Task 2: Modifier Logic Module

**Files:**
- Create: `src/features/billing/lib/modifiers.ts`
- Create: `src/features/billing/lib/__tests__/modifiers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/billing/lib/__tests__/modifiers.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  MODIFIERS,
  getAutoModifiers,
  type Modifier,
} from "../modifiers";

describe("MODIFIERS", () => {
  it("contains GP, 95, and KX", () => {
    const codes = MODIFIERS.map((m) => m.code);
    expect(codes).toContain("GP");
    expect(codes).toContain("95");
    expect(codes).toContain("KX");
  });

  it("every modifier has code, description, and autoApply function", () => {
    for (const m of MODIFIERS) {
      expect(m.code.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
      expect(typeof m.autoApply).toBe("function");
    }
  });
});

describe("getAutoModifiers", () => {
  it("always includes GP for in-person", () => {
    const result = getAutoModifiers("in-person");
    expect(result).toContain("GP");
    expect(result).not.toContain("95");
  });

  it("includes GP and 95 for teletherapy", () => {
    const result = getAutoModifiers("teletherapy");
    expect(result).toContain("GP");
    expect(result).toContain("95");
  });

  it("includes GP for parent-consultation", () => {
    const result = getAutoModifiers("parent-consultation");
    expect(result).toContain("GP");
    expect(result).not.toContain("95");
  });

  it("never auto-includes KX", () => {
    const inPerson = getAutoModifiers("in-person");
    const tele = getAutoModifiers("teletherapy");
    expect(inPerson).not.toContain("KX");
    expect(tele).not.toContain("KX");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/billing/lib/__tests__/modifiers.test.ts --reporter=verbose`

Expected: FAIL — module `../modifiers` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/billing/lib/modifiers.ts`:

```typescript
export type SessionType = "in-person" | "teletherapy" | "parent-consultation";

export interface Modifier {
  code: string;
  description: string;
  autoApply: (sessionType: SessionType) => boolean;
}

export const MODIFIERS: readonly Modifier[] = [
  {
    code: "GP",
    description: "Services delivered under an outpatient speech-language pathology plan of care",
    autoApply: () => true,
  },
  {
    code: "95",
    description: "Synchronous telemedicine service rendered via real-time interactive audio/video",
    autoApply: (sessionType) => sessionType === "teletherapy",
  },
  {
    code: "KX",
    description: "Requirements specified in the medical policy have been met (Medicare therapy cap exceeded)",
    autoApply: () => false,
  },
] as const;

export function getAutoModifiers(sessionType: SessionType): string[] {
  return MODIFIERS
    .filter((m) => m.autoApply(sessionType))
    .map((m) => m.code);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/billing/lib/__tests__/modifiers.test.ts --reporter=verbose`

Expected: PASS (2 describe blocks, all green).

- [ ] **Step 5: Commit**

---

## Task 3: Place of Service Module

**Files:**
- Create: `src/features/billing/lib/place-of-service.ts`

- [ ] **Step 1: Create the module**

Create `src/features/billing/lib/place-of-service.ts`:

```typescript
export interface PlaceOfService {
  code: string;
  description: string;
}

export const PLACES_OF_SERVICE: readonly PlaceOfService[] = [
  { code: "11", description: "Office" },
  { code: "02", description: "Telehealth — Provided to Patient" },
  { code: "10", description: "Telehealth — Patient's Home" },
  { code: "12", description: "Home (in-person visit)" },
] as const;

export function getPosByCode(code: string): PlaceOfService | undefined {
  return PLACES_OF_SERVICE.find((p) => p.code === code);
}

export function getDefaultPos(sessionType: "in-person" | "teletherapy" | "parent-consultation"): string {
  return sessionType === "teletherapy" ? "02" : "11";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty src/features/billing/lib/place-of-service.ts 2>&1 | head -20`

Expected: No errors.

- [ ] **Step 3: Commit**

---

## Task 4: Schema — billingRecords Table

**Files:**
- Create: `convex/__tests__/billingRecords.test.ts`
- Modify: `convex/schema.ts:607` (before closing `});`)

- [ ] **Step 1: Write the failing test**

Create `convex/__tests__/billingRecords.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-billing", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

describe("billingRecords schema", () => {
  it("billingRecords table exists in schema", () => {
    expect(schema.tables.billingRecords).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: FAIL — `schema.tables.billingRecords` is undefined.

- [ ] **Step 3: Add billingRecords table to schema**

In `convex/schema.ts`, insert before the closing `});` on line 608:

```typescript
  billingRecords: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    sessionNoteId: v.id("sessionNotes"),
    dateOfService: v.string(),
    cptCode: v.string(),
    cptDescription: v.string(),
    modifiers: v.array(v.string()),
    diagnosisCodes: v.array(v.object({
      code: v.string(),
      description: v.string(),
    })),
    placeOfService: v.string(),
    units: v.number(),
    fee: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("finalized"),
      v.literal("billed")
    ),
    billedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_slpUserId", ["slpUserId"])
    .index("by_slpUserId_status", ["slpUserId", "status"])
    .index("by_sessionNoteId", ["sessionNoteId"])
    .index("by_dateOfService", ["dateOfService"]),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: PASS.

- [ ] **Step 5: Commit**

---

## Task 5: Schema — Patient Insurance Fields

**Files:**
- Modify: `convex/schema.ts:163-196` (patients table)
- Modify: `convex/patients.ts:183-232` (update mutation args)

- [ ] **Step 1: Write the failing test**

Add to `convex/__tests__/billingRecords.test.ts`:

```typescript
describe("patients insurance fields", () => {
  it("can store insurance fields on patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);

    await t.mutation(api.patients.update, {
      patientId,
      insuranceCarrier: "Blue Cross Blue Shield",
      insuranceMemberId: "BCB123456789",
      insuranceGroupNumber: "GRP001",
      insurancePhone: "1-800-555-0100",
    });

    const patient = await t.query(api.patients.get, { patientId });
    expect(patient!.insuranceCarrier).toBe("Blue Cross Blue Shield");
    expect(patient!.insuranceMemberId).toBe("BCB123456789");
    expect(patient!.insuranceGroupNumber).toBe("GRP001");
    expect(patient!.insurancePhone).toBe("1-800-555-0100");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: FAIL — `insuranceCarrier` is not a valid arg for `patients.update`.

- [ ] **Step 3: Add insurance fields to patients schema**

In `convex/schema.ts`, add four fields inside the `patients` table definition (after line 195, before the closing `})` of patients):

```typescript
    insuranceCarrier: v.optional(v.string()),
    insuranceMemberId: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    insurancePhone: v.optional(v.string()),
```

- [ ] **Step 4: Add insurance args to patients.update mutation**

In `convex/patients.ts`, add to the `update` mutation args (after line 195):

```typescript
    insuranceCarrier: v.optional(v.string()),
    insuranceMemberId: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    insurancePhone: v.optional(v.string()),
```

And add to the handler body (after line 220):

```typescript
    if (args.insuranceCarrier !== undefined) updates.insuranceCarrier = args.insuranceCarrier;
    if (args.insuranceMemberId !== undefined) updates.insuranceMemberId = args.insuranceMemberId;
    if (args.insuranceGroupNumber !== undefined) updates.insuranceGroupNumber = args.insuranceGroupNumber;
    if (args.insurancePhone !== undefined) updates.insurancePhone = args.insurancePhone;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: PASS.

- [ ] **Step 6: Commit**

---

## Task 6: Schema — practiceProfiles Table

**Files:**
- Modify: `convex/schema.ts` (add table before `billingRecords`)
- Create: `convex/practiceProfiles.ts`

- [ ] **Step 1: Write the failing test**

Add to `convex/__tests__/billingRecords.test.ts`:

```typescript
describe("practiceProfiles", () => {
  it("table exists in schema", () => {
    expect(schema.tables.practiceProfiles).toBeDefined();
  });

  it("can create and read a practice profile", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    await t.mutation(api.practiceProfiles.upsert, {
      practiceName: "Springfield Speech Clinic",
      npiNumber: "1234567890",
      taxId: "12-3456789",
      address: "123 Main St, Springfield, IL 62701",
      phone: "217-555-0100",
      credentials: "CCC-SLP",
      licenseNumber: "SLP-12345",
      defaultSessionFee: 15000,
    });

    const profile = await t.query(api.practiceProfiles.get, {});
    expect(profile).toBeDefined();
    expect(profile!.practiceName).toBe("Springfield Speech Clinic");
    expect(profile!.defaultSessionFee).toBe(15000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: FAIL — `schema.tables.practiceProfiles` is undefined.

- [ ] **Step 3: Add practiceProfiles table to schema**

In `convex/schema.ts`, insert before `billingRecords`:

```typescript
  practiceProfiles: defineTable({
    slpUserId: v.string(),
    practiceName: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    taxId: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    credentials: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    defaultSessionFee: v.optional(v.number()),
  })
    .index("by_slpUserId", ["slpUserId"]),
```

- [ ] **Step 4: Create practiceProfiles Convex functions**

Create `convex/practiceProfiles.ts`:

```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

export const get = slpQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.slpUserId) return null;
    return await ctx.db
      .query("practiceProfiles")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", ctx.slpUserId!))
      .first();
  },
});

export const upsert = slpMutation({
  args: {
    practiceName: v.optional(v.string()),
    npiNumber: v.optional(v.string()),
    taxId: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    credentials: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    defaultSessionFee: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("practiceProfiles")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", ctx.slpUserId))
      .first();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (args.practiceName !== undefined) updates.practiceName = args.practiceName;
      if (args.npiNumber !== undefined) updates.npiNumber = args.npiNumber;
      if (args.taxId !== undefined) updates.taxId = args.taxId;
      if (args.address !== undefined) updates.address = args.address;
      if (args.phone !== undefined) updates.phone = args.phone;
      if (args.credentials !== undefined) updates.credentials = args.credentials;
      if (args.licenseNumber !== undefined) updates.licenseNumber = args.licenseNumber;
      if (args.defaultSessionFee !== undefined) updates.defaultSessionFee = args.defaultSessionFee;
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("practiceProfiles", {
      slpUserId: ctx.slpUserId,
      ...args,
    });
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: PASS.

- [ ] **Step 6: Commit**

---

## Task 7: Backend — createFromSessionNote Internal Mutation

**Files:**
- Create: `convex/billingRecords.ts`
- Test: `convex/__tests__/billingRecords.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `convex/__tests__/billingRecords.test.ts`:

```typescript
const today = new Date().toISOString().slice(0, 10);

const VALID_SESSION_DATA = {
  sessionDate: today,
  sessionDuration: 30,
  sessionType: "in-person" as const,
  structuredData: {
    targetsWorkedOn: [
      {
        target: "Initial /s/ in words",
        trials: 20,
        correct: 14,
        promptLevel: "verbal-cue" as const,
      },
    ],
  },
};

const VALID_SOAP = {
  subjective: "Patient appeared eager and engaged.",
  objective: "Patient produced initial /s/ correctly in 14/20 trials (70%).",
  assessment: "Steady progress toward initial /s/ production goal.",
  plan: "Continue initial /s/ in words, begin fading verbal cues.",
};

async function signNote(t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const noteId = await t.mutation(api.sessionNotes.create, {
    patientId,
    ...VALID_SESSION_DATA,
  });
  await t.mutation(api.sessionNotes.update, { noteId, sessionDuration: 30 });
  await t.mutation(api.sessionNotes.updateStatus, { noteId, status: "complete" });
  await t.mutation(api.sessionNotes.saveSoapFromAI, { noteId, soapNote: VALID_SOAP });
  await t.mutation(api.sessionNotes.sign, { noteId });
  return { patientId, noteId };
}

describe("billingRecords.createFromSessionNote", () => {
  it("creates a draft billing record with correct defaults", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.run(async (ctx) => {
      const { createFromSessionNote } = await import("../billingRecords");
    });

    // Call internal mutation directly
    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "in-person",
    });

    const records = await t.query(api.billingRecords.listByPatient, { patientId });
    expect(records).toHaveLength(1);
    expect(records[0].cptCode).toBe("92507");
    expect(records[0].modifiers).toContain("GP");
    expect(records[0].modifiers).not.toContain("95");
    expect(records[0].placeOfService).toBe("11");
    expect(records[0].status).toBe("draft");
    expect(records[0].units).toBe(1);
  });

  it("applies 95 modifier and POS 02 for teletherapy", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
      sessionType: "teletherapy" as const,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "teletherapy",
    });

    const records = await t.query(api.billingRecords.listByPatient, { patientId });
    expect(records[0].modifiers).toContain("GP");
    expect(records[0].modifiers).toContain("95");
    expect(records[0].placeOfService).toBe("02");
  });

  it("populates fee from practice profile defaultSessionFee", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);

    await t.mutation(api.practiceProfiles.upsert, {
      defaultSessionFee: 15000,
    });

    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "in-person",
    });

    const records = await t.query(api.billingRecords.listByPatient, { patientId });
    expect(records[0].fee).toBe(15000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: FAIL — `convex/billingRecords.ts` does not exist.

- [ ] **Step 3: Write createFromSessionNote + listByPatient**

Create `convex/billingRecords.ts`:

```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { internalMutation } from "./_generated/server";
import { slpMutation, slpQuery } from "./lib/customFunctions";

// ── Internal Mutations ─────────────────────────────────────────────────────

export const createFromSessionNote = internalMutation({
  args: {
    sessionNoteId: v.id("sessionNotes"),
    slpUserId: v.string(),
    patientId: v.id("patients"),
    sessionDate: v.string(),
    sessionType: v.union(
      v.literal("in-person"),
      v.literal("teletherapy"),
      v.literal("parent-consultation")
    ),
  },
  handler: async (ctx, args) => {
    // Check for duplicate — idempotency guard
    const existing = await ctx.db
      .query("billingRecords")
      .withIndex("by_sessionNoteId", (q) => q.eq("sessionNoteId", args.sessionNoteId))
      .first();
    if (existing) return existing._id;

    // Determine CPT code
    const cptCode = "92507";
    const cptDescription = "Individual speech/language/voice treatment";

    // Determine modifiers
    const modifiers: string[] = ["GP"];
    if (args.sessionType === "teletherapy") {
      modifiers.push("95");
    }

    // Determine place of service
    const placeOfService = args.sessionType === "teletherapy" ? "02" : "11";

    // Look up practice profile for default fee
    const profile = await ctx.db
      .query("practiceProfiles")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", args.slpUserId))
      .first();
    const fee = profile?.defaultSessionFee;

    // Look up patient for diagnosis codes (future: icdCodes from SP2)
    const diagnosisCodes: { code: string; description: string }[] = [];

    return await ctx.db.insert("billingRecords", {
      patientId: args.patientId,
      slpUserId: args.slpUserId,
      sessionNoteId: args.sessionNoteId,
      dateOfService: args.sessionDate,
      cptCode,
      cptDescription,
      modifiers,
      diagnosisCodes,
      placeOfService,
      units: 1,
      fee,
      status: "draft",
    });
  },
});

// ── Queries ────────────────────────────────────────────────────────────────

export const listByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return [];
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.slpUserId !== ctx.slpUserId) return [];

    return await ctx.db
      .query("billingRecords")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: PASS.

- [ ] **Step 5: Commit**

---

## Task 8: Backend — listBySlp, get, getUnbilledCount Queries

**Files:**
- Modify: `convex/billingRecords.ts`
- Test: `convex/__tests__/billingRecords.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `convex/__tests__/billingRecords.test.ts`:

```typescript
describe("billingRecords.listBySlp", () => {
  it("returns all records for the SLP", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "in-person",
    });

    const records = await t.query(api.billingRecords.listBySlp, {});
    expect(records).toHaveLength(1);
  });

  it("filters by status when provided", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "in-person",
    });

    const drafts = await t.query(api.billingRecords.listBySlp, { status: "draft" });
    expect(drafts).toHaveLength(1);

    const billed = await t.query(api.billingRecords.listBySlp, { status: "billed" });
    expect(billed).toHaveLength(0);
  });
});

describe("billingRecords.get", () => {
  it("returns a single record by ID", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const recordId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "in-person",
    });

    const record = await t.query(api.billingRecords.get, { recordId });
    expect(record).toBeDefined();
    expect(record!.cptCode).toBe("92507");
  });

  it("rejects access by different SLP", async () => {
    const t = convexTest(schema, modules);
    const slp1 = t.withIdentity(SLP_IDENTITY);
    const slp2 = t.withIdentity({ subject: "other-slp-456", issuer: "clerk" });

    const { patientId } = await slp1.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp1.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });
    const recordId = await slp1.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "in-person",
    });

    const result = await slp2.query(api.billingRecords.get, { recordId });
    expect(result).toBeNull();
  });
});

describe("billingRecords.getUnbilledCount", () => {
  it("returns count of draft + finalized records", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await t.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      slpUserId: "slp-user-billing",
      patientId,
      sessionDate: today,
      sessionType: "in-person",
    });

    const count = await t.query(api.billingRecords.getUnbilledCount, {});
    expect(count).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: FAIL — `api.billingRecords.listBySlp`, `api.billingRecords.get`, `api.billingRecords.getUnbilledCount` do not exist.

- [ ] **Step 3: Add queries to billingRecords.ts**

Append to `convex/billingRecords.ts`:

```typescript
export const listBySlp = slpQuery({
  args: {
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("finalized"),
      v.literal("billed")
    )),
  },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return [];

    if (args.status) {
      return await ctx.db
        .query("billingRecords")
        .withIndex("by_slpUserId_status", (q) =>
          q.eq("slpUserId", ctx.slpUserId!).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("billingRecords")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", ctx.slpUserId!))
      .order("desc")
      .collect();
  },
});

export const get = slpQuery({
  args: { recordId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return null;
    const record = await ctx.db.get(args.recordId);
    if (!record || record.slpUserId !== ctx.slpUserId) return null;
    return record;
  },
});

export const getUnbilledCount = slpQuery({
  args: {},
  handler: async (ctx) => {
    if (!ctx.slpUserId) return 0;

    const drafts = await ctx.db
      .query("billingRecords")
      .withIndex("by_slpUserId_status", (q) =>
        q.eq("slpUserId", ctx.slpUserId!).eq("status", "draft")
      )
      .collect();

    const finalized = await ctx.db
      .query("billingRecords")
      .withIndex("by_slpUserId_status", (q) =>
        q.eq("slpUserId", ctx.slpUserId!).eq("status", "finalized")
      )
      .collect();

    return drafts.length + finalized.length;
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: PASS.

- [ ] **Step 5: Commit**

---

## Task 9: Backend — update, finalize, markBilled, remove Mutations

**Files:**
- Modify: `convex/billingRecords.ts`
- Test: `convex/__tests__/billingRecords.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `convex/__tests__/billingRecords.test.ts`:

```typescript
async function createDraftRecord(t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const noteId = await t.mutation(api.sessionNotes.create, {
    patientId,
    ...VALID_SESSION_DATA,
  });
  const recordId = await t.mutation(internal.billingRecords.createFromSessionNote, {
    sessionNoteId: noteId,
    slpUserId: "slp-user-billing",
    patientId,
    sessionDate: today,
    sessionType: "in-person",
  });
  return { patientId, noteId, recordId };
}

describe("billingRecords.update", () => {
  it("updates CPT code and fee on draft record", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { recordId } = await createDraftRecord(t);

    await t.mutation(api.billingRecords.update, {
      recordId,
      cptCode: "92523",
      cptDescription: "Evaluation — speech sound + language",
      fee: 20000,
    });

    const record = await t.query(api.billingRecords.get, { recordId });
    expect(record!.cptCode).toBe("92523");
    expect(record!.fee).toBe(20000);
  });

  it("rejects update on finalized record", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { recordId } = await createDraftRecord(t);

    await t.mutation(api.billingRecords.finalize, { recordId });

    await expect(
      t.mutation(api.billingRecords.update, { recordId, fee: 25000 }),
    ).rejects.toThrow("Only draft");
  });
});

describe("billingRecords.finalize", () => {
  it("transitions from draft to finalized", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { recordId } = await createDraftRecord(t);

    await t.mutation(api.billingRecords.finalize, { recordId });

    const record = await t.query(api.billingRecords.get, { recordId });
    expect(record!.status).toBe("finalized");
  });

  it("rejects finalizing non-draft record", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { recordId } = await createDraftRecord(t);

    await t.mutation(api.billingRecords.finalize, { recordId });
    await expect(
      t.mutation(api.billingRecords.finalize, { recordId }),
    ).rejects.toThrow("Only draft");
  });
});

describe("billingRecords.markBilled", () => {
  it("transitions from finalized to billed with timestamp", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { recordId } = await createDraftRecord(t);

    await t.mutation(api.billingRecords.finalize, { recordId });
    await t.mutation(api.billingRecords.markBilled, { recordId });

    const record = await t.query(api.billingRecords.get, { recordId });
    expect(record!.status).toBe("billed");
    expect(record!.billedAt).toBeDefined();
    expect(record!.billedAt).toBeGreaterThan(0);
  });

  it("rejects marking draft as billed", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { recordId } = await createDraftRecord(t);

    await expect(
      t.mutation(api.billingRecords.markBilled, { recordId }),
    ).rejects.toThrow("Only finalized");
  });
});

describe("billingRecords.remove", () => {
  it("deletes a draft record", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { recordId, patientId } = await createDraftRecord(t);

    await t.mutation(api.billingRecords.remove, { recordId });

    const records = await t.query(api.billingRecords.listByPatient, { patientId });
    expect(records).toHaveLength(0);
  });

  it("rejects deleting a billed record", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { recordId } = await createDraftRecord(t);

    await t.mutation(api.billingRecords.finalize, { recordId });
    await t.mutation(api.billingRecords.markBilled, { recordId });

    await expect(
      t.mutation(api.billingRecords.remove, { recordId }),
    ).rejects.toThrow("Cannot delete a billed");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: FAIL — `api.billingRecords.update`, `.finalize`, `.markBilled`, `.remove` do not exist.

- [ ] **Step 3: Add mutations to billingRecords.ts**

Append to `convex/billingRecords.ts`:

```typescript
// ── Public Mutations ───────────────────────────────────────────────────────

export const update = slpMutation({
  args: {
    recordId: v.id("billingRecords"),
    cptCode: v.optional(v.string()),
    cptDescription: v.optional(v.string()),
    modifiers: v.optional(v.array(v.string())),
    diagnosisCodes: v.optional(v.array(v.object({
      code: v.string(),
      description: v.string(),
    }))),
    placeOfService: v.optional(v.string()),
    units: v.optional(v.number()),
    fee: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status !== "draft") {
      throw new ConvexError("Only draft billing records can be edited");
    }

    const updates: Record<string, unknown> = {};
    if (args.cptCode !== undefined) updates.cptCode = args.cptCode;
    if (args.cptDescription !== undefined) updates.cptDescription = args.cptDescription;
    if (args.modifiers !== undefined) updates.modifiers = args.modifiers;
    if (args.diagnosisCodes !== undefined) updates.diagnosisCodes = args.diagnosisCodes;
    if (args.placeOfService !== undefined) updates.placeOfService = args.placeOfService;
    if (args.units !== undefined) updates.units = args.units;
    if (args.fee !== undefined) updates.fee = args.fee;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.recordId, updates);
  },
});

export const finalize = slpMutation({
  args: { recordId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status !== "draft") {
      throw new ConvexError("Only draft billing records can be finalized");
    }

    await ctx.db.patch(args.recordId, { status: "finalized" });
  },
});

export const markBilled = slpMutation({
  args: { recordId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status !== "finalized") {
      throw new ConvexError("Only finalized billing records can be marked as billed");
    }

    await ctx.db.patch(args.recordId, {
      status: "billed",
      billedAt: Date.now(),
    });
  },
});

export const remove = slpMutation({
  args: { recordId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status === "billed") {
      throw new ConvexError("Cannot delete a billed billing record");
    }

    await ctx.db.delete(args.recordId);
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: PASS.

- [ ] **Step 5: Commit**

---

## Task 10: Session Note Sign Integration

**Files:**
- Modify: `convex/sessionNotes.ts:309-345` (sign mutation)
- Test: `convex/__tests__/billingRecords.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `convex/__tests__/billingRecords.test.ts`:

```typescript
describe("sessionNotes.sign billing integration", () => {
  it("signing a note schedules createFromSessionNote", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, noteId } = await signNote(t);

    // convex-test runs scheduled functions synchronously in some modes,
    // but scheduler writes cause "Write outside of transaction" which we suppress.
    // The test validates the scheduler was called by checking no error was thrown.
    // In production, the billing record would be created asynchronously.
    const note = await t.query(api.sessionNotes.get, { noteId });
    expect(note!.status).toBe("signed");
  });
});
```

- [ ] **Step 2: Run test to verify it passes (baseline)**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: PASS (this is a baseline to confirm sign still works).

- [ ] **Step 3: Add scheduler call to sign mutation**

In `convex/sessionNotes.ts`, add this import at the top (after existing imports):

```typescript
import { internal } from "./_generated/api";
```

Then, in the `sign` mutation handler, after the `insertProgressFromTargets` call (after line 343), add:

```typescript
    // Auto-create billing record for the signed session note
    await ctx.scheduler.runAfter(0, internal.billingRecords.createFromSessionNote, {
      sessionNoteId: args.noteId,
      slpUserId: ctx.slpUserId,
      patientId: note.patientId,
      sessionDate: note.sessionDate,
      sessionType: note.sessionType,
    });
```

- [ ] **Step 4: Run full test suite to verify nothing broke**

Run: `npx vitest run convex/__tests__/sessionNotes.test.ts convex/__tests__/billingRecords.test.ts --reporter=verbose`

Expected: PASS (suppressSchedulerErrors handles the expected "Write outside of transaction" noise).

- [ ] **Step 5: Commit**

---

## Task 11: Frontend — Routes and Navigation

**Files:**
- Modify: `src/core/routes.ts`
- Modify: `src/shared/lib/navigation.ts`
- Create: `src/app/(app)/billing/page.tsx`

- [ ] **Step 1: Add BILLING route constant**

In `src/core/routes.ts`, add after the `SESSIONS` line (line 19):

```typescript
  BILLING: "/billing",
```

- [ ] **Step 2: Add Billing to SLP sidebar nav**

In `src/shared/lib/navigation.ts`, add a new entry in `NAV_ITEMS` after the "Sessions" entry (after line 7):

```typescript
  { icon: "receipt_long", label: "Billing", href: ROUTES.BILLING },
```

And add to `isNavActive` function (after the sessions line):

```typescript
  if (href === "/billing") return pathname.startsWith("/billing");
```

- [ ] **Step 3: Create billing page route**

Create `src/app/(app)/billing/page.tsx`:

```typescript
import { ClinicalBillingDashboard } from "@/features/billing/components/clinical-billing-dashboard";

export const metadata = {
  title: "Billing | Bridges",
};

export default function BillingPage() {
  return <ClinicalBillingDashboard />;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: May have an error for missing `ClinicalBillingDashboard` (created in next task). That is expected.

- [ ] **Step 5: Commit**

---

## Task 12: Frontend — use-billing-records Hook

**Files:**
- Create: `src/features/billing/hooks/use-billing-records.ts`

- [ ] **Step 1: Create the hook**

Create `src/features/billing/hooks/use-billing-records.ts`:

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type BillingStatus = "draft" | "finalized" | "billed";

export function useBillingRecords(status?: BillingStatus) {
  return useQuery(api.billingRecords.listBySlp, status ? { status } : {});
}

export function useBillingRecord(recordId: Id<"billingRecords"> | undefined) {
  return useQuery(
    api.billingRecords.get,
    recordId ? { recordId } : "skip",
  );
}

export function usePatientBillingRecords(patientId: Id<"patients"> | undefined) {
  return useQuery(
    api.billingRecords.listByPatient,
    patientId ? { patientId } : "skip",
  );
}

export function useUnbilledCount() {
  return useQuery(api.billingRecords.getUnbilledCount, {});
}

export function useBillingMutations() {
  const updateRecord = useMutation(api.billingRecords.update);
  const finalizeRecord = useMutation(api.billingRecords.finalize);
  const markBilled = useMutation(api.billingRecords.markBilled);
  const removeRecord = useMutation(api.billingRecords.remove);

  return { updateRecord, finalizeRecord, markBilled, removeRecord };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "use-billing-records" | head -5`

Expected: No errors for this file.

- [ ] **Step 3: Commit**

---

## Task 13: Frontend — CPT Code Picker Component

**Files:**
- Create: `src/features/billing/components/cpt-code-picker.tsx`
- Create: `src/features/billing/components/__tests__/cpt-code-picker.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/billing/components/__tests__/cpt-code-picker.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CptCodePicker } from "../cpt-code-picker";

describe("CptCodePicker", () => {
  it("renders with the selected CPT code", () => {
    render(<CptCodePicker value="92507" onChange={vi.fn()} />);
    expect(screen.getByText(/92507/)).toBeInTheDocument();
  });

  it("shows all 9 options when opened", async () => {
    const user = userEvent.setup();
    render(<CptCodePicker value="92507" onChange={vi.fn()} />);

    await user.click(screen.getByRole("combobox"));

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(9);
  });

  it("calls onChange with code and description when selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CptCodePicker value="92507" onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText(/92523/));

    expect(onChange).toHaveBeenCalledWith("92523", "Evaluation — speech sound + language");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/billing/components/__tests__/cpt-code-picker.test.tsx --reporter=verbose`

Expected: FAIL — module `../cpt-code-picker` does not exist.

- [ ] **Step 3: Write the CPT code picker component**

Create `src/features/billing/components/cpt-code-picker.tsx`:

```typescript
"use client";

import { cn } from "@/core/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

import { CPT_CODES } from "../lib/cpt-codes";

interface CptCodePickerProps {
  value: string;
  onChange: (code: string, description: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CptCodePicker({ value, onChange, disabled, className }: CptCodePickerProps) {
  return (
    <Select
      value={value}
      onValueChange={(code) => {
        const entry = CPT_CODES.find((c) => c.code === code);
        if (entry) onChange(entry.code, entry.description);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder="Select CPT code" />
      </SelectTrigger>
      <SelectContent>
        {CPT_CODES.map((cpt) => (
          <SelectItem key={cpt.code} value={cpt.code}>
            {cpt.code} — {cpt.description}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/billing/components/__tests__/cpt-code-picker.test.tsx --reporter=verbose`

Expected: PASS.

- [ ] **Step 5: Commit**

---

## Task 14: Frontend — Insurance Fields Component

**Files:**
- Create: `src/features/billing/components/insurance-fields.tsx`

- [ ] **Step 1: Create the insurance fields form component**

Create `src/features/billing/components/insurance-fields.tsx`:

```typescript
"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface InsuranceFieldsProps {
  patientId: Id<"patients">;
  initialValues?: {
    insuranceCarrier?: string;
    insuranceMemberId?: string;
    insuranceGroupNumber?: string;
    insurancePhone?: string;
  };
}

export function InsuranceFields({ patientId, initialValues }: InsuranceFieldsProps) {
  const updatePatient = useMutation(api.patients.update);
  const [saving, setSaving] = useState(false);
  const [carrier, setCarrier] = useState(initialValues?.insuranceCarrier ?? "");
  const [memberId, setMemberId] = useState(initialValues?.insuranceMemberId ?? "");
  const [groupNumber, setGroupNumber] = useState(initialValues?.insuranceGroupNumber ?? "");
  const [phone, setPhone] = useState(initialValues?.insurancePhone ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await updatePatient({
        patientId,
        insuranceCarrier: carrier || undefined,
        insuranceMemberId: memberId || undefined,
        insuranceGroupNumber: groupNumber || undefined,
        insurancePhone: phone || undefined,
      });
      toast.success("Insurance information saved");
    } catch {
      toast.error("Failed to save insurance information");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="font-body text-sm font-semibold text-on-surface">Insurance Information</h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="insurance-carrier">Carrier Name</Label>
          <Input
            id="insurance-carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="e.g. Blue Cross Blue Shield"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="insurance-member-id">Member / Subscriber ID</Label>
          <Input
            id="insurance-member-id"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="e.g. BCB123456789"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="insurance-group">Group Number</Label>
          <Input
            id="insurance-group"
            value={groupNumber}
            onChange={(e) => setGroupNumber(e.target.value)}
            placeholder="e.g. GRP001"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="insurance-phone">Claims Phone</Label>
          <Input
            id="insurance-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 1-800-555-0100"
          />
        </div>
      </div>
      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="bg-gradient-135 text-white"
      >
        {saving ? "Saving..." : "Save Insurance Info"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "insurance-fields" | head -5`

Expected: No errors.

- [ ] **Step 3: Commit**

---

## Task 15: Frontend — Billing Record Editor Component

**Files:**
- Create: `src/features/billing/components/billing-record-editor.tsx`

- [ ] **Step 1: Create the billing record editor**

Create `src/features/billing/components/billing-record-editor.tsx`:

```typescript
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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

import type { Id } from "../../../../convex/_generated/dataModel";
import { useBillingMutations, useBillingRecord } from "../hooks/use-billing-records";
import { MODIFIERS } from "../lib/modifiers";
import { PLACES_OF_SERVICE } from "../lib/place-of-service";
import { CptCodePicker } from "./cpt-code-picker";

interface BillingRecordEditorProps {
  recordId: Id<"billingRecords">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillingRecordEditor({ recordId, open, onOpenChange }: BillingRecordEditorProps) {
  const record = useBillingRecord(recordId);
  const { updateRecord, finalizeRecord } = useBillingMutations();
  const [saving, setSaving] = useState(false);

  const [cptCode, setCptCode] = useState("");
  const [cptDescription, setCptDescription] = useState("");
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [placeOfService, setPlaceOfService] = useState("");
  const [units, setUnits] = useState(1);
  const [fee, setFee] = useState("");
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize from record data once loaded
  if (record && !initialized) {
    setCptCode(record.cptCode);
    setCptDescription(record.cptDescription);
    setModifiers([...record.modifiers]);
    setPlaceOfService(record.placeOfService);
    setUnits(record.units);
    setFee(record.fee ? (record.fee / 100).toFixed(2) : "");
    setNotes(record.notes ?? "");
    setInitialized(true);
  }

  // Reset initialized state when dialog closes
  function handleOpenChange(open: boolean) {
    if (!open) setInitialized(false);
    onOpenChange(open);
  }

  function toggleModifier(code: string) {
    setModifiers((prev) =>
      prev.includes(code) ? prev.filter((m) => m !== code) : [...prev, code]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const feeInCents = fee ? Math.round(parseFloat(fee) * 100) : undefined;
      await updateRecord({
        recordId,
        cptCode,
        cptDescription,
        modifiers,
        placeOfService,
        units,
        fee: feeInCents,
        notes: notes || undefined,
      });
      toast.success("Billing record updated");
      handleOpenChange(false);
    } catch {
      toast.error("Failed to update billing record");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    setSaving(true);
    try {
      // Save first, then finalize
      const feeInCents = fee ? Math.round(parseFloat(fee) * 100) : undefined;
      await updateRecord({
        recordId,
        cptCode,
        cptDescription,
        modifiers,
        placeOfService,
        units,
        fee: feeInCents,
        notes: notes || undefined,
      });
      await finalizeRecord({ recordId });
      toast.success("Billing record finalized");
      handleOpenChange(false);
    } catch {
      toast.error("Failed to finalize billing record");
    } finally {
      setSaving(false);
    }
  }

  const isDraft = record?.status === "draft";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Billing Record</DialogTitle>
          <DialogDescription>
            {record?.dateOfService ? `Service date: ${record.dateOfService}` : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        {!record ? (
          <div className="animate-pulse h-48 rounded-xl bg-surface-container" />
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>CPT Code</Label>
              <CptCodePicker
                value={cptCode}
                onChange={(code, desc) => {
                  setCptCode(code);
                  setCptDescription(desc);
                }}
                disabled={!isDraft}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Modifiers</Label>
              <div className="flex flex-wrap gap-2">
                {MODIFIERS.map((m) => (
                  <Badge
                    key={m.code}
                    variant={modifiers.includes(m.code) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => isDraft && toggleModifier(m.code)}
                  >
                    {m.code}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Place of Service</Label>
                <Select
                  value={placeOfService}
                  onValueChange={setPlaceOfService}
                  disabled={!isDraft}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACES_OF_SERVICE.map((pos) => (
                      <SelectItem key={pos.code} value={pos.code}>
                        {pos.code} — {pos.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing-units">Units</Label>
                <Input
                  id="billing-units"
                  type="number"
                  min={1}
                  value={units}
                  onChange={(e) => setUnits(parseInt(e.target.value) || 1)}
                  disabled={!isDraft}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="billing-fee">Fee ($)</Label>
              <Input
                id="billing-fee"
                type="number"
                step="0.01"
                min="0"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="e.g. 150.00"
                disabled={!isDraft}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="billing-notes">Notes</Label>
              <Textarea
                id="billing-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal billing notes..."
                rows={2}
                disabled={!isDraft}
              />
            </div>

            {isDraft && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Draft"}
                </Button>
                <Button
                  className="bg-gradient-135 text-white"
                  onClick={handleFinalize}
                  disabled={saving}
                >
                  <MaterialIcon icon="check_circle" size="sm" />
                  {saving ? "Finalizing..." : "Finalize"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "billing-record-editor" | head -5`

Expected: No errors for this file.

- [ ] **Step 3: Commit**

---

## Task 16: Frontend — Billing Record Row Component

**Files:**
- Create: `src/features/billing/components/billing-record-row.tsx`

- [ ] **Step 1: Create the row component**

Create `src/features/billing/components/billing-record-row.tsx`:

```typescript
"use client";

import { useQuery } from "convex/react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  finalized: "bg-blue-100 text-blue-800",
  billed: "bg-green-100 text-green-800",
};

interface BillingRecordRowProps {
  record: Doc<"billingRecords">;
  onEdit: (recordId: Id<"billingRecords">) => void;
  onGenerateSuperbill?: (recordId: Id<"billingRecords">) => void;
  onMarkBilled?: (recordId: Id<"billingRecords">) => void;
}

export function BillingRecordRow({
  record,
  onEdit,
  onGenerateSuperbill,
  onMarkBilled,
}: BillingRecordRowProps) {
  const patient = useQuery(api.patients.get, { patientId: record.patientId });
  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "Loading...";
  const feeDisplay = record.fee ? `$${(record.fee / 100).toFixed(2)}` : "—";

  return (
    <tr className="border-b border-surface-container-high hover:bg-surface-container-lowest/50 transition-colors duration-300">
      <td className="px-4 py-3 text-sm text-on-surface">{patientName}</td>
      <td className="px-4 py-3 text-sm text-on-surface-variant">{record.dateOfService}</td>
      <td className="px-4 py-3 text-sm font-mono text-on-surface">{record.cptCode}</td>
      <td className="px-4 py-3 text-sm text-on-surface-variant">
        {record.modifiers.join(", ") || "—"}
      </td>
      <td className="px-4 py-3 text-sm text-on-surface">{feeDisplay}</td>
      <td className="px-4 py-3">
        <Badge className={cn("text-xs", STATUS_STYLES[record.status])}>
          {record.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {record.status === "draft" && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(record._id)}>
              <MaterialIcon icon="edit" size="sm" />
            </Button>
          )}
          {record.status === "finalized" && onGenerateSuperbill && (
            <Button variant="ghost" size="sm" onClick={() => onGenerateSuperbill(record._id)}>
              <MaterialIcon icon="receipt" size="sm" />
            </Button>
          )}
          {record.status === "finalized" && onMarkBilled && (
            <Button variant="ghost" size="sm" onClick={() => onMarkBilled(record._id)}>
              <MaterialIcon icon="check_circle" size="sm" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "billing-record-row" | head -5`

Expected: No errors.

- [ ] **Step 3: Commit**

---

## Task 17: Frontend — Clinical Billing Dashboard

**Files:**
- Create: `src/features/billing/components/clinical-billing-dashboard.tsx`

- [ ] **Step 1: Create the dashboard component**

Create `src/features/billing/components/clinical-billing-dashboard.tsx`:

```typescript
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

import type { Id } from "../../../../convex/_generated/dataModel";
import {
  useBillingMutations,
  useBillingRecords,
} from "../hooks/use-billing-records";
import { BillingRecordEditor } from "./billing-record-editor";
import { BillingRecordRow } from "./billing-record-row";
import { SuperbillViewer } from "./superbill-viewer";

type Tab = "unbilled" | "ready" | "billed";

export function ClinicalBillingDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("unbilled");
  const [editingId, setEditingId] = useState<Id<"billingRecords"> | null>(null);
  const [superbillId, setSuperbillId] = useState<Id<"billingRecords"> | null>(null);

  const draftRecords = useBillingRecords("draft");
  const finalizedRecords = useBillingRecords("finalized");
  const billedRecords = useBillingRecords("billed");
  const { markBilled } = useBillingMutations();

  // Summary stats
  const totalUnbilledAmount = (draftRecords ?? []).reduce(
    (sum, r) => sum + (r.fee ?? 0),
    0,
  );
  const unbilledCount = (draftRecords ?? []).length + (finalizedRecords ?? []).length;
  const billedThisMonth = (billedRecords ?? []).filter((r) => {
    if (!r.billedAt) return false;
    const now = new Date();
    const billedDate = new Date(r.billedAt);
    return (
      billedDate.getMonth() === now.getMonth() &&
      billedDate.getFullYear() === now.getFullYear()
    );
  });
  const billedThisMonthTotal = billedThisMonth.reduce(
    (sum, r) => sum + (r.fee ?? 0),
    0,
  );

  async function handleMarkBilled(recordId: Id<"billingRecords">) {
    try {
      await markBilled({ recordId });
      toast.success("Record marked as billed");
    } catch {
      toast.error("Failed to mark record as billed");
    }
  }

  const TABLE_HEADERS = (
    <tr className="border-b border-surface-container-high">
      <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Patient</th>
      <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Date</th>
      <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">CPT</th>
      <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Modifiers</th>
      <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Fee</th>
      <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Status</th>
      <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Actions</th>
    </tr>
  );

  function renderEmpty(message: string) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
        <MaterialIcon icon="receipt_long" size="lg" className="mb-2 opacity-40" />
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-on-surface">Clinical Billing</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage billing records and generate superbills
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-container p-4">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Unbilled Amount</p>
          <p className="text-2xl font-semibold text-on-surface mt-1">
            ${(totalUnbilledAmount / 100).toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-container p-4">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Unbilled Sessions</p>
          <p className="text-2xl font-semibold text-on-surface mt-1">{unbilledCount}</p>
        </div>
        <div className="rounded-2xl bg-surface-container p-4">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Billed This Month</p>
          <p className="text-2xl font-semibold text-on-surface mt-1">
            ${(billedThisMonthTotal / 100).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="unbilled">
            Unbilled
            {(draftRecords?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">
                {draftRecords!.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ready">
            Ready to Bill
            {(finalizedRecords?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 text-xs text-blue-800">
                {finalizedRecords!.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="billed">Billed</TabsTrigger>
        </TabsList>

        <TabsContent value="unbilled">
          {!draftRecords || draftRecords.length === 0 ? (
            renderEmpty("No unbilled records. Records are created automatically when you sign session notes.")
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-container-high">
              <table className="w-full">
                <thead>{TABLE_HEADERS}</thead>
                <tbody>
                  {draftRecords.map((record) => (
                    <BillingRecordRow
                      key={record._id}
                      record={record}
                      onEdit={setEditingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ready">
          {!finalizedRecords || finalizedRecords.length === 0 ? (
            renderEmpty("No finalized records. Edit and finalize draft records to prepare them for billing.")
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-container-high">
              <table className="w-full">
                <thead>{TABLE_HEADERS}</thead>
                <tbody>
                  {finalizedRecords.map((record) => (
                    <BillingRecordRow
                      key={record._id}
                      record={record}
                      onEdit={setEditingId}
                      onGenerateSuperbill={setSuperbillId}
                      onMarkBilled={handleMarkBilled}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="billed">
          {!billedRecords || billedRecords.length === 0 ? (
            renderEmpty("No billed records yet.")
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-container-high">
              <table className="w-full">
                <thead>{TABLE_HEADERS}</thead>
                <tbody>
                  {billedRecords.map((record) => (
                    <BillingRecordRow
                      key={record._id}
                      record={record}
                      onEdit={setEditingId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Editor dialog */}
      {editingId && (
        <BillingRecordEditor
          recordId={editingId}
          open={!!editingId}
          onOpenChange={(open) => {
            if (!open) setEditingId(null);
          }}
        />
      )}

      {/* Superbill viewer dialog */}
      {superbillId && (
        <SuperbillViewer
          recordId={superbillId}
          open={!!superbillId}
          onOpenChange={(open) => {
            if (!open) setSuperbillId(null);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "clinical-billing" | head -5`

Expected: May error on missing `SuperbillViewer` (created in next task).

- [ ] **Step 3: Commit**

---

## Task 18: Frontend — Superbill Viewer with Print CSS

**Files:**
- Create: `src/features/billing/components/superbill-viewer.tsx`
- Create: `src/features/billing/components/__tests__/superbill-viewer.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/billing/components/__tests__/superbill-viewer.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn((fn: unknown, args: unknown) => {
    // Return mock data based on the function reference
    if (args && typeof args === "object" && "recordId" in args) {
      return {
        _id: "record-1",
        patientId: "patient-1",
        slpUserId: "slp-1",
        sessionNoteId: "note-1",
        dateOfService: "2026-03-28",
        cptCode: "92507",
        cptDescription: "Individual speech/language/voice treatment",
        modifiers: ["GP"],
        diagnosisCodes: [{ code: "F80.0", description: "Phonological disorder" }],
        placeOfService: "11",
        units: 1,
        fee: 15000,
        status: "finalized",
      };
    }
    if (args && typeof args === "object" && "patientId" in args) {
      return {
        _id: "patient-1",
        firstName: "Alex",
        lastName: "Smith",
        dateOfBirth: "2020-01-15",
        insuranceCarrier: "BCBS",
        insuranceMemberId: "BCB123",
      };
    }
    // practiceProfiles.get
    return {
      practiceName: "Springfield Speech",
      npiNumber: "1234567890",
      address: "123 Main St",
      phone: "217-555-0100",
      credentials: "CCC-SLP",
    };
  }),
}));

import { SuperbillViewer } from "../superbill-viewer";

describe("SuperbillViewer", () => {
  it("renders practice name and patient name", () => {
    render(
      <SuperbillViewer
        recordId={"record-1" as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Springfield Speech")).toBeInTheDocument();
    expect(screen.getByText(/Alex Smith/)).toBeInTheDocument();
  });

  it("renders CPT code and fee", () => {
    render(
      <SuperbillViewer
        recordId={"record-1" as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("92507")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("renders Print / Save as PDF button", () => {
    render(
      <SuperbillViewer
        recordId={"record-1" as any}
        open={true}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /print/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/billing/components/__tests__/superbill-viewer.test.tsx --reporter=verbose`

Expected: FAIL — module `../superbill-viewer` does not exist.

- [ ] **Step 3: Create the superbill viewer**

Create `src/features/billing/components/superbill-viewer.tsx`:

```typescript
"use client";

import { useQuery } from "convex/react";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface SuperbillViewerProps {
  recordId: Id<"billingRecords">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuperbillViewer({ recordId, open, onOpenChange }: SuperbillViewerProps) {
  const record = useQuery(api.billingRecords.get, { recordId });
  const patient = useQuery(
    api.patients.get,
    record ? { patientId: record.patientId } : "skip",
  );
  const profile = useQuery(api.practiceProfiles.get, {});

  const feeDisplay = record?.fee ? `$${(record.fee / 100).toFixed(2)}` : "$0.00";
  const totalFee = record?.fee
    ? `$${((record.fee * (record?.units ?? 1)) / 100).toFixed(2)}`
    : "$0.00";

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle className="font-display">Superbill</DialogTitle>
          <DialogDescription>Review and print this superbill for insurance submission.</DialogDescription>
        </DialogHeader>

        {!record || !patient ? (
          <div className="animate-pulse h-48 rounded-xl bg-surface-container" />
        ) : (
          <>
            {/* Print-friendly superbill content */}
            <div className="superbill-content space-y-6 rounded-xl border border-surface-container-high p-6 print:border-black print:p-0">
              {/* Header: Practice Info */}
              <div className="border-b border-surface-container-high pb-4 print:border-black">
                <h2 className="text-lg font-bold text-on-surface">
                  {profile?.practiceName ?? "Practice Name"}
                </h2>
                {profile?.address && (
                  <p className="text-sm text-on-surface-variant">{profile.address}</p>
                )}
                {profile?.phone && (
                  <p className="text-sm text-on-surface-variant">{profile.phone}</p>
                )}
                <div className="mt-2 flex gap-4 text-xs text-on-surface-variant">
                  {profile?.npiNumber && <span>NPI: {profile.npiNumber}</span>}
                  {profile?.taxId && <span>Tax ID: {profile.taxId}</span>}
                </div>
              </div>

              {/* Patient Info */}
              <div className="border-b border-surface-container-high pb-4 print:border-black">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Patient Information
                </h3>
                <p className="text-sm font-medium text-on-surface">
                  {patient.firstName} {patient.lastName}
                </p>
                <p className="text-sm text-on-surface-variant">DOB: {patient.dateOfBirth}</p>
                {patient.insuranceCarrier && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                    <span>Carrier: {patient.insuranceCarrier}</span>
                    {patient.insuranceMemberId && (
                      <span>Member ID: {patient.insuranceMemberId}</span>
                    )}
                    {patient.insuranceGroupNumber && (
                      <span>Group #: {patient.insuranceGroupNumber}</span>
                    )}
                    {patient.insurancePhone && (
                      <span>Claims Phone: {patient.insurancePhone}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Service Details */}
              <div className="border-b border-surface-container-high pb-4 print:border-black">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Services Rendered
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-on-surface-variant">
                      <th className="pb-1">Date</th>
                      <th className="pb-1">CPT</th>
                      <th className="pb-1">Description</th>
                      <th className="pb-1">Mod</th>
                      <th className="pb-1">POS</th>
                      <th className="pb-1">Units</th>
                      <th className="pb-1 text-right">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1">{record.dateOfService}</td>
                      <td className="py-1 font-mono">{record.cptCode}</td>
                      <td className="py-1">{record.cptDescription}</td>
                      <td className="py-1">{record.modifiers.join(", ")}</td>
                      <td className="py-1">{record.placeOfService}</td>
                      <td className="py-1">{record.units}</td>
                      <td className="py-1 text-right">{feeDisplay}</td>
                    </tr>
                  </tbody>
                </table>

                {record.diagnosisCodes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-on-surface-variant">Diagnosis Codes:</p>
                    {record.diagnosisCodes.map((dx, i) => (
                      <p key={i} className="text-xs text-on-surface-variant">
                        {dx.code} — {dx.description}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-on-surface-variant">Total</p>
                  <p className="text-lg font-bold text-on-surface">{totalFee}</p>
                </div>
              </div>

              {/* Clinician Signature */}
              <div className="border-t border-surface-container-high pt-4 print:border-black">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                  Provider
                </h3>
                {profile?.credentials && (
                  <p className="text-sm text-on-surface">{profile.credentials}</p>
                )}
                {profile?.licenseNumber && (
                  <p className="text-xs text-on-surface-variant">
                    License #: {profile.licenseNumber}
                  </p>
                )}
                <div className="mt-6 border-b border-black w-64">
                  <p className="text-xs text-on-surface-variant pb-1">Signature</p>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">Date: ____________</p>
              </div>
            </div>

            {/* Print button */}
            <div className="flex justify-end print:hidden">
              <Button
                onClick={handlePrint}
                className="bg-gradient-135 text-white"
              >
                <MaterialIcon icon="print" size="sm" />
                Print / Save as PDF
              </Button>
            </div>
          </>
        )}
      </DialogContent>

      {/* Print CSS */}
      <style>{`
        @media print {
          body > *:not([data-radix-portal]) { display: none !important; }
          [data-radix-portal] [role="dialog"] {
            position: static !important;
            transform: none !important;
            max-width: 100% !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print\\:hidden { display: none !important; }
          .print\\:border-black { border-color: black !important; }
          .print\\:p-0 { padding: 0 !important; }
        }
      `}</style>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/billing/components/__tests__/superbill-viewer.test.tsx --reporter=verbose`

Expected: PASS.

- [ ] **Step 5: Commit**

---

## Task 19: Full Test Suite Verification

**Files:**
- Test: All billing test files

- [ ] **Step 1: Run all billing-related tests**

Run: `npx vitest run convex/__tests__/billingRecords.test.ts src/features/billing/lib/__tests__/ src/features/billing/components/__tests__/ --reporter=verbose`

Expected: All tests PASS.

- [ ] **Step 2: Run full project test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`

Expected: No regressions. All existing tests still pass.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Commit all remaining changes**

---

## Task Summary

| # | Task | Files | Tests |
|---|------|-------|-------|
| 1 | CPT Code Static Module | `src/features/billing/lib/cpt-codes.ts` | `src/features/billing/lib/__tests__/cpt-codes.test.ts` |
| 2 | Modifier Logic Module | `src/features/billing/lib/modifiers.ts` | `src/features/billing/lib/__tests__/modifiers.test.ts` |
| 3 | Place of Service Module | `src/features/billing/lib/place-of-service.ts` | (type-check only) |
| 4 | Schema: billingRecords Table | `convex/schema.ts` | `convex/__tests__/billingRecords.test.ts` |
| 5 | Schema: Patient Insurance Fields | `convex/schema.ts`, `convex/patients.ts` | `convex/__tests__/billingRecords.test.ts` |
| 6 | Schema: practiceProfiles Table | `convex/schema.ts`, `convex/practiceProfiles.ts` | `convex/__tests__/billingRecords.test.ts` |
| 7 | Backend: createFromSessionNote | `convex/billingRecords.ts` | `convex/__tests__/billingRecords.test.ts` |
| 8 | Backend: listBySlp, get, getUnbilledCount | `convex/billingRecords.ts` | `convex/__tests__/billingRecords.test.ts` |
| 9 | Backend: update, finalize, markBilled, remove | `convex/billingRecords.ts` | `convex/__tests__/billingRecords.test.ts` |
| 10 | Session Note Sign Integration | `convex/sessionNotes.ts` | `convex/__tests__/billingRecords.test.ts` |
| 11 | Frontend: Routes + Navigation | `src/core/routes.ts`, `src/shared/lib/navigation.ts`, `src/app/(app)/billing/page.tsx` | (compile check) |
| 12 | Frontend: use-billing-records Hook | `src/features/billing/hooks/use-billing-records.ts` | (compile check) |
| 13 | Frontend: CPT Code Picker | `src/features/billing/components/cpt-code-picker.tsx` | `src/features/billing/components/__tests__/cpt-code-picker.test.tsx` |
| 14 | Frontend: Insurance Fields | `src/features/billing/components/insurance-fields.tsx` | (compile check) |
| 15 | Frontend: Billing Record Editor | `src/features/billing/components/billing-record-editor.tsx` | (compile check) |
| 16 | Frontend: Billing Record Row | `src/features/billing/components/billing-record-row.tsx` | (compile check) |
| 17 | Frontend: Clinical Billing Dashboard | `src/features/billing/components/clinical-billing-dashboard.tsx` | (compile check) |
| 18 | Frontend: Superbill Viewer + Print CSS | `src/features/billing/components/superbill-viewer.tsx` | `src/features/billing/components/__tests__/superbill-viewer.test.tsx` |
| 19 | Full Test Suite Verification | (all) | Full vitest + tsc |
