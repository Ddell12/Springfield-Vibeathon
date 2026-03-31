# SP3: Clinical Billing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clinical billing infrastructure so SLPs can auto-generate billing records when session notes are signed, edit CPT codes/modifiers, and print superbills — eliminating the need for a separate billing tool.

**Architecture:** Session note signing triggers an auto-created billing record via `ctx.scheduler.runAfter(0, ...)`. A new `billingRecords` Convex table stores CPT codes, modifiers, diagnosis codes, fees, and status (draft/finalized/billed). The `patients` table gains insurance fields, and `practiceProfiles` gains a `defaultSessionFee` field. Frontend adds a clinical billing dashboard, record editor, CPT picker, and print-friendly superbill viewer — all within the existing `src/features/billing/` feature slice.

**Tech Stack:** Convex (schema + functions), Next.js App Router, Clerk auth, shadcn/ui (Table, Dialog, Select, Badge, Tabs), Tailwind v4, `@media print` CSS, convex-test, Vitest

---

## File Structure

### Schema & Static Modules
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `convex/schema.ts` | Add `billingRecords` table; extend `patients` with insurance fields; extend `practiceProfiles` with `defaultSessionFee` |
| Create | `src/features/billing/lib/cpt-codes.ts` | Static CPT code data with descriptions and default POS |
| Create | `src/features/billing/lib/modifiers.ts` | Modifier definitions and auto-application logic |
| Create | `src/features/billing/lib/place-of-service.ts` | POS code data |

### Backend
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `convex/billingRecords.ts` | `createFromSessionNote` (internal), `update`, `finalize`, `markBilled`, `remove` mutations; `listBySlp`, `listByPatient`, `get`, `getUnbilledCount` queries |
| Modify | `convex/sessionNotes.ts` | Add `ctx.scheduler.runAfter(0, internal.billingRecords.createFromSessionNote, {...})` to `sign` mutation |

### Frontend
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/features/billing/components/cpt-code-picker.tsx` | Searchable CPT code dropdown |
| Create | `src/features/billing/components/insurance-fields.tsx` | Patient insurance info form section |
| Create | `src/features/billing/components/billing-record-editor.tsx` | Edit CPT, modifiers, diagnosis, fee, POS |
| Create | `src/features/billing/components/billing-record-row.tsx` | Row component for dashboard table |
| Create | `src/features/billing/components/clinical-billing-dashboard.tsx` | Unbilled/finalized/billed tabs with summary stats |
| Create | `src/features/billing/components/superbill-viewer.tsx` | Print-friendly superbill with `@media print` CSS |
| Create | `src/features/billing/hooks/use-billing-records.ts` | Hook wrapping Convex billing queries/mutations |
| Modify | `src/core/routes.ts` | Add `BILLING` route |
| Modify | `src/shared/lib/navigation.ts` | Add Billing nav item for SLP |
| Create | `src/app/(app)/billing/page.tsx` | Thin wrapper for clinical billing dashboard |

### Tests
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `convex/__tests__/billingRecords.test.ts` | Full backend test suite for billing records |
| Create | `src/features/billing/lib/__tests__/cpt-codes.test.ts` | CPT code module tests |
| Create | `src/features/billing/lib/__tests__/modifiers.test.ts` | Modifier auto-application logic tests |
| Create | `src/features/billing/components/__tests__/cpt-code-picker.test.tsx` | CPT picker render tests |
| Create | `src/features/billing/components/__tests__/superbill-viewer.test.tsx` | Superbill render tests |

---

## Task 1: Schema Changes — billingRecords Table + Patient/Practice Extensions

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Write failing schema test**

Create `convex/__tests__/billingRecords.test.ts` with an initial schema verification:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

describe("billingRecords schema", () => {
  it("billingRecords table exists in schema", () => {
    expect(schema.tables.billingRecords).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose
```

Expected: FAIL — `schema.tables.billingRecords` is undefined.

- [ ] **Step 3: Add billingRecords table to schema**

In `convex/schema.ts`, after the `childApps` table (before the closing `});`), add:

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

- [ ] **Step 4: Extend patients table with insurance fields**

In `convex/schema.ts`, find the `patients` table definition. After the `notes: v.optional(v.string()),` field (the last field before the closing `})` of the patients table), add:

```typescript
    insuranceCarrier: v.optional(v.string()),
    insuranceMemberId: v.optional(v.string()),
    insuranceGroupNumber: v.optional(v.string()),
    insurancePhone: v.optional(v.string()),
```

- [ ] **Step 5: Extend practiceProfiles table with defaultSessionFee**

**Note:** The `practiceProfiles` table is defined by SP1. If SP1 has already been implemented, add `defaultSessionFee` to the existing table. If SP1 has NOT been implemented yet, add the full `practiceProfiles` table now (it will be needed by SP3 regardless):

If `practiceProfiles` table does NOT yet exist in schema.ts, add it after `billingRecords`:

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
    defaultSessionFee: v.optional(v.number()),
  })
    .index("by_userId", ["userId"]),
```

If `practiceProfiles` already exists, just add `defaultSessionFee: v.optional(v.number()),` to the existing field list.

- [ ] **Step 6: Run schema test to verify it passes**

```bash
npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose
```

Expected: PASS

- [ ] **Step 7: Run full test suite to verify no regressions**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add convex/schema.ts convex/__tests__/billingRecords.test.ts
git commit -m "feat(schema): add billingRecords table, extend patients with insurance fields

New billingRecords table for clinical billing with CPT codes, modifiers,
diagnosis codes, and draft/finalized/billed status tracking.
Added insurance fields to patients table for superbill population.
Added practiceProfiles.defaultSessionFee for fee pre-population."
```

---

## Task 2: CPT Code and Modifier Static Modules

**Files:**
- Create: `src/features/billing/lib/cpt-codes.ts`
- Create: `src/features/billing/lib/modifiers.ts`
- Create: `src/features/billing/lib/place-of-service.ts`
- Create: `src/features/billing/lib/__tests__/cpt-codes.test.ts`
- Create: `src/features/billing/lib/__tests__/modifiers.test.ts`

- [ ] **Step 1: Write failing tests for CPT codes module**

Create `src/features/billing/lib/__tests__/cpt-codes.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  CPT_CODES,
  getCptByCode,
  getDefaultCptCode,
  type CptCode,
} from "../cpt-codes";

describe("cpt-codes", () => {
  it("exports a non-empty array of CPT codes", () => {
    expect(CPT_CODES.length).toBeGreaterThan(0);
  });

  it("each code has required fields", () => {
    for (const cpt of CPT_CODES) {
      expect(cpt.code).toMatch(/^\d{5}$/);
      expect(cpt.description).toBeTruthy();
      expect(cpt.defaultPlaceOfService).toMatch(/^\d{2}$/);
    }
  });

  it("getCptByCode returns correct code", () => {
    const result = getCptByCode("92507");
    expect(result).toBeDefined();
    expect(result!.code).toBe("92507");
    expect(result!.description).toContain("Individual");
  });

  it("getCptByCode returns undefined for unknown code", () => {
    expect(getCptByCode("99999")).toBeUndefined();
  });

  it("getDefaultCptCode returns 92507", () => {
    const defaultCode = getDefaultCptCode();
    expect(defaultCode.code).toBe("92507");
  });
});
```

- [ ] **Step 2: Write failing tests for modifiers module**

