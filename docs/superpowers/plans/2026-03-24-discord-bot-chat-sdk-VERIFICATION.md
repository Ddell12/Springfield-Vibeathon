# Plan Verification Report

> **Plan:** `2026-03-24-discord-bot-chat-sdk.md` | **Score:** 88/100 | **Verdict:** Needs fixes
>
> Solid plan with correct file paths, function signatures, and architecture. One blocking issue: missing Convex codegen step after schema/function changes. Three cautions around unverifiable Chat SDK APIs (package not yet installed).

---

## Scorecard (MANDATORY)

| Category       | Max     | Score   | Deductions                          |
| -------------- | ------- | ------- | ----------------------------------- |
| Paths & Lines  | 20      | 20      | none                                |
| APIs & Imports | 25      | 21      | A1(-4)                              |
| Wiring         | 15      | 15      | none                                |
| Architecture   | 15      | 15      | none                                |
| Dependencies   | 10      | 6       | D1(-4)                              |
| Logic          | 15      | 11      | L1(-4)                              |
| **Total**      | **100** | **88**  |                                     |

---

## Issues (MANDATORY)

| ID  | Severity   | Deduction | Category     | Issue (one line) | Fix (one line) |
| --- | ---------- | --------- | ------------ | ---------------- | -------------- |
| D1  | CRITICAL   | -4        | Dependencies | Missing `npx convex dev` codegen step after schema + function changes (Tasks 2 & 3) | Add codegen step after each schema/function modification, before running tests |
| A1  | WARNING    | -4        | APIs         | `result.fullStream` from `streamObject` is `AsyncIterableStream<ObjectStreamPart>`, not plain text — may not be compatible with Chat SDK `thread.post()` | Verify Chat SDK accepts this type; may need `result.textStream` instead, or pipe through a transform |
| L1  | WARNING    | -4        | Logic        | Chat SDK JSX exports (`Card`, `CardText`, `Image`, `Actions`, `LinkButton`) unverifiable until package installed | Add a verification step in Task 7 to confirm exact export names from installed package |
| S1  | SUGGESTION | 0         | Logic        | `bot.tsx` relative import `"../../../../convex/_generated/api"` is fragile — could use path alias | Use `@/` would require tsconfig change since convex/ is outside src/. Current approach is fine. |

---

## Correction Manifest (MANDATORY — one entry per issue)

### D1 — Missing Convex codegen step

**Plan says:** Task 2 Step 3 modifies schema, Step 4 adds mutation, Step 5 runs tests. Task 3 Step 3 adds query, Step 4 runs tests.

**Codebase has:** `convex-test` uses `convexTest(schema, modules)` with in-memory schema, but `api.projects.setDiscordMetadata` is a TypeScript import from `convex/_generated/api.d.ts` which requires codegen to update.

**Correction:** Insert after Task 2 Step 4 and after Task 3 Steps 3 & 7:

```bash
npx convex dev --typecheck=disable --once 2>/dev/null || npx convex codegen
```

**Affected plan locations:** Task 2 (between Steps 4 and 5), Task 3 (between Steps 3 and 4, between Steps 7 and 8)

### A1 — `fullStream` type compatibility with `thread.post()`

**Plan says:** `await thread.post(result.fullStream)` where `result` comes from `streamObject()`

**Codebase has:** `streamObject` returns `StreamObjectResult` whose `fullStream` is `AsyncIterableStream<ObjectStreamPart<PARTIAL>>` — typed object partials, not string chunks.

**Correction:** After installing Chat SDK (Task 1), verify `thread.post()` signature. If it requires `AsyncIterable<string>`, change to:

```typescript
await thread.post(result.textStream);
```

Or if `fullStream` works (as the Chat SDK docs suggest it accepts AI SDK streams), keep as-is.

**Affected plan locations:** Task 7 (bot.tsx lines 760, 848)

### L1 — Unverifiable Chat SDK JSX exports

**Plan says:** `import { Card, CardText, Image, Actions, LinkButton } from "chat"`

**Codebase has:** Package not installed — cannot verify export names.

**Correction:** After Task 1 (npm install), add a verification step:

```bash
node -e "const c = require('chat'); console.log(Object.keys(c).filter(k => /^[A-Z]/.test(k)).join(', '))"
```

If exports differ, update bot.tsx imports accordingly.

**Affected plan locations:** Task 7 (bot.tsx imports)

---

## Wiring Audit (MANDATORY)

| New Module | Wired Into | How | Status |
| ---------- | ---------- | --- | ------ |
| `src/features/discord/lib/bot.tsx` | webhook route + gateway route | `import { bot }` | OK |
| `src/features/discord/lib/convex-client.ts` | bot.tsx | `import { convex }` | OK |
| `src/features/builder-v2/lib/generate.ts` | route.ts + bot.tsx | `import { generateFragment }` | OK |
| `src/app/api/webhooks/[platform]/route.ts` | Next.js file-based routing | Auto-registered as POST handler | OK |
| `src/app/api/discord/gateway/route.ts` | Vercel cron (vercel.json) | Auto-registered as GET handler | OK |

---

## Completeness Checklist (MANDATORY)

