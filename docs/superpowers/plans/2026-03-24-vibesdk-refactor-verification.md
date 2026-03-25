# Plan Verification Report

> **Plan:** `2026-03-24-vibesdk-refactor.md` | **Score:** 62/100 | **Verdict:** Fix & re-verify
>
> The plan's architecture is sound and well-structured, but it has 9 concrete issues — most critically, hallucinated Convex function references, a wrong SDK import path, and a missing `convex.config.ts` update that would cause build failure. All issues have clear fixes.

---

## Scorecard (MANDATORY)

| Category       | Max     | Score   | Deductions                                         |
| -------------- | ------- | ------- | -------------------------------------------------- |
| Paths & Lines  | 20      | 18      | P1(-2)                                             |
| APIs & Imports | 25      | 5       | A1(-4), A2(-8), A3(-4), A4(-4)                     |
| Wiring         | 15      | 7       | W1(-4), W2(-4)                                     |
| Architecture   | 15      | 11      | R1(-4)                                             |
| Dependencies   | 10      | 6       | D1(-4)                                             |
| Logic          | 15      | 11      | L1(-4)                                             |
| **Total**      | **100** | **62**  |                                                    |

---

## Issues (MANDATORY)

| ID  | Severity   | Deduction | Category     | Issue (one line)                                                                                   | Fix (one line)                                                                                     |
| --- | ---------- | --------- | ------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| P1  | WARNING    | -2        | Paths        | `src/app/(app)/builder/page.tsx` already exists — plan says "Create"                               | Change to "Modify" and note existing content to preserve/replace                                   |
| A1  | CRITICAL   | -4        | APIs         | `betaZodTool` import path is wrong: `@anthropic-ai/sdk/resources/beta/messages`                    | Change to `@anthropic-ai/sdk/helpers/beta/zod`                                                     |
| A2  | CRITICAL   | -8        | APIs         | `internal.knowledge.searchInternal` hallucinated — function does not exist                         | Change to `internal.knowledge.search.searchKnowledgeAction`                                        |
| A3  | CRITICAL   | -4        | APIs         | `internal.aiActions.generateImageInternal` and `generateSpeechInternal` hallucinated               | Use existing public actions: `anyApi.aiActions.generateImage` and `anyApi.aiActions.generateSpeech` |
| A4  | WARNING    | -4        | APIs         | `api.generatedFiles.list` wrong module path — Convex uses underscored file name for module path    | Change to `api.generated_files.list` (and all other `generated_files` references)                  |
| W1  | CRITICAL   | -4        | Wiring       | Removing `@convex-dev/agent` without updating `convex/convex.config.ts` causes build failure       | Add step to Task 13: update `convex.config.ts` to remove `agent` import/usage                      |
| W2  | WARNING    | -4        | Wiring       | Dual tool definition patterns (betaZodTool + raw Anthropic.Tool) — redundant and inconsistent      | Pick one pattern; recommend betaZodTool exclusively since toolRunner is the primary execution model |
| R1  | WARNING    | -4        | Architecture | `src/lib/agent/schemas/` violates VSA — `src/lib/` doesn't exist in project structure              | Move to `src/features/builder/lib/schemas/` or `src/shared/schemas/`                               |
| D1  | WARNING    | -4        | Dependencies | Plan claims `@anthropic-ai/sdk` is "already installed as a transitive dependency" — it is NOT      | Add explicit `npm install @anthropic-ai/sdk` step (already partially addressed in Task 6 Step 1)   |
| L1  | WARNING    | -4        | Logic        | `sessions.ts` references `internal.pipeline.executeStep` before `pipeline.ts` exists (Tasks 2→6)   | Stub `pipeline.ts` with empty `executeStep` in Task 2, or comment out scheduler call until Task 6  |

---

## Correction Manifest (MANDATORY — one entry per issue)

### P1 — `builder/page.tsx` already exists

**Plan says:** Task 11 Step 4: "Create" `src/app/(app)/builder/page.tsx`

**Codebase has:** File already exists at `src/app/(app)/builder/page.tsx` (along with `error.tsx` and a `layout.tsx` in the `(app)` route group)

**Correction:** Change "Create" to "Modify" — the existing file imports from `builder-v2`; update import to point to the new `src/features/builder/` components instead.

**Affected plan locations:** Task 11, Step 4

---

### A1 — `betaZodTool` wrong import path

