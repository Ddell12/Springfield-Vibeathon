# Plan Verification Report

> **Plan:** `2026-03-24-bridges-app-builder-pivot.md` | **Score:** 62/100 | **Verdict:** Fix & re-verify
>
> The plan has strong structure and correct Convex patterns, but the Vercel AI SDK v6 API usage is critically wrong in 3 places — `useChat` import, `generateObject`, and `toDataStreamResponse` all don't exist in the current SDK version. These must be fixed before execution.

---

## Scorecard (MANDATORY)

| Category       | Max     | Score   | Deductions                          |
| -------------- | ------- | ------- | ----------------------------------- |
| Paths & Lines  | 20      | 20      | none                                |
| APIs & Imports | 25      | 1       | A1(-8), A2(-8), A3(-4), A4(-4)      |
| Wiring         | 15      | 11      | W1(-4)                              |
| Architecture   | 15      | 15      | none                                |
| Dependencies   | 10      | 6       | D1(-4)                              |
| Logic          | 15      | 9       | L1(-4), L2(-2)                      |
| **Total**      | **100** | **62**  |                                     |

---

## Issues (MANDATORY)

| ID  | Severity | Deduction | Category | Issue (one line) | Fix (one line) |
| --- | -------- | --------- | -------- | ---------------- | -------------- |
| A1  | CRITICAL | -8        | APIs     | `useChat` imported from `"ai/react"` — does not exist in AI SDK v6 | Change to `import { useChat } from "@ai-sdk/react"` and add `npm install @ai-sdk/react` |
| A2  | CRITICAL | -8        | APIs     | `generateObject()` does not exist in AI SDK v6 | Replace with `generateText()` + `Output.object({ schema })` from `"ai"` |
| A3  | WARNING  | -4        | APIs     | `toDataStreamResponse()` does not exist in AI SDK v6 | Replace with `toUIMessageStreamResponse()` and add `convertToModelMessages()` in the route |
| A4  | WARNING  | -4        | APIs     | `@ai-sdk/react` package not in `package.json` | Add `npm install @ai-sdk/react` step to Task 1 or Task 5 |
| W1  | WARNING  | -4        | Wiring   | `welcome-screen.tsx` listed in File Map but no task creates it; templates have no selection UI | Add template picker to Task 10 or remove from File Map |
| D1  | WARNING  | -4        | Deps     | Missing `npm install @ai-sdk/react` step | Add to Task 5 Step 1 |
| L1  | WARNING  | -4        | Logic    | Task 11 reskin re-introduces `border-r border-surface-variant` that was removed in Task 7 per No-Line Rule | Use tonal bg shift in Task 11 code, matching Task 7's pattern |
| L2  | SUGGESTION | -2      | Logic    | `convex/templates/queries.ts` queries `tools` table with `isTemplate:true`, not the new `therapyTemplates` table | Add a `listTherapyTemplates` query to `convex/projects.ts` or update existing query |

---

## Correction Manifest (MANDATORY — one entry per issue)

### A1 — `useChat` import path wrong

**Plan says:** `import { useChat } from "ai/react"` (Task 6, Step 3)

**Codebase has:** `ai@^6.0.137` installed. The `ai` package v6 is server-focused and does not export `useChat` from `ai/react`. The correct package is `@ai-sdk/react` per https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat.

**Correction:**
```typescript
// Replace in Task 6 Step 3:
import { useChat } from "@ai-sdk/react";
```

**Affected plan locations:** Task 6 Step 3, Task 5 Step 4 (verification note)

---

### A2 — `generateObject()` does not exist

**Plan says:** `import { generateObject } from "ai"` and `const { object } = await generateObject({ model, schema, system, messages })` (Task 5, Steps 2-3)

**Codebase has:** AI SDK v6 uses `generateText()` with `Output.object()` for structured generation. See https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data.

**Correction:**
```typescript
// Replace in Task 5 Step 3 (src/app/api/chat/generate/route.ts):
import { generateText, Output, type CoreMessage } from "ai";
import { modelClient } from "@/features/builder-v2/lib/models";
import { fragmentSchema } from "@/features/builder-v2/lib/schema";
import { getCodeGenPrompt } from "@/features/builder-v2/lib/prompt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { messages, ragContext, currentCode } = (await req.json()) as {
    messages: CoreMessage[];
    ragContext?: string;
    currentCode?: string;
  };

  const systemPrompt = currentCode
    ? `${getCodeGenPrompt(ragContext)}\n\n## Current Code (modify this based on the user's request)\n\`\`\`\n${currentCode}\n\`\`\``
    : getCodeGenPrompt(ragContext);

  const { output } = await generateText({
    model: modelClient,
    output: Output.object({ schema: fragmentSchema }),
    system: systemPrompt,
    messages,
  });

  return NextResponse.json({ fragment: output });
}
```

**Affected plan locations:** Task 5 Steps 2-3

---

### A3 — `toDataStreamResponse()` does not exist

**Plan says:** `return result.toDataStreamResponse()` (Task 5, Step 2)

**Codebase has:** AI SDK v6 uses `toUIMessageStreamResponse()` for server routes that work with `useChat`. Also requires `convertToModelMessages()` to transform incoming `UIMessage[]` to model format.

**Correction:**
```typescript
// Replace in Task 5 Step 2 (src/app/api/chat/route.ts):
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { modelClient } from "@/features/builder-v2/lib/models";
import { getInterviewPrompt } from "@/features/builder-v2/lib/prompt";

