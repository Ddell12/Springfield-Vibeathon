# SP2: Clinical Documents — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full clinical document lifecycle (evaluation reports, plans of care, discharge summaries) with AI-assisted narrative generation, goal amendment audit trail, and ICD-10 code support for SLP practices.

**Architecture:** Three new Convex tables (`evaluations`, `plansOfCare`, `dischargeSummaries`) plus schema extensions to `goals` (amendmentLog) and `patients` (icdCodes). Three new feature slices under `src/features/` for frontend. Two SSE streaming routes for AI generation (evaluation interpretation + discharge narrative). Plan of Care is structured data only — no AI narrative. All documents follow the same lifecycle: structured data in, optional AI generation, SLP review/edit, sign, print via browser CSS.

**Tech Stack:** Convex (schema + functions), Next.js App Router, Clerk auth, Anthropic SDK (Claude Sonnet), shadcn/ui, Tailwind v4, convex-test, Vitest, React Testing Library

---

## File Structure

### Schema & Backend
| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `convex/schema.ts` | Add `evaluations`, `plansOfCare`, `dischargeSummaries` tables; extend `goals` with `amendmentLog`; extend `patients` with `icdCodes`; add new `activityLog.action` literals |
| Create | `convex/evaluations.ts` | `create`, `update`, `sign`, `unsign` mutations; `getByPatient`, `get` queries |
| Create | `convex/plansOfCare.ts` | `generate`, `update`, `sign`, `amend` mutations; `getActiveByPatient`, `getByPatient`, `get` queries |
| Create | `convex/dischargeSummaries.ts` | `generate`, `update`, `sign` mutations; `getByPatient`, `get` queries |
| Modify | `convex/goals.ts` | Add amendment log snapshot to `update` mutation |

### AI Generation Routes
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/features/evaluations/lib/evaluation-prompt.ts` | Prompt builder for AI interpretation generation |
| Create | `src/app/api/generate-evaluation/route.ts` | SSE streaming endpoint for clinical interpretation + recommendations |
| Create | `src/features/discharge/lib/discharge-prompt.ts` | Prompt builder for AI discharge narrative |
| Create | `src/app/api/generate-discharge/route.ts` | SSE streaming endpoint for discharge narrative + recommendations |

### Frontend — New Feature Slices
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/features/evaluations/lib/icd10-codes.ts` | Static lookup of ~50 common SLP ICD-10 codes |
| Create | `src/features/evaluations/hooks/use-evaluations.ts` | Hook wrapping Convex evaluation queries + mutations |
| Create | `src/features/evaluations/components/icd10-picker.tsx` | Searchable dropdown for ICD-10 code selection |
| Create | `src/features/evaluations/components/assessment-tools-form.tsx` | Dynamic list of assessment tools with score fields |
| Create | `src/features/evaluations/components/domain-findings-form.tsx` | Per-domain narrative + scores inputs |
| Create | `src/features/evaluations/components/evaluation-editor.tsx` | Multi-section evaluation form |
| Create | `src/features/evaluations/components/evaluation-viewer.tsx` | Read-only view with print styling |
| Create | `src/features/evaluations/components/evaluation-list.tsx` | Patient's evaluation history list |
| Create | `src/features/plan-of-care/hooks/use-plan-of-care.ts` | Hook wrapping Convex POC queries + mutations |
| Create | `src/features/plan-of-care/components/physician-signature.tsx` | Physician name/NPI/signature section |
| Create | `src/features/plan-of-care/components/poc-editor.tsx` | Edit POC structured fields |
| Create | `src/features/plan-of-care/components/poc-viewer.tsx` | Read-only POC with print styling |
| Create | `src/features/plan-of-care/components/poc-generator.tsx` | Generate POC from evaluation + goals |
| Create | `src/features/plan-of-care/components/poc-history.tsx` | Version history for amendments |
| Create | `src/features/discharge/hooks/use-discharge-summary.ts` | Hook wrapping Convex discharge queries + mutations |
| Create | `src/features/discharge/components/discharge-form.tsx` | Discharge reason + editable fields |
| Create | `src/features/discharge/components/discharge-viewer.tsx` | Read-only discharge with print styling |
| Create | `src/features/discharge/components/discharge-prompt-modal.tsx` | Modal triggered on patient discharge |

### Frontend — Integration Points
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/app/(app)/patients/[id]/evaluations/new/page.tsx` | New evaluation route |
| Create | `src/app/(app)/patients/[id]/evaluations/[evalId]/page.tsx` | View/edit evaluation route |
| Create | `src/app/(app)/patients/[id]/plan-of-care/page.tsx` | View/edit active POC route |
| Modify | `src/app/(app)/patients/[id]/page.tsx` | Add EvaluationList + POC status to clinicalWidgets |
| Modify | `src/features/goals/components/goals-list.tsx` | Add "Generate Plan of Care" button |
| Modify | `src/features/patients/components/patient-profile-widget.tsx` | Add discharge summary card for discharged patients |

### Tests
| Action | File | Responsibility |
|--------|------|---------------|
| Create | `convex/__tests__/evaluations.test.ts` | Convex function tests for evaluation CRUD, signing, ICD-10 propagation |
| Create | `convex/__tests__/plansOfCare.test.ts` | Convex function tests for POC generation, amendment versioning |
| Create | `convex/__tests__/dischargeSummaries.test.ts` | Convex function tests for discharge summary generation, signing |
| Create | `convex/__tests__/goalAmendments.test.ts` | Tests for goal amendment audit trail |
| Create | `src/features/evaluations/components/__tests__/icd10-picker.test.tsx` | Render + search tests for ICD-10 picker |
| Create | `src/features/evaluations/components/__tests__/evaluation-editor.test.tsx` | Render tests for evaluation form |

---

## Task 1: Schema Changes — New Tables + Extended Fields

**Files:**
- Modify: `convex/schema.ts:1-612`
- Test: `convex/__tests__/evaluations.test.ts` (schema validation only)

This task adds the 3 new tables and extends `goals` and `patients`. Must be done first since all backend tasks depend on the schema.

- [ ] **Step 1: Add the `evaluations` table to `convex/schema.ts`**

Add after the `progressReports` table definition (after line 482):

```typescript
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
    diagnosisCodes: v.array(v.object({
      code: v.string(),
      description: v.string(),
    })),
    prognosis: v.union(
      v.literal("excellent"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("guarded")
    ),
    recommendations: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("complete"),
      v.literal("signed")
    ),
    signedAt: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"])
    .index("by_slpUserId", ["slpUserId"]),
```

- [ ] **Step 2: Add the `plansOfCare` table to `convex/schema.ts`**

Add immediately after the `evaluations` table:

```typescript
  plansOfCare: defineTable({
    patientId: v.id("patients"),
    slpUserId: v.string(),
    evaluationId: v.optional(v.id("evaluations")),
    diagnosisCodes: v.array(v.object({
      code: v.string(),
      description: v.string(),
    })),
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

- [ ] **Step 3: Add the `dischargeSummaries` table to `convex/schema.ts`**

Add immediately after the `plansOfCare` table:

```typescript
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
    status: v.union(
      v.literal("draft"),
      v.literal("signed")
    ),
    signedAt: v.optional(v.number()),
  })
    .index("by_patientId", ["patientId"]),
```

- [ ] **Step 4: Extend the `goals` table with `amendmentLog` field**

In the `goals` table definition (currently at line 379), add the `amendmentLog` field after `notes`:

```typescript
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

- [ ] **Step 5: Extend the `patients` table with `icdCodes` field**

In the `patients` table definition (currently at line 163), add after `behavioralNotes`:

```typescript
    icdCodes: v.optional(v.array(v.object({
      code: v.string(),
      description: v.string(),
    }))),
```

- [ ] **Step 6: Extend `activityLog.action` union with new literals**

In the `activityLog` table definition (currently at line 227), add to the `action` union:

```typescript
      v.literal("evaluation-created"),
      v.literal("evaluation-signed"),
      v.literal("evaluation-unsigned"),
      v.literal("poc-created"),
      v.literal("poc-signed"),
      v.literal("poc-amended"),
      v.literal("discharge-summary-created"),
      v.literal("discharge-summary-signed"),
```

- [ ] **Step 7: Verify schema compiles**

```bash
cd /Users/desha/Springfield-Vibeathon && npx convex dev --once 2>&1 | head -20
```

Expected: No schema validation errors.

- [ ] **Step 8: Commit**

```
feat(schema): add evaluations, plansOfCare, dischargeSummaries tables + extend goals/patients
```

---

## Task 2: Evaluations Backend — Convex Functions

**Files:**
- Create: `convex/evaluations.ts`
- Test: `convex/__tests__/evaluations.test.ts`

- [ ] **Step 1: Write failing tests for evaluations CRUD**

Create `convex/__tests__/evaluations.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

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

const validEvalArgs = {
  evaluationDate: "2026-03-15",
  backgroundHistory: "Child has been receiving speech services for 2 years.",
  assessmentTools: [
    { name: "GFTA-3", scoresRaw: "45", scoresStandard: "78", percentile: "7th" },
  ],
  domainFindings: {
    articulation: { narrative: "Demonstrates fronting and stopping patterns.", scores: "78 SS" },
  },
  behavioralObservations: "Cooperative and engaged throughout the evaluation.",
  clinicalInterpretation: "",
  diagnosisCodes: [{ code: "F80.0", description: "Phonological disorder" }],
  prognosis: "good" as const,
  recommendations: "Speech-language therapy 2x/week for 45 minutes.",
};

describe("evaluations.create", () => {
  it("creates a draft evaluation", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const evalId = await slp.mutation(api.evaluations.create, {
      patientId,
      ...validEvalArgs,
    });
    expect(evalId).toBeDefined();

    const evaluation = await slp.query(api.evaluations.get, { evaluationId: evalId });
    expect(evaluation).not.toBeNull();
    expect(evaluation!.status).toBe("draft");
    expect(evaluation!.patientId).toBe(patientId);
  });

  it("rejects non-owner SLP", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);

    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.evaluations.create, {
        patientId,
        ...validEvalArgs,
      })
    ).rejects.toThrow();
  });
});

describe("evaluations.update", () => {
  it("updates a draft evaluation", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const evalId = await slp.mutation(api.evaluations.create, {
      patientId,
      ...validEvalArgs,
    });

    await slp.mutation(api.evaluations.update, {
      evaluationId: evalId,
      clinicalInterpretation: "AI-generated interpretation text.",
      recommendations: "Updated recommendations.",
    });

    const evaluation = await slp.query(api.evaluations.get, { evaluationId: evalId });
    expect(evaluation!.clinicalInterpretation).toBe("AI-generated interpretation text.");
  });

  it("rejects update on signed evaluation", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const evalId = await slp.mutation(api.evaluations.create, {
      patientId,
      ...validEvalArgs,
    });

    // First set to complete, then sign
    await slp.mutation(api.evaluations.update, {
      evaluationId: evalId,
      status: "complete",
    });
    await slp.mutation(api.evaluations.sign, { evaluationId: evalId });

    await expect(
      slp.mutation(api.evaluations.update, {
        evaluationId: evalId,
        recommendations: "Should fail",
      })
    ).rejects.toThrow("Cannot edit a signed evaluation");
  });
});