**Plan says:** `import { betaZodTool } from "@anthropic-ai/sdk/resources/beta/messages";` (Task 5, Step 1)

**Codebase has:** N/A (new code). Verified via Context7: the correct import path is `@anthropic-ai/sdk/helpers/beta/zod`.

**Correction:** Replace with:
```typescript
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
```

**Affected plan locations:** Task 5 Step 1 (`convex/pipeline_tools.ts` code block)

---

### A2 — `internal.knowledge.searchInternal` hallucinated

**Plan says:** `await ctx.runAction(internal.knowledge.searchInternal, input)` in `pipeline_tools.ts` and `internal.knowledge.searchInternal` in the spec's `generateBlueprint` function

**Codebase has:** `convex/knowledge/search.ts` exports `searchKnowledgeAction` as an `internalAction`. Module path in Convex: `internal.knowledge.search.searchKnowledgeAction`.

**Correction:** Replace all occurrences:
```typescript
// Before (hallucinated)
await ctx.runAction(internal.knowledge.searchInternal, { query, category });
// After (correct)
await ctx.runAction(internal.knowledge.search.searchKnowledgeAction, { query, category });
```

**Affected plan locations:** Task 5 Step 1 (`search_knowledge` tool run function), Task 6 Step 3 (`generateBlueprint` handler), spec Section 5

---

### A3 — `internal.aiActions.generateImageInternal` and `generateSpeechInternal` hallucinated

**Plan says:** `await ctx.runAction(internal.aiActions.generateImageInternal, input)` and `internal.aiActions.generateSpeechInternal` in `pipeline_tools.ts`

**Codebase has:** `convex/aiActions.ts` exports `generateImage` and `generateSpeech` as **public** `action`s (not `internalAction`). They are accessed via `api.aiActions.generateImage` or `anyApi.aiActions.generateImage`.

**Correction:** Replace with:
```typescript
import { anyApi } from "convex/server";

// In generate_image tool:
return await ctx.runAction(anyApi.aiActions.generateImage, { label: input.label, category: input.category ?? "general" });

// In generate_speech tool:
return await ctx.runAction(anyApi.aiActions.generateSpeech, { text: input.text, voiceId: input.voiceId ?? "default" });
```
Note: `generateSpeech` requires `voiceId` as a required arg (not optional) per current implementation. The tool input schema should match.

**Affected plan locations:** Task 5 Step 1 (`pipeline_tools.ts`), spec Section 5 `executeToolCall`

---

### A4 — `api.generatedFiles` wrong Convex module path

**Plan says:** `api.generatedFiles.list` and `api.generatedFiles.getByPath` in hooks (`src/features/builder/hooks/use-session.ts`)

**Codebase has:** The plan creates `convex/generated_files.ts`. Convex derives the module path from the file name with underscores: `generated_files`, not camelCase `generatedFiles`.

**Correction:** Replace all occurrences in hooks and any other references:
```typescript
// Before
useQuery(api.generatedFiles.list, ...)
// After
useQuery(api.generated_files.list, ...)
```

**Affected plan locations:** Task 10 Step 1 (`use-session.ts`), spec Section 5 "Event Delivery"

---

### W1 — `convex.config.ts` not updated when removing `@convex-dev/agent`

**Plan says:** Task 13 Step 3: `npm uninstall @convex-dev/agent @ai-sdk/anthropic @assistant-ui/react`

**Codebase has:** `convex/convex.config.ts` currently imports and uses `@convex-dev/agent`:
```typescript
import agent from "@convex-dev/agent/convex.config";
import rag from "@convex-dev/rag/convex.config";
const app = defineApp();
app.use(agent);
app.use(rag);
```
Removing the package without updating this file will cause a build error.

