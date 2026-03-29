# Patient-Contextualized AI Material Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thread patient context from the patient detail page through the builder pipeline so Claude generates personalized therapy materials without the SLP having to re-describe the child.

**Architecture:** Purely additive changes to the existing builder pipeline. The standalone builder stays untouched. When `patientId` is in the URL, the route fetches patient profile + active goals, sanitizes via an allowlist, and appends a `## Patient Context` block to the system prompt. A context card shows in the builder UI, and a post-generation toast prompts the SLP to assign the material to the patient.

**Tech Stack:** Next.js 16 App Router, Convex (schema + functions), Clerk auth, Zod validation, shadcn/ui, sonner toasts, Vitest + convex-test

**Spec:** `docs/superpowers/specs/2026-03-28-patient-contextualized-materials-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `src/features/builder/lib/patient-context.ts` | `sanitizePatientContext()` + `buildPatientContextBlock()` — PII allowlist and prompt formatting |
| `src/features/builder/lib/__tests__/patient-context.test.ts` | Unit tests for the above |
| `src/features/builder/components/patient-context-card.tsx` | Collapsible UI card showing patient info + active goals in the builder |
| `src/features/builder/components/__tests__/patient-context-card.test.tsx` | Component render tests |
| `src/features/patients/components/create-material-button.tsx` | "Create Material" CTA that navigates to `/builder?patientId=X` |

### Modified Files

| File | What Changes |
|---|---|
| `convex/schema.ts:5-21` | Add `patientId: v.optional(v.id("patients"))` to sessions table |
| `convex/schema.ts:181-189` | Add `goalId: v.optional(v.id("goals"))` to patientMaterials table |
| `convex/schema.ts:194-208` | Add `"material-generated-for-patient"` to activityLog action union |
| `convex/patients.ts` | Add `getForContext` public query (auth-enforced, allowlisted fields) |
| `convex/sessions.ts:11-27` | Accept optional `patientId` in `create` mutation args |
| `convex/patientMaterials.ts:6-41` | Accept optional `goalId` in `assign` mutation args |
| `src/features/builder/lib/schemas/generate.ts:3-12` | Add `patientId: z.string().optional()` to `GenerateInputSchema` |
| `src/features/builder/lib/agent-prompt.ts:542-544` | Modify `buildSystemPrompt()` to accept optional patient context string |
| `src/features/builder/hooks/use-streaming.ts:340-366` | Pass `patientId` in fetch body |
| `src/features/builder/components/builder-page.tsx:38-60` | Read `patientId` from URL, pass to context card + streaming hook |
| `src/app/api/generate/route.ts:90-102` | Fetch patient context, inject into prompt, pass patientId to session create |
| `src/features/patients/components/patient-detail-page.tsx:38-70` | Add "Create Material" button to header |

---

## Task 1: Schema Changes (Convex)

**Files:**
- Modify: `convex/schema.ts:5-21` (sessions table)
- Modify: `convex/schema.ts:181-189` (patientMaterials table)
- Modify: `convex/schema.ts:194-208` (activityLog union)

- [ ] **Step 1: Add `patientId` to sessions table**

In `convex/schema.ts`, add after line 18 (`type` field):

```typescript
    patientId: v.optional(v.id("patients")),
```

- [ ] **Step 2: Add `goalId` to patientMaterials table**

In `convex/schema.ts`, add after line 187 (`notes` field):

```typescript
    goalId: v.optional(v.id("goals")),
```

- [ ] **Step 3: Add `material-generated-for-patient` to activityLog action union**

In `convex/schema.ts`, add a new literal after `v.literal("report-generated")` (line 207):

```typescript
      v.literal("material-generated-for-patient"),
```

- [ ] **Step 4: Verify schema pushes cleanly**

Run: `npx convex dev --once`
Expected: Schema deployed without errors. Existing data unaffected (all new fields are optional).

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add patientId to sessions, goalId to patientMaterials, new activity action"
```

---

## Task 2: `patients.getForContext` Query

**Files:**
- Modify: `convex/patients.ts` (add new export)
- Test: `convex/__tests__/patients.test.ts`

- [ ] **Step 1: Write failing tests for `getForContext`**

Append to `convex/__tests__/patients.test.ts`:

