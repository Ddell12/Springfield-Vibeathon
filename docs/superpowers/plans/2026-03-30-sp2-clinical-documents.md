# SP2: Clinical Documents — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the clinical document lifecycle (evaluation, plan of care, discharge summary) with AI-assisted narrative generation, sign/unsign workflows, and goal amendment audit trails.
**Architecture:** Three new Convex tables (`evaluations`, `plansOfCare`, `dischargeSummaries`) with one backend file per document type following the `sessionNotes.ts` pattern (slpMutation/slpQuery, sign/unsign, activity logging). Two SSE streaming routes for AI generation (`/api/generate-evaluation`, `/api/generate-discharge`) following the `/api/generate-soap/route.ts` pattern. Three new frontend feature slices under `src/features/` with hooks, editors, and list components matching the session-notes architecture.
**Tech Stack:** Convex (schema, mutations, queries), Anthropic Claude Sonnet (SSE streaming), Next.js App Router (API routes + pages), React + shadcn/ui + Tailwind v4 (frontend)

---

## Task 1: Schema — Add evaluations, plansOfCare, dischargeSummaries tables + extend goals and patients

**Files:**
- Modify: `convex/schema.ts:379-407` (goals table — add amendmentLog field)
- Modify: `convex/schema.ts:163-196` (patients table — add icdCodes field)
- Modify: `convex/schema.ts:607` (insert before closing `});` — add 3 new tables)

- [ ] **Step 1: Add `amendmentLog` optional field to `goals` table**

In `convex/schema.ts`, find the `goals` table definition (line 379). After `notes: v.optional(v.string()),` (line 405) and before the closing `})` of the table fields, add:

```ts
    amendmentLog: v.optional(v.array(v.object({
      previousGoalText: v.string(),
      previousTargetAccuracy: v.number(),
      previousTargetConsecutiveSessions: v.number(),
      previousStatus: v.string(),
      changedAt: v.number(),
      changedBy: v.string(),
      reason: v.optional(v.string()),
    }))),
```

- [ ] **Step 2: Add `icdCodes` optional field to `patients` table**

In `convex/schema.ts`, find the `patients` table definition (line 163). After `notes: v.optional(v.string()),` (line 194) and before the closing `})`, add:

```ts
    icdCodes: v.optional(v.array(v.object({
      code: v.string(),
      description: v.string(),
    }))),
```

- [ ] **Step 3: Add `evaluations` table**

In `convex/schema.ts`, before the closing `});` of `defineSchema`, add:

```ts
  evaluations: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    evaluationDate: v.string(),
    referralSource: v.optional(v.string()),
    backgroundHistory: v.string(),
    assessmentTools: v.array(v.object({
      name: v.string(),
      scoresRaw: v.optional(v.string()),
      scoresStandard: v.optional(v.string()),
      percentile: v.optional(v.string()),
      notes: v.optional(v.string()),
    })),
    domainFindings: v.object({
      articulation: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      languageReceptive: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      languageExpressive: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      fluency: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      voice: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      pragmatics: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
      aac: v.optional(v.object({ narrative: v.string(), scores: v.optional(v.string()) })),
    }),
    behavioralObservations: v.string(),
    clinicalInterpretation: v.string(),
    diagnosisCodes: v.array(v.object({ code: v.string(), description: v.string() })),
    prognosis: v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("guarded")
    ),
    recommendations: v.string(),
    status: v.union(v.literal("draft"), v.literal("complete"), v.literal("signed")),
    signedAt: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_slpUserId", ["slpUserId"]),
```

- [ ] **Step 4: Add `plansOfCare` table**

Immediately after the `evaluations` table:

```ts
  plansOfCare: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    evaluationId: v.optional(v.id("evaluations")),
    diagnosisCodes: v.array(v.object({ code: v.string(), description: v.string() })),
    longTermGoals: v.array(v.string()),
    shortTermGoals: v.array(v.string()),
    frequency: v.string(),
    sessionDuration: v.string(),
    planDuration: v.string(),
    projectedDischargeDate: v.optional(v.string()),
    dischargeCriteria: v.string(),
    physicianName: v.optional(v.string()),
    physicianNPI: v.optional(v.string()),
    physicianSignatureOnFile: v.boolean(),
    physicianSignatureDate: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("amended"),
      v.literal("expired")
    ),
    signedAt: v.optional(v.number()),
    version: v.number(),
    previousVersionId: v.optional(v.id("plansOfCare")),
  })
    .index("by_patientId", ["patientId"])
    .index("by_patientId_status", ["patientId", "status"]),
```

- [ ] **Step 5: Add `dischargeSummaries` table**

Immediately after the `plansOfCare` table:

```ts
  dischargeSummaries: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    serviceStartDate: v.string(),
    serviceEndDate: v.string(),
    presentingDiagnosis: v.string(),
    goalsAchieved: v.array(v.object({
      goalId: v.string(),
      shortDescription: v.string(),
      finalAccuracy: v.number(),
    })),
    goalsNotMet: v.array(v.object({
      goalId: v.string(),
      shortDescription: v.string(),
      finalAccuracy: v.number(),
      reason: v.string(),
    })),
    dischargeReason: v.union(
      v.literal("goals-met"),
      v.literal("plateau"),
      v.literal("family-request"),
      v.literal("insurance-exhausted"),
      v.literal("transition"),
      v.literal("other")
    ),
    dischargeReasonOther: v.optional(v.string()),
    narrative: v.string(),
    recommendations: v.string(),
    returnCriteria: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("signed")),
    signedAt: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"]),
```

- [ ] **Step 6: Add new activity log actions to the activityLog table union**

In `convex/schema.ts`, find the `activityLog` table (line 227). The `action` field has a `v.union(...)` at line 233. Add these literals inside the union, after the existing ones:

```ts
      v.literal("evaluation-signed"),
      v.literal("evaluation-unsigned"),
      v.literal("poc-signed"),
      v.literal("poc-amended"),
      v.literal("discharge-signed"),
```

Also update `convex/activityLog.ts` line 10 `action` validator union to include the same 5 new literals.

- [ ] **Step 7: Run `npx convex dev` to verify schema pushes cleanly**
Run: `npx convex dev --once`
Expected: PASS — schema accepted, no errors

- [ ] **Step 8: Commit**

---

## Task 2: ICD-10 Code Module

**Files:**
- Create: `src/features/evaluations/lib/icd10-codes.ts`

- [ ] **Step 1: Create the ICD-10 codes static lookup**

```ts
export interface ICD10Code {
  code: string;
  description: string;
  category: string;
}

export const ICD10_CODES: ICD10Code[] = [
  // Articulation / Phonological
  { code: "F80.0", description: "Phonological disorder", category: "articulation" },
  { code: "F80.89", description: "Other developmental disorders of speech and language", category: "articulation" },
  { code: "R47.1", description: "Dysarthria and anarthria", category: "articulation" },
  { code: "Q38.1", description: "Ankyloglossia (tongue-tie)", category: "articulation" },
  { code: "R47.89", description: "Other speech disturbances", category: "articulation" },

  // Language — Receptive
  { code: "F80.2", description: "Mixed receptive-expressive language disorder", category: "language-receptive" },
  { code: "R47.02", description: "Dysphasia", category: "language-receptive" },
  { code: "R48.2", description: "Apraxia, unspecified", category: "language-receptive" },
  { code: "F80.4", description: "Speech and language development delay due to hearing loss", category: "language-receptive" },

  // Language — Expressive
  { code: "F80.1", description: "Expressive language disorder", category: "language-expressive" },
  { code: "F80.9", description: "Developmental disorder of speech and language, unspecified", category: "language-expressive" },
  { code: "R47.01", description: "Aphasia", category: "language-expressive" },

  // Fluency
  { code: "F80.81", description: "Childhood onset fluency disorder (stuttering)", category: "fluency" },
  { code: "F98.5", description: "Adult onset fluency disorder", category: "fluency" },
  { code: "R47.82", description: "Fluency disorder in conditions classified elsewhere", category: "fluency" },

  // Voice
  { code: "J38.3", description: "Other diseases of vocal cords", category: "voice" },
  { code: "R49.0", description: "Dysphonia", category: "voice" },
  { code: "R49.1", description: "Aphonia", category: "voice" },
  { code: "R49.8", description: "Other voice and resonance disorders", category: "voice" },
  { code: "J38.00", description: "Paralysis of vocal cords and larynx, unspecified", category: "voice" },
  { code: "J38.01", description: "Paralysis of vocal cords and larynx, unilateral", category: "voice" },
  { code: "J38.02", description: "Paralysis of vocal cords and larynx, bilateral", category: "voice" },

  // Pragmatic / Social
  { code: "R48.8", description: "Other symbolic dysfunctions (pragmatic language)", category: "pragmatic-social" },
  { code: "F84.0", description: "Autistic disorder", category: "pragmatic-social" },
  { code: "F84.5", description: "Asperger syndrome", category: "pragmatic-social" },
  { code: "F84.9", description: "Pervasive developmental disorder, unspecified", category: "pragmatic-social" },
  { code: "F80.82", description: "Social pragmatic communication disorder", category: "pragmatic-social" },

  // AAC
  { code: "R47.8", description: "Other speech disturbances (AAC candidacy)", category: "aac" },
  { code: "R41.840", description: "Attention and concentration deficit", category: "aac" },

  // Feeding / Swallowing
  { code: "R13.10", description: "Dysphagia, unspecified", category: "feeding" },
  { code: "R13.11", description: "Dysphagia, oral phase", category: "feeding" },
  { code: "R13.12", description: "Dysphagia, oropharyngeal phase", category: "feeding" },
  { code: "R13.13", description: "Dysphagia, pharyngeal phase", category: "feeding" },
  { code: "R13.14", description: "Dysphagia, pharyngoesophageal phase", category: "feeding" },
  { code: "R13.19", description: "Other dysphagia", category: "feeding" },
  { code: "R63.3", description: "Feeding difficulties", category: "feeding" },
  { code: "F98.29", description: "Other feeding disorders of infancy and early childhood", category: "feeding" },
  { code: "P92.9", description: "Feeding problem of newborn, unspecified", category: "feeding" },

  // General / Cross-domain
  { code: "R41.0", description: "Disorientation, unspecified", category: "language-receptive" },
  { code: "R48.0", description: "Dyslexia and alexia", category: "language-receptive" },
  { code: "Z13.4", description: "Encounter for screening for developmental delays", category: "language-expressive" },
  { code: "Z87.890", description: "Personal history of other speech and language disorders", category: "language-expressive" },
  { code: "G31.01", description: "Pick disease (language variant dementia)", category: "language-expressive" },
  { code: "I69.320", description: "Aphasia following cerebral infarction", category: "language-expressive" },
  { code: "I69.321", description: "Dysphasia following cerebral infarction", category: "language-expressive" },
  { code: "I69.328", description: "Other speech and language deficits following cerebral infarction", category: "language-expressive" },
  { code: "R13.0", description: "Aphagia", category: "feeding" },
  { code: "R48.1", description: "Agnosia", category: "language-receptive" },
];

/** Search ICD-10 codes by query string (matches code or description). */
export function searchICD10(query: string): ICD10Code[] {
  const q = query.toLowerCase().trim();
  if (q.length === 0) return ICD10_CODES;
  return ICD10_CODES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
  );
}

/** Filter ICD-10 codes by therapy domain category. */
export function filterICD10ByCategory(category: string): ICD10Code[] {
  return ICD10_CODES.filter((c) => c.category === category);
}
```