**Correction:** Add a step before the `npm uninstall` in Task 13:
```
Update convex/convex.config.ts to remove agent import and usage:
```typescript
import rag from "@convex-dev/rag/convex.config";
import { defineApp } from "convex/server";
const app = defineApp();
app.use(rag);
export default app;
```

**Affected plan locations:** Task 13 Steps 1-3

---

### W2 — Dual tool definition patterns

**Plan says:** Task 5 creates both `betaZodTool`-based tools via `createPipelineTools()` AND raw `Anthropic.Tool` JSON Schema objects (`searchKnowledgeTool`, `selectTemplateTool`, `generateImageTool`, `generateSpeechTool`) in the same file.

**Codebase has:** N/A (new code).

**Correction:** Consolidate on `betaZodTool` exclusively since `toolRunner()` is the primary execution model. Remove the raw `Anthropic.Tool` definitions and the manual `executeToolCall` dispatcher. The spec's `generateBlueprint` function in Section 5 uses the old manual tool loop pattern — update it to use `toolRunner` consistently.

**Affected plan locations:** Task 5 Steps 1-2, spec Section 5 `generateBlueprint` function

---

### R1 — VSA violation: `src/lib/agent/schemas/`

**Plan says:** Task 4: Create `src/lib/agent/schemas/index.ts`

**Codebase has:** No `src/lib/` directory exists. The project uses VSA: `src/core/` (universal), `src/shared/` (3+ consumers), `src/features/{name}/` (domain slices).

**Correction:** Move schemas to `src/features/builder/lib/schemas/index.ts` since they're specific to the builder feature. If later needed by 3+ features, promote to `src/shared/schemas/`.

Update imports in:
- `src/features/builder/hooks/use-session.ts`
- `convex/pipeline_tools.ts` (if importing schemas for validation — currently schemas aren't imported by Convex code, but verify)

**Affected plan locations:** Task 4 (all steps), Task 5 (if cross-referencing schemas)

---

### D1 — `@anthropic-ai/sdk` not installed

**Plan says:** Spec Section 5: "v0.80.0 already installed as a transitive dependency"

**Codebase has:** Not in `package.json` dependencies or devDependencies. Not present in `node_modules/@anthropic-ai/sdk`.

**Correction:** The plan partially addresses this in Task 6 Step 1 (`npm install @anthropic-ai/sdk`). However, the spec's claim is factually wrong and could mislead someone reading the spec first. Update the spec to remove the "already installed" claim. The install step should also be called out in the plan summary and in `docs/architecture/dependencies.md`.

**Affected plan locations:** Task 6 Step 1 (install step exists but spec contradicts it)

---

### L1 — Dependency ordering: `sessions.ts` → `pipeline.ts`

**Plan says:** Task 2 creates `sessions.ts` with `updateState` that calls `ctx.scheduler.runAfter(0, internal.pipeline.executeStep, ...)`. Task 6 (Phase 3) creates `pipeline.ts`.

**Codebase has:** N/A (new code). Between Tasks 2 and 6, `internal.pipeline.executeStep` doesn't exist. `npx convex dev` will fail because the import from `_generated/api` references a nonexistent function.

**Correction:** Add a stub at the start of Task 2:
```typescript
// convex/pipeline.ts — stub, fleshed out in Task 6
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const executeStep = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async () => {
    // Stub — implemented in Phase 3
    throw new Error("Pipeline not yet implemented");
  },
});
```
This allows `sessions.ts` to reference `internal.pipeline.executeStep` without build errors.

**Affected plan locations:** Task 2 (add stub step before Step 1)

---

## Wiring Audit (MANDATORY)

| New Module                            | Wired Into                          | How                                               | Status                 |
| ------------------------------------- | ----------------------------------- | ------------------------------------------------- | ---------------------- |
| `convex/sessions.ts`                  | API routes, frontend hooks          | `api.sessions.*` called from routes + `useQuery`   | OK                     |
| `convex/messages.ts`                  | Pipeline actions, frontend hooks    | `internal.*` from pipeline, `api.*` from hooks     | OK                     |
| `convex/agent_context.ts`             | Pipeline actions                    | `internal.agent_context.*` from pipeline           | OK                     |
| `convex/blueprints.ts`               | Pipeline, API route, frontend hooks | `internal.*` from pipeline, `api.*` from frontend  | OK                     |
| `convex/phases.ts`                    | Pipeline actions, frontend hooks    | `internal.*` from pipeline, `api.*` from hooks     | OK                     |
| `convex/generated_files.ts`          | Pipeline actions, frontend hooks    | `internal.*` from pipeline, `api.*` from hooks     | PARTIAL (A4: wrong module path in hooks) |
| `convex/versions.ts`                  | Pipeline actions, frontend hooks    | `internal.*` from pipeline, `api.*` from hooks     | OK                     |
| `convex/apps.ts`                      | Replaces `tools.ts`                 | Same API surface, renamed                          | OK                     |
| `convex/app_state.ts`                 | Replaces `tool_state.ts`            | Same API surface, renamed                          | OK                     |
| `convex/pipeline.ts`                  | Convex scheduler from `sessions.ts` | `internal.pipeline.executeStep`                    | PARTIAL (L1: stub needed) |
| `convex/pipeline_tools.ts`           | Imported by `pipeline.ts`           | Direct import                                      | PARTIAL (A1, A2, A3: wrong refs) |
| `convex/pipeline_prompts.ts`         | Imported by `pipeline.ts`           | Direct import                                      | OK                     |
| `convex/e2b.ts`                       | Called from `pipeline.ts`           | Direct import in deploying/validating handlers     | OK                     |
| `src/features/builder/hooks/use-session.ts` | Builder components             | React hooks called in UI components                | PARTIAL (A4: wrong module path) |
| `src/features/builder/components/*`   | Builder page                        | Imported by `builder-page.tsx`                     | OK                     |
| `src/app/api/agent/*/route.ts`        | Next.js App Router                  | File-based routing                                 | OK                     |
| `src/lib/agent/schemas/index.ts`      | Validation in pipeline + tests      | Import from components                              | PARTIAL (R1: wrong directory) |

---

## Completeness Checklist (MANDATORY)

| #   | Check             | Item                                              | Status | Notes                                                          |
| --- | ----------------- | ------------------------------------------------- | ------ | -------------------------------------------------------------- |
| 1   | Schema changes    | `npx convex dev` step after schema modifications? | ✓      | Task 1 Step 3 explicitly calls `npx convex dev --once`         |
| 2   | Convex functions  | All new functions exported?                       | ✓      | All functions use named exports                                |
| 3   | Bus events        | New events have listeners registered?             | N/A    | No bus events — uses Convex scheduler                          |
| 4   | Dashboard routes  | New pages have sidebar entries?                   | N/A    | No dashboard in this project                                   |
| 5   | Trigger.dev tasks | Deployment step mentioned?                        | N/A    | No Trigger.dev tasks                                           |
| 6   | Barrel exports    | New public APIs in slice `index.ts`?              | ✗      | No barrel `index.ts` for `src/features/builder/` mentioned     |
| 7   | npm packages      | `npm install` step for new deps?                  | ✓      | Task 6 Step 1 for `@anthropic-ai/sdk`                          |
| 8   | Environment vars  | New env vars documented?                          | ✓      | `ANTHROPIC_API_KEY` in Convex env vars (Task 6 Step 1)         |
| 9   | Convex imports    | API routes use path aliases?                      | ✗      | Task 9 uses relative: `../../../../convex/_generated/api` — should use path alias `convex/_generated/api` |
| 10  | ESM compliance    | All local imports use `.js` extensions?           | N/A    | Convex + Next.js handle module resolution — no `.js` needed    |
| 11  | Test files        | Tests planned alongside implementation?           | ✓      | Tasks 2, 3, 4 all have test-first steps                        |

---

## Dependency Verification (MANDATORY)

| Package                  | Required By           | Installed? | Version  | API Verified?                        | Notes                                           |
| ------------------------ | --------------------- | ---------- | -------- | ------------------------------------ | ------------------------------------------------ |
| `@anthropic-ai/sdk`     | `convex/pipeline.ts`  | NO         | N/A      | Context7 — CORRECT (toolRunner, betaZodTool) | Must add via `npm install` — NOT a transitive dep |
| `@e2b/code-interpreter` | `convex/e2b.ts`       | YES        | ^2.4.0   | Context7 — CORRECT (Sandbox.create)  | API signature confirmed                          |
| `convex`                 | All Convex modules    | YES        | ^1.34.0  | Codebase read                        | OK                                               |
| `convex-test`            | Tests                 | YES        | ^0.0.43  | Codebase read                        | OK                                               |
| `zod`                    | Schemas               | YES        | ^4.3.6   | N/A                                  | Plan uses Zod v3/v4 compatible API; verify betaZodTool compat |
| `@convex-dev/rag`        | Knowledge search      | YES        | ^0.7.2   | Codebase read                        | Stays after refactor                             |
| `@convex-dev/agent`      | To be REMOVED         | YES        | ^0.6.1   | N/A                                  | Removal requires `convex.config.ts` update (W1)  |

---

## API Spot-Checks (MANDATORY when 3+ external library calls)

| Library              | API Used in Plan                                    | Verified Via    | Correct? | Notes                                                              |
| -------------------- | --------------------------------------------------- | --------------- | -------- | ------------------------------------------------------------------ |
| `@anthropic-ai/sdk`  | `betaZodTool()` from `helpers/beta/zod`             | Context7        | YES      | Plan has WRONG import path (A1) but API itself is correct          |
| `@anthropic-ai/sdk`  | `client.beta.messages.toolRunner({ max_iterations })` | Context7      | YES      | Returns final message directly; `runUntilDone()` also available    |
| `@anthropic-ai/sdk`  | `new Anthropic()` auto-reads `ANTHROPIC_API_KEY`    | Context7        | YES      | Env var name correct                                               |
| `@e2b/code-interpreter` | `Sandbox.create(templateId, opts)`               | Context7        | YES      | Accepts string template + opts object                              |
| `@e2b/code-interpreter` | `sandbox.files.write(path, content)`             | Codebase read   | YES      | Existing `e2b.ts` uses same pattern                                |
| `@e2b/code-interpreter` | `sandbox.commands.run(cmd, { cwd })`             | Codebase read   | YES      | Existing `e2b.ts` uses same pattern                                |
| `convex`             | `ConvexHTTPClient` from `convex/browser`             | Codebase read   | YES      | Correct import path                                                |
| `convex`             | `ctx.scheduler.runAfter(0, internal.*, args)`        | Codebase read   | YES      | Standard Convex scheduler pattern                                  |
| `convex-test`        | `convexTest(schema)` + `t.mutation(internal.*, args)` | Codebase read  | YES      | convex-test supports calling internal functions                    |

---

## Reuse Opportunities (IF APPLICABLE)

| Existing Code                          | Location                                   | Replaces Plan Code In         | Replacement Code                                                                  |
| -------------------------------------- | ------------------------------------------ | ----------------------------- | --------------------------------------------------------------------------------- |
| E2B sandbox logic (create, write, HMR) | `src/features/builder-v2/lib/e2b.ts`       | `convex/e2b.ts`               | Port directly; existing code handles `sanitizeForVite`, `ensureViteRunning`, path resolution |
| `getSandboxUrl` helper                  | `src/features/builder-v2/lib/e2b.ts:10`    | `convex/e2b.ts` URL logic     | Reuse the same `https://${host}` pattern                                          |
| `tools.ts` CRUD patterns               | `convex/tools.ts`                          | `convex/apps.ts`              | Copy and rename — plan already suggests this                                      |
| Share slug generation                   | `convex/tools.ts:52-56`                    | `convex/apps.ts`              | Reuse the random slug generator                                                   |