```typescript
describe("patients.getForContext", () => {
  it("returns only allowlisted fields for the owning SLP", async () => {
    const t = convexTest(schema, modules).withIdentity(SLP_IDENTITY);
    const { patientId } = await t.mutation(api.patients.create, {
      ...VALID_PATIENT,
      interests: ["dinosaurs", "trains"],
      communicationLevel: "single-words" as const,
      sensoryNotes: "Sensitive to loud sounds",
      behavioralNotes: "Responds well to visual timers",
    });

    const context = await t.query(api.patients.getForContext, { patientId });
    expect(context).not.toBeNull();
    // Allowlisted fields present
    expect(context!.firstName).toBe("Alex");
    expect(context!.diagnosis).toBe("articulation");
    expect(context!.communicationLevel).toBe("single-words");
    expect(context!.interests).toEqual(["dinosaurs", "trains"]);
    expect(context!.sensoryNotes).toBe("Sensitive to loud sounds");
    expect(context!.behavioralNotes).toBe("Responds well to visual timers");
    // PII fields excluded
    expect((context as Record<string, unknown>).lastName).toBeUndefined();
    expect((context as Record<string, unknown>).dateOfBirth).toBeUndefined();
    expect((context as Record<string, unknown>).parentEmail).toBeUndefined();
    expect((context as Record<string, unknown>).slpUserId).toBeUndefined();
    expect((context as Record<string, unknown>)._id).toBeUndefined();
  });

  it("returns null for non-owning SLP (same DB, different identity)", async () => {
    // IMPORTANT: convex-test creates isolated DBs per convexTest() call.
    // Use ONE instance with .withIdentity() to test auth boundaries on shared data.
    const t = convexTest(schema, modules);
    const asOwner = t.withIdentity(SLP_IDENTITY);
    const asOther = t.withIdentity(OTHER_SLP);

    const { patientId } = await asOwner.mutation(api.patients.create, VALID_PATIENT);

    const context = await asOther.query(api.patients.getForContext, { patientId });
    expect(context).toBeNull();
  });

  it("throws for unauthenticated users", async () => {
    const t = convexTest(schema, modules);
    // No identity set — should throw
    await expect(
      t.query(api.patients.getForContext, { patientId: "placeholder" as any })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/patients.test.ts --reporter=verbose`
Expected: FAIL — `getForContext` is not defined

- [ ] **Step 3: Implement `getForContext`**

Add to `convex/patients.ts` (after existing exports):

```typescript
export const getForContext = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, { patientId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    const patient = await ctx.db.get(patientId);
    if (!patient) return null;
    if (patient.slpUserId !== identity.subject) return null;
    return {
      firstName: patient.firstName,
      diagnosis: patient.diagnosis,
      communicationLevel: patient.communicationLevel,
      interests: patient.interests,
      sensoryNotes: patient.sensoryNotes,
      behavioralNotes: patient.behavioralNotes,
    };
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/patients.test.ts --reporter=verbose`
Expected: All `getForContext` tests PASS

- [ ] **Step 5: Commit**

```bash
git add convex/patients.ts convex/__tests__/patients.test.ts
git commit -m "feat(patients): add getForContext query with PII allowlist and auth boundary"
```

---

## Task 3: Update `sessions.create` to Accept `patientId`

**Files:**
- Modify: `convex/sessions.ts:11-27`

- [ ] **Step 1: Add `patientId` to `create` mutation args**

In `convex/sessions.ts`, update the `create` mutation:

```typescript
export const create = mutation({
  args: {
    title: v.string(),
    query: v.string(),
    type: v.optional(v.union(v.literal("builder"), v.literal("flashcards"))),
    patientId: v.optional(v.id("patients")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    return await ctx.db.insert("sessions", {
      userId: identity?.subject,
      title: args.title,
      query: args.query,
      state: SESSION_STATES.IDLE,
      type: args.type,
      ...(args.patientId ? { patientId: args.patientId } : {}),
    });
  },
});
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `npx vitest run --reporter=verbose 2>&1 | head -50`
Expected: No regressions — `patientId` is optional, existing callers don't provide it.

- [ ] **Step 3: Commit**

```bash
git add convex/sessions.ts
git commit -m "feat(sessions): accept optional patientId in create mutation"
```

---

## Task 4: Update `patientMaterials.assign` to Accept `goalId`

**Files:**
- Modify: `convex/patientMaterials.ts:6-41`

- [ ] **Step 1: Add `goalId` to `assign` mutation args**

In `convex/patientMaterials.ts`, update the `assign` mutation args to include:

```typescript
goalId: v.optional(v.id("goals")),
```

And in the `ctx.db.insert` call, add:

```typescript
goalId: args.goalId,
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `npx vitest run --reporter=verbose 2>&1 | head -50`
Expected: No regressions.