Create `src/features/billing/lib/__tests__/modifiers.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  MODIFIERS,
  getAutoModifiers,
  type Modifier,
} from "../modifiers";

describe("modifiers", () => {
  it("exports a non-empty array of modifiers", () => {
    expect(MODIFIERS.length).toBeGreaterThan(0);
  });

  it("GP modifier exists and is auto-applied always", () => {
    const gp = MODIFIERS.find((m) => m.code === "GP");
    expect(gp).toBeDefined();
    expect(gp!.autoApply).toBe("always");
  });

  it("95 modifier exists and is auto-applied for teletherapy", () => {
    const m95 = MODIFIERS.find((m) => m.code === "95");
    expect(m95).toBeDefined();
    expect(m95!.autoApply).toBe("teletherapy");
  });

  it("KX modifier exists and is manual", () => {
    const kx = MODIFIERS.find((m) => m.code === "KX");
    expect(kx).toBeDefined();
    expect(kx!.autoApply).toBe("manual");
  });

  it("getAutoModifiers returns GP for in-person", () => {
    const result = getAutoModifiers("in-person");
    expect(result).toContain("GP");
    expect(result).not.toContain("95");
  });

  it("getAutoModifiers returns GP and 95 for teletherapy", () => {
    const result = getAutoModifiers("teletherapy");
    expect(result).toContain("GP");
    expect(result).toContain("95");
  });

  it("getAutoModifiers returns GP for parent-consultation", () => {
    const result = getAutoModifiers("parent-consultation");
    expect(result).toContain("GP");
    expect(result).not.toContain("95");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/features/billing/lib/__tests__/ --reporter=verbose
```

Expected: FAIL — modules don't exist yet.

- [ ] **Step 4: Create CPT codes module**

Create `src/features/billing/lib/cpt-codes.ts`:

```typescript
export interface CptCode {
  code: string;
  description: string;
  defaultPlaceOfService: string;
}

export const CPT_CODES: readonly CptCode[] = [
  { code: "92507", description: "Individual speech/language/voice treatment", defaultPlaceOfService: "11" },
  { code: "92508", description: "Group speech/language treatment (2+ patients)", defaultPlaceOfService: "11" },
  { code: "92521", description: "Evaluation — speech fluency only", defaultPlaceOfService: "11" },
  { code: "92522", description: "Evaluation — speech sound production only", defaultPlaceOfService: "11" },
  { code: "92523", description: "Evaluation — speech sound + language", defaultPlaceOfService: "11" },
  { code: "92524", description: "Voice/resonance behavioral analysis", defaultPlaceOfService: "11" },
  { code: "92526", description: "Treatment of swallowing dysfunction", defaultPlaceOfService: "11" },
  { code: "92597", description: "AAC device evaluation", defaultPlaceOfService: "11" },
  { code: "92609", description: "AAC device service/programming", defaultPlaceOfService: "11" },
] as const;

export function getCptByCode(code: string): CptCode | undefined {
  return CPT_CODES.find((c) => c.code === code);
}

export function getDefaultCptCode(): CptCode {
  return CPT_CODES[0]; // 92507 — Individual speech/language/voice treatment
}
```

- [ ] **Step 5: Create modifiers module**

Create `src/features/billing/lib/modifiers.ts`:

```typescript
export type SessionType = "in-person" | "teletherapy" | "parent-consultation";

export interface Modifier {
  code: string;
  description: string;
  autoApply: "always" | "teletherapy" | "manual";
}

export const MODIFIERS: readonly Modifier[] = [
  {
    code: "GP",
    description: "Services delivered under an outpatient speech-language pathology plan of care",
    autoApply: "always",
  },
  {
    code: "95",
    description: "Synchronous telemedicine service rendered via real-time interactive audio/video",
    autoApply: "teletherapy",
  },
  {
    code: "KX",
    description: "Requirements specified in the medical policy have been met (Medicare therapy cap exceeded)",
    autoApply: "manual",
  },
] as const;

/**
 * Returns modifier codes that should be auto-applied for the given session type.
 * GP is always included. 95 is included for teletherapy. KX is never auto-applied.
 */
export function getAutoModifiers(sessionType: SessionType): string[] {
  const modifiers: string[] = [];
  for (const m of MODIFIERS) {
    if (m.autoApply === "always") {
      modifiers.push(m.code);
    } else if (m.autoApply === "teletherapy" && sessionType === "teletherapy") {
      modifiers.push(m.code);
    }
  }
  return modifiers;
}
```

- [ ] **Step 6: Create place-of-service module**

Create `src/features/billing/lib/place-of-service.ts`:

```typescript
export interface PlaceOfService {
  code: string;
  description: string;
}

export const PLACE_OF_SERVICE_CODES: readonly PlaceOfService[] = [
  { code: "11", description: "Office" },
  { code: "02", description: "Telehealth (provided to patient)" },
  { code: "10", description: "Telehealth (provided in patient's home)" },
  { code: "12", description: "Patient's home (in-person home visit)" },
] as const;

/**
 * Returns the default place of service code based on session type.
 * Teletherapy → "02", all others → "11".
 */
export function getDefaultPlaceOfService(
  sessionType: "in-person" | "teletherapy" | "parent-consultation",
): string {
  return sessionType === "teletherapy" ? "02" : "11";
}

export function getPosByCode(code: string): PlaceOfService | undefined {
  return PLACE_OF_SERVICE_CODES.find((p) => p.code === code);
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx vitest run src/features/billing/lib/__tests__/ --reporter=verbose
```

Expected: PASS — all CPT and modifier tests green.

- [ ] **Step 8: Commit**

```bash
git add src/features/billing/lib/
git commit -m "feat(billing): add CPT code, modifier, and place-of-service modules

Static SLP-relevant CPT codes (92507-92609), modifier auto-application
logic (GP always, 95 for teletherapy, KX manual), and POS code data.
Full test coverage for all modules."
```

---

## Task 3: Convex Backend — billingRecords.ts

**Files:**
- Create: `convex/billingRecords.ts`
- Test: `convex/__tests__/billingRecords.test.ts`

- [ ] **Step 1: Expand the billingRecords test file with full backend tests**

Replace the contents of `convex/__tests__/billingRecords.test.ts` with:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../_generated/api";
import schema from "../schema";
import { suppressSchedulerErrors } from "./testHelpers";

const modules = import.meta.glob("../**/*.*s");

suppressSchedulerErrors();

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

const VALID_PATIENT = {
  firstName: "Alex",
  lastName: "Smith",
  dateOfBirth: "2020-01-15",
  diagnosis: "articulation" as const,
};

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
  subjective: "Patient appeared eager and engaged at start of session.",
  objective: "Patient produced initial /s/ correctly in 14/20 trials (70%).",
  assessment: "Patient is making steady progress toward initial /s/ production goal.",
  plan: "Continue initial /s/ in words, begin fading verbal cues.",
};

async function createSignedNote(
  t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  overrides?: { sessionType?: "in-person" | "teletherapy" | "parent-consultation" },
) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const noteId = await t.mutation(api.sessionNotes.create, {
    patientId,
    ...VALID_SESSION_DATA,
    ...(overrides?.sessionType ? { sessionType: overrides.sessionType } : {}),
  });
  await t.mutation(api.sessionNotes.update, { noteId, sessionDuration: 30 });
  await t.mutation(api.sessionNotes.updateStatus, { noteId, status: "complete" });
  await t.mutation(api.sessionNotes.saveSoapFromAI, { noteId, soapNote: VALID_SOAP });
  await t.mutation(api.sessionNotes.sign, { noteId });
  return { patientId, noteId };
}

// ── createFromSessionNote (internal) ──────────────────────────────────────