- [ ] **Step 2: Verify the module compiles**
Run: `npx tsc --noEmit --pretty src/features/evaluations/lib/icd10-codes.ts 2>&1 || echo "Check manually"`
Expected: No type errors

- [ ] **Step 3: Commit**

---

## Task 3: Backend — `convex/evaluations.ts` (queries + mutations)

**Files:**
- Create: `convex/evaluations.ts`
- Create: `convex/__tests__/evaluations.test.ts`

- [ ] **Step 1: Write the test file**

Create `convex/__tests__/evaluations.test.ts`:

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

const today = new Date().toISOString().slice(0, 10);

const VALID_EVALUATION = {
  evaluationDate: today,
  backgroundHistory: "Patient was referred for articulation concerns. No prior speech services.",
  assessmentTools: [
    { name: "GFTA-3", scoresRaw: "45", scoresStandard: "78", percentile: "7th" },
  ],
  domainFindings: {
    articulation: { narrative: "Patient demonstrates /r/ and /s/ distortions in all positions.", scores: "7th percentile" },
  },
  behavioralObservations: "Patient was cooperative and engaged throughout testing.",
  clinicalInterpretation: "",
  diagnosisCodes: [{ code: "F80.0", description: "Phonological disorder" }],
  prognosis: "good" as const,
  recommendations: "",
};

async function createPatientAndEval(
  t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  evalOverrides?: Partial<typeof VALID_EVALUATION>,
) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const evalId = await t.mutation(api.evaluations.create, {
    patientId,
    ...VALID_EVALUATION,
    ...evalOverrides,
  });
  return { patientId, evalId };
}

describe("evaluations.create", () => {
  it("creates evaluation in draft status with correct slpUserId", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { evalId } = await createPatientAndEval(t);
    const evaluation = await t.query(api.evaluations.get, { evalId });
    expect(evaluation).toBeDefined();
    expect(evaluation!.status).toBe("draft");
    expect(evaluation!.slpUserId).toBe("slp-user-123");
    expect(evaluation!.evaluationDate).toBe(today);
  });

  it("rejects unauthenticated users", async () => {
    const base = convexTest(schema, modules);
    const authed = base.withIdentity(SLP_IDENTITY);
    const { patientId } = await authed.mutation(api.patients.create, VALID_PATIENT);
    await expect(
      base.mutation(api.evaluations.create, { patientId, ...VALID_EVALUATION })
    ).rejects.toThrow();
  });

  it("rejects access to another SLP's patient", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp1.mutation(api.patients.create, VALID_PATIENT);
    const slp2 = base.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.evaluations.create, { patientId, ...VALID_EVALUATION })
    ).rejects.toThrow("Not authorized");
  });
});

describe("evaluations.update", () => {
  it("updates fields on draft evaluation", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { evalId } = await createPatientAndEval(t);
    await t.mutation(api.evaluations.update, {
      evalId,
      backgroundHistory: "Updated history",
    });
    const evaluation = await t.query(api.evaluations.get, { evalId });
    expect(evaluation!.backgroundHistory).toBe("Updated history");
  });

  it("rejects update on signed evaluation", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { evalId } = await createPatientAndEval(t, {
      clinicalInterpretation: "Interpretation text",
      recommendations: "Recommend 2x/week therapy",
    });
    await t.mutation(api.evaluations.updateStatus, { evalId, status: "complete" });
    await t.mutation(api.evaluations.sign, { evalId });
    await expect(
      t.mutation(api.evaluations.update, { evalId, backgroundHistory: "Changed" })
    ).rejects.toThrow("signed");
  });
});

describe("evaluations.sign", () => {
  it("signs complete evaluation, sets signedAt, propagates ICD codes to patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, evalId } = await createPatientAndEval(t, {
      clinicalInterpretation: "Clinical interpretation text",
      recommendations: "Recommend 2x/week speech therapy",
    });
    await t.mutation(api.evaluations.updateStatus, { evalId, status: "complete" });
    await t.mutation(api.evaluations.sign, { evalId });

    const evaluation = await t.query(api.evaluations.get, { evalId });
    expect(evaluation!.status).toBe("signed");
    expect(evaluation!.signedAt).toBeGreaterThan(0);

    const patient = await t.query(api.patients.get, { patientId });
    expect(patient!.icdCodes).toEqual([{ code: "F80.0", description: "Phonological disorder" }]);
  });

  it("rejects signing draft evaluation", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { evalId } = await createPatientAndEval(t);
    await expect(t.mutation(api.evaluations.sign, { evalId })).rejects.toThrow("complete");
  });
});

describe("evaluations.unsign", () => {
  it("reverts signed to complete, clears signedAt", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { evalId } = await createPatientAndEval(t, {
      clinicalInterpretation: "Interpretation",
      recommendations: "Recommendations",
    });
    await t.mutation(api.evaluations.updateStatus, { evalId, status: "complete" });
    await t.mutation(api.evaluations.sign, { evalId });
    await t.mutation(api.evaluations.unsign, { evalId });

    const evaluation = await t.query(api.evaluations.get, { evalId });
    expect(evaluation!.status).toBe("complete");
    expect(evaluation!.signedAt).toBeUndefined();
  });
});

describe("evaluations.getByPatient", () => {
  it("returns evaluations for patient sorted by date desc", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    await t.mutation(api.evaluations.create, {
      patientId,
      ...VALID_EVALUATION,
      evaluationDate: "2026-01-15",
    });
    await t.mutation(api.evaluations.create, {
      patientId,
      ...VALID_EVALUATION,
      evaluationDate: "2026-03-15",
    });
    const evals = await t.query(api.evaluations.getByPatient, { patientId });
    expect(evals).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run convex/__tests__/evaluations.test.ts`
Expected: FAIL — `api.evaluations` does not exist

- [ ] **Step 3: Create `convex/evaluations.ts`**

```ts
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

// ── Validators ──────────────────────────────────────────────────────────────

const assessmentToolValidator = v.object({
  name: v.string(),
  scoresRaw: v.optional(v.string()),
  scoresStandard: v.optional(v.string()),
  percentile: v.optional(v.string()),
  notes: v.optional(v.string()),
});

const domainFindingValidator = v.optional(v.object({
  narrative: v.string(),
  scores: v.optional(v.string()),
}));

const domainFindingsValidator = v.object({
  articulation: domainFindingValidator,
  languageReceptive: domainFindingValidator,
  languageExpressive: domainFindingValidator,
  fluency: domainFindingValidator,
  voice: domainFindingValidator,
  pragmatics: domainFindingValidator,
  aac: domainFindingValidator,
});

const diagnosisCodeValidator = v.object({
  code: v.string(),
  description: v.string(),
});

const prognosisValidator = v.union(
  v.literal("excellent"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("guarded")
);

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("complete"),
  v.literal("signed")
);

// ── Queries ─────────────────────────────────────────────────────────────────

export const get = slpQuery({
  args: { evalId: v.id("evaluations") },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    return evaluation;
  },
});

export const getByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("evaluations")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    evaluationDate: v.string(),
    referralSource: v.optional(v.string()),
    backgroundHistory: v.string(),
    assessmentTools: v.array(assessmentToolValidator),
    domainFindings: domainFindingsValidator,
    behavioralObservations: v.string(),
    clinicalInterpretation: v.string(),
    diagnosisCodes: v.array(diagnosisCodeValidator),
    prognosis: prognosisValidator,
    recommendations: v.string(),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db.insert("evaluations", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      evaluationDate: args.evaluationDate,
      referralSource: args.referralSource,
      backgroundHistory: args.backgroundHistory,
      assessmentTools: args.assessmentTools,
      domainFindings: args.domainFindings,
      behavioralObservations: args.behavioralObservations,
      clinicalInterpretation: args.clinicalInterpretation,
      diagnosisCodes: args.diagnosisCodes,
      prognosis: args.prognosis,
      recommendations: args.recommendations ?? "",
      status: "draft",
    });
  },
});

export const update = slpMutation({
  args: {
    evalId: v.id("evaluations"),
    evaluationDate: v.optional(v.string()),
    referralSource: v.optional(v.string()),
    backgroundHistory: v.optional(v.string()),
    assessmentTools: v.optional(v.array(assessmentToolValidator)),
    domainFindings: v.optional(domainFindingsValidator),
    behavioralObservations: v.optional(v.string()),
    clinicalInterpretation: v.optional(v.string()),
    diagnosisCodes: v.optional(v.array(diagnosisCodeValidator)),
    prognosis: v.optional(prognosisValidator),
    recommendations: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status === "signed") {
      throw new ConvexError("Cannot edit a signed evaluation");
    }

    const { evalId, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    await ctx.db.patch(args.evalId, filtered);
  },
});

export const updateStatus = slpMutation({
  args: {
    evalId: v.id("evaluations"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status === "signed") {
      throw new ConvexError("Cannot change status of a signed evaluation — use unsign first");
    }
    if (args.status === "signed") {
      throw new ConvexError("Cannot set status to signed — use the sign function");
    }
    await ctx.db.patch(args.evalId, { status: args.status });
  },
});

export const sign = slpMutation({
  args: { evalId: v.id("evaluations") },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status !== "complete") {
      throw new ConvexError("Only complete evaluations can be signed");
    }

    const now = Date.now();
    await ctx.db.patch(args.evalId, { status: "signed", signedAt: now });

    // Propagate ICD codes to patient record
    if (evaluation.diagnosisCodes.length > 0) {
      await ctx.db.patch(evaluation.patientId, {
        icdCodes: evaluation.diagnosisCodes,
      });
    }

    await ctx.db.insert("activityLog", {
      patientId: evaluation.patientId,
      actorUserId: ctx.slpUserId,
      action: "evaluation-signed",
      details: `Signed evaluation from ${evaluation.evaluationDate}`,
      timestamp: now,
    });
  },
});

export const unsign = slpMutation({
  args: { evalId: v.id("evaluations") },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status !== "signed") {
      throw new ConvexError("Only signed evaluations can be unsigned");
    }

    const now = Date.now();
    await ctx.db.patch(args.evalId, { status: "complete", signedAt: undefined });

    await ctx.db.insert("activityLog", {
      patientId: evaluation.patientId,
      actorUserId: ctx.slpUserId,
      action: "evaluation-unsigned",
      details: `Unsigned evaluation from ${evaluation.evaluationDate}`,
      timestamp: now,
    });
  },
});

export const saveFromAI = slpMutation({
  args: {
    evalId: v.id("evaluations"),
    clinicalInterpretation: v.string(),
    recommendations: v.string(),
  },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evalId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status === "signed") {
      throw new ConvexError("Cannot edit a signed evaluation");
    }

    await ctx.db.patch(args.evalId, {
      clinicalInterpretation: args.clinicalInterpretation,
      recommendations: args.recommendations,
    });
  },
});
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run convex/__tests__/evaluations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

---

## Task 4: Backend — `convex/plansOfCare.ts` (queries + mutations)

**Files:**
- Create: `convex/plansOfCare.ts`
- Create: `convex/__tests__/plansOfCare.test.ts`

- [ ] **Step 1: Write the test file**

Create `convex/__tests__/plansOfCare.test.ts`:

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

const VALID_POC = {
  diagnosisCodes: [{ code: "F80.0", description: "Phonological disorder" }],
  longTermGoals: ["goal-1"],
  shortTermGoals: ["goal-2"],
  frequency: "2x/week",
  sessionDuration: "45 minutes",
  planDuration: "12 weeks",
  dischargeCriteria: "Patient achieves 90% accuracy across all targets",
  physicianSignatureOnFile: false,
};

