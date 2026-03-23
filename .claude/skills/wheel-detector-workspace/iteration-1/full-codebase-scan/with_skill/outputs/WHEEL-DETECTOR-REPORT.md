# Wheel Detector Report

## Summary

- **Scanned:** 23 directories, 182 source files (excluding tests, generated code, node_modules)
- **Candidates found:** 9
- **High confidence replacements:** 3
- **Medium confidence replacements:** 4
- **Low confidence replacements:** 2
- **Estimated maintenance savings:** Replacing the high-confidence items would eliminate ~250 lines of hand-rolled infrastructure code and improve edge-case handling for retry logic, concurrency control, and atomic file writes.

---

## High Confidence

### Retry/Backoff: Custom exponential retry with transient error detection

**File:** `src/shared/retry.ts:1-63` (45 lines of logic)
**What it does:** Exponential backoff retry for async operations with a hard-coded transient error classifier (string-matching on HTTP status codes, DNS errors, socket errors).
**Confidence:** High
**Migration difficulty:** Easy

**Suggested library:** [`p-retry`](https://www.npmjs.com/package/p-retry) (npm: ~24.9M weekly downloads, 989 stars)

- Handles exponential backoff, jitter, abort signals, custom retry conditions
- Built-in support for non-retryable errors via `AbortError`
- Zero dependencies, ESM-native, TypeScript types included
- 1.2KB gzipped

**Why replace:**

- Current `isTransientError()` relies on brittle string matching (`message.includes("502")`) -- easily misclassifies errors
- No jitter support (all retries at identical intervals = thundering herd risk)
- No abort signal support for cancellation
- `p-retry` provides a `shouldRetry` callback for proper error classification
- The hand-rolled code has 10+ string-match conditions that would need ongoing maintenance as new transient error patterns emerge

**Call sites:** Used in `src/health/health-push.ts`, `src/daemon/vault-observer.ts`, `src/convex-sync/sessions.ts`, `src/convex-sync/memories.ts`, `src/convex-sync/messages.ts`, `src/convex-sync/costs.ts`, `src/convex-sync/goals.ts`, `src/convex-sync/active-context.ts`, `src/convex-sync/proactive-actions.ts`, `src/convex-sync/token-usage.ts`

**Next step:** `npm install p-retry` and replace `withRetry()` usage across ~12 call sites. The `isTransientError` logic maps directly to p-retry's `shouldRetry` option.

---

### Concurrency Control: Hand-rolled counting semaphore with FIFO queue

**File:** `src/agent/concurrency.ts:1-111` (75 lines of logic)
**What it does:** `AgentQueue` class -- a counting semaphore with FIFO waiting queue that limits concurrent `runAgent()` executions. Includes per-channel observability and a `queuedRunAgent` wrapper.
**Confidence:** High
**Migration difficulty:** Moderate

**Suggested library:** [`p-limit`](https://www.npmjs.com/package/p-limit) (npm: ~170M weekly downloads, part of sindresorhus ecosystem) or [`p-queue`](https://www.npmjs.com/package/p-queue) (npm: ~7.5M weekly downloads, 3.5k stars)

- `p-limit`: Simple concurrency limiter, zero deps, ESM, TypeScript. Provides `activeCount` and `pendingCount`.
- `p-queue`: Full-featured promise queue with concurrency control, priority, pause/resume, events, timeout support.

**Why replace:**

- `AgentQueue` reimplements the core acquire/release semaphore pattern that `p-limit` handles natively
- The hand-rolled code lacks: priority support, timeout for queued items, pause/resume, error handling for stuck slots
- `p-queue` additionally offers `onEmpty()`, `onIdle()` events that would improve daemon shutdown behavior
- The per-channel `pendingCount(channel)` filter is the only custom logic -- easily layered on top

**Call sites:** Instantiated in `src/daemon/daemon.ts`, used via `queuedRunAgent()` wrapper

**Next step:** `npm install p-queue` and wrap with a thin adapter that adds the channel-filtered `pendingCount`. Eliminates the manual acquire/release pattern.

---

### Atomic File Write: Custom write-temp-then-rename implementation

**File:** `src/core/atomic-write.ts:1-41` (30 lines of logic)
**What it does:** Writes to a temp file (random UUID suffix), then renames atomically. Both async and sync versions. Cleans up temp file on error.
**Confidence:** High
**Migration difficulty:** Easy

**Suggested library:** [`write-file-atomic`](https://www.npmjs.com/package/write-file-atomic) (npm: maintained by the npm team, 1598 dependents, v7.0.0)

- Same write-to-temp-then-rename pattern
- Additionally handles: ownership (uid/gid), mode preservation, fsync option, signal handling
- Maintained by the npm core team -- battle-tested in npm itself
- Includes sync version (`writeFileAtomicSync`)

**Why replace:**

- Current implementation doesn't call `fsync` before rename -- on crash, the temp file could be empty/truncated (data loss risk on some filesystems)
- No file mode/permission preservation
- `write-file-atomic` handles race conditions between multiple concurrent writers to the same file (uses murmurhash-based temp names scoped to PID + invocation count)

**Call sites:** Used in `src/health/heartbeat.ts` and potentially other vault write paths

**Next step:** `npm install write-file-atomic` and replace both `atomicWriteFile` and `atomicWriteFileSync`.

---

## Medium Confidence

### Git Operations: Raw execSync git commands

**Files:** `src/coding/git-automator.ts:1-73` (50 lines), `src/coding/workspace.ts:1-87` (65 lines)
**What it does:** `git-automator.ts` wraps `git add`, `git commit`, `git push`, `gh pr create` via `execSync`. `workspace.ts` manages cloning, worktrees (`git worktree add/remove/list`), and fetching via `execSync`.
**Confidence:** Medium
**Migration difficulty:** Moderate

**Suggested library:** [`simple-git`](https://www.npmjs.com/package/simple-git) (npm: ~3.5M weekly downloads, 3.2k stars)

- Async-first API with chaining and Promise support
- Built-in TypeScript types
- Supports: clone, fetch, add, commit, push, worktree operations, log, diff, status
- AbortController support, progress events, timeout handling
- Proper error parsing (distinguishes git errors from spawn failures)

**Why replace:**

- `execSync` blocks the event loop -- problematic in a daemon process that handles concurrent requests
- No error parsing: `execSync` throws with raw stderr, making it hard to distinguish "nothing to commit" from actual failures (current code string-matches `err.message`)
- `simple-git` provides structured error objects and async execution
- Worktree listing output parsing in `workspace.ts:73-83` is fragile (manual line-by-line parsing of `--porcelain` output)

**Why Medium (not High):**

- The `gh pr create` CLI command isn't covered by `simple-git` -- would still need a shell call or the `octokit` SDK
- The code is relatively straightforward and not frequently changed
- Switching from sync to async requires refactoring callers

**Next step:** `npm install simple-git` and migrate git operations. Keep `gh` CLI calls as-is (or add `@octokit/rest` separately).

---

### HTTP Server: Raw node:http with manual routing

**File:** `src/scheduling/trigger-server.ts:361-540` (~150 lines of logic in `TriggerServer` class)
**What it does:** Full HTTP server using `node:http` with manual `if/else` URL routing, manual body parsing with size limits, manual JSON response writing, HMAC auth.
**Confidence:** Medium
**Migration difficulty:** Hard

**Suggested library:** [`fastify`](https://fastify.dev/) (npm: ~9M weekly downloads, 33k stars) or [`hono`](https://hono.dev/) (npm: ~3M weekly downloads, 22k stars)

- Fastify: Schema-based validation, plugin ecosystem, structured error handling, built-in body parsing
- Hono: Ultralight (14KB), Web Standards based, works on Node.js/edge/Deno

**Why replace:**

- Manual `if/else` URL routing is fragile and growing (currently ~15 route branches)
- Manual body parsing with size-limit enforcement reimplements what frameworks handle natively
- No request logging, no middleware pipeline, no structured error responses
- Adding new routes requires touching the monolithic `handleRequest` method

**Why Medium (not High):**

- The server works and is well-tested
- Migration would touch many route handler files
- The HMAC auth pattern would need to become middleware
- The current code is already modular (route handlers in separate files)

**Next step:** If refactoring, Fastify is the better fit (Node.js focused, plugin architecture). Hono if edge deployment is planned.

---

### Concurrency Limiter: Polling-based slot management in Orchestrator

**File:** `src/minions/orchestrator.ts:197-200` (part of larger class, ~4 lines of polling logic)
**What it does:** `while (this.activeMinions >= MAX_CONCURRENT_MINIONS) { await new Promise(r => setTimeout(r, 5000)); }` -- busy-wait polling loop for concurrency control.
**Confidence:** Medium
**Migration difficulty:** Easy

**Suggested library:** [`p-limit`](https://www.npmjs.com/package/p-limit) or [`p-queue`](https://www.npmjs.com/package/p-queue) (same as above)

**Why replace:**

- Polling every 5 seconds wastes cycles and adds up to 5s latency when a slot opens
- A proper semaphore/queue would hand off the slot immediately when released
- This is a textbook use case for `p-limit` or `p-queue`

**Why Medium:** The polling loop is only 4 lines -- the fix is trivial but the benefit is also modest given low task volume.

**Next step:** Wrap `runMinion` calls with `p-limit(MAX_CONCURRENT_MINIONS)` to eliminate the polling loop entirely.

---

### Topological Sort: Hand-rolled DAG ordering

**File:** `src/minions/runner.ts:13-40` (20 lines of logic)
**What it does:** Depth-first topological sort of blueprint steps by dependency edges. Also includes `getReadySteps()` for wave-based parallel execution.
**Confidence:** Medium
**Migration difficulty:** Easy

**Suggested library:** [`toposort`](https://www.npmjs.com/package/toposort) (npm: ~12M weekly downloads) or built-in approach with modern graph libraries

**Why replace:**

- Current implementation doesn't detect cycles -- infinite recursion on circular dependencies
- `toposort` detects cycles and throws clear errors
- Small but tricky algorithm where bugs are subtle

**Why Medium:** The implementation is short and correct for the acyclic case. The main benefit is cycle detection.

**Next step:** `npm install toposort` and replace the `topologicalSort` function. Keep `getReadySteps` as-is (it's domain-specific wave logic).

---

## Low Confidence

### Typed Event Bus: TypedEventEmitter wrapper over node:events

**File:** `src/core/bus.ts:1-88` (30 lines of logic, 55 lines of type definitions)
**What it does:** Creates a typed wrapper interface over Node.js `EventEmitter` with `BusEvents` type map for compile-time event name/argument checking.
**Confidence:** Low
**Migration difficulty:** Moderate

**Considered libraries:** [`eventemitter3`](https://www.npmjs.com/package/eventemitter3) (72M weekly downloads, 3.5k stars), [`mitt`](https://github.com/developit/mitt) (19M downloads, 11.8k stars), [`typed-emitter`](https://www.npmjs.com/package/typed-emitter)

**Why Low:**

- The current implementation is a thin type-cast over Node.js `EventEmitter` -- essentially zero runtime code
- It works correctly and the type safety is already achieved
- Switching to `mitt` or `eventemitter3` would require changing the type pattern across 26+ files
- Node.js `EventEmitter` has no bundle size cost in a Node.js-only project
- The hand-rolled typing approach (`TypedEventEmitter<Events>`) is actually a well-known, minimal pattern

**Skip recommendation:** Keep as-is. The maintenance burden is near zero.

---

### Markdown Chunker: Custom markdown splitting for RAG

**File:** `src/vault/chunker.ts:1-212` (140 lines of logic)
**What it does:** Splits markdown files by heading boundaries, handles oversized sections by splitting at paragraph boundaries, extracts YAML frontmatter, builds enriched chunk preambles with metadata.
**Confidence:** Low
**Migration difficulty:** Hard

**Considered libraries:** [`langchain/text_splitter`](https://js.langchain.com/) (MarkdownTextSplitter), [`llama-index`](https://www.llamaindex.ai/) chunkers

**Why Low:**

- The chunker is deeply tailored to the Obsidian vault format (frontmatter extraction, type/tags/aliases, file path preambles)
- Generic markdown splitters would lose the semantic enrichment (chunk preambles with metadata)
- The frontmatter parsing already uses the `yaml` library -- it's not hand-rolling YAML parsing
- LangChain's MarkdownTextSplitter is heavier and less configurable for this specific use case
- Migration would require significant refactoring of the RAG pipeline

**Skip recommendation:** Keep as-is. This is domain-specific enough that a library wouldn't reduce maintenance.

---

## Already Installed But Unused

### `cron-parser` -- Already used correctly

The project uses `cron-parser` v5 in `src/task-management/recurring-helpers.ts` for cron expression parsing. No hand-rolled cron logic was found. Good.

### `zod` -- Underused for runtime validation

`zod` v4 is installed but the codebase frequently uses manual type guards and `typeof` checks for runtime validation (e.g., in `src/memory/graph-extract.ts:122-158`, `src/memory/commitments.ts:47-68`). These JSON parsing + validation blocks could use `z.object({...}).safeParse()` instead of manual `.filter()` + type assertions.

**Files with manual JSON validation that could use zod:**

- `src/memory/graph-extract.ts:110-165` -- `parseGraphExtractionResponse` and `parseConflictResolutionResponse`
- `src/memory/commitments.ts:47-68` -- `parseCommitmentResponse`
- `src/scheduling/trigger-server.ts:78-100` -- `parseNotificationBlocks`

This isn't a "reinvented wheel" per se, but it's a missed opportunity to use an already-installed dependency for cleaner, more maintainable validation.

### `pino` -- Already used correctly

Logging uses `pino` throughout via `createLogger()`. No hand-rolled structured logging.

---

## Skipped

| Item                                                            | Reason                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/rate-limit/limiter.ts` (token rate limiter)                | Domain-specific business logic (session + daily token budgets). Not a general rate limiter. |
| `src/daemon/execution-lock.ts` (simple boolean lock)            | 35 lines, trivially simple. A library would be overkill.                                    |
| `src/task-management/task-scheduling.ts` (task priority scorer) | Domain-specific scheduling logic with custom scoring weights. Not replaceable by a library. |
| `src/task-management/deadline-escalation.ts`                    | Domain-specific deadline alerting. Pure business logic.                                     |
| `src/coding/executor.ts` (Claude CLI spawner)                   | Specific to Claude CLI's `--stream-json` output format. No general library applies.         |
| `src/coding/ralph-loop.ts` (iterative code-fix loop)            | Domain-specific orchestration pattern. Not a general retry problem.                         |
| `src/skills/parser.ts` (SKILL.md frontmatter parser)            | Uses `yaml` library for YAML parsing. The rest is domain-specific field extraction.         |
| `src/vault/watcher-hub.ts` (chokidar subscriber hub)            | Thin pub/sub layer over chokidar. Already uses `chokidar` for the actual watching.          |
| `src/agent/context.ts` (context assembly)                       | Pure domain logic (vault file reading + prompt construction).                               |
| `src/health/heartbeat.ts` (heartbeat writer)                    | Domain-specific health status serialization.                                                |
| `src/daemon/sensor-loop.ts` (periodic sensor sweep)             | Simple `setInterval` wrapper with domain-specific sensor logic.                             |
| `src/memory/commitments.ts:70-78` (`toKebabCase`)               | 8-line utility. Library (`slugify`, `change-case`) would be overkill.                       |

---

## Priority Ranking

If you want to tackle these in order of impact:

1. **`p-retry`** (High, Easy) -- Biggest risk reduction. Fixes real edge-case gaps (no jitter, brittle error classification). ~12 call sites but straightforward swap.
2. **`write-file-atomic`** (High, Easy) -- Fixes potential data loss on crash (missing fsync). Drop-in replacement.
3. **`p-queue`** (High, Moderate) -- Replaces `AgentQueue` and fixes `Orchestrator` polling loop. Two birds, one stone.
4. **`simple-git`** (Medium, Moderate) -- Unblocks the event loop in git operations. Worth doing when next touching `src/coding/`.
5. **zod validation** (Already installed) -- Use zod for JSON response parsing in memory/commitments modules. Incremental improvement.
6. **`toposort`** (Medium, Easy) -- Quick win for cycle detection safety.
7. **HTTP framework** (Medium, Hard) -- Only worth doing during a major refactor of the trigger server.