- [ ] **Step 3: Commit**

```bash
git add convex/patientMaterials.ts
git commit -m "feat(patientMaterials): accept optional goalId in assign mutation"
```

---

## Task 5: Patient Context Sanitization & Prompt Builder

**Files:**
- Create: `src/features/builder/lib/patient-context.ts`
- Create: `src/features/builder/lib/__tests__/patient-context.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/features/builder/lib/__tests__/patient-context.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  sanitizePatientContext,
  buildPatientContextBlock,
  type PatientForContext,
  type GoalForContext,
} from "../patient-context";

const FULL_PATIENT: PatientForContext = {
  firstName: "Alex",
  diagnosis: "articulation",
  communicationLevel: "single-words",
  interests: ["dinosaurs", "trains", "Bluey"],
  sensoryNotes: "Sensitive to loud sounds",
  behavioralNotes: "Responds well to visual timers",
};

const GOALS: GoalForContext[] = [
  { shortDescription: "Produce /r/ in initial position", domain: "articulation", targetAccuracy: 80 },
  { shortDescription: "Follow 2-step directions", domain: "language-receptive", targetAccuracy: 90 },
];

describe("sanitizePatientContext", () => {
  it("returns only allowlisted patient fields", () => {
    const result = sanitizePatientContext(FULL_PATIENT, GOALS);
    expect(result.patient.firstName).toBe("Alex");
    expect(result.patient.diagnosis).toBe("articulation");
    expect(result.patient.communicationLevel).toBe("single-words");
    expect(result.patient.interests).toEqual(["dinosaurs", "trains", "Bluey"]);
    expect(result.patient.sensoryNotes).toBe("Sensitive to loud sounds");
    expect(result.patient.behavioralNotes).toBe("Responds well to visual timers");
  });

  it("sanitizes goals to only allowed fields", () => {
    const result = sanitizePatientContext(FULL_PATIENT, GOALS);
    expect(result.goals).toHaveLength(2);
    expect(result.goals[0]).toEqual({
      shortDescription: "Produce /r/ in initial position",
      domain: "articulation",
      targetAccuracy: 80,
    });
    // Ensure no extra keys snuck in
    expect(Object.keys(result.goals[0])).toEqual(["shortDescription", "domain", "targetAccuracy"]);
  });

  it("handles missing optional fields", () => {
    const minimal: PatientForContext = {
      firstName: "Sam",
      diagnosis: "language",
      communicationLevel: undefined,
      interests: undefined,
      sensoryNotes: undefined,
      behavioralNotes: undefined,
    };
    const result = sanitizePatientContext(minimal, []);
    expect(result.patient.firstName).toBe("Sam");
    expect(result.patient.communicationLevel).toBeUndefined();
    expect(result.patient.interests).toBeUndefined();
    expect(result.goals).toEqual([]);
  });
});

describe("buildPatientContextBlock", () => {
  it("formats a complete patient context block", () => {
    const { patient, goals } = sanitizePatientContext(FULL_PATIENT, GOALS);
    const block = buildPatientContextBlock(patient, goals);

    expect(block).toContain("## Patient Context");
    expect(block).toContain("building a therapy tool for Alex");
    expect(block).toContain("Diagnosis: articulation");
    expect(block).toContain("Communication level: single-words");
    expect(block).toContain("dinosaurs, trains, Bluey");
    expect(block).toContain("Sensitive to loud sounds");
    expect(block).toContain("[articulation] Produce /r/ in initial position (target: 80%)");
    expect(block).toContain("[language-receptive] Follow 2-step directions (target: 90%)");
    expect(block).toContain("Do not include the child's name");
  });

  it("handles zero goals", () => {
    const { patient, goals } = sanitizePatientContext(FULL_PATIENT, []);
    const block = buildPatientContextBlock(patient, goals);

    expect(block).toContain("## Patient Context");
    expect(block).toContain("No active therapy goals");
    expect(block).not.toContain("1.");
  });

  it("shows 'None noted' for missing optional fields", () => {
    const minimal: PatientForContext = {
      firstName: "Sam",
      diagnosis: "language",
      communicationLevel: undefined,
      interests: undefined,
      sensoryNotes: undefined,
      behavioralNotes: undefined,
    };
    const { patient, goals } = sanitizePatientContext(minimal, []);
    const block = buildPatientContextBlock(patient, goals);

    expect(block).toContain("Sensory notes: None noted");
    expect(block).toContain("Behavioral notes: None noted");
    expect(block).toContain("Interests: None noted");
    expect(block).toContain("Communication level: Not specified");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/lib/__tests__/patient-context.test.ts --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement patient-context.ts**

Create `src/features/builder/lib/patient-context.ts`:

```typescript
/**
 * Patient context sanitization and prompt formatting for the builder pipeline.
 *
 * HIPAA-forward design: uses an explicit allowlist so new patient fields
 * are blocked by default. A developer must opt in each field.
 */