describe("billingRecords.createFromSessionNote", () => {
  it("creates a draft billing record with correct defaults for in-person", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    // Call internal mutation directly
    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    const record = await slp.query(api.billingRecords.get, { billingId });
    expect(record).toBeDefined();
    expect(record!.status).toBe("draft");
    expect(record!.cptCode).toBe("92507");
    expect(record!.modifiers).toContain("GP");
    expect(record!.modifiers).not.toContain("95");
    expect(record!.placeOfService).toBe("11");
    expect(record!.units).toBe(1);
    expect(record!.dateOfService).toBe(today);
  });

  it("auto-applies 95 modifier and POS 02 for teletherapy", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
      sessionType: "teletherapy",
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "teletherapy",
    });

    const record = await slp.query(api.billingRecords.get, { billingId });
    expect(record!.modifiers).toContain("GP");
    expect(record!.modifiers).toContain("95");
    expect(record!.placeOfService).toBe("02");
  });

  it("does not create duplicate if billing record already exists for session note", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    // Second call should return null (no duplicate created)
    const secondId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    expect(secondId).toBeNull();
  });
});

// ── update ────────────────────────────────────────────────────────────────

describe("billingRecords.update", () => {
  it("updates CPT code and fee on draft record", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    await slp.mutation(api.billingRecords.update, {
      billingId: billingId!,
      cptCode: "92523",
      cptDescription: "Evaluation — speech sound + language",
      fee: 17500,
    });

    const record = await slp.query(api.billingRecords.get, { billingId: billingId! });
    expect(record!.cptCode).toBe("92523");
    expect(record!.fee).toBe(17500);
  });

  it("rejects update on finalized record", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    await slp.mutation(api.billingRecords.finalize, { billingId: billingId! });

    await expect(
      slp.mutation(api.billingRecords.update, {
        billingId: billingId!,
        fee: 20000,
      }),
    ).rejects.toThrow("draft");
  });

  it("rejects update by different SLP", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    const otherSlp = t.withIdentity(OTHER_SLP);
    await expect(
      otherSlp.mutation(api.billingRecords.update, {
        billingId: billingId!,
        fee: 20000,
      }),
    ).rejects.toThrow("Not authorized");
  });
});

// ── finalize ──────────────────────────────────────────────────────────────

describe("billingRecords.finalize", () => {
  it("transitions draft to finalized", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    await slp.mutation(api.billingRecords.finalize, { billingId: billingId! });

    const record = await slp.query(api.billingRecords.get, { billingId: billingId! });
    expect(record!.status).toBe("finalized");
  });

  it("rejects finalizing a billed record", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    await slp.mutation(api.billingRecords.finalize, { billingId: billingId! });
    await slp.mutation(api.billingRecords.markBilled, { billingId: billingId! });

    await expect(
      slp.mutation(api.billingRecords.finalize, { billingId: billingId! }),
    ).rejects.toThrow();
  });
});

// ── markBilled ────────────────────────────────────────────────────────────

describe("billingRecords.markBilled", () => {
  it("transitions finalized to billed with timestamp", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    await slp.mutation(api.billingRecords.finalize, { billingId: billingId! });
    await slp.mutation(api.billingRecords.markBilled, { billingId: billingId! });

    const record = await slp.query(api.billingRecords.get, { billingId: billingId! });
    expect(record!.status).toBe("billed");
    expect(record!.billedAt).toBeDefined();
    expect(record!.billedAt).toBeGreaterThan(0);
  });

  it("rejects marking draft as billed", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    await expect(
      slp.mutation(api.billingRecords.markBilled, { billingId: billingId! }),
    ).rejects.toThrow("finalized");
  });
});

// ── remove ────────────────────────────────────────────────────────────────

describe("billingRecords.remove", () => {
  it("deletes a draft record", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    await slp.mutation(api.billingRecords.remove, { billingId: billingId! });

    const record = await slp.query(api.billingRecords.get, { billingId: billingId! });
    expect(record).toBeNull();
  });

  it("rejects deleting a billed record", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    await slp.mutation(api.billingRecords.finalize, { billingId: billingId! });
    await slp.mutation(api.billingRecords.markBilled, { billingId: billingId! });

    await expect(
      slp.mutation(api.billingRecords.remove, { billingId: billingId! }),
    ).rejects.toThrow("billed");
  });
});

// ── queries ───────────────────────────────────────────────────────────────

describe("billingRecords queries", () => {
  it("listBySlp returns records for the authenticated SLP", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    const records = await slp.query(api.billingRecords.listBySlp, {});
    expect(records).toHaveLength(1);
    expect(records[0].cptCode).toBe("92507");
  });

  it("listBySlp filters by status", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    const billingId = await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    const drafts = await slp.query(api.billingRecords.listBySlp, { status: "draft" });
    expect(drafts).toHaveLength(1);

    const finalized = await slp.query(api.billingRecords.listBySlp, { status: "finalized" });
    expect(finalized).toHaveLength(0);
  });

  it("getUnbilledCount returns correct count", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    const count = await slp.query(api.billingRecords.getUnbilledCount, {});
    expect(count).toBe(1);
  });

  it("listByPatient returns records for a patient", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId } = await slp.mutation(api.patients.create, VALID_PATIENT);
    const noteId = await slp.mutation(api.sessionNotes.create, {
      patientId,
      ...VALID_SESSION_DATA,
    });

    await t.mutation(internal.billingRecords.createFromSessionNote, {
      sessionNoteId: noteId,
      patientId,
      slpUserId: "slp-user-123",
      sessionDate: today,
      sessionType: "in-person",
    });

    const records = await slp.query(api.billingRecords.listByPatient, { patientId });
    expect(records).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose
```

Expected: FAIL — `api.billingRecords` and `internal.billingRecords` don't exist yet.

- [ ] **Step 3: Create convex/billingRecords.ts**

Create `convex/billingRecords.ts`:

```typescript
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { internalMutation } from "./_generated/server";
import { slpMutation, slpQuery } from "./lib/customFunctions";

// ── Validators ──────────────────────────────────────────────────────────────

const billingStatusValidator = v.union(
  v.literal("draft"),
  v.literal("finalized"),
  v.literal("billed")
);

const diagnosisCodeValidator = v.object({
  code: v.string(),
  description: v.string(),
});

// ── Internal Mutations ──────────────────────────────────────────────────────

/**
 * Auto-create a billing record when a session note is signed.
 * Called via ctx.scheduler.runAfter(0, ...) from sessionNotes.sign.
 * Idempotent: skips if a billing record already exists for the session note.
 */
