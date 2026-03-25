# Plan: Refactor E2B Sandbox → WebContainer for Live Preview

## Context

Bridges currently uses E2B remote sandboxes for live preview of AI-generated therapy tools. E2B adds per-minute cost ($0.16/min), network latency, and a server-side dependency (`convex/e2b.ts`). WebContainers run Node.js entirely in the browser via WASM — zero cost, zero latency, offline-capable. bolt.diy proved this pattern works for AI code generation + live preview at scale.

**A prior agent session already completed ~90% of this refactor** in the worktree `.claude/worktrees/implement-webcontainer`. This plan covers the remaining cleanup + verification + merge.

## What's Already Done (in worktree)

| Layer | File | Status |
|-------|------|--------|
| Singleton | `src/features/builder/hooks/webcontainer.ts` | ✅ New — boots with `coep: "credentialless"`, SSR guard |
| React hook | `src/features/builder/hooks/use-webcontainer.ts` | ✅ New — lifecycle (boot→install→ready), `writeFile()`, StrictMode guard |
| Template files | `src/features/builder/hooks/webcontainer-files.ts` | ✅ New — full Vite+React 19+Tailwind v4+therapy-ui `FileSystemTree` |
| Re-exports | `src/features/builder/lib/webcontainer.ts`, `lib/webcontainer-files.ts` | ✅ New — re-export from hooks |
| Preview panel | `src/features/builder/components/preview-panel.tsx` | ✅ Modified — uses `wcStatus` prop, iframe shows WebContainer localhost URL |
| Streaming hook | `src/features/builder/hooks/use-streaming.ts` | ✅ Modified — `onFileComplete` callback pipes SSE file events to WebContainer |
| Generate route | `src/app/api/generate/route.ts` | ✅ Modified — all E2B calls removed, SSE sends files for client-side write |
| Sessions backend | `convex/sessions.ts` | ✅ Modified — `setLive` takes only `sessionId`, `setSandbox` deprecated |
| Schema | `convex/schema.ts` | ✅ Modified — `sandboxId`/`previewUrl` fields deprecated (kept for data compat) |
| COOP/COEP headers | `next.config.ts` | ✅ Modified — `Cross-Origin-Embedder-Policy: credentialless`, `Cross-Origin-Opener-Policy: same-origin` |
| Agent prompt | `src/features/builder/lib/agent-prompt.ts` | ✅ Modified — references WebContainer environment |
| E2B deleted | `convex/e2b.ts` | ✅ Deleted |
| Sandbox route deleted | `src/app/api/sandbox/route.ts` | ✅ Deleted |
| Package.json | `package.json` | ✅ Modified — `@webcontainer/api: ^1.6.1` added |
| Tests | 5 new test files, 3 modified test files | ✅ Written |

## Remaining Work

### Task 1: Fix `schema.test.ts` — stale `setLive` args
**File:** `convex/__tests__/schema.test.ts:40-44`

The test calls `api.sessions.setLive` with `{ sessionId, sandboxId, previewUrl }` — but the new `setLive` only accepts `{ sessionId }`. Update to match the new API:

```ts
// Before (broken):
await t.mutation(api.sessions.setLive, {
  sessionId: id,
  sandboxId: "sb_abc123",
  previewUrl: "https://abc.e2b.app",
});

// After (fixed):
await t.mutation(api.sessions.setLive, { sessionId: id });
```

### Task 2: Clean up dead SSE types
**File:** `src/features/builder/lib/sse-types.ts`

Remove `"sandbox_ready"` from `SSEEventType` union and delete the `SandboxReadyEvent` interface. These events are never emitted by the new generate route.

### Task 3: Remove E2B dependency from package.json
**File:** `package.json`

Remove `"@e2b/code-interpreter"` from `dependencies`. The `e2b` SDK is no longer used anywhere.

### Task 4: Regenerate Convex types
**Command:** `npx convex dev --once` (or `npx convex codegen`)

`convex/_generated/api.d.ts` still imports `e2b.ts` which was deleted. Regenerating types will fix this.

### Task 5: Verify — run full test suite + typecheck + lint
```bash
npx vitest run                    # All tests pass
npx tsc --noEmit                  # No type errors
npx next lint                     # No lint errors
```

**Known issue to watch for:** `convex-test` scheduler limitation — `ctx.scheduler.runAfter()` throws "Write outside of transaction" warnings (not failures). This is a framework bug, not our bug.

### Task 6: Commit all changes
Stage all modified, new, and deleted files. Single commit:
```
refactor: replace E2B sandbox with in-browser WebContainer for live preview

- Boot WebContainer (WASM Node.js) client-side instead of E2B remote VMs
- Preview URL from server-ready event, no longer stored in Convex
- Streaming hook pipes SSE file_complete events directly to WebContainer fs
- Delete convex/e2b.ts, src/app/api/sandbox/route.ts
- Add COOP/COEP headers in next.config.ts for SharedArrayBuffer
- Remove @e2b/code-interpreter dependency, add @webcontainer/api
```

### Task 7: Merge worktree branch to main

## File Summary

| Action | File |
|--------|------|
| **Edit** | `convex/__tests__/schema.test.ts` — fix `setLive` args |
| **Edit** | `src/features/builder/lib/sse-types.ts` — remove `sandbox_ready` |
| **Edit** | `package.json` — remove `@e2b/code-interpreter` |
| **Regenerate** | `convex/_generated/api.d.ts` — `npx convex codegen` |
| **Verify** | Run tests, typecheck, lint |
| **Commit + Merge** | All worktree changes → main |

## Verification

1. `npx vitest run` — all tests green (including new WebContainer tests)
2. `npx tsc --noEmit` — no type errors
3. `npm run dev` — app boots, WebContainer initializes (check browser console for "server-ready")
4. Enter a therapy prompt → SSE streams files → WebContainer hot-reloads → iframe shows live app
5. No E2B API calls in Network tab
6. Mobile/Desktop toggle in preview panel works

## Execution Strategy

Using **Subagent-Driven Development** with fresh subagent per task. Tasks 1-3 are simple edits (haiku-tier). Task 4 is a shell command. Task 5 is verification. Tasks 6-7 are git operations.