export async function POST(req: Request) {
  const { messages, ragContext } = (await req.json()) as {
    messages: UIMessage[];
    ragContext?: string;
  };

  const result = streamText({
    model: modelClient,
    system: getInterviewPrompt(ragContext),
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
```

**Affected plan locations:** Task 5 Step 2

---

### A4 — `@ai-sdk/react` not installed

**Plan says:** Uses `import { useChat } from "@ai-sdk/react"` (after A1 fix) but never installs the package.

**Codebase has:** `@ai-sdk/anthropic` and `@ai-sdk/google` installed, but NOT `@ai-sdk/react`.

**Correction:** Add to Task 5 Step 1 or create a new step:
```bash
npm install @ai-sdk/react
```

**Affected plan locations:** Task 5 (add install step), Task 1 Step 3 (or bundle with E2B install)

---

### W1 — `welcome-screen.tsx` in File Map but no task creates it

**Plan says:** File Map lists `src/features/builder-v2/components/welcome-screen.tsx` as "Guided onboarding — template picker + AI greeting"

**Codebase has:** No task in the plan creates this file. Templates are seeded (Task 10) but there's no UI to select them.

**Correction:** Either:
1. Remove `welcome-screen.tsx` from the File Map (simplest — template selection is a stretch goal), or
2. Add a step to Task 10 that creates a simple template picker component and wires it into builder-layout.

**Affected plan locations:** File Map, optionally Task 10

---

### D1 — Missing `npm install @ai-sdk/react`

Same as A4 — listed separately per category scoring rules.

**Correction:** Add `npm install @ai-sdk/react` to Task 5.

**Affected plan locations:** Task 5

---

### L1 — Task 11 re-introduces border violation

**Plan says:** Task 11 Step 2 code contains `border-r border-surface-variant` in the builder layout reskin.

**Codebase has:** Task 7 already removed this per the No-Line Rule. Task 11's reskin code snippet re-adds it.

**Correction:** Replace Task 11 Step 2 layout code with:
```typescript
<div className="w-[420px] shrink-0 bg-surface">
```
(matching Task 7's pattern — tonal bg shift, no border)

**Affected plan locations:** Task 11 Step 2

---

### L2 — `therapyTemplates` table has no query

**Plan says:** Creates `therapyTemplates` table (Task 8) and seeds it (Task 10) but never adds a query to read from it.

**Codebase has:** `convex/templates/queries.ts` queries the `tools` table with `isTemplate: true`, not the new `therapyTemplates` table.

**Correction:** Add to Task 10:
```typescript
// In convex/projects.ts or convex/templates/queries.ts:
export const listTherapyTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("therapyTemplates").withIndex("by_category").collect();
  },
});
```

**Affected plan locations:** Task 10, Task 8 (convex/projects.ts)

---

## Wiring Audit (MANDATORY)

| New Module | Wired Into | How | Status |
| ---------- | ---------- | --- | ------ |
| `src/features/builder-v2/lib/schema.ts` | `src/app/api/sandbox/route.ts`, `src/app/api/chat/generate/route.ts`, `chat.tsx` | import type | OK |
| `src/features/builder-v2/lib/e2b.ts` | `src/app/api/sandbox/route.ts` | import { createSandbox, getSandboxPreviewUrl } | OK |
| `src/features/builder-v2/lib/prompt.ts` | `src/app/api/chat/route.ts`, `src/app/api/chat/generate/route.ts` | import { getInterviewPrompt, getCodeGenPrompt } | OK |
| `src/features/builder-v2/lib/models.ts` | `src/app/api/chat/route.ts`, `src/app/api/chat/generate/route.ts` | import { modelClient } | OK |
| `src/features/builder-v2/components/chat.tsx` | `builder-layout.tsx` | import { Chat } | OK |
| `src/features/builder-v2/components/preview.tsx` | `builder-layout.tsx` | import { Preview } | OK |
| `src/features/builder-v2/components/builder-layout.tsx` | `src/app/(app)/builder/page.tsx` | import { BuilderLayout } | OK |
| `src/features/builder-v2/components/welcome-screen.tsx` | NOWHERE | Not created by any task | MISSING (W1) |
| `src/features/builder-v2/components/share-dialog.tsx` | NOWHERE | Not created by any task | MISSING |
| `convex/projects.ts` | Not wired to frontend yet | CRUD functions defined but not called from builder UI | PARTIAL |
| `convex/knowledge/http.ts` | `convex/http.ts` | route handler registered | OK |
| `convex/http.ts` | Convex runtime | auto-detected as httpRouter | OK |

---

## Completeness Checklist (MANDATORY)

| #   | Check             | Item                                              | Status | Notes |
| --- | ----------------- | ------------------------------------------------- | ------ | ----- |
| 1   | Schema changes    | `npx convex dev` step after schema modifications? | ✓      | Task 8 Step 3 |
| 2   | Convex functions  | All new functions exported?                       | ✓      | All use named exports |
| 3   | Bus events        | New events have listeners registered?             | N/A    | No bus events |
| 4   | Dashboard routes  | New pages have sidebar entries?                   | N/A    | No new routes |
| 5   | Trigger.dev tasks | Deployment step mentioned?                        | N/A    | No Trigger.dev |
| 6   | Barrel exports    | New public APIs in slice `index.ts`?              | N/A    | No barrel files in this project |
| 7   | npm packages      | `npm install` step for new deps?                  | ✗      | Missing `@ai-sdk/react` install (D1) |
| 8   | Environment vars  | New env vars documented?                          | ✓      | `E2B_API_KEY` mentioned in Task 1 |
| 9   | Convex imports    | Dashboard uses path aliases?                      | N/A    | No dashboard |
| 10  | ESM compliance    | All local imports use `.js` extensions?           | N/A    | Next.js/TypeScript project — `.js` not required |
| 11  | Test files        | Tests planned alongside implementation?           | ✗      | No tests planned (acceptable for 3-day vibeathon) |

---

## Dependency Verification (MANDATORY)

| Package | Required By | Installed? | Version | API Verified? | Notes |
| ------- | ----------- | ---------- | ------- | ------------- | ----- |
| `ai` | Tasks 5, 6 | Yes | ^6.0.137 | WebFetch (ai-sdk.dev) | `streamText`, `generateText`, `Output.object` confirmed; `generateObject` REMOVED |
| `@ai-sdk/anthropic` | Task 5 | Yes | ^3.0.63 | Codebase read | `createAnthropic` export confirmed |
| `@ai-sdk/react` | Task 6 | **No** | N/A | WebFetch (ai-sdk.dev) | `useChat` hook lives here, NOT in `ai/react` |
| `@e2b/code-interpreter` | Tasks 1-3 | **No** | N/A | Not verified | Plan correctly defers to runtime verification |
| `zod` | Task 1 | Yes | ^4.3.6 | Codebase read | Zod 3/4 compat still needs runtime check with AI SDK |
| `convex` | Task 8 | Yes | ^1.34.0 | Codebase read | `httpAction`, `httpRouter` confirmed available |

---

## API Spot-Checks (MANDATORY)

| Library | API Used in Plan | Verified Via | Correct? | Notes |
| ------- | ---------------- | ------------ | -------- | ----- |
| AI SDK | `streamText({ model, system, messages })` | WebFetch ai-sdk.dev | ✓ | Correct API |
| AI SDK | `generateObject({ model, schema, system, messages })` | WebFetch ai-sdk.dev | ✗ | Does not exist; use `generateText` + `Output.object` |
| AI SDK | `result.toDataStreamResponse()` | WebFetch ai-sdk.dev | ✗ | Does not exist; use `toUIMessageStreamResponse()` |
| AI SDK | `useChat({ api, onFinish })` | WebFetch ai-sdk.dev | ✓ | Correct API but wrong import path |
| AI SDK | `convertToModelMessages(messages)` | WebFetch ai-sdk.dev | ✓ | Required for useChat server route |
| Convex | `httpAction(async (ctx, request) => {...})` | Codebase read | ✓ | Available in _generated/server |
| Convex | `httpRouter()` + `http.route({path, method, handler})` | Codebase read | ✓ | Available in convex/server |
| Convex | `ctx.runAction(internal.knowledge.search.searchKnowledgeAction, args)` | Codebase read | ✓ | Correct internal reference |

---

## Over-Engineering Flags (IF APPLICABLE)

| Location | Pattern | Recommendation |
| -------- | ------- | -------------- |
| Task 12 pre-warm | Boots entire sandbox on page load, costs E2B credits even if user leaves | Consider pre-warming only after 2+ interview exchanges (signals intent to build) |

---

## Verified Correct (MANDATORY)

- **VSA file placement** — All new files correctly placed in `src/features/builder-v2/` per VSA conventions. Verified no `src/lib/` directory created.
- **Convex schema additions** — `projects` and `therapyTemplates` tables use correct validators, indexes, and conventions. No `createdAt` redundancy.
- **Convex internal/api namespacing** — `searchKnowledgeAction` correctly referenced as `internal.knowledge.search.searchKnowledgeAction` (not `api.*`).
- **Task dependency ordering** — Task 4 (prompt) correctly precedes Task 5 (chat route that imports prompt). Task 1 → 2 → 3 dependency chain is correct.
- **No-Line Rule** — Task 7 builder layout correctly uses tonal bg shifts instead of borders.
- **Template seed data** — Token Board and Behavior Tracker code in Task 10 are complete, self-contained React components that would run in E2B.
- **Convex HTTP routing** — `httpRouter` + `httpAction` pattern is correct for exposing RAG search to Next.js API routes.
- **Existing work preserved** — Plan correctly keeps `tools` table, `convex.config.ts` (agent + rag), and RAG knowledge base intact.