---

## Over-Engineering Flags (IF APPLICABLE)

| Location                             | Pattern                                                          | Recommendation                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 4 therapy E2B templates              | Plan defines 4 templates but only `vite-therapy` exists           | Start with `vite-therapy` only; add others when proven needed — the TODO comment is sufficient  |
| Agent context compaction             | Token count tracking + summarization at 100k tokens               | Defer compaction to Phase 2; start with simple message append — therapy sessions are short      |
| Version restore with redeploy        | `versions.ts` restore mutation copies files + redeploys           | Defer restore to post-MVP; version listing + viewing is sufficient initially                    |

---

## Verified Correct (MANDATORY)

- **State machine design** — 11 states with clear transitions, blocking gates for blueprint approval, and auto-advance via Convex scheduler. Verified against Convex `ctx.scheduler.runAfter` API.
- **Convex action + `"use node;"` separation** — `pipeline.ts` and `e2b.ts` correctly use `"use node;"` for Node.js API access (Anthropic SDK, E2B SDK). CRUD modules correctly omit it.
- **Schema design** — New tables (sessions, messages, blueprints, phases, files, versions) have appropriate indexes matching query patterns. Foreign keys use `v.id("tableName")`.
- **ConvexHTTPClient in API routes** — Correctly uses public `api.*` functions, not `internal.*`. The `startBuild` mutation pattern correctly wraps internal scheduling.
- **E2B file paths** — Plan uses `/home/user/app/${file.filePath}` matching the existing `e2b.ts` convention and CLAUDE.md gotcha about E2B path resolution.
- **Test-first approach** — Tasks 2, 3, and 4 write tests before implementation, following TDD.
- **`convex-test` usage** — Tests correctly use `convexTest(schema)` and can call both `api.*` and `internal.*` functions.

---