async function createPatientAndPOC(
  t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  pocOverrides?: Partial<typeof VALID_POC>,
) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const pocId = await t.mutation(api.plansOfCare.create, {
    patientId,
    ...VALID_POC,
    ...pocOverrides,
  });
  return { patientId, pocId };
}

describe("plansOfCare.create", () => {
  it("creates POC in draft status, version 1", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { pocId } = await createPatientAndPOC(t);
    const poc = await t.query(api.plansOfCare.get, { pocId });
    expect(poc).toBeDefined();
    expect(poc!.status).toBe("draft");
    expect(poc!.version).toBe(1);
    expect(poc!.slpUserId).toBe("slp-user-123");
  });

  it("rejects access to another SLP's patient", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp1.mutation(api.patients.create, VALID_PATIENT);
    const slp2 = base.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.plansOfCare.create, { patientId, ...VALID_POC })
    ).rejects.toThrow("Not authorized");
  });
});

describe("plansOfCare.sign", () => {
  it("transitions draft to active, sets signedAt", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { pocId } = await createPatientAndPOC(t);
    await t.mutation(api.plansOfCare.sign, { pocId });
    const poc = await t.query(api.plansOfCare.get, { pocId });
    expect(poc!.status).toBe("active");
    expect(poc!.signedAt).toBeGreaterThan(0);
  });
});

describe("plansOfCare.amend", () => {
  it("creates new version, sets old to amended", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, pocId } = await createPatientAndPOC(t);
    await t.mutation(api.plansOfCare.sign, { pocId });

    const newPocId = await t.mutation(api.plansOfCare.amend, {
      pocId,
      frequency: "3x/week",
    });

    const oldPoc = await t.query(api.plansOfCare.get, { pocId });
    expect(oldPoc!.status).toBe("amended");

    const newPoc = await t.query(api.plansOfCare.get, { pocId: newPocId });
    expect(newPoc!.version).toBe(2);
    expect(newPoc!.previousVersionId).toBe(pocId);
    expect(newPoc!.frequency).toBe("3x/week");
    expect(newPoc!.status).toBe("draft");
  });
});

describe("plansOfCare.getActiveByPatient", () => {
  it("returns active POC for patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, pocId } = await createPatientAndPOC(t);
    await t.mutation(api.plansOfCare.sign, { pocId });
    const active = await t.query(api.plansOfCare.getActiveByPatient, { patientId });
    expect(active).toBeDefined();
    expect(active!._id).toBe(pocId);
  });

  it("returns null when no active POC", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
    const active = await t.query(api.plansOfCare.getActiveByPatient, { patientId });
    expect(active).toBeNull();
  });
});

describe("plansOfCare.getByPatient", () => {
  it("returns all POC versions for patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId, pocId } = await createPatientAndPOC(t);
    await t.mutation(api.plansOfCare.sign, { pocId });
    await t.mutation(api.plansOfCare.amend, { pocId, frequency: "3x/week" });
    const all = await t.query(api.plansOfCare.getByPatient, { patientId });
    expect(all).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run convex/__tests__/plansOfCare.test.ts`
Expected: FAIL — `api.plansOfCare` does not exist

- [ ] **Step 3: Create `convex/plansOfCare.ts`**

```ts
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

// ── Validators ──────────────────────────────────────────────────────────────

const diagnosisCodeValidator = v.object({
  code: v.string(),
  description: v.string(),
});

const statusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("amended"),
  v.literal("expired")
);

// ── Queries ─────────────────────────────────────────────────────────────────

export const get = slpQuery({
  args: { pocId: v.id("plansOfCare") },
  handler: async (ctx, args) => {
    const poc = await ctx.db.get(args.pocId);
    if (!poc) throw new ConvexError("Plan of Care not found");
    if (poc.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    return poc;
  },
});

export const getActiveByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("plansOfCare")
      .withIndex("by_patientId_status", (q) =>
        q.eq("patientId", args.patientId).eq("status", "active")
      )
      .first() ?? null;
  },
});

export const getByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("plansOfCare")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    evaluationId: v.optional(v.id("evaluations")),
    diagnosisCodes: v.array(diagnosisCodeValidator),
    longTermGoals: v.array(v.string()),
    shortTermGoals: v.array(v.string()),
    frequency: v.string(),
    sessionDuration: v.string(),
    planDuration: v.string(),
    projectedDischargeDate: v.optional(v.string()),
    dischargeCriteria: v.string(),
    physicianName: v.optional(v.string()),
    physicianNPI: v.optional(v.string()),
    physicianSignatureOnFile: v.boolean(),
    physicianSignatureDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db.insert("plansOfCare", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      evaluationId: args.evaluationId,
      diagnosisCodes: args.diagnosisCodes,
      longTermGoals: args.longTermGoals,
      shortTermGoals: args.shortTermGoals,
      frequency: args.frequency,
      sessionDuration: args.sessionDuration,
      planDuration: args.planDuration,
      projectedDischargeDate: args.projectedDischargeDate,
      dischargeCriteria: args.dischargeCriteria,
      physicianName: args.physicianName,
      physicianNPI: args.physicianNPI,
      physicianSignatureOnFile: args.physicianSignatureOnFile,
      physicianSignatureDate: args.physicianSignatureDate,
      status: "draft",
      version: 1,
    });
  },
});

export const update = slpMutation({
  args: {
    pocId: v.id("plansOfCare"),
    diagnosisCodes: v.optional(v.array(diagnosisCodeValidator)),
    longTermGoals: v.optional(v.array(v.string())),
    shortTermGoals: v.optional(v.array(v.string())),
    frequency: v.optional(v.string()),
    sessionDuration: v.optional(v.string()),
    planDuration: v.optional(v.string()),
    projectedDischargeDate: v.optional(v.string()),
    dischargeCriteria: v.optional(v.string()),
    physicianName: v.optional(v.string()),
    physicianNPI: v.optional(v.string()),
    physicianSignatureOnFile: v.optional(v.boolean()),
    physicianSignatureDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const poc = await ctx.db.get(args.pocId);
    if (!poc) throw new ConvexError("Plan of Care not found");
    if (poc.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (poc.status === "amended" || poc.status === "expired") {
      throw new ConvexError("Cannot edit an amended or expired Plan of Care");
    }

    const { pocId, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    await ctx.db.patch(args.pocId, filtered);
  },
});

export const sign = slpMutation({
  args: { pocId: v.id("plansOfCare") },
  handler: async (ctx, args) => {
    const poc = await ctx.db.get(args.pocId);
    if (!poc) throw new ConvexError("Plan of Care not found");
    if (poc.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (poc.status !== "draft") {
      throw new ConvexError("Only draft Plans of Care can be signed");
    }

    const now = Date.now();
    await ctx.db.patch(args.pocId, { status: "active", signedAt: now });

    await ctx.db.insert("activityLog", {
      patientId: poc.patientId,
      actorUserId: ctx.slpUserId,
      action: "poc-signed",
      details: `Signed Plan of Care v${poc.version}`,
      timestamp: now,
    });
  },
});

export const amend = slpMutation({
  args: {
    pocId: v.id("plansOfCare"),
    frequency: v.optional(v.string()),
    sessionDuration: v.optional(v.string()),
    planDuration: v.optional(v.string()),
    projectedDischargeDate: v.optional(v.string()),
    dischargeCriteria: v.optional(v.string()),
    longTermGoals: v.optional(v.array(v.string())),
    shortTermGoals: v.optional(v.array(v.string())),
    diagnosisCodes: v.optional(v.array(diagnosisCodeValidator)),
    physicianName: v.optional(v.string()),
    physicianNPI: v.optional(v.string()),
    physicianSignatureOnFile: v.optional(v.boolean()),
    physicianSignatureDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const oldPoc = await ctx.db.get(args.pocId);
    if (!oldPoc) throw new ConvexError("Plan of Care not found");
    if (oldPoc.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (oldPoc.status !== "active") {
      throw new ConvexError("Only active Plans of Care can be amended");
    }

    // Mark old version as amended
    await ctx.db.patch(args.pocId, { status: "amended" });

    // Create new version with overrides
    const { pocId, ...overrides } = args;
    const newPocId = await ctx.db.insert("plansOfCare", {
      patientId: oldPoc.patientId,
      slpUserId: ctx.slpUserId,
      evaluationId: oldPoc.evaluationId,
      diagnosisCodes: overrides.diagnosisCodes ?? oldPoc.diagnosisCodes,
      longTermGoals: overrides.longTermGoals ?? oldPoc.longTermGoals,
      shortTermGoals: overrides.shortTermGoals ?? oldPoc.shortTermGoals,
      frequency: overrides.frequency ?? oldPoc.frequency,
      sessionDuration: overrides.sessionDuration ?? oldPoc.sessionDuration,
      planDuration: overrides.planDuration ?? oldPoc.planDuration,
      projectedDischargeDate: overrides.projectedDischargeDate ?? oldPoc.projectedDischargeDate,
      dischargeCriteria: overrides.dischargeCriteria ?? oldPoc.dischargeCriteria,
      physicianName: overrides.physicianName ?? oldPoc.physicianName,
      physicianNPI: overrides.physicianNPI ?? oldPoc.physicianNPI,
      physicianSignatureOnFile: overrides.physicianSignatureOnFile ?? oldPoc.physicianSignatureOnFile,
      physicianSignatureDate: overrides.physicianSignatureDate ?? oldPoc.physicianSignatureDate,
      status: "draft",
      version: oldPoc.version + 1,
      previousVersionId: args.pocId,
    });

    await ctx.db.insert("activityLog", {
      patientId: oldPoc.patientId,
      actorUserId: ctx.slpUserId,
      action: "poc-amended",
      details: `Amended Plan of Care from v${oldPoc.version} to v${oldPoc.version + 1}`,
      timestamp: Date.now(),
    });

    return newPocId;
  },
});
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run convex/__tests__/plansOfCare.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

---

## Task 5: Backend — `convex/dischargeSummaries.ts` (queries + mutations)

**Files:**
- Create: `convex/dischargeSummaries.ts`
- Create: `convex/__tests__/dischargeSummaries.test.ts`

- [ ] **Step 1: Write the test file**

Create `convex/__tests__/dischargeSummaries.test.ts`:

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

const VALID_DISCHARGE = {
  serviceStartDate: "2025-09-01",
  serviceEndDate: "2026-03-30",
  presentingDiagnosis: "Phonological disorder (F80.0)",
  goalsAchieved: [
    { goalId: "goal-1", shortDescription: "Produce /s/ in initial position", finalAccuracy: 92 },
  ],
  goalsNotMet: [
    { goalId: "goal-2", shortDescription: "Produce /r/ in all positions", finalAccuracy: 65, reason: "Insufficient progress" },
  ],
  dischargeReason: "goals-met" as const,
  narrative: "",
  recommendations: "",
};

async function createPatientAndDischarge(
  t: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>,
  overrides?: Partial<typeof VALID_DISCHARGE>,
) {
  const { patientId } = await t.mutation(api.patients.create, VALID_PATIENT);
  const dischargeId = await t.mutation(api.dischargeSummaries.create, {
    patientId,
    ...VALID_DISCHARGE,
    ...overrides,
  });
  return { patientId, dischargeId };
}

describe("dischargeSummaries.create", () => {
  it("creates discharge summary in draft status", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { dischargeId } = await createPatientAndDischarge(t);
    const discharge = await t.query(api.dischargeSummaries.get, { dischargeId });
    expect(discharge).toBeDefined();
    expect(discharge!.status).toBe("draft");
    expect(discharge!.slpUserId).toBe("slp-user-123");
  });

  it("rejects access to another SLP's patient", async () => {
    const base = convexTest(schema, modules);
    const slp1 = base.withIdentity(SLP_IDENTITY);
    const { patientId } = await slp1.mutation(api.patients.create, VALID_PATIENT);
    const slp2 = base.withIdentity(OTHER_SLP);
    await expect(
      slp2.mutation(api.dischargeSummaries.create, { patientId, ...VALID_DISCHARGE })
    ).rejects.toThrow("Not authorized");
  });
});

describe("dischargeSummaries.update", () => {
  it("updates fields on draft discharge", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { dischargeId } = await createPatientAndDischarge(t);
    await t.mutation(api.dischargeSummaries.update, {
      dischargeId,
      narrative: "Updated narrative",
    });
    const discharge = await t.query(api.dischargeSummaries.get, { dischargeId });
    expect(discharge!.narrative).toBe("Updated narrative");
  });

  it("rejects update on signed discharge", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { dischargeId } = await createPatientAndDischarge(t, {
      narrative: "Final narrative",
      recommendations: "Continue home practice",
    });
    await t.mutation(api.dischargeSummaries.sign, { dischargeId });
    await expect(
      t.mutation(api.dischargeSummaries.update, { dischargeId, narrative: "Changed" })
    ).rejects.toThrow("signed");
  });
});

describe("dischargeSummaries.sign", () => {
  it("signs discharge, sets signedAt", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { dischargeId } = await createPatientAndDischarge(t, {
      narrative: "Treatment summary narrative",
      recommendations: "Continue home practice",
    });
    await t.mutation(api.dischargeSummaries.sign, { dischargeId });
    const discharge = await t.query(api.dischargeSummaries.get, { dischargeId });
    expect(discharge!.status).toBe("signed");
    expect(discharge!.signedAt).toBeGreaterThan(0);
  });
});