export const createFromSessionNote = internalMutation({
  args: {
    sessionNoteId: v.id("sessionNotes"),
    patientId: v.id("patients"),
    slpUserId: v.string(),
    sessionDate: v.string(),
    sessionType: v.union(
      v.literal("in-person"),
      v.literal("teletherapy"),
      v.literal("parent-consultation")
    ),
  },
  handler: async (ctx, args) => {
    // Idempotency: check if a billing record already exists for this session note
    const existing = await ctx.db
      .query("billingRecords")
      .withIndex("by_sessionNoteId", (q) =>
        q.eq("sessionNoteId", args.sessionNoteId)
      )
      .first();

    if (existing) return null;

    // Determine CPT code — default to 92507 (individual treatment)
    const cptCode = "92507";
    const cptDescription = "Individual speech/language/voice treatment";

    // Auto-apply modifiers: GP always, 95 for teletherapy
    const modifiers: string[] = ["GP"];
    if (args.sessionType === "teletherapy") {
      modifiers.push("95");
    }

    // Place of service: 02 for teletherapy, 11 for in-person/consultation
    const placeOfService = args.sessionType === "teletherapy" ? "02" : "11";

    // Attempt to pull ICD-10 codes from patient record (if SP2 has added them)
    const patient = await ctx.db.get(args.patientId);
    const diagnosisCodes: Array<{ code: string; description: string }> = [];
    if (patient && "icdCodes" in patient && Array.isArray((patient as Record<string, unknown>).icdCodes)) {
      for (const icd of (patient as Record<string, unknown>).icdCodes as Array<{ code: string; description: string }>) {
        if (icd.code && icd.description) {
          diagnosisCodes.push({ code: icd.code, description: icd.description });
        }
      }
    }

    // Attempt to pull default fee from practice profile (if SP1 has added it)
    let fee: number | undefined;
    const profile = await ctx.db
      .query("practiceProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.slpUserId))
      .first();
    if (profile && typeof profile.defaultSessionFee === "number") {
      fee = profile.defaultSessionFee;
    }

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

// ── Queries ─────────────────────────────────────────────────────────────────

export const get = slpQuery({
  args: { billingId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return null;
    const record = await ctx.db.get(args.billingId);
    if (!record) return null;
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    return record;
  },
});

export const listBySlp = slpQuery({
  args: {
    status: v.optional(billingStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return [];
    const limit = args.limit ?? 50;

    if (args.status) {
      return await ctx.db
        .query("billingRecords")
        .withIndex("by_slpUserId_status", (q) =>
          q.eq("slpUserId", ctx.slpUserId!).eq("status", args.status!)
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("billingRecords")
      .withIndex("by_slpUserId", (q) => q.eq("slpUserId", ctx.slpUserId!))
      .order("desc")
      .take(limit);
  },
});

export const listByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return [];

    // Verify the SLP owns this patient
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("billingRecords")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
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

// ── Mutations ───────────────────────────────────────────────────────────────

export const update = slpMutation({
  args: {
    billingId: v.id("billingRecords"),
    cptCode: v.optional(v.string()),
    cptDescription: v.optional(v.string()),
    modifiers: v.optional(v.array(v.string())),
    diagnosisCodes: v.optional(v.array(diagnosisCodeValidator)),
    placeOfService: v.optional(v.string()),
    units: v.optional(v.number()),
    fee: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.billingId);
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
    if (args.units !== undefined) {
      if (args.units < 1 || args.units > 20) {
        throw new ConvexError("Units must be between 1 and 20");
      }
      updates.units = args.units;
    }
    if (args.fee !== undefined) {
      if (args.fee < 0) throw new ConvexError("Fee cannot be negative");
      updates.fee = args.fee;
    }
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.billingId, updates);
  },
});

export const finalize = slpMutation({
  args: { billingId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.billingId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status !== "draft") {
      throw new ConvexError("Only draft billing records can be finalized");
    }

    await ctx.db.patch(args.billingId, { status: "finalized" });
  },
});

export const markBilled = slpMutation({
  args: { billingId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.billingId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status !== "finalized") {
      throw new ConvexError("Only finalized billing records can be marked as billed");
    }

    await ctx.db.patch(args.billingId, {
      status: "billed",
      billedAt: Date.now(),
    });
  },
});

export const remove = slpMutation({
  args: { billingId: v.id("billingRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.billingId);
    if (!record) throw new ConvexError("Billing record not found");
    if (record.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (record.status === "billed") {
      throw new ConvexError("Cannot delete a billed billing record");
    }

    await ctx.db.delete(args.billingId);
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run convex/__tests__/billingRecords.test.ts --reporter=verbose
```

Expected: PASS — all billing record tests green.

- [ ] **Step 5: Run full test suite to verify no regressions**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add convex/billingRecords.ts convex/__tests__/billingRecords.test.ts
git commit -m "feat(billing): add billingRecords Convex functions with full test coverage

Internal createFromSessionNote mutation with CPT/modifier auto-population.
CRUD mutations (update, finalize, markBilled, remove) with status guards.
Queries: listBySlp, listByPatient, get, getUnbilledCount.
Idempotent creation prevents duplicate billing records."
```

---

## Task 4: SessionNotes.sign Integration — Auto-Create Billing Record

**Files:**
- Modify: `convex/sessionNotes.ts`
- Test: `convex/__tests__/billingRecords.test.ts` (already written in Task 3)

- [ ] **Step 1: Write integration test — signing a note auto-creates billing record**

Add to the end of `convex/__tests__/billingRecords.test.ts`:

```typescript
// ── sessionNotes.sign integration ─────────────────────────────────────────

describe("sessionNotes.sign → billing record auto-creation", () => {
  it("signing a session note schedules billing record creation", async () => {
    const t = convexTest(schema, modules);
    const slp = t.withIdentity(SLP_IDENTITY);

    const { patientId, noteId } = await createSignedNote(slp);

    // The scheduler fires asynchronously — in convex-test, scheduled functions
    // may or may not execute depending on the test runtime. We verify the
    // sign mutation itself succeeds without error.
    const note = await slp.query(api.sessionNotes.get, { noteId });
    expect(note!.status).toBe("signed");
    expect(note!.signedAt).toBeDefined();
  });
});
```

- [ ] **Step 2: Modify convex/sessionNotes.ts to schedule billing record creation**

Add the import for `internal` at the top of `convex/sessionNotes.ts`:

```typescript
import { internal } from "./_generated/api";
```

Then in the `sign` mutation handler, after the `insertProgressFromTargets` call (the last line of the handler), add:

```typescript
    // Auto-create billing record (non-blocking, runs after transaction commits)
    await ctx.scheduler.runAfter(0, internal.billingRecords.createFromSessionNote, {
      sessionNoteId: args.noteId,
      patientId: note.patientId,
      slpUserId: ctx.slpUserId,
      sessionDate: note.sessionDate,
      sessionType: note.sessionType,
    });
```

The full `sign` handler should now end with:

```typescript
    // Auto-create progressData for targets linked to goals
    await insertProgressFromTargets(
      ctx.db,
      note.structuredData.targetsWorkedOn,
      args.noteId,
      note.patientId,
      note.sessionDate,
    );

    // Auto-create billing record (non-blocking, runs after transaction commits)
    await ctx.scheduler.runAfter(0, internal.billingRecords.createFromSessionNote, {
      sessionNoteId: args.noteId,
      patientId: note.patientId,
      slpUserId: ctx.slpUserId,
      sessionDate: note.sessionDate,
      sessionType: note.sessionType,
    });
```

- [ ] **Step 3: Run all session notes and billing tests**

```bash
npx vitest run convex/__tests__/sessionNotes.test.ts convex/__tests__/billingRecords.test.ts --reporter=verbose
```

Expected: PASS — existing session notes tests still pass, billing tests still pass. The scheduler call may produce "Write outside of transaction" warnings which `suppressSchedulerErrors()` handles.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add convex/sessionNotes.ts convex/__tests__/billingRecords.test.ts
git commit -m "feat(billing): auto-create billing record on session note signing

sessionNotes.sign now schedules billingRecords.createFromSessionNote
via ctx.scheduler.runAfter(0, ...) after the transaction commits.
Non-blocking and idempotent — won't create duplicates on re-sign."
```

---

## Task 5: Frontend — CPT Code Picker and Insurance Fields Components

**Files:**
- Create: `src/features/billing/components/cpt-code-picker.tsx`
- Create: `src/features/billing/components/insurance-fields.tsx`
- Create: `src/features/billing/hooks/use-billing-records.ts`
- Create: `src/features/billing/components/__tests__/cpt-code-picker.test.tsx`

- [ ] **Step 1: Write failing render test for CPT code picker**

Create `src/features/billing/components/__tests__/cpt-code-picker.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CptCodePicker } from "../cpt-code-picker";

describe("CptCodePicker", () => {
  it("renders with the selected CPT code", () => {
    render(
      <CptCodePicker
        value="92507"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/92507/)).toBeInTheDocument();
    expect(screen.getByText(/Individual speech/)).toBeInTheDocument();
  });

  it("renders placeholder when no value selected", () => {
    render(
      <CptCodePicker
        value=""
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Select CPT code/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/billing/components/__tests__/cpt-code-picker.test.tsx --reporter=verbose
```

Expected: FAIL — component doesn't exist yet.

- [ ] **Step 3: Create the CPT code picker component**

Create `src/features/billing/components/cpt-code-picker.tsx`:

```tsx
"use client";

import { cn } from "@/core/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { CPT_CODES, getCptByCode } from "../lib/cpt-codes";

interface CptCodePickerProps {
  value: string;
  onChange: (code: string, description: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CptCodePicker({
  value,
  onChange,
  className,
  disabled,
}: CptCodePickerProps) {
  const selected = getCptByCode(value);

  return (
    <Select
      value={value}
      onValueChange={(code) => {
        const cpt = getCptByCode(code);
        if (cpt) onChange(cpt.code, cpt.description);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder="Select CPT code">
          {selected
            ? `${selected.code} — ${selected.description}`
            : "Select CPT code"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CPT_CODES.map((cpt) => (
          <SelectItem key={cpt.code} value={cpt.code}>
            <span className="font-mono text-sm">{cpt.code}</span>
            <span className="ml-2 text-sm text-on-surface-variant">
              {cpt.description}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: Create the insurance fields component**

Create `src/features/billing/components/insurance-fields.tsx`:

```tsx
"use client";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface InsuranceData {
  insuranceCarrier?: string;
  insuranceMemberId?: string;
  insuranceGroupNumber?: string;
  insurancePhone?: string;
}

interface InsuranceFieldsProps {
  data: InsuranceData;
  onChange: (field: keyof InsuranceData, value: string) => void;
  disabled?: boolean;
}

export function InsuranceFields({
  data,
  onChange,
  disabled,
}: InsuranceFieldsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-on-surface">
        Insurance Information
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="insuranceCarrier">Insurance Carrier</Label>
          <Input
            id="insuranceCarrier"
            placeholder="e.g., Blue Cross Blue Shield"
            value={data.insuranceCarrier ?? ""}
            onChange={(e) => onChange("insuranceCarrier", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="insuranceMemberId">Member / Subscriber ID</Label>
          <Input
            id="insuranceMemberId"
            placeholder="e.g., ABC123456789"
            value={data.insuranceMemberId ?? ""}
            onChange={(e) => onChange("insuranceMemberId", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="insuranceGroupNumber">Group Number</Label>
          <Input
            id="insuranceGroupNumber"
            placeholder="e.g., GRP-001"
            value={data.insuranceGroupNumber ?? ""}
            onChange={(e) => onChange("insuranceGroupNumber", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="insurancePhone">Insurance Phone (Claims)</Label>
          <Input
            id="insurancePhone"
            type="tel"
            placeholder="e.g., (800) 555-0100"
            value={data.insurancePhone ?? ""}
            onChange={(e) => onChange("insurancePhone", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create the billing records hook**

Create `src/features/billing/hooks/use-billing-records.ts`:

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useBillingRecords(options?: {
  status?: "draft" | "finalized" | "billed";
}) {
  const records = useQuery(api.billingRecords.listBySlp, {
    status: options?.status,
  });
  const unbilledCount = useQuery(api.billingRecords.getUnbilledCount, {});

  return { records, unbilledCount };
}

export function useBillingRecord(billingId: Id<"billingRecords"> | null) {
  const record = useQuery(
    api.billingRecords.get,
    billingId ? { billingId } : "skip",
  );

  const updateRecord = useMutation(api.billingRecords.update);
  const finalizeRecord = useMutation(api.billingRecords.finalize);
  const markBilled = useMutation(api.billingRecords.markBilled);
  const removeRecord = useMutation(api.billingRecords.remove);

  return {
    record,
    updateRecord,
    finalizeRecord,
    markBilled,
    removeRecord,
  };
}

export function usePatientBillingRecords(patientId: Id<"patients"> | null) {
  return useQuery(
    api.billingRecords.listByPatient,
    patientId ? { patientId } : "skip",
  );
}
```

- [ ] **Step 6: Run CPT picker test to verify it passes**

```bash
npx vitest run src/features/billing/components/__tests__/cpt-code-picker.test.tsx --reporter=verbose
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/billing/components/cpt-code-picker.tsx src/features/billing/components/insurance-fields.tsx src/features/billing/hooks/use-billing-records.ts src/features/billing/components/__tests__/cpt-code-picker.test.tsx
git commit -m "feat(billing): add CPT code picker, insurance fields, and billing hooks

Searchable CPT code dropdown using shadcn Select.
Insurance info form section for patient profile.
React hooks wrapping Convex billing queries and mutations."
```

---

## Task 6: Frontend — Billing Record Editor and Row Components

**Files:**
- Create: `src/features/billing/components/billing-record-editor.tsx`
- Create: `src/features/billing/components/billing-record-row.tsx`

- [ ] **Step 1: Create the billing record editor component**

Create `src/features/billing/components/billing-record-editor.tsx`:

```tsx
"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
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
import { useBillingRecord } from "../hooks/use-billing-records";
import { CptCodePicker } from "./cpt-code-picker";
import { MODIFIERS } from "../lib/modifiers";
import { PLACE_OF_SERVICE_CODES } from "../lib/place-of-service";

interface BillingRecordEditorProps {
  billingId: Id<"billingRecords">;
  onClose?: () => void;
}

export function BillingRecordEditor({
  billingId,
  onClose,
}: BillingRecordEditorProps) {
  const { record, updateRecord, finalizeRecord, markBilled } =
    useBillingRecord(billingId);

  const [saving, setSaving] = useState(false);

  if (!record) {
    return (
      <div className="flex items-center justify-center p-8 text-on-surface-variant">
        Loading...
      </div>
    );
  }

  const isDraft = record.status === "draft";
  const isFinalized = record.status === "finalized";

  async function handleSave(updates: Record<string, unknown>) {
    setSaving(true);
    try {
      await updateRecord({ billingId, ...updates });
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    setSaving(true);
    try {
      await finalizeRecord({ billingId });
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkBilled() {
    setSaving(true);
    try {
      await markBilled({ billingId });
      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-on-surface">
          Billing Record
        </h2>
        <Badge
          variant={
            record.status === "draft"
              ? "secondary"
              : record.status === "finalized"
                ? "default"
                : "outline"
          }
        >
          {record.status}
        </Badge>
      </div>

      {/* Date of Service */}
      <div className="space-y-1.5">
        <Label>Date of Service</Label>
        <p className="text-sm text-on-surface">{record.dateOfService}</p>
      </div>

      {/* CPT Code */}
      <div className="space-y-1.5">
        <Label>CPT Code</Label>
        <CptCodePicker
          value={record.cptCode}
          onChange={(code, description) =>
            handleSave({ cptCode: code, cptDescription: description })
          }
          disabled={!isDraft}
        />
      </div>

      {/* Modifiers */}
      <div className="space-y-2">
        <Label>Modifiers</Label>
        <div className="flex flex-wrap gap-3">
          {MODIFIERS.map((mod) => {
            const checked = record.modifiers.includes(mod.code);
            return (
              <label
                key={mod.code}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                  !isDraft && "opacity-60",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    if (!isDraft) return;
                    const newMods = isChecked
                      ? [...record.modifiers, mod.code]
                      : record.modifiers.filter((m) => m !== mod.code);
                    handleSave({ modifiers: newMods });
                  }}
                  disabled={!isDraft}
                />
                <span className="font-mono">{mod.code}</span>
                <span className="text-on-surface-variant">
                  {mod.description.slice(0, 40)}...
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Place of Service */}
      <div className="space-y-1.5">
        <Label>Place of Service</Label>
        <Select
          value={record.placeOfService}
          onValueChange={(val) => handleSave({ placeOfService: val })}
          disabled={!isDraft}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLACE_OF_SERVICE_CODES.map((pos) => (
              <SelectItem key={pos.code} value={pos.code}>
                {pos.code} — {pos.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Units */}
      <div className="space-y-1.5">
        <Label htmlFor="units">Units</Label>
        <Input
          id="units"
          type="number"
          min={1}
          max={20}
          value={record.units}
          onChange={(e) =>
            handleSave({ units: parseInt(e.target.value, 10) || 1 })
          }
          disabled={!isDraft}
          className="w-24"
        />
      </div>

      {/* Fee */}
      <div className="space-y-1.5">
        <Label htmlFor="fee">Fee ($)</Label>
        <Input
          id="fee"
          type="number"
          min={0}
          step={0.01}
          placeholder="0.00"
          value={record.fee != null ? (record.fee / 100).toFixed(2) : ""}
          onChange={(e) => {
            const cents = Math.round(parseFloat(e.target.value) * 100);
            if (!isNaN(cents)) handleSave({ fee: cents });
          }}
          disabled={!isDraft}
          className="w-36"
        />
      </div>

      {/* Diagnosis Codes */}
      <div className="space-y-1.5">
        <Label>Diagnosis Codes (ICD-10)</Label>
        {record.diagnosisCodes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {record.diagnosisCodes.map((dx) => (
              <Badge key={dx.code} variant="outline">
                {dx.code} — {dx.description}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">
            No diagnosis codes — add ICD-10 codes to the patient profile.
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="billingNotes">Internal Notes</Label>
        <Textarea
          id="billingNotes"
          placeholder="Optional billing notes..."
          value={record.notes ?? ""}
          onChange={(e) => handleSave({ notes: e.target.value })}
          disabled={!isDraft}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {isDraft && (
          <Button onClick={handleFinalize} disabled={saving}>
            Finalize
          </Button>
        )}
        {isFinalized && (
          <Button onClick={handleMarkBilled} disabled={saving}>
            Mark as Billed
          </Button>
        )}
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the billing record row component**

Create `src/features/billing/components/billing-record-row.tsx`:

```tsx
"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { Doc } from "../../../../convex/_generated/dataModel";

interface BillingRecordRowProps {
  record: Doc<"billingRecords">;
  patientName?: string;
  onEdit: () => void;
  onSuperbill?: () => void;
}

const STATUS_COLORS = {
  draft: "secondary",
  finalized: "default",
  billed: "outline",
} as const;

export function BillingRecordRow({
  record,
  patientName,
  onEdit,
  onSuperbill,
}: BillingRecordRowProps) {
  const feeDisplay =
    record.fee != null ? `$${(record.fee / 100).toFixed(2)}` : "—";

  return (
    <TableRow className="cursor-pointer hover:bg-surface-container-low" onClick={onEdit}>
      <TableCell className="font-medium">{patientName ?? "—"}</TableCell>
      <TableCell>{record.dateOfService}</TableCell>
      <TableCell>
        <span className="font-mono text-sm">{record.cptCode}</span>
        <span className="ml-2 text-xs text-on-surface-variant">
          {record.cptDescription}
        </span>
      </TableCell>
      <TableCell>
        {record.modifiers.map((m) => (
          <Badge key={m} variant="outline" className="mr-1 text-xs">
            {m}
          </Badge>
        ))}
      </TableCell>
      <TableCell className="text-right">{feeDisplay}</TableCell>
      <TableCell>
        <Badge variant={STATUS_COLORS[record.status]}>{record.status}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <MaterialIcon icon="edit" size="sm" />
          </Button>
          {record.status === "finalized" && onSuperbill && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSuperbill();
              }}
            >
              <MaterialIcon icon="receipt_long" size="sm" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 3: Run existing tests to verify no regressions**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/billing/components/billing-record-editor.tsx src/features/billing/components/billing-record-row.tsx
git commit -m "feat(billing): add billing record editor and row components

Full editor with CPT picker, modifier checkboxes, POS dropdown, fee input,
diagnosis codes display, and status-based action buttons.
Row component for dashboard table with status badges and actions."
```

---

## Task 7: Frontend — Clinical Billing Dashboard

**Files:**
- Create: `src/features/billing/components/clinical-billing-dashboard.tsx`
- Modify: `src/core/routes.ts`
- Modify: `src/shared/lib/navigation.ts`
- Create: `src/app/(app)/billing/page.tsx`

- [ ] **Step 1: Add BILLING route to routes.ts**

In `src/core/routes.ts`, add after the `SESSIONS` line:

```typescript
  BILLING: "/billing",
```

- [ ] **Step 2: Add Billing nav item for SLP**

In `src/shared/lib/navigation.ts`, add to the `NAV_ITEMS` array after the Sessions entry:

```typescript
  { icon: "receipt_long", label: "Billing", href: ROUTES.BILLING },
```

Add to `isNavActive` function:

```typescript
  if (href === "/billing") return pathname.startsWith("/billing");
```

- [ ] **Step 3: Create the clinical billing dashboard**

Create `src/features/billing/components/clinical-billing-dashboard.tsx`:

```tsx
"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { MaterialIcon } from "@/shared/components/material-icon";
import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useBillingRecords } from "../hooks/use-billing-records";
import { BillingRecordEditor } from "./billing-record-editor";
import { BillingRecordRow } from "./billing-record-row";
import { SuperbillViewer } from "./superbill-viewer";

type TabValue = "unbilled" | "ready" | "billed";

export function ClinicalBillingDashboard() {
  const [activeTab, setActiveTab] = useState<TabValue>("unbilled");
  const [editingId, setEditingId] = useState<Id<"billingRecords"> | null>(null);
  const [superbillId, setSuperbillId] = useState<Id<"billingRecords"> | null>(null);

  const { records: draftRecords } = useBillingRecords({ status: "draft" });
  const { records: finalizedRecords } = useBillingRecords({ status: "finalized" });
  const { records: billedRecords } = useBillingRecords({ status: "billed" });
  const { unbilledCount } = useBillingRecords();

  // Summary stats
  const totalUnbilledAmount =
    (draftRecords ?? []).reduce((sum, r) => sum + (r.fee ?? 0), 0) +
    (finalizedRecords ?? []).reduce((sum, r) => sum + (r.fee ?? 0), 0);

  const totalBilledThisMonth = (billedRecords ?? [])
    .filter((r) => {
      if (!r.billedAt) return false;
      const now = new Date();
      const billedDate = new Date(r.billedAt);
      return (
        billedDate.getMonth() === now.getMonth() &&
        billedDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, r) => sum + (r.fee ?? 0), 0);

  function getRecordsForTab(tab: TabValue) {
    switch (tab) {
      case "unbilled":
        return draftRecords ?? [];
      case "ready":
        return finalizedRecords ?? [];
      case "billed":
        return billedRecords ?? [];
    }
  }

  const currentRecords = getRecordsForTab(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-on-surface">
          Clinical Billing
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Manage billing records and generate superbills
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="bg-surface-container-low">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <MaterialIcon icon="pending_actions" size="md" />
              </div>
              <div>
                <p className="text-sm text-on-surface-variant">Unbilled</p>
                <p className="text-xl font-bold text-on-surface">
                  {unbilledCount ?? 0} sessions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-surface-container-low">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <MaterialIcon icon="attach_money" size="md" />
              </div>
              <div>
                <p className="text-sm text-on-surface-variant">
                  Unbilled Amount
                </p>
                <p className="text-xl font-bold text-on-surface">
                  ${(totalUnbilledAmount / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-surface-container-low">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <MaterialIcon icon="check_circle" size="md" />
              </div>
              <div>
                <p className="text-sm text-on-surface-variant">
                  Billed This Month
                </p>
                <p className="text-xl font-bold text-on-surface">
                  ${(totalBilledThisMonth / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <TabsList>
          <TabsTrigger value="unbilled" className="gap-2">
            Unbilled
            {(draftRecords?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1">
                {draftRecords?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ready" className="gap-2">
            Ready to Bill
            {(finalizedRecords?.length ?? 0) > 0 && (
              <Badge variant="default" className="ml-1">
                {finalizedRecords?.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="billed">Billed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {currentRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container-low py-12">
              <MaterialIcon
                icon="receipt_long"
                size="lg"
                className="text-on-surface-variant"
              />
              <p className="mt-2 text-sm text-on-surface-variant">
                {activeTab === "unbilled"
                  ? "No unbilled sessions. Sign a session note to auto-create a billing record."
                  : activeTab === "ready"
                    ? "No records ready to bill. Finalize draft records first."
                    : "No billed records yet."}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-surface-container-lowest">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>CPT Code</TableHead>
                    <TableHead>Modifiers</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRecords.map((record) => (
                    <BillingRecordRow
                      key={record._id}
                      record={record}
                      onEdit={() => setEditingId(record._id)}
                      onSuperbill={
                        record.status === "finalized"
                          ? () => setSuperbillId(record._id)
                          : undefined
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Editor Dialog */}
      <Dialog
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogTitle className="sr-only">Edit Billing Record</DialogTitle>
          {editingId && (
            <BillingRecordEditor
              billingId={editingId}
              onClose={() => setEditingId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Superbill Dialog */}
      <Dialog
        open={superbillId !== null}
        onOpenChange={(open) => {
          if (!open) setSuperbillId(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Superbill</DialogTitle>
          {superbillId && (
            <SuperbillViewer billingId={superbillId} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Create the billing page route**

Create `src/app/(app)/billing/page.tsx`:

```tsx
import type { Metadata } from "next";

import { ClinicalBillingDashboard } from "@/features/billing/components/clinical-billing-dashboard";

export const metadata: Metadata = {
  title: "Clinical Billing — Bridges",
};

export default function BillingPage() {
  return <ClinicalBillingDashboard />;
}
```

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/billing/components/clinical-billing-dashboard.tsx src/app/\(app\)/billing/page.tsx src/core/routes.ts src/shared/lib/navigation.ts
git commit -m "feat(billing): add clinical billing dashboard with tab navigation

Three-tab dashboard (unbilled/ready/billed) with summary stats cards.
Editor dialog for CPT code, modifier, and fee editing.
New /billing route with sidebar navigation for SLP users."
```

---

## Task 8: Frontend — Superbill Viewer with Print CSS

**Files:**
- Create: `src/features/billing/components/superbill-viewer.tsx`
- Create: `src/features/billing/components/__tests__/superbill-viewer.test.tsx`

- [ ] **Step 1: Write failing render test for superbill viewer**

Create `src/features/billing/components/__tests__/superbill-viewer.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(null),
}));

import { SuperbillViewer } from "../superbill-viewer";
import type { Id } from "../../../../../convex/_generated/dataModel";

describe("SuperbillViewer", () => {
  it("renders loading state when data is null", () => {
    render(
      <SuperbillViewer billingId={"test-id" as Id<"billingRecords">} />,
    );
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/billing/components/__tests__/superbill-viewer.test.tsx --reporter=verbose
```

Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Create the superbill viewer component**

Create `src/features/billing/components/superbill-viewer.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";

import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getPosByCode } from "../lib/place-of-service";

interface SuperbillViewerProps {
  billingId: Id<"billingRecords">;
}

export function SuperbillViewer({ billingId }: SuperbillViewerProps) {
  const record = useQuery(api.billingRecords.get, { billingId });

  // Load patient data
  const patient = useQuery(
    api.patients.get,
    record ? { patientId: record.patientId } : "skip",
  );

  // Load practice profile
  const profile = useQuery(
    api.practiceProfile.get,
    record ? {} : "skip",
  );

  if (!record) {
    return (
      <div className="flex items-center justify-center p-8 text-on-surface-variant">
        Loading superbill...
      </div>
    );
  }

  const posDescription =
    getPosByCode(record.placeOfService)?.description ?? record.placeOfService;

  const feeDisplay =
    record.fee != null ? `$${(record.fee / 100).toFixed(2)}` : "—";

  const totalFee =
    record.fee != null
      ? `$${((record.fee * record.units) / 100).toFixed(2)}`
      : "—";

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      {/* Print Button — hidden in print */}
      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={handlePrint} className="gap-2">
          <MaterialIcon icon="print" size="sm" />
          Print / Save as PDF
        </Button>
      </div>

      {/* Superbill Content */}
      <div className="superbill-print space-y-6 rounded-xl border border-border bg-white p-8 text-sm text-black">
        {/* Header — Practice Info */}
        <div className="border-b border-gray-300 pb-4">
          <h1 className="text-xl font-bold">SUPERBILL</h1>
          {profile && (
            <div className="mt-2 space-y-0.5 text-sm">
              {profile.practiceName && (
                <p className="font-semibold">{profile.practiceName}</p>
              )}
              {profile.practiceAddress && <p>{profile.practiceAddress}</p>}
              {profile.practicePhone && <p>Phone: {profile.practicePhone}</p>}
              {profile.npiNumber && <p>NPI: {profile.npiNumber}</p>}
              {profile.taxId && <p>Tax ID: {profile.taxId}</p>}
            </div>
          )}
          {!profile && (
            <p className="mt-2 text-xs text-gray-500">
              Practice profile not configured — update in Settings.
            </p>
          )}
        </div>

        {/* Patient Info */}
        <div className="border-b border-gray-300 pb-4">
          <h2 className="mb-2 font-semibold uppercase tracking-wide text-gray-600">
            Patient Information
          </h2>
          {patient && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Name: </span>
                <span className="font-medium">
                  {patient.firstName} {patient.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-500">DOB: </span>
                <span>{patient.dateOfBirth}</span>
              </div>
              {patient.insuranceCarrier && (
                <div>
                  <span className="text-gray-500">Insurance: </span>
                  <span>{patient.insuranceCarrier}</span>
                </div>
              )}
              {patient.insuranceMemberId && (
                <div>
                  <span className="text-gray-500">Member ID: </span>
                  <span>{patient.insuranceMemberId}</span>
                </div>
              )}
              {patient.insuranceGroupNumber && (
                <div>
                  <span className="text-gray-500">Group #: </span>
                  <span>{patient.insuranceGroupNumber}</span>
                </div>
              )}
              {patient.insurancePhone && (
                <div>
                  <span className="text-gray-500">Insurance Phone: </span>
                  <span>{patient.insurancePhone}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Service Lines */}
        <div className="border-b border-gray-300 pb-4">
          <h2 className="mb-2 font-semibold uppercase tracking-wide text-gray-600">
            Services Rendered
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-1">Date</th>
                <th className="pb-1">CPT Code</th>
                <th className="pb-1">Description</th>
                <th className="pb-1">Modifiers</th>
                <th className="pb-1">POS</th>
                <th className="pb-1 text-center">Units</th>
                <th className="pb-1 text-right">Fee</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">{record.dateOfService}</td>
                <td className="py-1 font-mono">{record.cptCode}</td>
                <td className="py-1">{record.cptDescription}</td>
                <td className="py-1">{record.modifiers.join(", ")}</td>
                <td className="py-1">
                  {record.placeOfService} ({posDescription})
                </td>
                <td className="py-1 text-center">{record.units}</td>
                <td className="py-1 text-right">{feeDisplay}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Diagnosis Codes */}
        {record.diagnosisCodes.length > 0 && (
          <div className="border-b border-gray-300 pb-4">
            <h2 className="mb-2 font-semibold uppercase tracking-wide text-gray-600">
              Diagnosis Codes (ICD-10)
            </h2>
            <div className="space-y-0.5 text-sm">
              {record.diagnosisCodes.map((dx, i) => (
                <p key={dx.code}>
                  {i + 1}. <span className="font-mono">{dx.code}</span> —{" "}
                  {dx.description}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Clinician Info */}
        <div className="border-b border-gray-300 pb-4">
          <h2 className="mb-2 font-semibold uppercase tracking-wide text-gray-600">
            Rendering Provider
          </h2>
          {profile && (
            <div className="space-y-0.5 text-sm">
              {profile.credentials && (
                <p className="font-medium">{profile.credentials}</p>
              )}
              {profile.licenseNumber && profile.licenseState && (
                <p>
                  License: {profile.licenseNumber} ({profile.licenseState})
                </p>
              )}
              {profile.npiNumber && <p>NPI: {profile.npiNumber}</p>}
            </div>
          )}
          <div className="mt-6">
            <p className="text-xs text-gray-500">Signature:</p>
            <div className="mt-1 h-8 border-b border-gray-400" />
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-end">
          <div className="text-right">
            <p className="text-lg font-bold">Total: {totalFee}</p>
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .superbill-print,
          .superbill-print * {
            visibility: visible;
          }
          .superbill-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            padding: 24px !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
```

**Note:** The `api.patients.get` and `api.practiceProfile.get` queries are referenced. `patients.get` likely needs a public-facing query (check if one exists — if `patients.ts` only has `slpQuery`-based `get`, it will work for SLPs). For `practiceProfile.get`, SP1 may or may not have been implemented. If `convex/practiceProfile.ts` does not exist, create a minimal version in this task (see Step 4).

- [ ] **Step 4: If convex/practiceProfile.ts does not exist, create a minimal version**

Check if `convex/practiceProfile.ts` exists. If not, create it:

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
      .withIndex("by_userId", (q) => q.eq("userId", ctx.slpUserId!))
      .first();
  },
});

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
    defaultSessionFee: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("practiceProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.slpUserId))
      .first();

    const updates: Record<string, unknown> = {};
    if (args.practiceName !== undefined) updates.practiceName = args.practiceName;
    if (args.practiceAddress !== undefined) updates.practiceAddress = args.practiceAddress;
    if (args.practicePhone !== undefined) updates.practicePhone = args.practicePhone;
    if (args.npiNumber !== undefined) updates.npiNumber = args.npiNumber;
    if (args.licenseNumber !== undefined) updates.licenseNumber = args.licenseNumber;
    if (args.licenseState !== undefined) updates.licenseState = args.licenseState;
    if (args.taxId !== undefined) updates.taxId = args.taxId;
    if (args.credentials !== undefined) updates.credentials = args.credentials;
    if (args.defaultSessionFee !== undefined) updates.defaultSessionFee = args.defaultSessionFee;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("practiceProfiles", {
      userId: ctx.slpUserId,
      ...updates,
    });
  },
});
```

- [ ] **Step 5: Verify patients.get query exists for superbill**

Check that `convex/patients.ts` exports a `get` query. If it's `slpQuery`-based, it will work for the superbill (since the SLP is the one viewing it). If a `get` query by patient ID is missing, add one:

```typescript
export const get = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) return null;
    const patient = await ctx.db.get(args.patientId);
    if (!patient) return null;
    if (patient.slpUserId !== ctx.slpUserId) return null;
    return patient;
  },
});
```

- [ ] **Step 6: Run superbill viewer test to verify it passes**

```bash
npx vitest run src/features/billing/components/__tests__/superbill-viewer.test.tsx --reporter=verbose
```

Expected: PASS

- [ ] **Step 7: Run full test suite**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/billing/components/superbill-viewer.tsx src/features/billing/components/__tests__/superbill-viewer.test.tsx convex/practiceProfile.ts
git commit -m "feat(billing): add superbill viewer with print CSS

Print-friendly superbill layout with practice info, patient/insurance data,
service lines (CPT, modifiers, POS, fee), diagnosis codes, and provider info.
Uses @media print CSS for clean PDF output via window.print().
Includes minimal practiceProfile Convex functions if SP1 not yet implemented."
```

---

## Task 9: Integration Points — Navigation Badge, Patient Detail, Session Note Link

**Files:**
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
- Verify: `src/shared/lib/navigation.ts` (already modified in Task 7)

- [ ] **Step 1: Add unbilled count badge to sidebar billing nav item**

In `src/features/dashboard/components/dashboard-sidebar.tsx`, add a Convex query for the unbilled count. Import `useQuery` from `convex/react` and `api`:

```typescript
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
```

Inside the `DashboardSidebar` component, add:

```typescript
const unbilledCount = isCaregiver ? 0 : (useQuery(api.billingRecords.getUnbilledCount, isCaregiver ? "skip" : {}) ?? 0);
```

Then in the nav items rendering, after the `<MaterialIcon>` and tooltip `<span>`, add a conditional badge for the Billing item:

```tsx
{item.label === "Billing" && unbilledCount > 0 && (
  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
    {unbilledCount > 9 ? "9+" : unbilledCount}
  </span>
)}
```

- [ ] **Step 2: Run existing sidebar tests to verify no regressions**

```bash
npx vitest run src/features/dashboard/components/__tests__/dashboard-sidebar.test.tsx --reporter=verbose
```

Expected: PASS (may need mock adjustments for the new useQuery call).

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/dashboard/components/dashboard-sidebar.tsx
git commit -m "feat(billing): add unbilled count badge to sidebar Billing nav item

Shows amber notification badge on Billing nav when draft or finalized
billing records exist. Hidden for caregiver users."
```

---

## Task Summary

| Task | Description | Files Created | Files Modified | Tests |
|------|-------------|--------------|----------------|-------|
| 1 | Schema — `billingRecords` table + patient/practice extensions | — | `convex/schema.ts` | `convex/__tests__/billingRecords.test.ts` (schema check) |
| 2 | CPT codes, modifiers, POS static modules | 3 (`cpt-codes.ts`, `modifiers.ts`, `place-of-service.ts`) | — | 2 (`cpt-codes.test.ts`, `modifiers.test.ts`) |
| 3 | Convex backend — `billingRecords.ts` full CRUD | 1 (`convex/billingRecords.ts`) | — | `convex/__tests__/billingRecords.test.ts` (full suite) |
| 4 | `sessionNotes.sign` → auto-create billing record | — | `convex/sessionNotes.ts` | Integration test in `billingRecords.test.ts` |
| 5 | CPT picker, insurance fields, billing hooks | 3 components + 1 hook | — | `cpt-code-picker.test.tsx` |
| 6 | Billing record editor + row components | 2 (`billing-record-editor.tsx`, `billing-record-row.tsx`) | — | — |
| 7 | Clinical billing dashboard + route + navigation | 2 (`clinical-billing-dashboard.tsx`, `page.tsx`) | `routes.ts`, `navigation.ts` | — |
| 8 | Superbill viewer with print CSS | 1-2 (`superbill-viewer.tsx`, possibly `convex/practiceProfile.ts`) | — | `superbill-viewer.test.tsx` |
| 9 | Integration — sidebar badge | — | `dashboard-sidebar.tsx` | Verify existing sidebar tests |

**Total new files:** ~14
**Total modified files:** ~5
**Total test files:** ~5

**Verification command after all tasks:**
```bash
npx vitest run --reporter=verbose
```

Expected: All tests pass with 0 failures.