describe("evaluations.sign", () => {
  it("transitions to signed and propagates ICD codes to patient", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const evalId = await slp.mutation(api.evaluations.create, {
      patientId,
      ...validEvalArgs,
    });
    await slp.mutation(api.evaluations.update, {
      evaluationId: evalId,
      status: "complete",
    });

    await slp.mutation(api.evaluations.sign, { evaluationId: evalId });

    const evaluation = await slp.query(api.evaluations.get, { evaluationId: evalId });
    expect(evaluation!.status).toBe("signed");
    expect(evaluation!.signedAt).toBeDefined();

    // Verify ICD codes propagated to patient
    const patient = await slp.query(api.patients.get, { patientId });
    expect(patient!.icdCodes).toEqual([{ code: "F80.0", description: "Phonological disorder" }]);
  });

  it("rejects signing a draft evaluation", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const evalId = await slp.mutation(api.evaluations.create, {
      patientId,
      ...validEvalArgs,
    });

    await expect(
      slp.mutation(api.evaluations.sign, { evaluationId: evalId })
    ).rejects.toThrow("Only complete evaluations can be signed");
  });
});

describe("evaluations.unsign", () => {
  it("reverts signed evaluation to complete", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const evalId = await slp.mutation(api.evaluations.create, {
      patientId,
      ...validEvalArgs,
    });
    await slp.mutation(api.evaluations.update, {
      evaluationId: evalId,
      status: "complete",
    });
    await slp.mutation(api.evaluations.sign, { evaluationId: evalId });
    await slp.mutation(api.evaluations.unsign, { evaluationId: evalId });

    const evaluation = await slp.query(api.evaluations.get, { evaluationId: evalId });
    expect(evaluation!.status).toBe("complete");
    expect(evaluation!.signedAt).toBeUndefined();
  });
});

describe("evaluations.getByPatient", () => {
  it("returns evaluations sorted by date descending", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.evaluations.create, {
      patientId,
      ...validEvalArgs,
      evaluationDate: "2026-01-01",
    });
    await slp.mutation(api.evaluations.create, {
      patientId,
      ...validEvalArgs,
      evaluationDate: "2026-03-15",
    });

    const evals = await slp.query(api.evaluations.getByPatient, { patientId });
    expect(evals).toHaveLength(2);
    // Most recent first
    expect(evals[0].evaluationDate).toBe("2026-03-15");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/evaluations.test.ts 2>&1 | tail -20
```

Expected: All tests fail because `api.evaluations` does not exist yet.

- [ ] **Step 3: Implement `convex/evaluations.ts`**

Create `convex/evaluations.ts`:

```typescript
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

// ── Validation Helpers ──────────────────────────────────────────────────────

function validateEvaluationDate(dateStr: string): void {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new ConvexError("Invalid evaluation date");
  }
}

// ── Queries ─────────────────────────────────────────────────────────────────

export const getByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    const evals = await ctx.db
      .query("evaluations")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();

    // Sort by evaluationDate descending
    return evals.sort((a, b) => b.evaluationDate.localeCompare(a.evaluationDate));
  },
});

export const get = slpQuery({
  args: { evaluationId: v.id("evaluations") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    const evaluation = await ctx.db.get(args.evaluationId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return evaluation;
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

    validateEvaluationDate(args.evaluationDate);

    const evalId = await ctx.db.insert("evaluations", {
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
      recommendations: args.recommendations,
      status: "draft",
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: ctx.slpUserId,
      action: "evaluation-created",
      details: `Created evaluation for ${args.evaluationDate}`,
      timestamp: Date.now(),
    });

    return evalId;
  },
});

export const update = slpMutation({
  args: {
    evaluationId: v.id("evaluations"),
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
    status: v.optional(v.union(v.literal("draft"), v.literal("complete"))),
  },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evaluationId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status === "signed") {
      throw new ConvexError("Cannot edit a signed evaluation");
    }

    if (args.evaluationDate !== undefined) validateEvaluationDate(args.evaluationDate);

    const updates: Record<string, unknown> = {};
    if (args.evaluationDate !== undefined) updates.evaluationDate = args.evaluationDate;
    if (args.referralSource !== undefined) updates.referralSource = args.referralSource;
    if (args.backgroundHistory !== undefined) updates.backgroundHistory = args.backgroundHistory;
    if (args.assessmentTools !== undefined) updates.assessmentTools = args.assessmentTools;
    if (args.domainFindings !== undefined) updates.domainFindings = args.domainFindings;
    if (args.behavioralObservations !== undefined) updates.behavioralObservations = args.behavioralObservations;
    if (args.clinicalInterpretation !== undefined) updates.clinicalInterpretation = args.clinicalInterpretation;
    if (args.diagnosisCodes !== undefined) updates.diagnosisCodes = args.diagnosisCodes;
    if (args.prognosis !== undefined) updates.prognosis = args.prognosis;
    if (args.recommendations !== undefined) updates.recommendations = args.recommendations;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.evaluationId, updates);
  },
});

export const sign = slpMutation({
  args: { evaluationId: v.id("evaluations") },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evaluationId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status !== "complete") {
      throw new ConvexError("Only complete evaluations can be signed");
    }

    const now = Date.now();
    await ctx.db.patch(args.evaluationId, {
      status: "signed",
      signedAt: now,
    });

    // Propagate ICD-10 codes to patient record
    await ctx.db.patch(evaluation.patientId, {
      icdCodes: evaluation.diagnosisCodes,
    });

    await ctx.db.insert("activityLog", {
      patientId: evaluation.patientId,
      actorUserId: ctx.slpUserId,
      action: "evaluation-signed",
      details: `Signed evaluation for ${evaluation.evaluationDate}`,
      timestamp: now,
    });
  },
});

export const unsign = slpMutation({
  args: { evaluationId: v.id("evaluations") },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db.get(args.evaluationId);
    if (!evaluation) throw new ConvexError("Evaluation not found");
    if (evaluation.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (evaluation.status !== "signed") {
      throw new ConvexError("Only signed evaluations can be unsigned");
    }

    const now = Date.now();
    await ctx.db.patch(args.evaluationId, {
      status: "complete",
      signedAt: undefined,
    });

    await ctx.db.insert("activityLog", {
      patientId: evaluation.patientId,
      actorUserId: ctx.slpUserId,
      action: "evaluation-unsigned",
      details: `Unsigned evaluation for ${evaluation.evaluationDate}`,
      timestamp: now,
    });
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/evaluations.test.ts 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```
feat(evaluations): add evaluations backend — CRUD, signing, ICD-10 propagation
```

---

## Task 3: Plans of Care Backend — Convex Functions

**Files:**
- Create: `convex/plansOfCare.ts`
- Test: `convex/__tests__/plansOfCare.test.ts`

- [ ] **Step 1: Write failing tests for plans of care**

Create `convex/__tests__/plansOfCare.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

async function createPatientWithGoals(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });

  const goalId = await slp.mutation(api.goals.create, {
    patientId,
    domain: "articulation" as const,
    shortDescription: "Produce /s/ in initial position",
    fullGoalText: "Patient will produce /s/ in initial position of words with 80% accuracy over 3 consecutive sessions.",
    targetAccuracy: 80,
    targetConsecutiveSessions: 3,
    startDate: "2026-01-15",
  });

  return { patientId, goalId };
}

const validPocArgs = {
  diagnosisCodes: [{ code: "F80.0", description: "Phonological disorder" }],
  longTermGoals: ["Improve overall speech intelligibility to 90%"],
  shortTermGoals: [],
  frequency: "2x/week",
  sessionDuration: "45 minutes",
  planDuration: "12 weeks",
  dischargeCriteria: "All short-term goals met at 80% accuracy over 3 consecutive sessions.",
  physicianSignatureOnFile: false,
  version: 1,
};

describe("plansOfCare.generate", () => {
  it("creates a draft POC", async () => {
    const t = convexTest(schema, modules);
    const { patientId, goalId } = await createPatientWithGoals(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const pocId = await slp.mutation(api.plansOfCare.generate, {
      patientId,
      ...validPocArgs,
      shortTermGoals: [goalId],
    });
    expect(pocId).toBeDefined();

    const poc = await slp.query(api.plansOfCare.get, { pocId });
    expect(poc).not.toBeNull();
    expect(poc!.status).toBe("draft");
    expect(poc!.version).toBe(1);
  });

  it("rejects non-owner SLP", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithGoals(t);

    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.plansOfCare.generate, {
        patientId,
        ...validPocArgs,
      })
    ).rejects.toThrow();
  });
});

describe("plansOfCare.sign", () => {
  it("transitions to active with signedAt", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithGoals(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const pocId = await slp.mutation(api.plansOfCare.generate, {
      patientId,
      ...validPocArgs,
    });
    await slp.mutation(api.plansOfCare.sign, { pocId });

    const poc = await slp.query(api.plansOfCare.get, { pocId });
    expect(poc!.status).toBe("active");
    expect(poc!.signedAt).toBeDefined();
  });
});

describe("plansOfCare.amend", () => {
  it("creates new version and marks old as amended", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithGoals(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const pocId = await slp.mutation(api.plansOfCare.generate, {
      patientId,
      ...validPocArgs,
    });
    await slp.mutation(api.plansOfCare.sign, { pocId });

    const newPocId = await slp.mutation(api.plansOfCare.amend, {
      pocId,
      frequency: "3x/week",
    });

    // Old version should be "amended"
    const oldPoc = await slp.query(api.plansOfCare.get, { pocId });
    expect(oldPoc!.status).toBe("amended");

    // New version should be "draft" with incremented version
    const newPoc = await slp.query(api.plansOfCare.get, { pocId: newPocId });
    expect(newPoc!.status).toBe("draft");
    expect(newPoc!.version).toBe(2);
    expect(newPoc!.previousVersionId).toBe(pocId);
    expect(newPoc!.frequency).toBe("3x/week");
  });
});

describe("plansOfCare.getActiveByPatient", () => {
  it("returns the active POC", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithGoals(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const pocId = await slp.mutation(api.plansOfCare.generate, {
      patientId,
      ...validPocArgs,
    });
    await slp.mutation(api.plansOfCare.sign, { pocId });

    const activePoc = await slp.query(api.plansOfCare.getActiveByPatient, { patientId });
    expect(activePoc).not.toBeNull();
    expect(activePoc!._id).toBe(pocId);
  });

  it("returns null when no active POC", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithGoals(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const activePoc = await slp.query(api.plansOfCare.getActiveByPatient, { patientId });
    expect(activePoc).toBeNull();
  });
});

describe("plansOfCare.getByPatient", () => {
  it("returns all versions", async () => {
    const t = convexTest(schema, modules);
    const { patientId } = await createPatientWithGoals(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const pocId = await slp.mutation(api.plansOfCare.generate, {
      patientId,
      ...validPocArgs,
    });
    await slp.mutation(api.plansOfCare.sign, { pocId });
    await slp.mutation(api.plansOfCare.amend, { pocId });

    const all = await slp.query(api.plansOfCare.getByPatient, { patientId });
    expect(all).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/plansOfCare.test.ts 2>&1 | tail -20
```

Expected: All tests fail because `api.plansOfCare` does not exist yet.

- [ ] **Step 3: Implement `convex/plansOfCare.ts`**

Create `convex/plansOfCare.ts`:

```typescript
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
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    const poc = await ctx.db.get(args.pocId);
    if (!poc) throw new ConvexError("Plan of Care not found");
    if (poc.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    return poc;
  },
});

export const getActiveByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    const activePoc = await ctx.db
      .query("plansOfCare")
      .withIndex("by_patientId_status", (q) =>
        q.eq("patientId", args.patientId).eq("status", "active")
      )
      .first();

    return activePoc ?? null;
  },
});

export const getByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("plansOfCare")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const generate = slpMutation({
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
    version: v.optional(v.number()),
    previousVersionId: v.optional(v.id("plansOfCare")),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    const pocId = await ctx.db.insert("plansOfCare", {
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
      version: args.version ?? 1,
      previousVersionId: args.previousVersionId,
    });

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: ctx.slpUserId,
      action: "poc-created",
      details: `Created Plan of Care v${args.version ?? 1}`,
      timestamp: Date.now(),
    });

    return pocId;
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

    const updates: Record<string, unknown> = {};
    if (args.diagnosisCodes !== undefined) updates.diagnosisCodes = args.diagnosisCodes;
    if (args.longTermGoals !== undefined) updates.longTermGoals = args.longTermGoals;
    if (args.shortTermGoals !== undefined) updates.shortTermGoals = args.shortTermGoals;
    if (args.frequency !== undefined) updates.frequency = args.frequency;
    if (args.sessionDuration !== undefined) updates.sessionDuration = args.sessionDuration;
    if (args.planDuration !== undefined) updates.planDuration = args.planDuration;
    if (args.projectedDischargeDate !== undefined) updates.projectedDischargeDate = args.projectedDischargeDate;
    if (args.dischargeCriteria !== undefined) updates.dischargeCriteria = args.dischargeCriteria;
    if (args.physicianName !== undefined) updates.physicianName = args.physicianName;
    if (args.physicianNPI !== undefined) updates.physicianNPI = args.physicianNPI;
    if (args.physicianSignatureOnFile !== undefined) updates.physicianSignatureOnFile = args.physicianSignatureOnFile;
    if (args.physicianSignatureDate !== undefined) updates.physicianSignatureDate = args.physicianSignatureDate;

    await ctx.db.patch(args.pocId, updates);
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
    await ctx.db.patch(args.pocId, {
      status: "active",
      signedAt: now,
    });

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
    // Override fields for the new version
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
    if (poc.status !== "active") {
      throw new ConvexError("Only active Plans of Care can be amended");
    }

    // Mark old version as amended
    await ctx.db.patch(args.pocId, { status: "amended" });

    // Create new version copying all fields, with overrides
    const newPocId = await ctx.db.insert("plansOfCare", {
      patientId: poc.patientId,
      slpUserId: ctx.slpUserId,
      evaluationId: poc.evaluationId,
      diagnosisCodes: args.diagnosisCodes ?? poc.diagnosisCodes,
      longTermGoals: args.longTermGoals ?? poc.longTermGoals,
      shortTermGoals: args.shortTermGoals ?? poc.shortTermGoals,
      frequency: args.frequency ?? poc.frequency,
      sessionDuration: args.sessionDuration ?? poc.sessionDuration,
      planDuration: args.planDuration ?? poc.planDuration,
      projectedDischargeDate: args.projectedDischargeDate ?? poc.projectedDischargeDate,
      dischargeCriteria: args.dischargeCriteria ?? poc.dischargeCriteria,
      physicianName: args.physicianName ?? poc.physicianName,
      physicianNPI: args.physicianNPI ?? poc.physicianNPI,
      physicianSignatureOnFile: args.physicianSignatureOnFile ?? poc.physicianSignatureOnFile,
      physicianSignatureDate: args.physicianSignatureDate ?? poc.physicianSignatureDate,
      status: "draft",
      version: poc.version + 1,
      previousVersionId: args.pocId,
    });

    const now = Date.now();
    await ctx.db.insert("activityLog", {
      patientId: poc.patientId,
      actorUserId: ctx.slpUserId,
      action: "poc-amended",
      details: `Amended Plan of Care v${poc.version} → v${poc.version + 1}`,
      timestamp: now,
    });

    return newPocId;
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/plansOfCare.test.ts 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```
feat(plansOfCare): add Plan of Care backend — generate, sign, amend versioning
```

---

## Task 4: Discharge Summaries Backend — Convex Functions

**Files:**
- Create: `convex/dischargeSummaries.ts`
- Test: `convex/__tests__/dischargeSummaries.test.ts`

- [ ] **Step 1: Write failing tests for discharge summaries**

Create `convex/__tests__/dischargeSummaries.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };
const OTHER_SLP = { subject: "other-slp-456", issuer: "clerk" };

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

const validDischargeArgs = {
  serviceStartDate: "2025-06-01",
  serviceEndDate: "2026-03-15",
  presentingDiagnosis: "Phonological disorder (F80.0)",
  goalsAchieved: [
    { goalId: "goal-1", shortDescription: "Produce /s/ in initial position", finalAccuracy: 90 },
  ],
  goalsNotMet: [
    { goalId: "goal-2", shortDescription: "Produce /r/ blends", finalAccuracy: 55, reason: "Plateau in progress" },
  ],
  dischargeReason: "goals-met" as const,
  narrative: "",
  recommendations: "",
};

describe("dischargeSummaries.generate", () => {
  it("creates a draft discharge summary", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const summaryId = await slp.mutation(api.dischargeSummaries.generate, {
      patientId,
      ...validDischargeArgs,
    });
    expect(summaryId).toBeDefined();

    const summary = await slp.query(api.dischargeSummaries.get, { summaryId });
    expect(summary).not.toBeNull();
    expect(summary!.status).toBe("draft");
  });

  it("rejects non-owner SLP", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);

    await expect(
      t.withIdentity(OTHER_SLP).mutation(api.dischargeSummaries.generate, {
        patientId,
        ...validDischargeArgs,
      })
    ).rejects.toThrow();
  });
});