| #   | Check             | Item                                              | Status | Notes |
| --- | ----------------- | ------------------------------------------------- | ------ | ----- |
| 1   | Schema changes    | `npx convex dev` step after schema modifications? | X      | Missing — D1 |
| 2   | Convex functions  | All new functions exported?                       | ✓      | All use named exports |
| 3   | Bus events        | New events have listeners registered?             | N/A    | No bus events |
| 4   | Dashboard routes  | New pages have sidebar entries?                   | N/A    | API routes only |
| 5   | Trigger.dev tasks | Deployment step mentioned?                        | N/A    | No Trigger.dev tasks |
| 6   | Barrel exports    | New public APIs in slice `index.ts`?              | N/A    | No barrel files in this project |
| 7   | npm packages      | `npm install` step for new deps?                  | ✓      | Task 1 |
| 8   | Environment vars  | New env vars documented?                          | ✓      | Task 10 + env table |
| 9   | Convex imports    | Dashboard uses path aliases?                      | N/A    | No dashboard |
| 10  | ESM compliance    | All local imports use `.js` extensions?           | N/A    | Next.js + bundler resolution — extensions not required |
| 11  | Test files        | Tests planned alongside implementation?           | ✓      | Tasks 2, 3, 4 have TDD |

---

## Dependency Verification (MANDATORY)

| Package | Required By | Installed? | Version | API Verified? | Notes |
| ------- | ----------- | ---------- | ------- | ------------- | ----- |
| `ai` | generate.ts | Yes | ^6.0.137 | Codebase read | `streamObject`, `fullStream`, `object`, `toTextStreamResponse` all present |
| `@ai-sdk/anthropic` | generate.ts | Yes | ^3.0.63 | Codebase read | `anthropic()` factory used correctly |
| `@e2b/code-interpreter` | bot.tsx | Yes | ^2.4.0 | Codebase read | `Sandbox`, `createSandbox`, `executeFragment` verified |
| `convex` | projects.ts | Yes | ^1.34.0 | Codebase read | `query`, `mutation`, `v` validators, `ConvexHttpClient` all present |
| `chat` | bot.tsx | No (Task 1) | ^4.21.0 | Not verified | Install before use — A1, L1 |
| `@chat-adapter/discord` | bot.tsx | No (Task 1) | ^4.21.0 | Not verified | Install before use |
| `@chat-adapter/state-redis` | bot.tsx | No (Task 1) | ^4.21.0 | Not verified | Install before use |
| `redis` | bot.tsx | No (Task 1) | ^5.11.0 | Not verified | Standard package |

---

## API Spot-Checks (MANDATORY when 3+ external library calls)

| Library | API Used in Plan | Verified Via | Correct? | Notes |
| ------- | ---------------- | ------------ | -------- | ----- |
| `ai` | `streamObject()` | Codebase (route.ts) | Yes | Same call pattern as existing code |
| `ai` | `result.fullStream` | Codebase + types | Yes | Property exists on `StreamObjectResult` |
| `ai` | `result.object` | Codebase + types | Yes | Promise of completed object |
| `@ai-sdk/anthropic` | `anthropic("claude-sonnet-4-20250514")` | Codebase (route.ts) | Yes | Same model string as existing |
| `@e2b/code-interpreter` | `createSandbox(fragment)` | Codebase (e2b.ts) | Yes | Returns `SandboxResult` |
| `@e2b/code-interpreter` | `executeFragment(sandboxId, fragment)` | Codebase (e2b.ts) | Yes | Returns `SandboxResult` |
| `convex` | `ConvexHttpClient` | Types | Yes | Exported from `convex/browser` |
| `convex` | `ctx.db.patch()` | Codebase (projects.ts) | Yes | Used in existing `update` mutation |
| `next/server` | `after()` | Next.js 16.2.1 docs | Yes | Available in Next.js 15+ |

---

## Reuse Opportunities (IF APPLICABLE)

No existing code to reuse — no Discord, Redis, or ConvexHttpClient usage found in the codebase.

---

## Over-Engineering Flags (IF APPLICABLE)

No over-engineering detected. The plan is appropriately scoped — thin adapter layer, reuses existing pipeline, minimal new code.

---

## Verified Correct (MANDATORY)

- **All 10 existing file paths verified** — schema.ts, projects.ts, route.ts, e2b.ts, schema.ts, prompt.ts, next.config.ts, projects.test.ts, vitest.config.ts, package.json all exist at claimed paths with claimed content
- **All 6 new file paths verified clean** — No collisions with existing files
- **Function signatures match** — `projects.create`, `projects.update`, `createSandbox`, `executeFragment`, `getCodeGenSystemPrompt` all match plan's usage exactly
- **Convex patterns correct** — `.withIndex()` used (not `.filter()`), compound index query order valid, named exports, `v` validators on all args
- **Import paths verified** — Relative imports from `src/features/discord/lib/` to `convex/_generated/api` (4 levels up) and `builder-v2/lib/` (2 levels up) are correct
- **VSA compliance** — Discord bot in `src/features/discord/`, shared generation in `src/features/builder-v2/lib/`, routes in `src/app/api/`
- **tsconfig.json compatible** — `"jsx": "react-jsx"` supports `@jsxImportSource` pragma needed for Chat SDK JSX cards
- **Test patterns match** — New tests follow existing `convexTest(schema, modules)` pattern with `describe`/`test` blocks