describe("dischargeSummaries.getByPatient", () => {
  it("returns discharge summaries for patient", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await createPatientAndDischarge(t);
    const summaries = await t.query(api.dischargeSummaries.getByPatient, { patientId });
    expect(summaries).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run convex/__tests__/dischargeSummaries.test.ts`
Expected: FAIL — `api.dischargeSummaries` does not exist

- [ ] **Step 3: Create `convex/dischargeSummaries.ts`**

```ts
import { v } from "convex/values";
import { ConvexError } from "convex/values";

import { slpMutation, slpQuery } from "./lib/customFunctions";

// ── Validators ──────────────────────────────────────────────────────────────

const goalAchievedValidator = v.object({
  goalId: v.string(),
  shortDescription: v.string(),
  finalAccuracy: v.number(),
});

const goalNotMetValidator = v.object({
  goalId: v.string(),
  shortDescription: v.string(),
  finalAccuracy: v.number(),
  reason: v.string(),
});

const dischargeReasonValidator = v.union(
  v.literal("goals-met"),
  v.literal("plateau"),
  v.literal("family-request"),
  v.literal("insurance-exhausted"),
  v.literal("transition"),
  v.literal("other")
);

// ── Queries ─────────────────────────────────────────────────────────────────

export const get = slpQuery({
  args: { dischargeId: v.id("dischargeSummaries") },
  handler: async (ctx, args) => {
    const discharge = await ctx.db.get(args.dischargeId);
    if (!discharge) throw new ConvexError("Discharge summary not found");
    if (discharge.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    return discharge;
  },
});

export const getByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("dischargeSummaries")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const create = slpMutation({
  args: {
    patientId: v.id("patients"),
    serviceStartDate: v.string(),
    serviceEndDate: v.string(),
    presentingDiagnosis: v.string(),
    goalsAchieved: v.array(goalAchievedValidator),
    goalsNotMet: v.array(goalNotMetValidator),
    dischargeReason: dischargeReasonValidator,
    dischargeReasonOther: v.optional(v.string()),
    narrative: v.string(),
    recommendations: v.string(),
    returnCriteria: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db.insert("dischargeSummaries", {
      patientId: args.patientId,
      slpUserId: ctx.slpUserId,
      serviceStartDate: args.serviceStartDate,
      serviceEndDate: args.serviceEndDate,
      presentingDiagnosis: args.presentingDiagnosis,
      goalsAchieved: args.goalsAchieved,
      goalsNotMet: args.goalsNotMet,
      dischargeReason: args.dischargeReason,
      dischargeReasonOther: args.dischargeReasonOther,
      narrative: args.narrative,
      recommendations: args.recommendations,
      returnCriteria: args.returnCriteria,
      status: "draft",
    });
  },
});

export const update = slpMutation({
  args: {
    dischargeId: v.id("dischargeSummaries"),
    serviceStartDate: v.optional(v.string()),
    serviceEndDate: v.optional(v.string()),
    presentingDiagnosis: v.optional(v.string()),
    goalsAchieved: v.optional(v.array(goalAchievedValidator)),
    goalsNotMet: v.optional(v.array(goalNotMetValidator)),
    dischargeReason: v.optional(dischargeReasonValidator),
    dischargeReasonOther: v.optional(v.string()),
    narrative: v.optional(v.string()),
    recommendations: v.optional(v.string()),
    returnCriteria: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const discharge = await ctx.db.get(args.dischargeId);
    if (!discharge) throw new ConvexError("Discharge summary not found");
    if (discharge.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (discharge.status === "signed") {
      throw new ConvexError("Cannot edit a signed discharge summary");
    }

    const { dischargeId, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    await ctx.db.patch(args.dischargeId, filtered);
  },
});

export const sign = slpMutation({
  args: { dischargeId: v.id("dischargeSummaries") },
  handler: async (ctx, args) => {
    const discharge = await ctx.db.get(args.dischargeId);
    if (!discharge) throw new ConvexError("Discharge summary not found");
    if (discharge.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (discharge.status === "signed") {
      throw new ConvexError("Discharge summary is already signed");
    }

    const now = Date.now();
    await ctx.db.patch(args.dischargeId, { status: "signed", signedAt: now });

    await ctx.db.insert("activityLog", {
      patientId: discharge.patientId,
      actorUserId: ctx.slpUserId,
      action: "discharge-signed",
      details: `Signed discharge summary (${discharge.dischargeReason})`,
      timestamp: now,
    });
  },
});

export const saveFromAI = slpMutation({
  args: {
    dischargeId: v.id("dischargeSummaries"),
    narrative: v.string(),
    recommendations: v.string(),
  },
  handler: async (ctx, args) => {
    const discharge = await ctx.db.get(args.dischargeId);
    if (!discharge) throw new ConvexError("Discharge summary not found");
    if (discharge.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (discharge.status === "signed") {
      throw new ConvexError("Cannot edit a signed discharge summary");
    }

    await ctx.db.patch(args.dischargeId, {
      narrative: args.narrative,
      recommendations: args.recommendations,
    });
  },
});
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run convex/__tests__/dischargeSummaries.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

---

## Task 6: Backend — Goal Amendment Audit Trail in `convex/goals.ts`

**Files:**
- Modify: `convex/goals.ts:201-269` (update mutation)
- Modify: `convex/__tests__/goals.test.ts` (add amendment test)

- [ ] **Step 1: Write the failing test**

Add to `convex/__tests__/goals.test.ts` at the end of the `describe("goals.update")` block:

```ts
  it("snapshots current state to amendmentLog before update", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { goalId } = await createPatientAndGoal(t);

    // First update — changes accuracy
    await t.mutation(api.goals.update, {
      goalId,
      targetAccuracy: 90,
      amendmentReason: "Adjusted based on progress",
    });

    const goal = await t.query(api.goals.get, { goalId });
    expect(goal.amendmentLog).toBeDefined();
    expect(goal.amendmentLog).toHaveLength(1);
    expect(goal.amendmentLog![0].previousTargetAccuracy).toBe(80);
    expect(goal.amendmentLog![0].previousGoalText).toBe(VALID_GOAL.fullGoalText);
    expect(goal.amendmentLog![0].reason).toBe("Adjusted based on progress");
    expect(goal.amendmentLog![0].changedBy).toBe("slp-user-123");
    expect(goal.amendmentLog![0].changedAt).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run test to verify it fails**
Run: `npx vitest run convex/__tests__/goals.test.ts`
Expected: FAIL — `amendmentReason` not in args, or `amendmentLog` undefined

- [ ] **Step 3: Modify `convex/goals.ts` update mutation**

In `convex/goals.ts`, add `amendmentReason: v.optional(v.string()),` to the `update` mutation args (after line 213, the `status` arg).

Then in the handler, after the `validateGoalFields(merged)` call (line 237) and before the `const updates: Record<string, unknown> = {};` line (line 239), add the amendment log snapshotting:

```ts
    // Snapshot current state to amendment log before applying changes
    const updates: Record<string, unknown> = {};
    const hasFieldChanges =
      args.domain !== undefined ||
      args.shortDescription !== undefined ||
      args.fullGoalText !== undefined ||
      args.targetAccuracy !== undefined ||
      args.targetConsecutiveSessions !== undefined ||
      args.status !== undefined;

    if (hasFieldChanges) {
      const snapshot = {
        previousGoalText: goal.fullGoalText,
        previousTargetAccuracy: goal.targetAccuracy,
        previousTargetConsecutiveSessions: goal.targetConsecutiveSessions,
        previousStatus: goal.status,
        changedAt: Date.now(),
        changedBy: slpUserId,
        reason: args.amendmentReason,
      };
      const existingLog = goal.amendmentLog ?? [];
      updates.amendmentLog = [...existingLog, snapshot];
    }
```

Remove the existing `const updates: Record<string, unknown> = {};` line (line 239) since it is now declared above.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx vitest run convex/__tests__/goals.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

---

## Task 7: AI Generation — Evaluation Prompt Builder

**Files:**
- Create: `src/features/evaluations/lib/evaluation-prompt.ts`

- [ ] **Step 1: Create the prompt builder**

```ts
const trunc = (s: string, max = 500) => s.length > max ? s.slice(0, max) + "..." : s;

export interface EvalPatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosis: string;
}

export interface AssessmentTool {
  name: string;
  scoresRaw?: string;
  scoresStandard?: string;
  percentile?: string;
  notes?: string;
}

export interface DomainFinding {
  narrative: string;
  scores?: string;
}

export interface DomainFindings {
  articulation?: DomainFinding;
  languageReceptive?: DomainFinding;
  languageExpressive?: DomainFinding;
  fluency?: DomainFinding;
  voice?: DomainFinding;
  pragmatics?: DomainFinding;
  aac?: DomainFinding;
}

export interface EvalData {
  evaluationDate: string;
  referralSource?: string;
  backgroundHistory: string;
  assessmentTools: AssessmentTool[];
  domainFindings: DomainFindings;
  behavioralObservations: string;
  diagnosisCodes: { code: string; description: string }[];
  prognosis: string;
}

export function buildEvaluationPrompt(
  patient: EvalPatient,
  evalData: EvalData
): string {
  const patientContext = [
    `<patient_data>`,
    `Patient: ${patient.firstName} ${patient.lastName}`,
    `DOB: ${patient.dateOfBirth}`,
    `Diagnosis: ${patient.diagnosis}`,
    `</patient_data>`,
  ].join("\n");

  const toolsSection = evalData.assessmentTools
    .map((t) => {
      const parts = [`- ${t.name}`];
      if (t.scoresRaw) parts.push(`  Raw Score: ${t.scoresRaw}`);
      if (t.scoresStandard) parts.push(`  Standard Score: ${t.scoresStandard}`);
      if (t.percentile) parts.push(`  Percentile: ${t.percentile}`);
      if (t.notes) parts.push(`  Notes: ${trunc(t.notes)}`);
      return parts.join("\n");
    })
    .join("\n");

  const domainKeys: (keyof DomainFindings)[] = [
    "articulation", "languageReceptive", "languageExpressive",
    "fluency", "voice", "pragmatics", "aac",
  ];
  const domainLabels: Record<string, string> = {
    articulation: "Articulation/Phonology",
    languageReceptive: "Receptive Language",
    languageExpressive: "Expressive Language",
    fluency: "Fluency",
    voice: "Voice",
    pragmatics: "Pragmatics/Social Communication",
    aac: "AAC",
  };
  const domainsSection = domainKeys
    .filter((k) => evalData.domainFindings[k])
    .map((k) => {
      const d = evalData.domainFindings[k]!;
      const parts = [`${domainLabels[k]}:`];
      parts.push(`  Findings: ${trunc(d.narrative)}`);
      if (d.scores) parts.push(`  Scores: ${d.scores}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const diagSection = evalData.diagnosisCodes
    .map((d) => `- ${d.code}: ${d.description}`)
    .join("\n");

  return `You are a clinical documentation assistant for speech-language pathologists.
Generate two sections for a speech-language evaluation report following ASHA documentation standards.

${patientContext}

Evaluation Date: ${evalData.evaluationDate}
${evalData.referralSource ? `Referral Source: ${evalData.referralSource}` : ""}

Background History:
${trunc(evalData.backgroundHistory, 1000)}

Assessment Tools Administered:
${toolsSection}

Domain-Specific Findings:
${domainsSection}

Behavioral Observations:
${trunc(evalData.behavioralObservations, 1000)}

Diagnosis Codes:
${diagSection}

Prognosis: ${evalData.prognosis}

Generate exactly two sections with these headers:

CLINICAL INTERPRETATION:
Write a professional narrative that interprets the assessment scores and clinical observations.
Synthesize findings across domains. Reference specific scores and percentiles.
Explain the clinical significance of results in context of the patient's history.

RECOMMENDATIONS:
Write specific, actionable recommendations for services, referrals, and accommodations.
Include recommended frequency and duration of therapy if applicable.
Address any additional evaluations or referrals needed.`;
}

export interface EvalAIResult {
  clinicalInterpretation: string;
  recommendations: string;
}

export function parseEvaluationResponse(text: string): EvalAIResult | null {
  const interpMatch = text.match(
    /CLINICAL INTERPRETATION:\s*([\s\S]*?)(?=RECOMMENDATIONS:|$)/i
  );
  const recsMatch = text.match(/RECOMMENDATIONS:\s*([\s\S]*?)$/i);

  if (!interpMatch || !recsMatch) return null;

  const clinicalInterpretation = interpMatch[1].trim();
  const recommendations = recsMatch[1].trim();

  if (!clinicalInterpretation || !recommendations) return null;

  return { clinicalInterpretation, recommendations };
}
```

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in evaluation-prompt.ts

- [ ] **Step 3: Commit**

---

## Task 8: AI Generation — Discharge Prompt Builder

**Files:**
- Create: `src/features/discharge/lib/discharge-prompt.ts`

- [ ] **Step 1: Create the prompt builder**

```ts
const trunc = (s: string, max = 500) => s.length > max ? s.slice(0, max) + "..." : s;

export interface DischargePatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosis: string;
}

export interface GoalOutcome {
  shortDescription: string;
  finalAccuracy: number;
  status: "achieved" | "not-met";
  reason?: string;
}

export interface DischargeData {
  serviceStartDate: string;
  serviceEndDate: string;
  presentingDiagnosis: string;
  dischargeReason: string;
  dischargeReasonOther?: string;
  goals: GoalOutcome[];
  totalSessions: number;
}

export function buildDischargePrompt(
  patient: DischargePatient,
  data: DischargeData
): string {
  const patientContext = [
    `<patient_data>`,
    `Patient: ${patient.firstName} ${patient.lastName}`,
    `DOB: ${patient.dateOfBirth}`,
    `Diagnosis: ${patient.diagnosis}`,
    `</patient_data>`,
  ].join("\n");

  const goalsSection = data.goals
    .map((g) => {
      const status = g.status === "achieved" ? "ACHIEVED" : "NOT MET";
      const parts = [`- [${status}] ${g.shortDescription} (Final accuracy: ${g.finalAccuracy}%)`];
      if (g.reason) parts.push(`  Reason: ${g.reason}`);
      return parts.join("\n");
    })
    .join("\n");

  const reasonDisplay = data.dischargeReason === "other" && data.dischargeReasonOther
    ? data.dischargeReasonOther
    : data.dischargeReason.replace(/-/g, " ");

  return `You are a clinical documentation assistant for speech-language pathologists.
Generate two sections for a discharge summary following ASHA documentation standards.

${patientContext}

Service Period: ${data.serviceStartDate} to ${data.serviceEndDate}
Total Sessions: ${data.totalSessions}
Presenting Diagnosis: ${data.presentingDiagnosis}
Discharge Reason: ${reasonDisplay}

Goal Outcomes:
${goalsSection}

Generate exactly two sections with these headers:

NARRATIVE:
Write a professional summary of the treatment course.
Describe the presenting concerns, services provided, and progress made.
Reference specific goal outcomes and accuracy data.
Explain the rationale for discharge in context of the treatment goals.

RECOMMENDATIONS:
Write specific post-discharge recommendations.
Include any continued services, home strategies, follow-up timeline.
Address conditions that should prompt return to therapy.`;
}

export interface DischargeAIResult {
  narrative: string;
  recommendations: string;
}

export function parseDischargeResponse(text: string): DischargeAIResult | null {
  const narrativeMatch = text.match(
    /NARRATIVE:\s*([\s\S]*?)(?=RECOMMENDATIONS:|$)/i
  );
  const recsMatch = text.match(/RECOMMENDATIONS:\s*([\s\S]*?)$/i);

  if (!narrativeMatch || !recsMatch) return null;

  const narrative = narrativeMatch[1].trim();
  const recommendations = recsMatch[1].trim();

  if (!narrative || !recommendations) return null;

  return { narrative, recommendations };
}
```

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in discharge-prompt.ts

- [ ] **Step 3: Commit**

---

## Task 9: SSE Route — `/api/generate-evaluation/route.ts`

**Files:**
- Create: `src/app/api/generate-evaluation/route.ts`

- [ ] **Step 1: Create the SSE route**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

import {
  buildEvaluationPrompt,
  parseEvaluationResponse,
} from "@/features/evaluations/lib/evaluation-prompt";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "../generate/sse";

export const runtime = "nodejs";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate-evaluation");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-evaluation");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const InputSchema = z.object({ evaluationId: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const { userId, getToken } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  convex.setAuth(token);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const parsedBody = InputSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return new Response(
      JSON.stringify({ error: parsedBody.error.issues[0]?.message ?? "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const evalId = parsedBody.data.evaluationId as Id<"evaluations">;
  const evaluation = await convex.query(api.evaluations.get, { evalId });
  if (!evaluation) {
    return new Response(JSON.stringify({ error: "Evaluation not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (evaluation.status === "signed") {
    return new Response(
      JSON.stringify({ error: "Cannot generate for a signed evaluation" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const patient = await convex.query(api.patients.get, { patientId: evaluation.patientId });
  if (!patient) {
    return new Response(JSON.stringify({ error: "Patient not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildEvaluationPrompt(patient, {
    evaluationDate: evaluation.evaluationDate,
    referralSource: evaluation.referralSource,
    backgroundHistory: evaluation.backgroundHistory,
    assessmentTools: evaluation.assessmentTools,
    domainFindings: evaluation.domainFindings,
    behavioralObservations: evaluation.behavioralObservations,
    diagnosisCodes: evaluation.diagnosisCodes,
    prognosis: evaluation.prognosis,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const isAborted = () => request.signal.aborted;
      const send = (eventType: string, data: object) => {
        if (isAborted()) return;
        try {
          controller.enqueue(encoder.encode(sseEncode(eventType, data)));
        } catch {}
      };

      try {
        let fullText = "";
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          temperature: 0.3,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: "Generate the clinical interpretation and recommendations for this evaluation.",
            },
          ],
          stream: true,
        });

        for await (const event of response) {
          if (isAborted()) break;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            send("eval-chunk", { text: event.delta.text });
          }
        }

        const parsed = parseEvaluationResponse(fullText);
        if (parsed) {
          await convex.mutation(api.evaluations.saveFromAI, {
            evalId,
            clinicalInterpretation: parsed.clinicalInterpretation,
            recommendations: parsed.recommendations,
          });
          send("eval-complete", parsed);
        } else {
          send("error", { message: "Failed to parse evaluation response" });
        }
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Unknown error",
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

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

---

## Task 10: SSE Route — `/api/generate-discharge/route.ts`

**Files:**
- Create: `src/app/api/generate-discharge/route.ts`

- [ ] **Step 1: Create the SSE route**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";

import {
  buildDischargePrompt,
  parseDischargeResponse,
} from "@/features/discharge/lib/discharge-prompt";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "../generate/sse";

export const runtime = "nodejs";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required for /api/generate-discharge");
}
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-discharge");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const InputSchema = z.object({ dischargeId: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const { userId, getToken } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  convex.setAuth(token);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const parsedBody = InputSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return new Response(
      JSON.stringify({ error: parsedBody.error.issues[0]?.message ?? "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const dischargeId = parsedBody.data.dischargeId as Id<"dischargeSummaries">;
  const discharge = await convex.query(api.dischargeSummaries.get, { dischargeId });
  if (!discharge) {
    return new Response(JSON.stringify({ error: "Discharge summary not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (discharge.status === "signed") {
    return new Response(
      JSON.stringify({ error: "Cannot generate for a signed discharge summary" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const patient = await convex.query(api.patients.get, { patientId: discharge.patientId });
  if (!patient) {
    return new Response(JSON.stringify({ error: "Patient not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Count total sessions for context
  const sessionNotes = await convex.query(api.sessionNotes.list, {
    patientId: discharge.patientId,
    limit: 200,
  });

  const goals = [
    ...discharge.goalsAchieved.map((g) => ({
      shortDescription: g.shortDescription,
      finalAccuracy: g.finalAccuracy,
      status: "achieved" as const,
    })),
    ...discharge.goalsNotMet.map((g) => ({
      shortDescription: g.shortDescription,
      finalAccuracy: g.finalAccuracy,
      status: "not-met" as const,
      reason: g.reason,
    })),
  ];

  const systemPrompt = buildDischargePrompt(patient, {
    serviceStartDate: discharge.serviceStartDate,
    serviceEndDate: discharge.serviceEndDate,
    presentingDiagnosis: discharge.presentingDiagnosis,
    dischargeReason: discharge.dischargeReason,
    dischargeReasonOther: discharge.dischargeReasonOther,
    goals,
    totalSessions: sessionNotes?.length ?? 0,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const isAborted = () => request.signal.aborted;
      const send = (eventType: string, data: object) => {
        if (isAborted()) return;
        try {
          controller.enqueue(encoder.encode(sseEncode(eventType, data)));
        } catch {}
      };

      try {
        let fullText = "";
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          temperature: 0.3,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: "Generate the discharge narrative and recommendations.",
            },
          ],
          stream: true,
        });

        for await (const event of response) {
          if (isAborted()) break;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            send("discharge-chunk", { text: event.delta.text });
          }
        }

        const parsed = parseDischargeResponse(fullText);
        if (parsed) {
          await convex.mutation(api.dischargeSummaries.saveFromAI, {
            dischargeId,
            narrative: parsed.narrative,
            recommendations: parsed.recommendations,
          });
          send("discharge-complete", parsed);
        } else {
          send("error", { message: "Failed to parse discharge response" });
        }
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Unknown error",
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

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

---

## Task 11: Frontend — Evaluations hooks

**Files:**
- Create: `src/features/evaluations/hooks/use-evaluations.ts`

- [ ] **Step 1: Create the hooks file**

```ts
"use client";

import { useCallback, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useEvaluations(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.evaluations.getByPatient, isAuthenticated ? { patientId } : "skip");
}

export function useEvaluation(evalId: Id<"evaluations"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.evaluations.get,
    isAuthenticated && evalId ? { evalId } : "skip"
  );
}

export function useCreateEvaluation() {
  return useMutation(api.evaluations.create);
}

export function useUpdateEvaluation() {
  return useMutation(api.evaluations.update);
}

export function useUpdateEvaluationStatus() {
  return useMutation(api.evaluations.updateStatus);
}

export function useSignEvaluation() {
  return useMutation(api.evaluations.sign);
}

export function useUnsignEvaluation() {
  return useMutation(api.evaluations.unsign);
}

// ── SSE generation hook (mirrors use-soap-generation.ts pattern) ────────────

interface EvalAIResult {
  clinicalInterpretation: string;
  recommendations: string;
}

type EvalGenerationStatus = "idle" | "generating" | "complete" | "error";

interface EvalGenerationState {
  status: EvalGenerationStatus;
  streamedText: string;
  result: EvalAIResult | null;
  error: string | null;
}

export function useEvalGeneration() {
  const [state, setState] = useState<EvalGenerationState>({
    status: "idle",
    streamedText: "",
    result: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({ status: "idle", streamedText: "", result: null, error: null });
  }, []);

  const generate = useCallback(async (evaluationId: Id<"evaluations">) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({ status: "generating", streamedText: "", result: null, error: null });

    try {
      const response = await fetch("/api/generate-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

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
            if (i + 1 < lines.length && lines[i + 1].startsWith("data: ")) {
              let data;
              try {
                data = JSON.parse(lines[i + 1].slice(6));
              } catch {
                i++;
                continue;
              }
              i++;

              if (eventType === "eval-chunk") {
                setState((prev) => ({
                  ...prev,
                  streamedText: prev.streamedText + (data.text as string),
                }));
              } else if (eventType === "eval-complete") {
                setState((prev) => ({
                  ...prev,
                  status: "complete",
                  result: data as EvalAIResult,
                }));
              } else if (eventType === "error") {
                setState((prev) => ({
                  ...prev,
                  status: "error",
                  error: (data.message as string) ?? "Unknown error",
                }));
              }
            }
          }
        }
      }

      setState((prev) =>
        prev.status === "generating" ? { ...prev, status: "complete" } : prev
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  return { ...state, generate, reset };
}
```

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

---

## Task 12: Frontend — Plan of Care hooks

**Files:**
- Create: `src/features/plan-of-care/hooks/use-plan-of-care.ts`

- [ ] **Step 1: Create the hooks file**

```ts
"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function usePlanOfCare(pocId: Id<"plansOfCare"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.plansOfCare.get,
    isAuthenticated && pocId ? { pocId } : "skip"
  );
}

export function useActivePlanOfCare(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.plansOfCare.getActiveByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
}

export function usePlansOfCareHistory(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.plansOfCare.getByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
}

export function useCreatePlanOfCare() {
  return useMutation(api.plansOfCare.create);
}

export function useUpdatePlanOfCare() {
  return useMutation(api.plansOfCare.update);
}

export function useSignPlanOfCare() {
  return useMutation(api.plansOfCare.sign);
}

export function useAmendPlanOfCare() {
  return useMutation(api.plansOfCare.amend);
}
```

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

---

## Task 13: Frontend — Discharge hooks

**Files:**
- Create: `src/features/discharge/hooks/use-discharge-summary.ts`

- [ ] **Step 1: Create the hooks file**

```ts
"use client";

import { useCallback, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useDischargeSummaries(patientId: Id<"patients">) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.dischargeSummaries.getByPatient,
    isAuthenticated ? { patientId } : "skip"
  );
}

export function useDischargeSummary(dischargeId: Id<"dischargeSummaries"> | null) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.dischargeSummaries.get,
    isAuthenticated && dischargeId ? { dischargeId } : "skip"
  );
}

export function useCreateDischargeSummary() {
  return useMutation(api.dischargeSummaries.create);
}

export function useUpdateDischargeSummary() {
  return useMutation(api.dischargeSummaries.update);
}

export function useSignDischargeSummary() {
  return useMutation(api.dischargeSummaries.sign);
}

// ── SSE generation hook ─────────────────────────────────────────────────────

interface DischargeAIResult {
  narrative: string;
  recommendations: string;
}

type DischargeGenerationStatus = "idle" | "generating" | "complete" | "error";

interface DischargeGenerationState {
  status: DischargeGenerationStatus;
  streamedText: string;
  result: DischargeAIResult | null;
  error: string | null;
}

export function useDischargeGeneration() {
  const [state, setState] = useState<DischargeGenerationState>({
    status: "idle",
    streamedText: "",
    result: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({ status: "idle", streamedText: "", result: null, error: null });
  }, []);

  const generate = useCallback(async (dischargeId: Id<"dischargeSummaries">) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({ status: "generating", streamedText: "", result: null, error: null });

    try {
      const response = await fetch("/api/generate-discharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dischargeId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

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
            if (i + 1 < lines.length && lines[i + 1].startsWith("data: ")) {
              let data;
              try {
                data = JSON.parse(lines[i + 1].slice(6));
              } catch {
                i++;
                continue;
              }
              i++;

              if (eventType === "discharge-chunk") {
                setState((prev) => ({
                  ...prev,
                  streamedText: prev.streamedText + (data.text as string),
                }));
              } else if (eventType === "discharge-complete") {
                setState((prev) => ({
                  ...prev,
                  status: "complete",
                  result: data as DischargeAIResult,
                }));
              } else if (eventType === "error") {
                setState((prev) => ({
                  ...prev,
                  status: "error",
                  error: (data.message as string) ?? "Unknown error",
                }));
              }
            }
          }
        }
      }

      setState((prev) =>
        prev.status === "generating" ? { ...prev, status: "complete" } : prev
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  return { ...state, generate, reset };
}
```

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

---

## Task 14: Frontend — ICD-10 Picker Component

**Files:**
- Create: `src/features/evaluations/components/icd10-picker.tsx`

- [ ] **Step 1: Create the ICD-10 picker component**

```tsx
"use client";

import { useState } from "react";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Input } from "@/shared/components/ui/input";

import { type ICD10Code, searchICD10 } from "../lib/icd10-codes";

interface ICD10PickerProps {
  selected: { code: string; description: string }[];
  onChange: (codes: { code: string; description: string }[]) => void;
  disabled?: boolean;
}

export function ICD10Picker({ selected, onChange, disabled }: ICD10PickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = searchICD10(query).slice(0, 15);
  const selectedCodes = new Set(selected.map((s) => s.code));

  function handleSelect(code: ICD10Code) {
    if (selectedCodes.has(code.code)) {
      onChange(selected.filter((s) => s.code !== code.code));
    } else {
      onChange([...selected, { code: code.code, description: code.description }]);
    }
  }

  function handleRemove(code: string) {
    onChange(selected.filter((s) => s.code !== code));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-on-surface">
        ICD-10 Diagnosis Codes
      </label>

      {/* Selected codes */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.code}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {s.code}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(s.code)}
                  className="ml-0.5 text-primary/60 transition-colors duration-300 hover:text-primary"
                >
                  <MaterialIcon icon="close" size="xs" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {!disabled && (
        <div className="relative">
          <Input
            placeholder="Search ICD-10 codes..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pr-8"
          />
          <MaterialIcon
            icon="search"
            size="sm"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          {/* Dropdown */}
          {isOpen && query.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-surface-container shadow-lg">
              {results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">No codes found</p>
              ) : (
                results.map((code) => (
                  <button
                    key={code.code}
                    type="button"
                    onClick={() => {
                      handleSelect(code);
                      setQuery("");
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-300 hover:bg-muted/50",
                      selectedCodes.has(code.code) && "bg-primary/5"
                    )}
                  >
                    <span className="font-mono text-xs font-semibold text-primary">
                      {code.code}
                    </span>
                    <span className="text-on-surface">{code.description}</span>
                    {selectedCodes.has(code.code) && (
                      <MaterialIcon icon="check" size="xs" className="ml-auto text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Click-away listener */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

---

## Task 15: Frontend — Evaluation List Component

**Files:**
- Create: `src/features/evaluations/components/evaluation-list.tsx`

- [ ] **Step 1: Create the evaluation list**

```tsx
"use client";

import Link from "next/link";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";

import type { Id } from "../../../../convex/_generated/dataModel";
import { useEvaluations } from "../hooks/use-evaluations";

interface EvaluationListProps {
  patientId: Id<"patients">;
}

export function EvaluationList({ patientId }: EvaluationListProps) {
  const evaluations = useEvaluations(patientId);

  if (evaluations === undefined) {
    return (
      <div className="rounded-xl bg-surface-container p-4">
        <p className="text-sm text-on-surface-variant">Loading evaluations...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-container p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-on-surface">Evaluations</h3>
        <Button asChild size="sm">
          <Link href={`/patients/${patientId}/evaluations/new`}>
            <MaterialIcon icon="add" size="sm" className="mr-1" />
            New Evaluation
          </Link>
        </Button>
      </div>

      {evaluations.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No evaluations yet</p>
      ) : (
        <div className="flex flex-col gap-2">
          {evaluations.map((evalDoc) => (
            <Link
              key={evalDoc._id}
              href={`/patients/${patientId}/evaluations/${evalDoc._id}`}
              className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5 transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-muted/60"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-on-surface">
                  Evaluation — {evalDoc.evaluationDate}
                </span>
                <span className="text-xs text-on-surface-variant">
                  {evalDoc.diagnosisCodes.map((d) => d.code).join(", ") || "No diagnosis codes"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    evalDoc.status === "signed"
                      ? "bg-success/10 text-success"
                      : evalDoc.status === "complete"
                        ? "bg-info/10 text-info"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {evalDoc.status === "signed"
                    ? "Signed"
                    : evalDoc.status === "complete"
                      ? "Complete"
                      : "Draft"}
                </span>
                <MaterialIcon icon="chevron_right" size="sm" className="text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

---

## Task 16: Frontend — Evaluation Editor + Route Pages

**Files:**
- Create: `src/features/evaluations/components/evaluation-editor.tsx`
- Create: `src/app/(app)/patients/[id]/evaluations/new/page.tsx`
- Create: `src/app/(app)/patients/[id]/evaluations/[evalId]/page.tsx`

- [ ] **Step 1: Create the evaluation editor component**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { usePatient } from "@/shared/clinical";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  useCreateEvaluation,
  useEvalGeneration,
  useEvaluation,
  useSignEvaluation,
  useUnsignEvaluation,
  useUpdateEvaluation,
  useUpdateEvaluationStatus,
} from "../hooks/use-evaluations";
import { ICD10Picker } from "./icd10-picker";

interface EvaluationEditorProps {
  patientId: string;
  evalId?: string;
}

const PROGNOSIS_OPTIONS = ["excellent", "good", "fair", "guarded"] as const;

export function EvaluationEditor({ patientId, evalId }: EvaluationEditorProps) {
  const router = useRouter();
  const typedPatientId = patientId as Id<"patients">;
  const typedEvalId = evalId ? (evalId as Id<"evaluations">) : null;

  const patient = usePatient(typedPatientId);
  const existingEval = useEvaluation(typedEvalId);
  const createEval = useCreateEvaluation();
  const updateEval = useUpdateEvaluation();
  const updateStatus = useUpdateEvaluationStatus();
  const signEval = useSignEvaluation();
  const unsignEval = useUnsignEvaluation();
  const aiGen = useEvalGeneration();

  const [evaluationDate, setEvaluationDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [referralSource, setReferralSource] = useState("");
  const [backgroundHistory, setBackgroundHistory] = useState("");
  const [behavioralObservations, setBehavioralObservations] = useState("");
  const [clinicalInterpretation, setClinicalInterpretation] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [diagnosisCodes, setDiagnosisCodes] = useState<
    { code: string; description: string }[]
  >([]);
  const [prognosis, setPrognosis] = useState<(typeof PROGNOSIS_OPTIONS)[number]>("good");
  const [currentEvalId, setCurrentEvalId] = useState<Id<"evaluations"> | null>(typedEvalId);

  // Initialize from existing
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || !existingEval) return;
    hasInitialized.current = true;
    setEvaluationDate(existingEval.evaluationDate);
    setReferralSource(existingEval.referralSource ?? "");
    setBackgroundHistory(existingEval.backgroundHistory);
    setBehavioralObservations(existingEval.behavioralObservations);
    setClinicalInterpretation(existingEval.clinicalInterpretation);
    setRecommendations(existingEval.recommendations);
    setDiagnosisCodes(existingEval.diagnosisCodes);
    setPrognosis(existingEval.prognosis);
  }, [existingEval]);

  // Update AI results when generation completes
  useEffect(() => {
    if (aiGen.result) {
      setClinicalInterpretation(aiGen.result.clinicalInterpretation);
      setRecommendations(aiGen.result.recommendations);
    }
  }, [aiGen.result]);

  const isSigned = existingEval?.status === "signed";

  async function handleSave() {
    try {
      if (currentEvalId) {
        await updateEval({
          evalId: currentEvalId,
          evaluationDate,
          referralSource: referralSource || undefined,
          backgroundHistory,
          behavioralObservations,
          clinicalInterpretation,
          recommendations,
          diagnosisCodes,
          prognosis,
          assessmentTools: existingEval?.assessmentTools ?? [],
          domainFindings: existingEval?.domainFindings ?? {},
        });
        toast.success("Evaluation saved");
      } else {
        const newId = await createEval({
          patientId: typedPatientId,
          evaluationDate,
          referralSource: referralSource || undefined,
          backgroundHistory,
          assessmentTools: [],
          domainFindings: {},
          behavioralObservations,
          clinicalInterpretation,
          diagnosisCodes,
          prognosis,
          recommendations,
        });
        setCurrentEvalId(newId);
        router.replace(`/patients/${patientId}/evaluations/${newId}`);
        toast.success("Evaluation created");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleGenerate() {
    if (!currentEvalId) {
      toast.error("Save the evaluation first");
      return;
    }
    try {
      await aiGen.generate(currentEvalId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    }
  }

  async function handleSign() {
    if (!currentEvalId) return;
    try {
      await updateStatus({ evalId: currentEvalId, status: "complete" });
      await signEval({ evalId: currentEvalId });
      toast.success("Evaluation signed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign");
    }
  }

  async function handleUnsign() {
    if (!currentEvalId) return;
    try {
      await unsignEval({ evalId: currentEvalId });
      toast.success("Evaluation unsigned");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unsign");
    }
  }

  if (patient === undefined || (typedEvalId && existingEval === undefined)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <MaterialIcon icon="progress_activity" className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3">
        <Link
          href={`/patients/${patientId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
        >
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to patient
        </Link>
        <h1 className="font-headline text-2xl font-bold text-on-surface">
          {evalId ? "Edit Evaluation" : "New Evaluation"}
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Evaluation Date</label>
            <Input type="date" value={evaluationDate} onChange={(e) => setEvaluationDate(e.target.value)} disabled={isSigned} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Referral Source</label>
            <Input value={referralSource} onChange={(e) => setReferralSource(e.target.value)} placeholder="e.g. Pediatrician" disabled={isSigned} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Background History</label>
          <Textarea rows={4} value={backgroundHistory} onChange={(e) => setBackgroundHistory(e.target.value)} placeholder="Developmental history, prior services, chief complaint" disabled={isSigned} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Behavioral Observations</label>
          <Textarea rows={3} value={behavioralObservations} onChange={(e) => setBehavioralObservations(e.target.value)} placeholder="Clinical observations during evaluation" disabled={isSigned} />
        </div>

        <ICD10Picker selected={diagnosisCodes} onChange={setDiagnosisCodes} disabled={isSigned} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Prognosis</label>
          <div className="flex gap-2">
            {PROGNOSIS_OPTIONS.map((p) => (
              <Button
                key={p}
                variant={prognosis === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPrognosis(p)}
                disabled={isSigned}
                className={prognosis === p ? "bg-primary-gradient text-white" : ""}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-on-surface">Clinical Interpretation</label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isSigned || aiGen.status === "generating" || !currentEvalId}
            >
              <MaterialIcon icon="auto_awesome" size="sm" />
              {aiGen.status === "generating" ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
          <Textarea
            rows={6}
            value={aiGen.status === "generating" ? aiGen.streamedText : clinicalInterpretation}
            onChange={(e) => setClinicalInterpretation(e.target.value)}
            placeholder="AI-assisted narrative interpreting scores and observations"
            disabled={isSigned || aiGen.status === "generating"}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Recommendations</label>
          <Textarea rows={4} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Services recommended, referrals, accommodations" disabled={isSigned} />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
          <Button onClick={handleSave} disabled={isSigned}>
            <MaterialIcon icon="save" size="sm" />
            Save
          </Button>
          <div className="flex items-center gap-2">
            {isSigned ? (
              <Button variant="outline" onClick={handleUnsign}>
                <MaterialIcon icon="lock_open" size="sm" />
                Unsign
              </Button>
            ) : (
              <Button
                onClick={handleSign}
                disabled={!currentEvalId || !clinicalInterpretation || !recommendations}
                className="bg-primary-gradient text-white"
              >
                <MaterialIcon icon="verified" size="sm" />
                Sign Evaluation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the route pages**

Create `src/app/(app)/patients/[id]/evaluations/new/page.tsx`:

```tsx
"use client";

import { use } from "react";

import { EvaluationEditor } from "@/features/evaluations/components/evaluation-editor";

export default function NewEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <EvaluationEditor patientId={id} />;
}
```

Create `src/app/(app)/patients/[id]/evaluations/[evalId]/page.tsx`:

```tsx
"use client";

import { use } from "react";

import { EvaluationEditor } from "@/features/evaluations/components/evaluation-editor";

export default function EditEvaluationPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id, evalId } = use(params);
  return <EvaluationEditor patientId={id} evalId={evalId} />;
}
```

- [ ] **Step 3: Verify pages compile**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 4: Commit**

---

## Task 17: Frontend — Plan of Care Editor + Route Page

**Files:**
- Create: `src/features/plan-of-care/components/poc-editor.tsx`
- Create: `src/app/(app)/patients/[id]/plan-of-care/page.tsx`

- [ ] **Step 1: Create the POC editor component**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { usePatient } from "@/shared/clinical";
import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../../convex/_generated/dataModel";
import {
  useActivePlanOfCare,
  useAmendPlanOfCare,
  useCreatePlanOfCare,
  useSignPlanOfCare,
  useUpdatePlanOfCare,
} from "../hooks/use-plan-of-care";

interface POCEditorProps {
  patientId: string;
}

export function POCEditor({ patientId }: POCEditorProps) {
  const typedPatientId = patientId as Id<"patients">;
  const patient = usePatient(typedPatientId);
  const activePoc = useActivePlanOfCare(typedPatientId);
  const createPoc = useCreatePlanOfCare();
  const updatePoc = useUpdatePlanOfCare();
  const signPoc = useSignPlanOfCare();
  const amendPoc = useAmendPlanOfCare();

  const [frequency, setFrequency] = useState("2x/week");
  const [sessionDuration, setSessionDuration] = useState("45 minutes");
  const [planDuration, setPlanDuration] = useState("12 weeks");
  const [dischargeCriteria, setDischargeCriteria] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [physicianNPI, setPhysicianNPI] = useState("");
  const [physicianSigOnFile, setPhysicianSigOnFile] = useState(false);
  const [currentPocId, setCurrentPocId] = useState<Id<"plansOfCare"> | null>(null);

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || !activePoc) return;
    hasInitialized.current = true;
    setFrequency(activePoc.frequency);
    setSessionDuration(activePoc.sessionDuration);
    setPlanDuration(activePoc.planDuration);
    setDischargeCriteria(activePoc.dischargeCriteria);
    setPhysicianName(activePoc.physicianName ?? "");
    setPhysicianNPI(activePoc.physicianNPI ?? "");
    setPhysicianSigOnFile(activePoc.physicianSignatureOnFile);
    setCurrentPocId(activePoc._id);
  }, [activePoc]);

  const isActive = activePoc?.status === "active";

  async function handleCreate() {
    try {
      const pocId = await createPoc({
        patientId: typedPatientId,
        diagnosisCodes: [],
        longTermGoals: [],
        shortTermGoals: [],
        frequency,
        sessionDuration,
        planDuration,
        dischargeCriteria,
        physicianName: physicianName || undefined,
        physicianNPI: physicianNPI || undefined,
        physicianSignatureOnFile: physicianSigOnFile,
      });
      setCurrentPocId(pocId);
      toast.success("Plan of Care created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    }
  }

  async function handleSave() {
    if (!currentPocId) return;
    try {
      await updatePoc({
        pocId: currentPocId,
        frequency,
        sessionDuration,
        planDuration,
        dischargeCriteria,
        physicianName: physicianName || undefined,
        physicianNPI: physicianNPI || undefined,
        physicianSignatureOnFile: physicianSigOnFile,
      });
      toast.success("Plan of Care saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleSign() {
    if (!currentPocId) return;
    try {
      await signPoc({ pocId: currentPocId });
      toast.success("Plan of Care signed and activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign");
    }
  }

  async function handleAmend() {
    if (!currentPocId) return;
    try {
      const newPocId = await amendPoc({
        pocId: currentPocId,
        frequency,
        sessionDuration,
        planDuration,
        dischargeCriteria,
      });
      setCurrentPocId(newPocId);
      hasInitialized.current = false;
      toast.success("Plan of Care amended — new draft created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to amend");
    }
  }

  if (patient === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <MaterialIcon icon="progress_activity" className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3">
        <Link
          href={`/patients/${patientId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:text-foreground"
        >
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to patient
        </Link>
        <h1 className="font-headline text-2xl font-bold text-on-surface">
          Plan of Care
          {activePoc ? ` (v${activePoc.version})` : ""}
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Frequency</label>
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} disabled={isActive} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Session Duration</label>
            <Input value={sessionDuration} onChange={(e) => setSessionDuration(e.target.value)} disabled={isActive} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-on-surface">Plan Duration</label>
            <Input value={planDuration} onChange={(e) => setPlanDuration(e.target.value)} disabled={isActive} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Discharge Criteria</label>
          <Textarea rows={3} value={dischargeCriteria} onChange={(e) => setDischargeCriteria(e.target.value)} placeholder="When is the patient ready for discharge?" disabled={isActive} />
        </div>

        <div className="rounded-xl bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-semibold text-on-surface">Physician Signature</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface">Physician Name</label>
              <Input value={physicianName} onChange={(e) => setPhysicianName(e.target.value)} disabled={isActive} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface">NPI</label>
              <Input value={physicianNPI} onChange={(e) => setPhysicianNPI(e.target.value)} disabled={isActive} />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-on-surface">
            <input type="checkbox" checked={physicianSigOnFile} onChange={(e) => setPhysicianSigOnFile(e.target.checked)} disabled={isActive} />
            Physician signature on file
          </label>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
          {!currentPocId ? (
            <Button onClick={handleCreate} className="bg-primary-gradient text-white">
              <MaterialIcon icon="add" size="sm" />
              Create Plan of Care
            </Button>
          ) : isActive ? (
            <Button onClick={handleAmend} variant="outline">
              <MaterialIcon icon="edit_note" size="sm" />
              Amend Plan of Care
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button onClick={handleSave}>
                <MaterialIcon icon="save" size="sm" />
                Save Draft
              </Button>
              <Button onClick={handleSign} className="bg-primary-gradient text-white">
                <MaterialIcon icon="verified" size="sm" />
                Sign and Activate
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the route page**

Create `src/app/(app)/patients/[id]/plan-of-care/page.tsx`:

```tsx
"use client";

import { use } from "react";

import { POCEditor } from "@/features/plan-of-care/components/poc-editor";

export default function PlanOfCarePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <POCEditor patientId={id} />;
}
```

- [ ] **Step 3: Verify pages compile**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 4: Commit**

---

## Task 18: Frontend — Discharge Form Component

**Files:**
- Create: `src/features/discharge/components/discharge-form.tsx`

- [ ] **Step 1: Create the discharge form component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { MaterialIcon } from "@/shared/components/material-icon";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";

import type { Id } from "../../../../convex/_generated/dataModel";
import {
  useCreateDischargeSummary,
  useDischargeGeneration,
  useSignDischargeSummary,
  useUpdateDischargeSummary,
} from "../hooks/use-discharge-summary";

const DISCHARGE_REASONS = [
  { value: "goals-met", label: "Goals Met" },
  { value: "plateau", label: "Plateau" },
  { value: "family-request", label: "Family Request" },
  { value: "insurance-exhausted", label: "Insurance Exhausted" },
  { value: "transition", label: "Transition" },
  { value: "other", label: "Other" },
] as const;

type DischargeReason = (typeof DISCHARGE_REASONS)[number]["value"];

interface DischargeFormProps {
  patientId: Id<"patients">;
  onComplete?: () => void;
}

export function DischargeForm({ patientId, onComplete }: DischargeFormProps) {
  const createDischarge = useCreateDischargeSummary();
  const updateDischarge = useUpdateDischargeSummary();
  const signDischarge = useSignDischargeSummary();
  const aiGen = useDischargeGeneration();

  const [reason, setReason] = useState<DischargeReason>("goals-met");
  const [reasonOther, setReasonOther] = useState("");
  const [narrative, setNarrative] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [returnCriteria, setReturnCriteria] = useState("");
  const [dischargeId, setDischargeId] = useState<Id<"dischargeSummaries"> | null>(null);

  useEffect(() => {
    if (aiGen.result) {
      setNarrative(aiGen.result.narrative);
      setRecommendations(aiGen.result.recommendations);
    }
  }, [aiGen.result]);

  async function handleCreate() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const id = await createDischarge({
        patientId,
        serviceStartDate: today,
        serviceEndDate: today,
        presentingDiagnosis: "",
        goalsAchieved: [],
        goalsNotMet: [],
        dischargeReason: reason,
        dischargeReasonOther: reason === "other" ? reasonOther : undefined,
        narrative,
        recommendations,
        returnCriteria: returnCriteria || undefined,
      });
      setDischargeId(id);
      toast.success("Discharge summary created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    }
  }

  async function handleGenerate() {
    if (!dischargeId) {
      toast.error("Create the discharge summary first");
      return;
    }
    try {
      await aiGen.generate(dischargeId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    }
  }

  async function handleSign() {
    if (!dischargeId) return;
    try {
      if (narrative) {
        await updateDischarge({
          dischargeId,
          narrative,
          recommendations,
          returnCriteria: returnCriteria || undefined,
        });
      }
      await signDischarge({ dischargeId });
      toast.success("Discharge summary signed");
      onComplete?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-on-surface">Discharge Reason</label>
        <div className="flex flex-wrap gap-2">
          {DISCHARGE_REASONS.map((r) => (
            <Button
              key={r.value}
              variant={reason === r.value ? "default" : "outline"}
              size="sm"
              onClick={() => setReason(r.value)}
              className={reason === r.value ? "bg-primary-gradient text-white" : ""}
            >
              {r.label}
            </Button>
          ))}
        </div>
        {reason === "other" && (
          <Textarea
            rows={2}
            value={reasonOther}
            onChange={(e) => setReasonOther(e.target.value)}
            placeholder="Describe the reason"
            className="mt-2"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-on-surface">Narrative</label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={aiGen.status === "generating" || !dischargeId}
          >
            <MaterialIcon icon="auto_awesome" size="sm" />
            {aiGen.status === "generating" ? "Generating..." : "Generate with AI"}
          </Button>
        </div>
        <Textarea
          rows={6}
          value={aiGen.status === "generating" ? aiGen.streamedText : narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Summary of treatment course"
          disabled={aiGen.status === "generating"}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-on-surface">Recommendations</label>
        <Textarea rows={4} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Post-discharge recommendations" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-on-surface">Return Criteria (optional)</label>
        <Textarea rows={2} value={returnCriteria} onChange={(e) => setReturnCriteria(e.target.value)} placeholder="When should the patient return to therapy?" />
      </div>

      <div className="flex items-center justify-end gap-2">
        {!dischargeId ? (
          <Button onClick={handleCreate} className="bg-primary-gradient text-white">
            <MaterialIcon icon="add" size="sm" />
            Create Discharge Summary
          </Button>
        ) : (
          <Button
            onClick={handleSign}
            disabled={!narrative || !recommendations}
            className="bg-primary-gradient text-white"
          >
            <MaterialIcon icon="verified" size="sm" />
            Sign Discharge Summary
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

---

## Task 19: Integration — Add Clinical Widgets to Patient Detail Page

**Files:**
- Modify: `src/app/(app)/patients/[id]/page.tsx:1-26`

- [ ] **Step 1: Add EvaluationList import and render to patient detail**

Replace the contents of `src/app/(app)/patients/[id]/page.tsx`:

```tsx
"use client";

import { EvaluationList } from "@/features/evaluations/components/evaluation-list";
import { GoalsList } from "@/features/goals/components/goals-list";
import { PatientDetailPage } from "@/features/patients/components/patient-detail-page";
import { SessionNotesList } from "@/features/session-notes/components/session-notes-list";

import type { Id } from "../../../../../convex/_generated/dataModel";

export default function PatientDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <PatientDetailPage
      paramsPromise={params}
      clinicalWidgets={(patientId: Id<"patients">) => (
        <>
          <EvaluationList patientId={patientId} />
          <GoalsList patientId={patientId} />
          <SessionNotesList patientId={patientId} />
        </>
      )}
    />
  );
}
```

- [ ] **Step 2: Verify it compiles**
Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

---

## Task 20: Run Full Test Suite

**Files:**
- None — verification only

- [ ] **Step 1: Run all backend tests**
Run: `npx vitest run convex/__tests__/evaluations.test.ts convex/__tests__/plansOfCare.test.ts convex/__tests__/dischargeSummaries.test.ts convex/__tests__/goals.test.ts convex/__tests__/sessionNotes.test.ts`
Expected: PASS — all tests green, no regressions

- [ ] **Step 2: Run full test suite**
Run: `npm test`
Expected: PASS — no regressions in existing 636+ tests

- [ ] **Step 3: Run type check**
Run: `npx tsc --noEmit`
Expected: PASS — no type errors

- [ ] **Step 4: Final commit with all verified**

---

## Task Summary

| Task | Description | Files | Tests |
|------|-------------|-------|-------|
| 1 | Schema — 3 new tables + extend goals/patients + activity log | `convex/schema.ts`, `convex/activityLog.ts` | Schema push |
| 2 | ICD-10 code static module | `src/features/evaluations/lib/icd10-codes.ts` | Compile |
| 3 | Backend — `convex/evaluations.ts` | `convex/evaluations.ts`, `convex/__tests__/evaluations.test.ts` | 6 test cases |
| 4 | Backend — `convex/plansOfCare.ts` | `convex/plansOfCare.ts`, `convex/__tests__/plansOfCare.test.ts` | 6 test cases |
| 5 | Backend — `convex/dischargeSummaries.ts` | `convex/dischargeSummaries.ts`, `convex/__tests__/dischargeSummaries.test.ts` | 5 test cases |
| 6 | Backend — Goal amendment audit trail | `convex/goals.ts`, `convex/__tests__/goals.test.ts` | 1 new test |
| 7 | AI — Evaluation prompt builder | `src/features/evaluations/lib/evaluation-prompt.ts` | Compile |
| 8 | AI — Discharge prompt builder | `src/features/discharge/lib/discharge-prompt.ts` | Compile |
| 9 | SSE — `/api/generate-evaluation` | `src/app/api/generate-evaluation/route.ts` | Compile |
| 10 | SSE — `/api/generate-discharge` | `src/app/api/generate-discharge/route.ts` | Compile |
| 11 | Frontend — Evaluations hooks | `src/features/evaluations/hooks/use-evaluations.ts` | Compile |
| 12 | Frontend — Plan of Care hooks | `src/features/plan-of-care/hooks/use-plan-of-care.ts` | Compile |
| 13 | Frontend — Discharge hooks | `src/features/discharge/hooks/use-discharge-summary.ts` | Compile |
| 14 | Frontend — ICD-10 picker component | `src/features/evaluations/components/icd10-picker.tsx` | Compile |
| 15 | Frontend — Evaluation list component | `src/features/evaluations/components/evaluation-list.tsx` | Compile |
| 16 | Frontend — Evaluation editor + routes | `src/features/evaluations/components/evaluation-editor.tsx`, 2 route pages | Compile |
| 17 | Frontend — POC editor + route | `src/features/plan-of-care/components/poc-editor.tsx`, 1 route page | Compile |
| 18 | Frontend — Discharge form component | `src/features/discharge/components/discharge-form.tsx` | Compile |
| 19 | Integration — Patient detail page | `src/app/(app)/patients/[id]/page.tsx` | Compile |
| 20 | Verification — Full test suite | None | All tests pass |