describe("dischargeSummaries.update", () => {
  it("updates draft fields", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const summaryId = await slp.mutation(api.dischargeSummaries.generate, {
      patientId,
      ...validDischargeArgs,
    });

    await slp.mutation(api.dischargeSummaries.update, {
      summaryId,
      narrative: "AI-generated narrative about treatment course.",
      recommendations: "Continue home practice program.",
    });

    const summary = await slp.query(api.dischargeSummaries.get, { summaryId });
    expect(summary!.narrative).toBe("AI-generated narrative about treatment course.");
  });

  it("rejects update on signed summary", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const summaryId = await slp.mutation(api.dischargeSummaries.generate, {
      patientId,
      ...validDischargeArgs,
    });
    await slp.mutation(api.dischargeSummaries.sign, { summaryId });

    await expect(
      slp.mutation(api.dischargeSummaries.update, {
        summaryId,
        narrative: "Should fail",
      })
    ).rejects.toThrow("Cannot edit a signed discharge summary");
  });
});

describe("dischargeSummaries.sign", () => {
  it("transitions to signed with signedAt", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    const summaryId = await slp.mutation(api.dischargeSummaries.generate, {
      patientId,
      ...validDischargeArgs,
    });
    await slp.mutation(api.dischargeSummaries.sign, { summaryId });

    const summary = await slp.query(api.dischargeSummaries.get, { summaryId });
    expect(summary!.status).toBe("signed");
    expect(summary!.signedAt).toBeDefined();
  });
});