// ── Types ───────────────────────────────────────────────────────────────────

/** Shape returned by patients.getForContext (already allowlisted at data layer) */
export interface PatientForContext {
  firstName: string;
  diagnosis: string;
  communicationLevel?: string;
  interests?: string[];
  sensoryNotes?: string;
  behavioralNotes?: string;
}

/** Goal fields allowlisted for the AI prompt */
export interface GoalForContext {
  shortDescription: string;
  domain: string;
  targetAccuracy: number;
}

interface SanitizedContext {
  patient: PatientForContext;
  goals: GoalForContext[];
}

// ── Sanitization ────────────────────────────────────────────────────────────

/**
 * Allowlist-based sanitization. Even though getForContext already filters
 * at the data layer, this function provides defense-in-depth by explicitly
 * picking only the fields we want.
 */
export function sanitizePatientContext(
  patient: PatientForContext,
  goals: GoalForContext[],
): SanitizedContext {
  return {
    patient: {
      firstName: patient.firstName,
      diagnosis: patient.diagnosis,
      communicationLevel: patient.communicationLevel,
      interests: patient.interests,
      sensoryNotes: patient.sensoryNotes,
      behavioralNotes: patient.behavioralNotes,
    },
    goals: goals.map((g) => ({
      shortDescription: g.shortDescription,
      domain: g.domain,
      targetAccuracy: g.targetAccuracy,
    })),
  };
}

// ── Prompt Formatting ───────────────────────────────────────────────────────