describe("dischargeSummaries.getByPatient", () => {
  it("returns all summaries for a patient", async () => {
    const t = convexTest(schema, modules);
    const patientId = await createPatient(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.dischargeSummaries.generate, {
      patientId,
      ...validDischargeArgs,
    });

    const summaries = await slp.query(api.dischargeSummaries.getByPatient, { patientId });
    expect(summaries).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/dischargeSummaries.test.ts 2>&1 | tail -20
```

Expected: All tests fail.

- [ ] **Step 3: Implement `convex/dischargeSummaries.ts`**

Create `convex/dischargeSummaries.ts`:

```typescript
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
  args: { summaryId: v.id("dischargeSummaries") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) throw new ConvexError("Discharge summary not found");
    if (summary.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    return summary;
  },
});

export const getByPatient = slpQuery({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    if (!ctx.slpUserId) throw new ConvexError("Not authorized");
    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");

    return await ctx.db
      .query("dischargeSummaries")
      .withIndex("by_patientId", (q) => q.eq("patientId", args.patientId))
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────────────────

export const generate = slpMutation({
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

    if (args.dischargeReason === "other" && !args.dischargeReasonOther) {
      throw new ConvexError("Discharge reason detail is required when reason is 'other'");
    }

    const summaryId = await ctx.db.insert("dischargeSummaries", {
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

    await ctx.db.insert("activityLog", {
      patientId: args.patientId,
      actorUserId: ctx.slpUserId,
      action: "discharge-summary-created",
      details: `Created discharge summary — reason: ${args.dischargeReason}`,
      timestamp: Date.now(),
    });

    return summaryId;
  },
});

export const update = slpMutation({
  args: {
    summaryId: v.id("dischargeSummaries"),
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
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) throw new ConvexError("Discharge summary not found");
    if (summary.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (summary.status === "signed") {
      throw new ConvexError("Cannot edit a signed discharge summary");
    }

    const updates: Record<string, unknown> = {};
    if (args.serviceStartDate !== undefined) updates.serviceStartDate = args.serviceStartDate;
    if (args.serviceEndDate !== undefined) updates.serviceEndDate = args.serviceEndDate;
    if (args.presentingDiagnosis !== undefined) updates.presentingDiagnosis = args.presentingDiagnosis;
    if (args.goalsAchieved !== undefined) updates.goalsAchieved = args.goalsAchieved;
    if (args.goalsNotMet !== undefined) updates.goalsNotMet = args.goalsNotMet;
    if (args.dischargeReason !== undefined) updates.dischargeReason = args.dischargeReason;
    if (args.dischargeReasonOther !== undefined) updates.dischargeReasonOther = args.dischargeReasonOther;
    if (args.narrative !== undefined) updates.narrative = args.narrative;
    if (args.recommendations !== undefined) updates.recommendations = args.recommendations;
    if (args.returnCriteria !== undefined) updates.returnCriteria = args.returnCriteria;

    await ctx.db.patch(args.summaryId, updates);
  },
});

export const sign = slpMutation({
  args: { summaryId: v.id("dischargeSummaries") },
  handler: async (ctx, args) => {
    const summary = await ctx.db.get(args.summaryId);
    if (!summary) throw new ConvexError("Discharge summary not found");
    if (summary.slpUserId !== ctx.slpUserId) throw new ConvexError("Not authorized");
    if (summary.status !== "draft") {
      throw new ConvexError("Only draft discharge summaries can be signed");
    }

    const now = Date.now();
    await ctx.db.patch(args.summaryId, {
      status: "signed",
      signedAt: now,
    });

    await ctx.db.insert("activityLog", {
      patientId: summary.patientId,
      actorUserId: ctx.slpUserId,
      action: "discharge-summary-signed",
      details: `Signed discharge summary`,
      timestamp: now,
    });
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/dischargeSummaries.test.ts 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```
feat(discharge): add discharge summaries backend — generate, update, sign
```

---

## Task 5: Goal Amendment Audit Trail

**Files:**
- Modify: `convex/goals.ts:200-269`
- Test: `convex/__tests__/goalAmendments.test.ts`

- [ ] **Step 1: Write failing tests for amendment logging**

Create `convex/__tests__/goalAmendments.test.ts`:

```typescript
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const SLP_IDENTITY = { subject: "slp-user-123", issuer: "clerk" };

async function createPatientWithGoal(t: ReturnType<typeof convexTest>) {
  const slp = t.withIdentity(SLP_IDENTITY);
  const { patientId } = await slp.mutation(api.patients.create, {
    firstName: "Alex",
    lastName: "Smith",
    dateOfBirth: "2020-01-15",
    diagnosis: "articulation" as const,
  });

  const goalId = await slp.mutation(api.goals.create, {
    patientId,
    domain: "articulation" as const,
    shortDescription: "Produce /s/ in initial position",
    fullGoalText: "Patient will produce /s/ in initial position of words with 80% accuracy.",
    targetAccuracy: 80,
    targetConsecutiveSessions: 3,
    startDate: "2026-01-15",
  });

  return { patientId, goalId };
}

describe("goal amendment audit trail", () => {
  it("creates amendment log entry when goal text changes", async () => {
    const t = convexTest(schema, modules);
    const { goalId } = await createPatientWithGoal(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.goals.update, {
      goalId,
      fullGoalText: "Updated goal text with 90% accuracy.",
      targetAccuracy: 90,
      amendmentReason: "Increased target based on progress",
    });

    const goal = await slp.query(api.goals.get, { goalId });
    expect(goal!.amendmentLog).toBeDefined();
    expect(goal!.amendmentLog).toHaveLength(1);
    expect(goal!.amendmentLog![0].previousGoalText).toBe(
      "Patient will produce /s/ in initial position of words with 80% accuracy."
    );
    expect(goal!.amendmentLog![0].previousTargetAccuracy).toBe(80);
    expect(goal!.amendmentLog![0].previousTargetConsecutiveSessions).toBe(3);
    expect(goal!.amendmentLog![0].previousStatus).toBe("active");
    expect(goal!.amendmentLog![0].changedBy).toBe("slp-user-123");
    expect(goal!.amendmentLog![0].reason).toBe("Increased target based on progress");
  });

  it("accumulates multiple amendments", async () => {
    const t = convexTest(schema, modules);
    const { goalId } = await createPatientWithGoal(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.goals.update, {
      goalId,
      targetAccuracy: 85,
    });

    await slp.mutation(api.goals.update, {
      goalId,
      targetAccuracy: 90,
    });

    const goal = await slp.query(api.goals.get, { goalId });
    expect(goal!.amendmentLog).toHaveLength(2);
    expect(goal!.amendmentLog![0].previousTargetAccuracy).toBe(80);
    expect(goal!.amendmentLog![1].previousTargetAccuracy).toBe(85);
  });

  it("does not create log entry when no tracked fields change", async () => {
    const t = convexTest(schema, modules);
    const { goalId } = await createPatientWithGoal(t);
    const slp = t.withIdentity(SLP_IDENTITY);

    await slp.mutation(api.goals.update, {
      goalId,
      notes: "Just adding a note",
    });

    const goal = await slp.query(api.goals.get, { goalId });
    // amendmentLog should be undefined or empty (notes-only changes don't trigger)
    expect(goal!.amendmentLog ?? []).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/goalAmendments.test.ts 2>&1 | tail -20
```

Expected: Tests fail because `update` does not yet accept `amendmentReason` or write `amendmentLog`.

- [ ] **Step 3: Modify `convex/goals.ts` to add amendment logging**

In the `update` mutation args (line 202), add:

```typescript
    amendmentReason: v.optional(v.string()),
```

In the `update` mutation handler, after the existing validation (line 237 area) and before the `updates` object construction, add the amendment snapshot logic:

```typescript
    // Snapshot current state into amendment log if tracked fields are changing
    const trackedFieldsChanging =
      args.fullGoalText !== undefined ||
      args.targetAccuracy !== undefined ||
      args.targetConsecutiveSessions !== undefined ||
      args.status !== undefined ||
      args.shortDescription !== undefined;

    if (trackedFieldsChanging) {
      const logEntry = {
        previousGoalText: goal.fullGoalText,
        previousTargetAccuracy: goal.targetAccuracy,
        previousTargetConsecutiveSessions: goal.targetConsecutiveSessions,
        previousStatus: goal.status,
        changedAt: Date.now(),
        changedBy: slpUserId,
        reason: args.amendmentReason,
      };
      const existingLog = goal.amendmentLog ?? [];
      await ctx.db.patch(args.goalId, {
        amendmentLog: [...existingLog, logEntry],
      });
    }
```

Also remove `amendmentReason` from the `updates` object construction by ensuring it is not passed through (it should not be, since it's not a field on the goal).

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/goalAmendments.test.ts 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Run existing goal tests to verify no regression**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/goals.test.ts 2>&1 | tail -20
```

Expected: All existing tests still pass (the `amendmentReason` arg is optional).

- [ ] **Step 6: Commit**

```
feat(goals): add amendment audit trail — snapshot previous state on tracked field changes
```

---

## Task 6: ICD-10 Code Module

**Files:**
- Create: `src/features/evaluations/lib/icd10-codes.ts`

- [ ] **Step 1: Create the ICD-10 static lookup module**

Create `src/features/evaluations/lib/icd10-codes.ts`:

```typescript
export interface ICD10Code {
  code: string;
  description: string;
  category: string;
}

/**
 * ~50 most common SLP diagnosis codes for private practice.
 * Not a full ICD-10 database — intentionally scoped to what SLPs actually use.
 */
export const SLP_ICD10_CODES: ICD10Code[] = [
  // Articulation / Phonological
  { code: "F80.0", description: "Phonological disorder", category: "articulation" },
  { code: "F80.89", description: "Other developmental disorders of speech and language", category: "articulation" },
  { code: "R47.1", description: "Dysarthria and anarthria", category: "articulation" },
  { code: "R47.81", description: "Slurred speech", category: "articulation" },
  { code: "Q38.1", description: "Ankyloglossia (tongue-tie)", category: "articulation" },

  // Language — Receptive
  { code: "F80.2", description: "Mixed receptive-expressive language disorder", category: "language-receptive" },
  { code: "R47.02", description: "Dysphasia", category: "language-receptive" },
  { code: "R48.2", description: "Apraxia", category: "language-receptive" },
  { code: "R41.840", description: "Attention and concentration deficit", category: "language-receptive" },

  // Language — Expressive
  { code: "F80.1", description: "Expressive language disorder", category: "language-expressive" },
  { code: "F80.9", description: "Developmental disorder of speech and language, unspecified", category: "language-expressive" },
  { code: "R47.01", description: "Aphasia", category: "language-expressive" },
  { code: "R48.8", description: "Other symbolic dysfunctions", category: "language-expressive" },

  // Fluency
  { code: "F80.81", description: "Childhood onset fluency disorder (stuttering)", category: "fluency" },
  { code: "F98.5", description: "Adult onset fluency disorder", category: "fluency" },
  { code: "R47.82", description: "Fluency disorder in conditions classified elsewhere", category: "fluency" },

  // Voice
  { code: "J38.3", description: "Other diseases of vocal cords", category: "voice" },
  { code: "J38.00", description: "Paralysis of vocal cords and larynx, unspecified", category: "voice" },
  { code: "J38.01", description: "Paralysis of vocal cords and larynx, unilateral", category: "voice" },
  { code: "J38.02", description: "Paralysis of vocal cords and larynx, bilateral", category: "voice" },
  { code: "J38.1", description: "Polyp of vocal cord and larynx", category: "voice" },
  { code: "J38.2", description: "Nodules of vocal cords", category: "voice" },
  { code: "R49.0", description: "Dysphonia", category: "voice" },
  { code: "R49.1", description: "Aphonia", category: "voice" },
  { code: "R49.8", description: "Other voice and resonance disorders", category: "voice" },

  // Pragmatic / Social
  { code: "F84.0", description: "Autistic disorder", category: "pragmatic-social" },
  { code: "F84.5", description: "Asperger's syndrome", category: "pragmatic-social" },
  { code: "F84.9", description: "Pervasive developmental disorder, unspecified", category: "pragmatic-social" },
  { code: "F80.82", description: "Social pragmatic communication disorder", category: "pragmatic-social" },
  { code: "F88", description: "Other disorders of psychological development", category: "pragmatic-social" },

  // AAC
  { code: "R47.89", description: "Other speech disturbances", category: "aac" },
  { code: "F80.4", description: "Speech and language development delay due to hearing loss", category: "aac" },
  { code: "R47.8", description: "Other and unspecified speech disturbances", category: "aac" },

  // Feeding / Swallowing
  { code: "R13.10", description: "Dysphagia, unspecified", category: "feeding" },
  { code: "R13.11", description: "Dysphagia, oral phase", category: "feeding" },
  { code: "R13.12", description: "Dysphagia, oropharyngeal phase", category: "feeding" },
  { code: "R13.13", description: "Dysphagia, pharyngeal phase", category: "feeding" },
  { code: "R13.14", description: "Dysphagia, pharyngoesophageal phase", category: "feeding" },
  { code: "R13.19", description: "Other dysphagia", category: "feeding" },
  { code: "R63.3", description: "Feeding difficulties", category: "feeding" },
  { code: "P92.9", description: "Feeding problem of newborn, unspecified", category: "feeding" },

  // Cognitive-Communication
  { code: "R41.3", description: "Other amnesia", category: "language-receptive" },
  { code: "R41.841", description: "Cognitive communication deficit", category: "language-expressive" },
  { code: "R48.0", description: "Dyslexia and alexia", category: "language-receptive" },
  { code: "R48.1", description: "Agnosia", category: "language-receptive" },

  // Hearing-related
  { code: "H90.5", description: "Unspecified sensorineural hearing loss", category: "aac" },
  { code: "H91.90", description: "Unspecified hearing loss, unspecified ear", category: "aac" },

  // Other common co-diagnoses
  { code: "F89", description: "Unspecified disorder of psychological development", category: "language-expressive" },
  { code: "Q87.0", description: "Congenital malformation syndromes predominantly affecting facial appearance", category: "articulation" },
  { code: "G80.9", description: "Cerebral palsy, unspecified", category: "articulation" },
];

/** Search ICD-10 codes by text query (matches code or description). */
export function searchICD10(query: string): ICD10Code[] {
  const q = query.toLowerCase().trim();
  if (!q) return SLP_ICD10_CODES;

  return SLP_ICD10_CODES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
  );
}

/** Filter ICD-10 codes by therapy domain category. */
export function filterByCategory(category: string): ICD10Code[] {
  return SLP_ICD10_CODES.filter((c) => c.category === category);
}
```

- [ ] **Step 2: Commit**

```
feat(evaluations): add ICD-10 code lookup module with ~50 common SLP codes
```

---

## Task 7: AI Generation — Evaluation Interpretation Route

**Files:**
- Create: `src/features/evaluations/lib/evaluation-prompt.ts`
- Create: `src/app/api/generate-evaluation/route.ts`

- [ ] **Step 1: Create the evaluation prompt builder**

Create `src/features/evaluations/lib/evaluation-prompt.ts`:

```typescript
const trunc = (s: string, max = 1000) => (s.length > max ? s.slice(0, max) + "..." : s);

export interface EvalPatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosis: string;
  communicationLevel?: string;
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
  diagnosisCodes: Array<{ code: string; description: string }>;
  prognosis: string;
}

export function buildEvaluationPrompt(
  patient: EvalPatient,
  evalData: EvalData,
): string {
  const toolLines = evalData.assessmentTools
    .map((t) => {
      const parts = [`  - ${t.name}`];
      if (t.scoresRaw) parts.push(`Raw: ${t.scoresRaw}`);
      if (t.scoresStandard) parts.push(`Standard: ${t.scoresStandard}`);
      if (t.percentile) parts.push(`Percentile: ${t.percentile}`);
      if (t.notes) parts.push(`Notes: ${t.notes}`);
      return parts.join(" | ");
    })
    .join("\n");

  const domainEntries = Object.entries(evalData.domainFindings)
    .filter(([, v]) => v !== undefined)
    .map(([domain, finding]) => {
      const f = finding as DomainFinding;
      return `  ${domain}: ${trunc(f.narrative)}${f.scores ? ` (Scores: ${f.scores})` : ""}`;
    })
    .join("\n");

  const diagCodes = evalData.diagnosisCodes
    .map((d) => `  ${d.code} — ${d.description}`)
    .join("\n");

  return `You are a speech-language pathology clinical documentation assistant. Generate two sections for a speech-language evaluation report.

<patient_data>
Patient: ${patient.firstName} ${patient.lastName}
DOB: ${patient.dateOfBirth}
Diagnosis: ${patient.diagnosis}
${patient.communicationLevel ? `Communication Level: ${patient.communicationLevel}` : ""}
Evaluation Date: ${evalData.evaluationDate}
${evalData.referralSource ? `Referral Source: ${evalData.referralSource}` : ""}
</patient_data>

<background_history>
${trunc(evalData.backgroundHistory)}
</background_history>

<assessment_tools>
${toolLines || "  No formal assessments administered."}
</assessment_tools>

<domain_findings>
${domainEntries || "  No domain findings entered."}
</domain_findings>

<behavioral_observations>
${trunc(evalData.behavioralObservations)}
</behavioral_observations>

<diagnosis_codes>
${diagCodes}
</diagnosis_codes>

<prognosis>${evalData.prognosis}</prognosis>

Generate exactly two sections in this format:

<clinical_interpretation>
Write a 2-4 paragraph clinical narrative that:
1. Synthesizes the assessment scores and domain findings into a cohesive interpretation
2. Relates findings to functional communication impact
3. Supports the diagnosis codes listed
4. References specific scores and percentiles where available
5. Uses professional clinical language appropriate for medical records
</clinical_interpretation>

<recommendations>
Write 3-6 specific, actionable recommendations including:
1. Recommended service type, frequency, and duration
2. Priority treatment areas
3. Any referrals to other professionals
4. Accommodations or environmental modifications
5. Home practice suggestions for caregivers
</recommendations>

Write in third person. Use the patient's first name. Do not include section headers inside the XML tags.`;
}

export interface EvalAIResponse {
  clinicalInterpretation: string;
  recommendations: string;
}

export function parseEvaluationResponse(text: string): EvalAIResponse | null {
  const interpMatch = text.match(
    /<clinical_interpretation>\s*([\s\S]*?)\s*<\/clinical_interpretation>/
  );
  const recsMatch = text.match(
    /<recommendations>\s*([\s\S]*?)\s*<\/recommendations>/
  );

  if (!interpMatch || !recsMatch) return null;

  return {
    clinicalInterpretation: interpMatch[1].trim(),
    recommendations: recsMatch[1].trim(),
  };
}
```

- [ ] **Step 2: Create the SSE streaming route**

Create `src/app/api/generate-evaluation/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  buildEvaluationPrompt,
  parseEvaluationResponse,
} from "@/features/evaluations/lib/evaluation-prompt";

import { authenticate } from "../generate/lib/authenticate";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "../generate/sse";

export const runtime = "nodejs";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-evaluation");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const InputSchema = z.object({ evaluationId: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  const { convex, userId } = await authenticate();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const parsed = InputSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const evaluationId = parsed.data.evaluationId as Id<"evaluations">;

  const evaluation = await convex.query(api.evaluations.get, { evaluationId });
  if (!evaluation) {
    return new Response(JSON.stringify({ error: "Evaluation not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (evaluation.status === "signed") {
    return new Response(
      JSON.stringify({ error: "Cannot generate for a signed evaluation" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const patient = await convex.query(api.patients.get, {
    patientId: evaluation.patientId,
  });
  if (!patient) {
    return new Response(JSON.stringify({ error: "Patient not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildEvaluationPrompt(patient, evaluation);

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
              content:
                "Generate the clinical interpretation and recommendations based on the evaluation data provided.",
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

        const parsedResult = parseEvaluationResponse(fullText);
        if (parsedResult) {
          await convex.mutation(api.evaluations.update, {
            evaluationId,
            clinicalInterpretation: parsedResult.clinicalInterpretation,
            recommendations: parsedResult.recommendations,
          });
          send("eval-complete", parsedResult);
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

- [ ] **Step 3: Commit**

```
feat(evaluations): add AI evaluation interpretation SSE route + prompt builder
```

---

## Task 8: AI Generation — Discharge Narrative Route

**Files:**
- Create: `src/features/discharge/lib/discharge-prompt.ts`
- Create: `src/app/api/generate-discharge/route.ts`

- [ ] **Step 1: Create the discharge prompt builder**

Create `src/features/discharge/lib/discharge-prompt.ts`:

```typescript
const trunc = (s: string, max = 1000) => (s.length > max ? s.slice(0, max) + "..." : s);

export interface DischargePatient {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosis: string;
}

export interface GoalOutcome {
  goalId: string;
  shortDescription: string;
  finalAccuracy: number;
}

export interface GoalNotMet extends GoalOutcome {
  reason: string;
}

export interface DischargeData {
  serviceStartDate: string;
  serviceEndDate: string;
  presentingDiagnosis: string;
  goalsAchieved: GoalOutcome[];
  goalsNotMet: GoalNotMet[];
  dischargeReason: string;
  dischargeReasonOther?: string;
  sessionCount?: number;
}

export function buildDischargePrompt(
  patient: DischargePatient,
  data: DischargeData,
): string {
  const achievedLines = data.goalsAchieved
    .map((g) => `  - ${g.shortDescription}: ${g.finalAccuracy}% accuracy (MET)`)
    .join("\n");

  const notMetLines = data.goalsNotMet
    .map((g) => `  - ${g.shortDescription}: ${g.finalAccuracy}% accuracy (NOT MET — ${g.reason})`)
    .join("\n");

  const reasonText = data.dischargeReason === "other"
    ? `other: ${data.dischargeReasonOther ?? "unspecified"}`
    : data.dischargeReason;

  return `You are a speech-language pathology clinical documentation assistant. Generate a discharge summary narrative and recommendations.

<patient_data>
Patient: ${patient.firstName} ${patient.lastName}
DOB: ${patient.dateOfBirth}
Diagnosis: ${patient.diagnosis}
</patient_data>

<service_dates>
Start: ${data.serviceStartDate}
End: ${data.serviceEndDate}
${data.sessionCount ? `Total Sessions: ${data.sessionCount}` : ""}
</service_dates>

<presenting_diagnosis>
${trunc(data.presentingDiagnosis)}
</presenting_diagnosis>

<goals_achieved>
${achievedLines || "  None"}
</goals_achieved>

<goals_not_met>
${notMetLines || "  None (all goals achieved)"}
</goals_not_met>

<discharge_reason>${reasonText}</discharge_reason>

Generate exactly two sections in this format:

<narrative>
Write a 2-3 paragraph narrative that:
1. Summarizes the treatment course (duration, focus areas)
2. Describes progress made across all goal areas
3. Explains the rationale for discharge
4. Notes any significant milestones or breakthroughs
5. Uses professional clinical language appropriate for medical records
</narrative>

<recommendations>
Write 3-5 specific recommendations including:
1. Any continued services needed (home practice, school-based, etc.)
2. Strategies for maintenance of gains
3. Follow-up timeline (when to re-evaluate)
4. Criteria for returning to therapy
5. Home strategies for caregivers
</recommendations>

Write in third person. Use the patient's first name. Do not include section headers inside the XML tags.`;
}

export interface DischargeAIResponse {
  narrative: string;
  recommendations: string;
}

export function parseDischargeResponse(text: string): DischargeAIResponse | null {
  const narrativeMatch = text.match(/<narrative>\s*([\s\S]*?)\s*<\/narrative>/);
  const recsMatch = text.match(/<recommendations>\s*([\s\S]*?)\s*<\/recommendations>/);

  if (!narrativeMatch || !recsMatch) return null;

  return {
    narrative: narrativeMatch[1].trim(),
    recommendations: recsMatch[1].trim(),
  };
}
```

- [ ] **Step 2: Create the SSE streaming route**

Create `src/app/api/generate-discharge/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import {
  buildDischargePrompt,
  parseDischargeResponse,
} from "@/features/discharge/lib/discharge-prompt";

import { authenticate } from "../generate/lib/authenticate";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { sseEncode } from "../generate/sse";

export const runtime = "nodejs";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required for /api/generate-discharge");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const InputSchema = z.object({ summaryId: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  const { convex, userId } = await authenticate();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const parsed = InputSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const summaryId = parsed.data.summaryId as Id<"dischargeSummaries">;

  const summary = await convex.query(api.dischargeSummaries.get, { summaryId });
  if (!summary) {
    return new Response(JSON.stringify({ error: "Discharge summary not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (summary.status === "signed") {
    return new Response(
      JSON.stringify({ error: "Cannot generate for a signed summary" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const patient = await convex.query(api.patients.get, {
    patientId: summary.patientId,
  });
  if (!patient) {
    return new Response(JSON.stringify({ error: "Patient not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Optionally get session count for richer narrative
  let sessionCount: number | undefined;
  try {
    const notes = await convex.query(api.sessionNotes.list, {
      patientId: summary.patientId,
      limit: 500,
    });
    sessionCount = notes.length;
  } catch {
    // Non-critical — proceed without session count
  }

  const systemPrompt = buildDischargePrompt(patient, {
    ...summary,
    sessionCount,
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
              content:
                "Generate the discharge narrative and recommendations based on the data provided.",
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

        const parsedResult = parseDischargeResponse(fullText);
        if (parsedResult) {
          await convex.mutation(api.dischargeSummaries.update, {
            summaryId,
            narrative: parsedResult.narrative,
            recommendations: parsedResult.recommendations,
          });
          send("discharge-complete", parsedResult);
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

- [ ] **Step 3: Commit**

```
feat(discharge): add AI discharge narrative SSE route + prompt builder
```

---

## Task 9: Frontend — Evaluations Feature Slice

**Files:**
- Create: `src/features/evaluations/hooks/use-evaluations.ts`
- Create: `src/features/evaluations/components/icd10-picker.tsx`
- Create: `src/features/evaluations/components/assessment-tools-form.tsx`
- Create: `src/features/evaluations/components/domain-findings-form.tsx`
- Create: `src/features/evaluations/components/evaluation-editor.tsx`
- Create: `src/features/evaluations/components/evaluation-viewer.tsx`
- Create: `src/features/evaluations/components/evaluation-list.tsx`
- Create: `src/app/(app)/patients/[id]/evaluations/new/page.tsx`
- Create: `src/app/(app)/patients/[id]/evaluations/[evalId]/page.tsx`
- Test: `src/features/evaluations/components/__tests__/icd10-picker.test.tsx`
- Test: `src/features/evaluations/components/__tests__/evaluation-editor.test.tsx`

- [ ] **Step 1: Create the evaluations hook**

Create `src/features/evaluations/hooks/use-evaluations.ts`:

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useEvaluations(patientId: Id<"patients">) {
  const evaluations = useQuery(api.evaluations.getByPatient, { patientId });
  return evaluations;
}

export function useEvaluation(evaluationId: Id<"evaluations">) {
  const evaluation = useQuery(api.evaluations.get, { evaluationId });
  return evaluation;
}

export function useEvaluationMutations() {
  const create = useMutation(api.evaluations.create);
  const update = useMutation(api.evaluations.update);
  const sign = useMutation(api.evaluations.sign);
  const unsign = useMutation(api.evaluations.unsign);

  return { create, update, sign, unsign };
}
```

- [ ] **Step 2: Create the ICD-10 picker component**

Create `src/features/evaluations/components/icd10-picker.tsx`:

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/core/utils";

import { searchICD10, type ICD10Code } from "../lib/icd10-codes";

interface ICD10PickerProps {
  selected: Array<{ code: string; description: string }>;
  onChange: (codes: Array<{ code: string; description: string }>) => void;
}

export function ICD10Picker({ selected, onChange }: ICD10PickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = searchICD10(query);
  const selectedCodes = new Set(selected.map((s) => s.code));

  function addCode(code: ICD10Code) {
    if (!selectedCodes.has(code.code)) {
      onChange([...selected, { code: code.code, description: code.description }]);
    }
  }

  function removeCode(code: string) {
    onChange(selected.filter((s) => s.code !== code));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-on-surface">
        ICD-10 Diagnosis Codes
      </label>

      {/* Selected codes */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <span
              key={s.code}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
            >
              <span className="font-mono font-medium">{s.code}</span>
              <span className="text-on-surface-variant">{s.description}</span>
              <button
                type="button"
                onClick={() => removeCode(s.code)}
                className="ml-1 text-on-surface-variant hover:text-destructive"
                aria-label={`Remove ${s.code}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Input
          placeholder="Search ICD-10 codes..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />

        {isOpen && query.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-background shadow-lg">
            {results.length === 0 ? (
              <p className="p-3 text-sm text-on-surface-variant">
                No matching codes found
              </p>
            ) : (
              results.slice(0, 20).map((code) => (
                <button
                  key={code.code}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-variant",
                    selectedCodes.has(code.code) && "opacity-50"
                  )}
                  onClick={() => {
                    addCode(code);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  disabled={selectedCodes.has(code.code)}
                >
                  <span className="font-mono font-medium text-primary">
                    {code.code}
                  </span>
                  <span className="text-on-surface">{code.description}</span>
                  <span className="ml-auto text-xs text-on-surface-variant">
                    {code.category}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Close dropdown on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the assessment tools form**

Create `src/features/evaluations/components/assessment-tools-form.tsx`:

```tsx
"use client";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { MaterialIcon } from "@/shared/components/material-icon";

interface AssessmentTool {
  name: string;
  scoresRaw?: string;
  scoresStandard?: string;
  percentile?: string;
  notes?: string;
}

interface AssessmentToolsFormProps {
  tools: AssessmentTool[];
  onChange: (tools: AssessmentTool[]) => void;
}

export function AssessmentToolsForm({ tools, onChange }: AssessmentToolsFormProps) {
  function addTool() {
    onChange([...tools, { name: "" }]);
  }

  function updateTool(index: number, updates: Partial<AssessmentTool>) {
    const updated = tools.map((t, i) => (i === index ? { ...t, ...updates } : t));
    onChange(updated);
  }

  function removeTool(index: number) {
    onChange(tools.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-on-surface">
          Assessment Tools
        </label>
        <Button type="button" variant="outline" size="sm" onClick={addTool}>
          <MaterialIcon icon="add" size="sm" />
          Add Tool
        </Button>
      </div>

      {tools.map((tool, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-lg bg-surface-variant/50 p-4"
        >
          <div className="flex items-center justify-between">
            <Input
              placeholder="Assessment name (e.g., GFTA-3)"
              value={tool.name}
              onChange={(e) => updateTool(index, { name: e.target.value })}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeTool(index)}
              className="ml-2"
            >
              <MaterialIcon icon="close" size="sm" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input
              placeholder="Raw scores"
              value={tool.scoresRaw ?? ""}
              onChange={(e) => updateTool(index, { scoresRaw: e.target.value })}
            />
            <Input
              placeholder="Standard scores"
              value={tool.scoresStandard ?? ""}
              onChange={(e) => updateTool(index, { scoresStandard: e.target.value })}
            />
            <Input
              placeholder="Percentile"
              value={tool.percentile ?? ""}
              onChange={(e) => updateTool(index, { percentile: e.target.value })}
            />
          </div>
          <Input
            placeholder="Notes about this assessment"
            value={tool.notes ?? ""}
            onChange={(e) => updateTool(index, { notes: e.target.value })}
          />
        </div>
      ))}

      {tools.length === 0 && (
        <p className="text-sm text-on-surface-variant">
          No assessment tools added yet. Click "Add Tool" to start.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the domain findings form**

Create `src/features/evaluations/components/domain-findings-form.tsx`:

```tsx
"use client";

import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";

const DOMAINS = [
  { key: "articulation", label: "Articulation / Phonology" },
  { key: "languageReceptive", label: "Receptive Language" },
  { key: "languageExpressive", label: "Expressive Language" },
  { key: "fluency", label: "Fluency" },
  { key: "voice", label: "Voice" },
  { key: "pragmatics", label: "Pragmatics / Social" },
  { key: "aac", label: "AAC" },
] as const;

type DomainKey = (typeof DOMAINS)[number]["key"];

interface DomainFinding {
  narrative: string;
  scores?: string;
}

type DomainFindings = Partial<Record<DomainKey, DomainFinding>>;

interface DomainFindingsFormProps {
  findings: DomainFindings;
  onChange: (findings: DomainFindings) => void;
}

export function DomainFindingsForm({ findings, onChange }: DomainFindingsFormProps) {
  function updateDomain(key: DomainKey, updates: Partial<DomainFinding>) {
    const existing = findings[key] ?? { narrative: "" };
    const updated = { ...existing, ...updates };
    // Remove domain if narrative is empty (user cleared it)
    if (!updated.narrative && !updated.scores) {
      const { [key]: _, ...rest } = findings;
      onChange(rest as DomainFindings);
    } else {
      onChange({ ...findings, [key]: updated });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium text-on-surface">
        Domain Findings
      </label>
      <p className="text-sm text-on-surface-variant">
        Enter findings for each relevant domain. Leave blank for domains not assessed.
      </p>

      {DOMAINS.map(({ key, label }) => {
        const finding = findings[key];
        const isActive = !!finding?.narrative;
        return (
          <div
            key={key}
            className="flex flex-col gap-2 rounded-lg border border-border/50 p-4"
          >
            <label className="text-sm font-medium text-on-surface">
              {label}
            </label>
            <Textarea
              placeholder={`Clinical findings for ${label.toLowerCase()}...`}
              value={finding?.narrative ?? ""}
              onChange={(e) => updateDomain(key, { narrative: e.target.value })}
              rows={3}
            />
            {isActive && (
              <Input
                placeholder="Relevant scores (e.g., 78 SS, 7th percentile)"
                value={finding?.scores ?? ""}
                onChange={(e) => updateDomain(key, { scores: e.target.value })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Create the evaluation editor component**

Create `src/features/evaluations/components/evaluation-editor.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { useEvaluation, useEvaluationMutations } from "../hooks/use-evaluations";
import { AssessmentToolsForm } from "./assessment-tools-form";
import { DomainFindingsForm } from "./domain-findings-form";
import { ICD10Picker } from "./icd10-picker";

interface EvaluationEditorProps {
  patientId: Id<"patients">;
  evaluationId?: Id<"evaluations">;
}

const PROGNOSIS_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "guarded", label: "Guarded" },
] as const;

export function EvaluationEditor({ patientId, evaluationId }: EvaluationEditorProps) {
  const router = useRouter();
  const existing = evaluationId ? useEvaluation(evaluationId) : null;
  const { create, update, sign, unsign } = useEvaluationMutations();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state — initialized from existing or defaults
  const [evaluationDate, setEvaluationDate] = useState(existing?.evaluationDate ?? new Date().toISOString().split("T")[0]);
  const [referralSource, setReferralSource] = useState(existing?.referralSource ?? "");
  const [backgroundHistory, setBackgroundHistory] = useState(existing?.backgroundHistory ?? "");
  const [assessmentTools, setAssessmentTools] = useState(existing?.assessmentTools ?? []);
  const [domainFindings, setDomainFindings] = useState(existing?.domainFindings ?? {});
  const [behavioralObservations, setBehavioralObservations] = useState(existing?.behavioralObservations ?? "");
  const [clinicalInterpretation, setClinicalInterpretation] = useState(existing?.clinicalInterpretation ?? "");
  const [diagnosisCodes, setDiagnosisCodes] = useState(existing?.diagnosisCodes ?? []);
  const [prognosis, setPrognosis] = useState<"excellent" | "good" | "fair" | "guarded">(existing?.prognosis ?? "good");
  const [recommendations, setRecommendations] = useState(existing?.recommendations ?? "");

  const isSigned = existing?.status === "signed";

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (evaluationId) {
        await update({
          evaluationId,
          evaluationDate,
          referralSource: referralSource || undefined,
          backgroundHistory,
          assessmentTools,
          domainFindings,
          behavioralObservations,
          clinicalInterpretation,
          diagnosisCodes,
          prognosis,
          recommendations,
        });
      } else {
        const newId = await create({
          patientId,
          evaluationDate,
          referralSource: referralSource || undefined,
          backgroundHistory,
          assessmentTools,
          domainFindings,
          behavioralObservations,
          clinicalInterpretation,
          diagnosisCodes,
          prognosis,
          recommendations,
        });
        router.push(`/patients/${patientId}/evaluations/${newId}`);
      }
    } finally {
      setSaving(false);
    }
  }, [evaluationId, patientId, evaluationDate, referralSource, backgroundHistory, assessmentTools, domainFindings, behavioralObservations, clinicalInterpretation, diagnosisCodes, prognosis, recommendations, create, update, router]);

  const handleGenerateAI = useCallback(async () => {
    if (!evaluationId) return;
    setGenerating(true);
    try {
      const response = await fetch("/api/generate-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluationId }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const block of lines) {
          const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
          const eventLine = block.split("\n").find((l) => l.startsWith("event: "));
          if (!dataLine || !eventLine) continue;

          const eventType = eventLine.replace("event: ", "");
          const data = JSON.parse(dataLine.replace("data: ", ""));

          if (eventType === "eval-complete") {
            setClinicalInterpretation(data.clinicalInterpretation);
            setRecommendations(data.recommendations);
          }
        }
      }
    } finally {
      setGenerating(false);
    }
  }, [evaluationId]);

  const handleSign = useCallback(async () => {
    if (!evaluationId) return;
    // Ensure saved as complete first
    await update({ evaluationId, status: "complete" });
    await sign({ evaluationId });
  }, [evaluationId, update, sign]);

  const handleUnsign = useCallback(async () => {
    if (!evaluationId) return;
    await unsign({ evaluationId });
  }, [evaluationId, unsign]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold text-on-surface">
          {evaluationId ? "Edit Evaluation" : "New Evaluation"}
        </h2>
        <div className="flex gap-2">
          {isSigned ? (
            <Button variant="outline" onClick={handleUnsign}>
              Unsign
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              {evaluationId && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleGenerateAI}
                    disabled={generating}
                  >
                    <MaterialIcon icon="auto_awesome" size="sm" />
                    {generating ? "Generating..." : "AI Interpret"}
                  </Button>
                  <Button onClick={handleSign}>Sign</Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-on-surface">Evaluation Date</label>
            <Input
              type="date"
              value={evaluationDate}
              onChange={(e) => setEvaluationDate(e.target.value)}
              disabled={isSigned}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-on-surface">Referral Source</label>
            <Input
              placeholder="e.g., Pediatrician, Parent, School"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              disabled={isSigned}
            />
          </div>
        </div>

        {/* Background History */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-on-surface">Background History</label>
          <Textarea
            placeholder="Developmental history, prior services, chief complaint..."
            value={backgroundHistory}
            onChange={(e) => setBackgroundHistory(e.target.value)}
            rows={4}
            disabled={isSigned}
          />
        </div>

        {/* Assessment Tools */}
        <AssessmentToolsForm
          tools={assessmentTools}
          onChange={setAssessmentTools}
        />

        {/* Domain Findings */}
        <DomainFindingsForm
          findings={domainFindings}
          onChange={setDomainFindings}
        />

        {/* Behavioral Observations */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-on-surface">
            Behavioral Observations
          </label>
          <Textarea
            placeholder="Clinical observations during the evaluation..."
            value={behavioralObservations}
            onChange={(e) => setBehavioralObservations(e.target.value)}
            rows={3}
            disabled={isSigned}
          />
        </div>

        {/* ICD-10 Codes */}
        <ICD10Picker selected={diagnosisCodes} onChange={setDiagnosisCodes} />

        {/* Prognosis */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-on-surface">Prognosis</label>
          <div className="flex gap-2">
            {PROGNOSIS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={prognosis === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPrognosis(opt.value)}
                disabled={isSigned}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* AI-Generated Sections */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-on-surface">
            Clinical Interpretation
          </label>
          <Textarea
            placeholder="AI-generated or manually written clinical interpretation..."
            value={clinicalInterpretation}
            onChange={(e) => setClinicalInterpretation(e.target.value)}
            rows={6}
            disabled={isSigned}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-on-surface">
            Recommendations
          </label>
          <Textarea
            placeholder="Services recommended, referrals, accommodations..."
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            rows={4}
            disabled={isSigned}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create the evaluation viewer (read-only + print)**

Create `src/features/evaluations/components/evaluation-viewer.tsx`:

```tsx
"use client";

import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { useEvaluation } from "../hooks/use-evaluations";

interface EvaluationViewerProps {
  evaluationId: Id<"evaluations">;
}

export function EvaluationViewer({ evaluationId }: EvaluationViewerProps) {
  const evaluation = useEvaluation(evaluationId);

  if (!evaluation) {
    return <p className="text-on-surface-variant">Loading evaluation...</p>;
  }

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="font-display text-2xl font-semibold text-on-surface">
          Evaluation Report
        </h2>
        <Button variant="outline" onClick={() => window.print()}>
          <MaterialIcon icon="print" size="sm" />
          Print
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-lg bg-surface p-6 print:rounded-none print:bg-white print:p-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-on-surface-variant">Date:</span>{" "}
            <span className="font-medium">{evaluation.evaluationDate}</span>
          </div>
          {evaluation.referralSource && (
            <div>
              <span className="text-on-surface-variant">Referral:</span>{" "}
              <span className="font-medium">{evaluation.referralSource}</span>
            </div>
          )}
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Background History
          </h3>
          <p className="whitespace-pre-wrap text-sm text-on-surface">
            {evaluation.backgroundHistory}
          </p>
        </section>

        {evaluation.assessmentTools.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Assessment Tools
            </h3>
            {evaluation.assessmentTools.map((tool, i) => (
              <div key={i} className="mb-2 text-sm">
                <span className="font-medium">{tool.name}</span>
                {tool.scoresStandard && ` — Standard: ${tool.scoresStandard}`}
                {tool.percentile && ` (${tool.percentile})`}
                {tool.notes && <p className="text-on-surface-variant">{tool.notes}</p>}
              </div>
            ))}
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Behavioral Observations
          </h3>
          <p className="whitespace-pre-wrap text-sm text-on-surface">
            {evaluation.behavioralObservations}
          </p>
        </section>

        {evaluation.clinicalInterpretation && (
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Clinical Interpretation
            </h3>
            <p className="whitespace-pre-wrap text-sm text-on-surface">
              {evaluation.clinicalInterpretation}
            </p>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Diagnosis
          </h3>
          <ul className="list-disc pl-5 text-sm">
            {evaluation.diagnosisCodes.map((d) => (
              <li key={d.code}>
                <span className="font-mono">{d.code}</span> — {d.description}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-sm">
            <span className="text-on-surface-variant">Prognosis:</span>{" "}
            <span className="font-medium capitalize">{evaluation.prognosis}</span>
          </p>
        </section>

        {evaluation.recommendations && (
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Recommendations
            </h3>
            <p className="whitespace-pre-wrap text-sm text-on-surface">
              {evaluation.recommendations}
            </p>
          </section>
        )}

        {evaluation.status === "signed" && evaluation.signedAt && (
          <div className="mt-4 border-t border-border pt-4 text-sm text-on-surface-variant">
            Signed on {new Date(evaluation.signedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create the evaluation list component**

Create `src/features/evaluations/components/evaluation-list.tsx`:

```tsx
"use client";

import Link from "next/link";

import { Button } from "@/shared/components/ui/button";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { useEvaluations } from "../hooks/use-evaluations";

interface EvaluationListProps {
  patientId: Id<"patients">;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  complete: "Complete",
  signed: "Signed",
};

export function EvaluationList({ patientId }: EvaluationListProps) {
  const evaluations = useEvaluations(patientId);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-on-surface">
          Evaluations
        </h3>
        <Button asChild variant="outline" size="sm">
          <Link href={`/patients/${patientId}/evaluations/new`}>
            <MaterialIcon icon="add" size="sm" />
            New Evaluation
          </Link>
        </Button>
      </div>

      {evaluations === undefined ? (
        <p className="text-sm text-on-surface-variant">Loading...</p>
      ) : evaluations.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          No evaluations yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {evaluations.map((evaluation) => (
            <Link
              key={evaluation._id}
              href={`/patients/${patientId}/evaluations/${evaluation._id}`}
              className="flex items-center justify-between rounded-lg bg-surface-variant/50 px-4 py-3 transition-colors hover:bg-surface-variant"
            >
              <div>
                <p className="text-sm font-medium text-on-surface">
                  {evaluation.evaluationDate}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {evaluation.diagnosisCodes.map((d) => d.code).join(", ") || "No diagnosis codes"}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {STATUS_LABELS[evaluation.status] ?? evaluation.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Create the route pages**

Create `src/app/(app)/patients/[id]/evaluations/new/page.tsx`:

```tsx
"use client";

import { use } from "react";

import { EvaluationEditor } from "@/features/evaluations/components/evaluation-editor";

import type { Id } from "../../../../../../../convex/_generated/dataModel";

export default function NewEvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <EvaluationEditor patientId={id as Id<"patients">} />
    </div>
  );
}
```

Create `src/app/(app)/patients/[id]/evaluations/[evalId]/page.tsx`:

```tsx
"use client";

import { use } from "react";

import { EvaluationEditor } from "@/features/evaluations/components/evaluation-editor";
import { EvaluationViewer } from "@/features/evaluations/components/evaluation-viewer";
import { useEvaluation } from "@/features/evaluations/hooks/use-evaluations";

import type { Id } from "../../../../../../../convex/_generated/dataModel";

export default function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string; evalId: string }>;
}) {
  const { id, evalId } = use(params);
  const evaluation = useEvaluation(evalId as Id<"evaluations">);

  if (evaluation === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (evaluation?.status === "signed") {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <EvaluationViewer evaluationId={evalId as Id<"evaluations">} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <EvaluationEditor
        patientId={id as Id<"patients">}
        evaluationId={evalId as Id<"evaluations">}
      />
    </div>
  );
}
```

- [ ] **Step 9: Write component tests**

Create `src/features/evaluations/components/__tests__/icd10-picker.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ICD10Picker } from "../icd10-picker";

describe("ICD10Picker", () => {
  it("renders selected codes", () => {
    render(
      <ICD10Picker
        selected={[{ code: "F80.0", description: "Phonological disorder" }]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("F80.0")).toBeInTheDocument();
    expect(screen.getByText("Phonological disorder")).toBeInTheDocument();
  });

  it("filters codes on search", () => {
    render(<ICD10Picker selected={[]} onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("Search ICD-10 codes...");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "stutter" } });
    expect(screen.getByText("F80.81")).toBeInTheDocument();
  });

  it("calls onChange when adding a code", () => {
    const onChange = vi.fn();
    render(<ICD10Picker selected={[]} onChange={onChange} />);
    const input = screen.getByPlaceholderText("Search ICD-10 codes...");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "F80.0" } });
    fireEvent.click(screen.getByText("Phonological disorder"));
    expect(onChange).toHaveBeenCalledWith([
      { code: "F80.0", description: "Phonological disorder" },
    ]);
  });

  it("calls onChange when removing a code", () => {
    const onChange = vi.fn();
    render(
      <ICD10Picker
        selected={[{ code: "F80.0", description: "Phonological disorder" }]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove F80.0"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
```

- [ ] **Step 10: Run tests**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run src/features/evaluations/components/__tests__/icd10-picker.test.tsx 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 11: Commit**

```
feat(evaluations): add evaluations frontend — editor, viewer, ICD-10 picker, routes
```

---

## Task 10: Frontend — Plan of Care Feature Slice

**Files:**
- Create: `src/features/plan-of-care/hooks/use-plan-of-care.ts`
- Create: `src/features/plan-of-care/components/physician-signature.tsx`
- Create: `src/features/plan-of-care/components/poc-editor.tsx`
- Create: `src/features/plan-of-care/components/poc-viewer.tsx`
- Create: `src/features/plan-of-care/components/poc-generator.tsx`
- Create: `src/features/plan-of-care/components/poc-history.tsx`
- Create: `src/app/(app)/patients/[id]/plan-of-care/page.tsx`

- [ ] **Step 1: Create the plan of care hook**

Create `src/features/plan-of-care/hooks/use-plan-of-care.ts`:

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useActivePOC(patientId: Id<"patients">) {
  return useQuery(api.plansOfCare.getActiveByPatient, { patientId });
}

export function usePOC(pocId: Id<"plansOfCare">) {
  return useQuery(api.plansOfCare.get, { pocId });
}

export function usePOCHistory(patientId: Id<"patients">) {
  return useQuery(api.plansOfCare.getByPatient, { patientId });
}

export function usePOCMutations() {
  const generate = useMutation(api.plansOfCare.generate);
  const update = useMutation(api.plansOfCare.update);
  const sign = useMutation(api.plansOfCare.sign);
  const amend = useMutation(api.plansOfCare.amend);

  return { generate, update, sign, amend };
}
```

- [ ] **Step 2: Create physician signature component**

Create `src/features/plan-of-care/components/physician-signature.tsx`:

```tsx
"use client";

import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";

interface PhysicianSignatureProps {
  physicianName: string;
  physicianNPI: string;
  signatureOnFile: boolean;
  signatureDate: string;
  onChange: (updates: {
    physicianName?: string;
    physicianNPI?: string;
    physicianSignatureOnFile?: boolean;
    physicianSignatureDate?: string;
  }) => void;
  disabled?: boolean;
}

export function PhysicianSignature({
  physicianName,
  physicianNPI,
  signatureOnFile,
  signatureDate,
  onChange,
  disabled,
}: PhysicianSignatureProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 p-4">
      <h4 className="text-sm font-semibold text-on-surface">
        Physician Signature
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-on-surface-variant">Physician Name</label>
          <Input
            placeholder="Dr. Jane Smith"
            value={physicianName}
            onChange={(e) => onChange({ physicianName: e.target.value })}
            disabled={disabled}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-on-surface-variant">NPI Number</label>
          <Input
            placeholder="1234567890"
            value={physicianNPI}
            onChange={(e) => onChange({ physicianNPI: e.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="sig-on-file"
          checked={signatureOnFile}
          onCheckedChange={(checked) =>
            onChange({ physicianSignatureOnFile: !!checked })
          }
          disabled={disabled}
        />
        <label htmlFor="sig-on-file" className="text-sm text-on-surface">
          Physician signature on file
        </label>
      </div>
      {signatureOnFile && (
        <div className="flex flex-col gap-1">
          <label className="text-sm text-on-surface-variant">Signature Date</label>
          <Input
            type="date"
            value={signatureDate}
            onChange={(e) => onChange({ physicianSignatureDate: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create POC editor, viewer, generator, and history components**

These follow the same pattern as the evaluation components. Create each file under `src/features/plan-of-care/components/`:

- `poc-editor.tsx` — Form for editing POC fields (frequency, duration, discharge criteria, physician sig, goal lists)
- `poc-viewer.tsx` — Read-only view with print styling
- `poc-generator.tsx` — Button/modal that pulls active goals + latest evaluation to pre-populate a new POC
- `poc-history.tsx` — Shows version chain (v1 -> v2 -> v3) with status badges

Each component follows the same hooks/state pattern as `evaluation-editor.tsx`. The full code for each is structurally identical to the evaluation components with field-appropriate differences. Implement using the `usePOCMutations` hook and the validators from `convex/plansOfCare.ts`.

- [ ] **Step 4: Create the POC route page**

Create `src/app/(app)/patients/[id]/plan-of-care/page.tsx`:

```tsx
"use client";

import { use } from "react";

import { PocEditor } from "@/features/plan-of-care/components/poc-editor";
import { PocViewer } from "@/features/plan-of-care/components/poc-viewer";
import { PocHistory } from "@/features/plan-of-care/components/poc-history";
import { useActivePOC } from "@/features/plan-of-care/hooks/use-plan-of-care";

import type { Id } from "../../../../../../convex/_generated/dataModel";

export default function PlanOfCarePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const patientId = id as Id<"patients">;
  const activePOC = useActivePOC(patientId);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      {activePOC === undefined ? (
        <p className="text-on-surface-variant">Loading...</p>
      ) : activePOC === null ? (
        <PocEditor patientId={patientId} />
      ) : activePOC.status === "active" ? (
        <PocViewer pocId={activePOC._id} patientId={patientId} />
      ) : (
        <PocEditor patientId={patientId} pocId={activePOC._id} />
      )}
      <PocHistory patientId={patientId} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```
feat(plan-of-care): add POC frontend — editor, viewer, generator, history, physician sig
```

---

## Task 11: Frontend — Discharge Feature Slice

**Files:**
- Create: `src/features/discharge/hooks/use-discharge-summary.ts`
- Create: `src/features/discharge/components/discharge-form.tsx`
- Create: `src/features/discharge/components/discharge-viewer.tsx`
- Create: `src/features/discharge/components/discharge-prompt-modal.tsx`

- [ ] **Step 1: Create the discharge summary hook**

Create `src/features/discharge/hooks/use-discharge-summary.ts`:

```typescript
"use client";

import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useDischargeSummaries(patientId: Id<"patients">) {
  return useQuery(api.dischargeSummaries.getByPatient, { patientId });
}

export function useDischargeSummary(summaryId: Id<"dischargeSummaries">) {
  return useQuery(api.dischargeSummaries.get, { summaryId });
}

export function useDischargeMutations() {
  const generate = useMutation(api.dischargeSummaries.generate);
  const update = useMutation(api.dischargeSummaries.update);
  const sign = useMutation(api.dischargeSummaries.sign);

  return { generate, update, sign };
}
```

- [ ] **Step 2: Create discharge form component**

Create `src/features/discharge/components/discharge-form.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { MaterialIcon } from "@/shared/components/material-icon";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { useDischargeMutations } from "../hooks/use-discharge-summary";

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
  summaryId?: Id<"dischargeSummaries">;
  onComplete?: () => void;
}

export function DischargeForm({ patientId, summaryId, onComplete }: DischargeFormProps) {
  const { generate, update, sign } = useDischargeMutations();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [serviceStartDate, setServiceStartDate] = useState("");
  const [serviceEndDate, setServiceEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [presentingDiagnosis, setPresentingDiagnosis] = useState("");
  const [dischargeReason, setDischargeReason] = useState<DischargeReason>("goals-met");
  const [dischargeReasonOther, setDischargeReasonOther] = useState("");
  const [narrative, setNarrative] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [returnCriteria, setReturnCriteria] = useState("");

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (summaryId) {
        await update({
          summaryId,
          narrative,
          recommendations,
          returnCriteria: returnCriteria || undefined,
        });
      } else {
        await generate({
          patientId,
          serviceStartDate,
          serviceEndDate,
          presentingDiagnosis,
          goalsAchieved: [],
          goalsNotMet: [],
          dischargeReason,
          dischargeReasonOther: dischargeReason === "other" ? dischargeReasonOther : undefined,
          narrative,
          recommendations,
          returnCriteria: returnCriteria || undefined,
        });
      }
      onComplete?.();
    } finally {
      setSaving(false);
    }
  }, [summaryId, patientId, serviceStartDate, serviceEndDate, presentingDiagnosis, dischargeReason, dischargeReasonOther, narrative, recommendations, returnCriteria, generate, update, onComplete]);

  const handleGenerateAI = useCallback(async () => {
    if (!summaryId) return;
    setGenerating(true);
    try {
      const response = await fetch("/api/generate-discharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryId }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const block of lines) {
          const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
          const eventLine = block.split("\n").find((l) => l.startsWith("event: "));
          if (!dataLine || !eventLine) continue;

          const eventType = eventLine.replace("event: ", "");
          const data = JSON.parse(dataLine.replace("data: ", ""));

          if (eventType === "discharge-complete") {
            setNarrative(data.narrative);
            setRecommendations(data.recommendations);
          }
        }
      }
    } finally {
      setGenerating(false);
    }
  }, [summaryId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-on-surface">Service Start Date</label>
          <Input type="date" value={serviceStartDate} onChange={(e) => setServiceStartDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-on-surface">Service End Date</label>
          <Input type="date" value={serviceEndDate} onChange={(e) => setServiceEndDate(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-on-surface">Presenting Diagnosis</label>
        <Input placeholder="e.g., Phonological disorder (F80.0)" value={presentingDiagnosis} onChange={(e) => setPresentingDiagnosis(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-on-surface">Discharge Reason</label>
        <div className="flex flex-wrap gap-2">
          {DISCHARGE_REASONS.map((r) => (
            <Button
              key={r.value}
              type="button"
              variant={dischargeReason === r.value ? "default" : "outline"}
              size="sm"
              onClick={() => setDischargeReason(r.value)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        {dischargeReason === "other" && (
          <Input
            placeholder="Specify reason..."
            value={dischargeReasonOther}
            onChange={(e) => setDischargeReasonOther(e.target.value)}
            className="mt-2"
          />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-on-surface">Narrative</label>
        <Textarea placeholder="Summary of treatment course..." value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={6} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-on-surface">Recommendations</label>
        <Textarea placeholder="Continued services, follow-up, home strategies..." value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={4} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-on-surface">Return Criteria (optional)</label>
        <Input placeholder="When to return to therapy..." value={returnCriteria} onChange={(e) => setReturnCriteria(e.target.value)} />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Draft"}
        </Button>
        {summaryId && (
          <Button variant="outline" onClick={handleGenerateAI} disabled={generating}>
            <MaterialIcon icon="auto_awesome" size="sm" />
            {generating ? "Generating..." : "AI Generate"}
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create discharge viewer and prompt modal**

Create `src/features/discharge/components/discharge-viewer.tsx` and `src/features/discharge/components/discharge-prompt-modal.tsx` following the same pattern as the evaluation viewer and the evaluation editor modal trigger. The discharge viewer shows the read-only signed summary with print button. The prompt modal wraps `DischargeForm` in a Dialog from shadcn/ui, triggered from the patient profile when status changes to "discharged".

- [ ] **Step 4: Commit**

```
feat(discharge): add discharge frontend — form, viewer, prompt modal, hooks
```

---

## Task 12: Integration — Wire Into Patient Detail Page

**Files:**
- Modify: `src/app/(app)/patients/[id]/page.tsx:1-26`
- Modify: `src/features/goals/components/goals-list.tsx` (add "Generate Plan of Care" button)

- [ ] **Step 1: Add EvaluationList to patient detail page clinicalWidgets**

Modify `src/app/(app)/patients/[id]/page.tsx`:

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

- [ ] **Step 2: Add "Generate Plan of Care" button to goals list**

In `src/features/goals/components/goals-list.tsx`, add a `<Link>` button to `/patients/${patientId}/plan-of-care` in the header section next to the existing "Add Goal" button:

```tsx
<Button asChild variant="outline" size="sm">
  <Link href={`/patients/${patientId}/plan-of-care`}>
    <MaterialIcon icon="description" size="sm" />
    Plan of Care
  </Link>
</Button>
```

- [ ] **Step 3: Verify build compiles**

```bash
cd /Users/desha/Springfield-Vibeathon && npx next build 2>&1 | tail -20
```

Expected: Build succeeds without errors.

- [ ] **Step 4: Run all backend tests**

```bash
cd /Users/desha/Springfield-Vibeathon && npx vitest run convex/__tests__/evaluations.test.ts convex/__tests__/plansOfCare.test.ts convex/__tests__/dischargeSummaries.test.ts convex/__tests__/goalAmendments.test.ts 2>&1 | tail -30
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```
feat(clinical-docs): wire evaluations, POC, and discharge into patient detail page
```

---

## Task Summary

| Task | Description | Files | Estimated Effort |
|------|-------------|-------|-----------------|
| 1 | Schema Changes — 3 new tables + extended goals/patients | 1 modify | Medium |
| 2 | Evaluations Backend | 1 create + 1 test | Medium |
| 3 | Plans of Care Backend | 1 create + 1 test | Medium |
| 4 | Discharge Summaries Backend | 1 create + 1 test | Medium |
| 5 | Goal Amendment Audit Trail | 1 modify + 1 test | Small |
| 6 | ICD-10 Code Module | 1 create | Small |
| 7 | AI Evaluation Interpretation Route | 2 create | Medium |
| 8 | AI Discharge Narrative Route | 2 create | Medium |
| 9 | Evaluations Frontend Slice | 10 create + 2 test | Large |
| 10 | Plan of Care Frontend Slice | 7 create | Large |
| 11 | Discharge Frontend Slice | 4 create | Medium |
| 12 | Integration — Patient Detail Page | 2 modify | Small |

**Total:** ~35 new files, ~5 modified files, ~6 test files

**Dependencies:** Task 1 first (schema), then Tasks 2-6 in parallel, then Tasks 7-8 (need backend), then Tasks 9-11 (need backend + prompts), then Task 12 (needs all frontend).