export function buildPatientContextBlock(
  patient: PatientForContext,
  goals: GoalForContext[],
): string {
  const lines: string[] = [
    `## Patient Context`,
    `You are building a therapy tool for ${patient.firstName}.`,
    `- Diagnosis: ${patient.diagnosis}`,
    `- Communication level: ${patient.communicationLevel ?? "Not specified"}`,
    `- Interests: ${patient.interests?.length ? patient.interests.join(", ") : "None noted"}`,
    `- Sensory notes: ${patient.sensoryNotes ?? "None noted"}`,
    `- Behavioral notes: ${patient.behavioralNotes ?? "None noted"}`,
    ``,
  ];

  if (goals.length > 0) {
    lines.push(`Active therapy goals:`);
    goals.forEach((g, i) => {
      lines.push(`${i + 1}. [${g.domain}] ${g.shortDescription} (target: ${g.targetAccuracy}%)`);
    });
  } else {
    lines.push(`No active therapy goals defined yet.`);
  }

  lines.push(``);
  lines.push(
    `Use this context to personalize the activity. Reference the child's interests in themes and visuals. Match complexity to their communication level.`,
  );
  lines.push(
    `Do not include the child's name in the app title or any visible text unless the therapist explicitly asks for it.`,
  );

  return lines.join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/lib/__tests__/patient-context.test.ts --reporter=verbose`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/lib/patient-context.ts src/features/builder/lib/__tests__/patient-context.test.ts
git commit -m "feat(builder): add patient context sanitization and prompt block builder"
```

---

## Task 6: Update `buildSystemPrompt()` to Accept Patient Context

**Files:**
- Modify: `src/features/builder/lib/agent-prompt.ts:542-544`
- Modify: `src/features/builder/lib/__tests__/agent-prompt.test.ts`

- [ ] **Step 1: Write failing test**

Append to `src/features/builder/lib/__tests__/agent-prompt.test.ts`:

```typescript
  it("appends patient context block when provided", () => {
    const patientBlock = "## Patient Context\nYou are building for Alex.";
    const prompt = buildSystemPrompt(patientBlock);
    expect(prompt).toContain("## Patient Context");
    expect(prompt).toContain("building for Alex");
    // Original prompt content still present
    expect(prompt).toMatch(/therapy/i);
  });

  it("returns standard prompt when no patient context provided", () => {
    const withContext = buildSystemPrompt("## Patient Context\nTest");
    const without = buildSystemPrompt();
    expect(without).not.toContain("## Patient Context");
    expect(withContext.length).toBeGreaterThan(without.length);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/builder/lib/__tests__/agent-prompt.test.ts --reporter=verbose`
Expected: FAIL — `buildSystemPrompt` doesn't accept arguments yet

- [ ] **Step 3: Update `buildSystemPrompt` signature**

In `src/features/builder/lib/agent-prompt.ts`, change:

```typescript
export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}
```

To:

```typescript
export function buildSystemPrompt(patientContextBlock?: string): string {
  if (!patientContextBlock) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\n${patientContextBlock}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/lib/__tests__/agent-prompt.test.ts --reporter=verbose`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/lib/agent-prompt.ts src/features/builder/lib/__tests__/agent-prompt.test.ts
git commit -m "feat(agent-prompt): accept optional patient context block"
```

---

## Task 7: Update `GenerateInputSchema` to Accept `patientId`

**Files:**
- Modify: `src/features/builder/lib/schemas/generate.ts:3-12`
- Modify: `src/features/builder/lib/schemas/__tests__/generate.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/features/builder/lib/schemas/__tests__/generate.test.ts`:

```typescript
describe("patientId field", () => {
  it("accepts a valid patientId string", () => {
    const result = GenerateInputSchema.safeParse({
      prompt: "Build an AAC board",
      patientId: "abc123def456",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.patientId).toBe("abc123def456");
  });

  it("accepts undefined patientId", () => {
    const result = GenerateInputSchema.safeParse({
      prompt: "Build a card game",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.patientId).toBeUndefined();
  });

  it("rejects non-string patientId", () => {
    const result = GenerateInputSchema.safeParse({
      prompt: "Build something",
      patientId: 12345,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/builder/lib/schemas/__tests__/generate.test.ts --reporter=verbose`
Expected: FAIL — patientId not recognized

- [ ] **Step 3: Add `patientId` to schema**

In `src/features/builder/lib/schemas/generate.ts`, add before the `.refine()`:

```typescript
  patientId: z.string().optional(),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/lib/schemas/__tests__/generate.test.ts --reporter=verbose`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/lib/schemas/generate.ts src/features/builder/lib/schemas/__tests__/generate.test.ts
git commit -m "feat(schemas): add optional patientId to GenerateInputSchema"
```

---

## Task 8: Wire Patient Context into `/api/generate` Route

**Files:**
- Modify: `src/app/api/generate/route.ts:90-102`

This is the core integration — fetching patient data and injecting it into the prompt. No separate test file needed; the unit tests for `sanitizePatientContext` and `buildPatientContextBlock` cover the logic. Integration testing happens via E2E.

- [ ] **Step 1: Add patient context import**

At the top of `src/app/api/generate/route.ts`, add alongside existing imports:

```typescript
import {
  sanitizePatientContext,
  buildPatientContextBlock,
} from "@/features/builder/lib/patient-context";
```

- [ ] **Step 2: Extract `patientId` from parsed input**

After line 93 (`const providedSessionId = parsed.data.sessionId as Id<"sessions"> | undefined;`), add:

```typescript
  const patientId = parsed.data.patientId as Id<"patients"> | undefined;
```

- [ ] **Step 3: Fetch patient context when patientId is present**

After the `patientId` extraction, before session creation (before line 96), add:

```typescript
  // ── Patient context (optional, graceful degradation) ──────────────────
  let patientContextBlock: string | undefined;
  if (patientId) {
    try {
      const [patientCtx, activeGoals] = await Promise.all([
        convex.query(api.patients.getForContext, { patientId }),
        convex.query(api.goals.listActive, { patientId }),
      ]);
      if (patientCtx) {
        const { patient, goals } = sanitizePatientContext(patientCtx, activeGoals ?? []);
        patientContextBlock = buildPatientContextBlock(patient, goals);
      }
    } catch {
      // Graceful degradation — generate without patient context
      // Don't log patient details (HIPAA-forward)
      console.warn("[generate] Failed to fetch patient context, proceeding without it");
    }
  }
```

- [ ] **Step 4: Pass `patientId` to session creation**

Update the session creation call (around line 98) to include `patientId`:

Change:
```typescript
    (await convex.mutation(api.sessions.create, {
      title: query.slice(0, 60),
      query,
      type: isFlashcardMode ? "flashcards" as const : "builder" as const,
    }));
```

To:
```typescript
    (await convex.mutation(api.sessions.create, {
      title: query.slice(0, 60),
      query,
      type: isFlashcardMode ? "flashcards" as const : "builder" as const,
      ...(patientId ? { patientId } : {}),
    }));
```

- [ ] **Step 5: Inject context into system prompt**

Update the `systemPrompt` construction (around line 138):

Change:
```typescript
        const systemPrompt = isFlashcardMode
          ? buildFlashcardSystemPrompt()
          : buildSystemPrompt();
```

To:
```typescript
        const systemPrompt = isFlashcardMode
          ? buildFlashcardSystemPrompt()
          : buildSystemPrompt(patientContextBlock);
```

- [ ] **Step 6: Verify the build compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds. TypeScript compilation passes.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat(generate): fetch and inject patient context into builder pipeline"
```

---

## Task 9: Update `useStreaming` Hook to Pass `patientId`

**Files:**
- Modify: `src/features/builder/hooks/use-streaming.ts:340-366`

- [ ] **Step 1: Update `generate` function signature**

In `use-streaming.ts`, update the `generate` callback (around line 342):

Change:
```typescript
    async (prompt: string, blueprint?: TherapyBlueprint): Promise<void> => {
```

To:
```typescript
    async (prompt: string, blueprint?: TherapyBlueprint, patientId?: string): Promise<void> => {
```

- [ ] **Step 2: Include `patientId` in fetch body**

Update the `body: JSON.stringify(...)` call (around line 360):

Change:
```typescript
          body: JSON.stringify({
            prompt,
            sessionId: sessionIdRef.current ?? undefined,
            ...(blueprint ? { blueprint } : {}),
          }),
```

To:
```typescript
          body: JSON.stringify({
            prompt,
            sessionId: sessionIdRef.current ?? undefined,
            ...(blueprint ? { blueprint } : {}),
            ...(patientId ? { patientId } : {}),
          }),
```

- [ ] **Step 3: Verify existing tests still pass**

Run: `npx vitest run src/features/builder/hooks/__tests__/use-streaming.test.ts --reporter=verbose`
Expected: All PASS — new parameter is optional.

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/hooks/use-streaming.ts
git commit -m "feat(use-streaming): pass optional patientId in generate request"
```

---

## Task 10: Patient Context Card Component

**Files:**
- Create: `src/features/builder/components/patient-context-card.tsx`
- Create: `src/features/builder/components/__tests__/patient-context-card.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/builder/components/__tests__/patient-context-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

import { useQuery } from "convex/react";
import { PatientContextCard } from "../patient-context-card";

const MOCK_PATIENT = {
  _id: "patient123" as any,
  firstName: "Alex",
  lastName: "Smith",
  diagnosis: "articulation",
  communicationLevel: "single-words",
  interests: ["dinosaurs", "trains", "Bluey"],
  sensoryNotes: "Sensitive to loud sounds",
  status: "active",
  slpUserId: "slp-123",
  dateOfBirth: "2020-01-15",
};

const MOCK_GOALS = [
  { _id: "goal1", shortDescription: "Produce /r/ in initial position", domain: "articulation", targetAccuracy: 80, status: "active" },
  { _id: "goal2", shortDescription: "Follow 2-step directions", domain: "language-receptive", targetAccuracy: 90, status: "active" },
];

describe("PatientContextCard", () => {
  it("renders patient name, diagnosis, and communication level", () => {
    (useQuery as any).mockImplementation((queryFn: any) => {
      if (queryFn._name?.includes("patients") || queryFn === expect.anything()) return MOCK_PATIENT;
      return MOCK_GOALS;
    });

    // Use a simpler mock approach
    (useQuery as any)
      .mockReturnValueOnce(MOCK_PATIENT)
      .mockReturnValueOnce(MOCK_GOALS);

    render(<PatientContextCard patientId={"patient123" as any} />);

    expect(screen.getByText(/Building for Alex/)).toBeInTheDocument();
    expect(screen.getByText(/articulation/i)).toBeInTheDocument();
    expect(screen.getByText(/single-words/i)).toBeInTheDocument();
  });

  it("renders active goals", () => {
    (useQuery as any)
      .mockReturnValueOnce(MOCK_PATIENT)
      .mockReturnValueOnce(MOCK_GOALS);

    render(<PatientContextCard patientId={"patient123" as any} />);

    expect(screen.getByText(/Produce \/r\/ in initial position/)).toBeInTheDocument();
    expect(screen.getByText(/Follow 2-step directions/)).toBeInTheDocument();
  });

  it("renders nothing when patient data is loading", () => {
    (useQuery as any)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined);

    const { container } = render(<PatientContextCard patientId={"patient123" as any} />);
    // Should show a loading skeleton or nothing
    expect(container.textContent).toBe("");
  });

  it("collapses when collapse button is clicked", async () => {
    const user = userEvent.setup();
    (useQuery as any)
      .mockReturnValueOnce(MOCK_PATIENT)
      .mockReturnValueOnce(MOCK_GOALS);

    render(<PatientContextCard patientId={"patient123" as any} />);

    const collapseButton = screen.getByRole("button", { name: /collapse/i });
    await user.click(collapseButton);

    // Goals should be hidden after collapse
    expect(screen.queryByText(/Produce \/r\/ in initial position/)).not.toBeInTheDocument();
    // Name should still be visible in collapsed state
    expect(screen.getByText(/Alex/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/features/builder/components/__tests__/patient-context-card.test.tsx --reporter=verbose`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `patient-context-card.tsx`**

Create `src/features/builder/components/patient-context-card.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface PatientContextCardProps {
  patientId: Id<"patients">;
}

export function PatientContextCard({ patientId }: PatientContextCardProps) {
  const patient = useQuery(api.patients.get, { patientId });
  const goals = useQuery(api.goals.listActive, { patientId });
  const [collapsed, setCollapsed] = useState(false);

  // Loading state — render nothing until data arrives
  if (patient === undefined) return null;
  if (patient === null) return null;

  const activeGoals = goals ?? [];

  return (
    <div className="rounded-lg bg-muted px-4 py-3">
      {/* Header row — always visible */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">
            Building for {patient.firstName}
          </span>
          {collapsed && (
            <span className="text-xs text-muted-foreground">
              · {activeGoals.length} goal{activeGoals.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand patient context" : "Collapse patient context"}
          className="h-7 w-7 p-0"
        >
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {/* Expandable details */}
      {!collapsed && (
        <div className="mt-2 space-y-2">
          {/* Diagnosis + communication level */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {patient.diagnosis}
            </Badge>
            {patient.communicationLevel && (
              <Badge variant="outline" className="text-xs">
                {patient.communicationLevel}
              </Badge>
            )}
          </div>

          {/* Interests */}
          {patient.interests && patient.interests.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Interests: {patient.interests.join(", ")}
            </p>
          )}

          {/* Active goals */}
          {activeGoals.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Active Goals ({activeGoals.length})
              </p>
              <ul className="space-y-0.5">
                {activeGoals.map((goal) => (
                  <li key={goal._id} className="text-xs text-muted-foreground">
                    <Badge variant="outline" className="mr-1.5 px-1 py-0 text-[10px]">
                      {goal.domain}
                    </Badge>
                    {goal.shortDescription} — {goal.targetAccuracy}%
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/components/__tests__/patient-context-card.test.tsx --reporter=verbose`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/patient-context-card.tsx src/features/builder/components/__tests__/patient-context-card.test.tsx
git commit -m "feat(builder): add patient context card component"
```

---

## Task 11: Wire Patient Context into Builder Page

**Files:**
- Modify: `src/features/builder/components/builder-page.tsx:38-60`

- [ ] **Step 1: Import PatientContextCard**

Add import at the top of `builder-page.tsx`:

```typescript
import { PatientContextCard } from "./patient-context-card";
```

- [ ] **Step 2: Read `patientId` from URL search params**

Inside `BuilderPage`, after line 40 (`const searchParams = useSearchParams();`), add:

```typescript
  const patientId = searchParams.get("patientId") as Id<"patients"> | null;
```

(Will need to import `Id` from `../../../../convex/_generated/dataModel` — already imported on line 21.)

- [ ] **Step 3: Render context card above chat**

Find where the chat panel renders in the JSX. Add the `PatientContextCard` just before `<ChatPanel>` (or at the top of the chat column):

```tsx
{patientId && <PatientContextCard patientId={patientId} />}
```

- [ ] **Step 4: Pass `patientId` to generate calls**

Find where `generate` is called in the component. Update to include `patientId`:

```typescript
generate(prompt, blueprint ?? undefined, patientId ?? undefined);
```

- [ ] **Step 5: Add post-generation assignment toast**

Add an effect that watches for generation completion when `patientId` is present. After the existing `useEffect` hooks:

```tsx
  // ── Post-generation assignment prompt ────────────────────────────────
  const assignMaterial = useMutation(api.patientMaterials.assign);
  const patientData = useQuery(
    api.patients.get,
    patientId ? { patientId } : "skip",
  );

  useEffect(() => {
    if (status !== "live" || !patientId || !sessionId) return;
    const firstName = patientData?.firstName ?? "patient";

    toast(`App ready · Assign to ${firstName}'s materials?`, {
      duration: 15_000,
      action: {
        label: "Assign",
        onClick: async () => {
          try {
            await assignMaterial({ patientId, sessionId: sessionId as Id<"sessions"> });
            toast.success(`Added to ${firstName}'s materials`);
          } catch {
            toast.error("Failed to assign material");
          }
        },
      },
      cancel: {
        label: "Skip",
        onClick: () => {},
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, patientId, sessionId]);
```

Note: `sessionId` should be available from the `useStreaming` hook return value. Check the existing destructuring and add it if not already present.

- [ ] **Step 6: Verify the dev server runs**

Run: `npx next dev` — navigate to `/builder?patientId=<valid-id>` and confirm the context card renders.

- [ ] **Step 7: Commit**

```bash
git add src/features/builder/components/builder-page.tsx
git commit -m "feat(builder): wire patient context card and assignment toast into builder page"
```

---

## Task 12: "Create Material" Button on Patient Detail Page

**Files:**
- Create: `src/features/patients/components/create-material-button.tsx`
- Modify: `src/features/patients/components/patient-detail-page.tsx:38-70`

- [ ] **Step 1: Create the button component**

Create `src/features/patients/components/create-material-button.tsx`:

```tsx
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import type { Id } from "../../../../convex/_generated/dataModel";

interface CreateMaterialButtonProps {
  patientId: Id<"patients">;
}

export function CreateMaterialButton({ patientId }: CreateMaterialButtonProps) {
  return (
    <Button asChild size="sm">
      <Link href={`/builder?patientId=${patientId}`}>
        <Sparkles className="mr-1.5 h-4 w-4" />
        Create Material
      </Link>
    </Button>
  );
}
```

- [ ] **Step 2: Add to patient detail page header**

In `src/features/patients/components/patient-detail-page.tsx`, add the import:

```typescript
import { CreateMaterialButton } from "./create-material-button";
```

Then add the button after the "Back to Caseload" button and before the profile widget (around line 48). Wrap both buttons in a flex row:

Change:
```tsx
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/patients">
          <MaterialIcon icon="arrow_back" size="sm" />
          Back to Caseload
        </Link>
      </Button>

      {/* Profile card (full width) */}
      <PatientProfileWidget patient={patient} />
```

To:
```tsx
      {/* Header with back link + actions */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/patients">
            <MaterialIcon icon="arrow_back" size="sm" />
            Back to Caseload
          </Link>
        </Button>
        <CreateMaterialButton patientId={patient._id} />
      </div>

      {/* Profile card (full width) */}
      <PatientProfileWidget patient={patient} />
```

- [ ] **Step 3: Verify it renders**

Run dev server, navigate to `/patients/<id>` — confirm "Create Material" button appears in header and links to `/builder?patientId=<id>`.

- [ ] **Step 4: Commit**

```bash
git add src/features/patients/components/create-material-button.tsx src/features/patients/components/patient-detail-page.tsx
git commit -m "feat(patients): add Create Material button to patient detail page"
```

---

## Task 13: Run Full Test Suite

**Files:** None (verification only)

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All tests pass. No regressions from schema or function changes.

- [ ] **Step 2: Run TypeScript compilation check**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: No type errors.

- [ ] **Step 3: Fix any failures**

If any tests fail, diagnose and fix before proceeding.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve test regressions from patient context integration"
```

---

## Task 14: Manual Smoke Test

**Files:** None (manual verification)

- [ ] **Step 1: Test standalone builder (no patient context)**

Navigate to `/builder`. Generate an app. Confirm behavior is identical to before — no context card, no assignment toast, no regressions.

- [ ] **Step 2: Test patient-contextualized builder**

Navigate to a patient detail page → click "Create Material" → verify:
1. Context card renders with patient name, diagnosis, interests, goals
2. Type a prompt like "Build a flashcard deck for practicing their sounds"
3. Confirm the generated app references the patient's interests (e.g., dinosaur themes)
4. On completion, assignment toast appears
5. Click "Assign" → verify material appears on patient detail page

- [ ] **Step 3: Test graceful degradation**

Navigate to `/builder?patientId=invalid_id`. Confirm:
1. No context card (patient not found)
2. Builder works normally without patient context
3. No errors in browser console
