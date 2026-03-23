# Wheel Detector Report

## Summary

- **Scanned:** 23 directories, 182 source files (excluding tests and generated code)
- **Candidates found:** 7
- **High confidence replacements:** 2
- **Medium confidence replacements:** 3
- **Low confidence replacements:** 2
- **Estimated maintenance savings:** Replacing the high-confidence candidates would eliminate ~125 lines of hand-rolled infrastructure code and reduce edge-case risk in retry logic and concurrency control. The medium-confidence candidates represent another ~125 lines that could be simplified but offer less clear-cut ROI.

---

## High Confidence

### Retry/Backoff: Custom exponential backoff with transient error detection

**File:** `src/shared/retry.ts:1-63` (63 lines)
**What it does:** Implements exponential backoff retry with configurable max attempts, delay, multiplier, and delay cap. Includes a hand-rolled `isTransientError()` that string-matches ~10 error patterns (502, 503, ECONNRESET, 429, etc.).
**Confidence:** High
**Migration difficulty:** Easy

**Suggested library:** [`p-retry`](https://www.npmjs.com/package/p-retry) (npm: ~25M weekly downloads, 989 stars)

- Handles exponential backoff, jitter, abort signals, custom retry conditions
- Built-in support for non-retryable errors via `AbortError`
- Zero dependencies, ~1.2KB

**Why replace:**

- Current `isTransientError()` uses brittle string matching (e.g., checking for "502" anywhere in the error message string). `p-retry` lets you define a proper `shouldRetry` predicate that receives the actual error object.
- No jitter in the current implementation -- concurrent retries from multiple callers can thundering-herd the same endpoint.
- No abort signal support -- long retry chains cannot be cancelled.
- 12 call sites across `src/convex-sync/`, `src/daemon/`, `src/health/`, `src/integrations/` -- widely used infrastructure.

**Next step:** `npm install p-retry` and replace `withRetry()` calls. The API is nearly identical: `pRetry(() => fn(), { retries: 3, onFailedAttempt })`. A wrapper function preserving the current `RetryOptions` shape could ease migration.

---

### Concurrency Control: Hand-rolled counting semaphore with FIFO queue

**File:** `src/agent/concurrency.ts:1-111` (87 lines of logic)
**What it does:** `AgentQueue` class implements a counting semaphore with FIFO queuing for limiting concurrent agent executions. `queuedRunAgent()` wraps `runAgent` with acquire/release.
**Confidence:** High
**Migration difficulty:** Easy

**Suggested library:** [`p-limit`](https://www.npmjs.com/package/p-limit) (npm: ~170M weekly downloads, 2000+ stars) or [`p-queue`](https://www.npmjs.com/package/p-queue) (npm: ~4M weekly downloads, 3300+ stars)

- `p-limit` is a direct replacement for the counting semaphore pattern -- `const limit = pLimit(3); limit(() => fn())`.
- `p-queue` adds priority queuing, pause/resume, event emitters, and introspection if needed later.
- Both are zero-dependency, battle-tested, and TypeScript-native.

**Why replace:**

- The hand-rolled implementation lacks features the codebase may eventually need: priority queuing (urgent agent requests), pause/resume, timeout per queued item, event hooks.
- `p-limit` is 1.5KB and would reduce `concurrency.ts` to ~15 lines (just the `queuedRunAgent` wrapper).
- Only 1 call site (`src/daemon/daemon.ts`), making migration trivial.

**Next step:** `npm install p-limit` and replace `AgentQueue` with `const agentLimit = pLimit(maxConcurrent)`. The `queuedRunAgent` wrapper becomes `return agentLimit(() => runAgent(request, deps))`.

---

## Medium Confidence

### Atomic File Write: Custom write-rename-unlink pattern

**File:** `src/core/atomic-write.ts:1-41` (41 lines)
**What it does:** Implements atomic file writes via write-to-temp-then-rename, with both async and sync variants. Uses `randomUUID()` for temp file naming and has cleanup-on-error logic.
**Confidence:** Medium
**Migration difficulty:** Easy

**Suggested library:** [`write-file-atomic`](https://www.npmjs.com/package/write-file-atomic) (npm/GitHub official package, widely used)

- Handles the same write-temp-rename pattern with additional features: concurrent write serialization to the same file, configurable ownership (uid/gid), murmurhash-based temp naming.
- Maintained by the npm team.
- Provides both async and sync APIs.

**Why replace:**

- The current implementation is correct and simple (41 lines). The library adds concurrent-write serialization, which matters if multiple parts of the daemon write to the same file simultaneously.
- 6 call sites across `src/agent/`, `src/task-management/`, `src/vault/`, `src/health/`.

**Why it's Medium, not High:**

- The hand-rolled version is short, correct, and well-tested. The library adds a dependency for a problem that's already solved adequately. The main benefit is concurrent write serialization, which may not be needed.

**Next step:** `npm install write-file-atomic` and replace imports. API is nearly identical.

---

### Deep Merge: Custom recursive object merge

**File:** `src/core/config.ts:249-268` (20 lines)
**What it does:** Recursively merges plain objects, with source values overriding target values. Arrays are replaced (not merged). Used only for config merging.
**Confidence:** Medium
**Migration difficulty:** Easy

**Suggested library:** [`deepmerge`](https://www.npmjs.com/package/deepmerge) (npm: ~30M weekly downloads, 2700+ stars) or built-in `structuredClone` + spread

- `deepmerge` handles circular references, arrays (with customizable merge strategies), symbols, and non-enumerable properties.
- Zero dependencies, 1.1KB.

**Why replace:**

- Current implementation doesn't handle edge cases: circular references would cause infinite recursion, `Date`/`RegExp`/`Map`/`Set` objects are treated as plain objects.
- Only 1 call site (`mergeConfig`), so the risk is low but so is migration effort.

**Why it's Medium, not High:**

- The config merge only deals with simple JSON-like objects, so the edge cases don't apply in practice. The 20-line implementation is readable and correct for its specific use case. Replacing it would add a dependency for marginal benefit.

**Next step:** `npm install deepmerge` and replace `deepMerge()` with `deepmerge(target, source)`.

---

### Markdown-to-Telegram-HTML: Custom converter with placeholder-based code block handling

**File:** `src/channels/telegram.ts:52-117` (65 lines)
**What it does:** Converts markdown to Telegram-compatible HTML. Extracts code blocks/inline code into placeholders, escapes HTML entities, converts bold/italic/strikethrough/headings/links/checkboxes, then restores code blocks.
**Confidence:** Medium
**Migration difficulty:** Moderate

**Suggested library:** [`telegramify-markdown`](https://www.npmjs.com/package/telegramify-markdown) (based on Unified/Remark, proper AST parsing)

- Uses a proper Markdown AST parser (Remark) rather than regex, which handles nested formatting, edge cases in code blocks, and malformed markdown more reliably.
- Actively maintained (last published 3 months ago).

**Why replace:**

- Regex-based markdown conversion is fragile. Edge cases like nested bold/italic, code blocks containing markdown syntax, or unusual whitespace patterns can produce incorrect output.
- The placeholder approach (using `\x00` null bytes) is clever but brittle -- if markdown content ever contains null bytes, it breaks.

**Why it's Medium, not High:**

- The available Telegram markdown libraries are relatively niche (524 weekly downloads for `telegram-format`, small community for `telegramify-markdown`). The existing code works well enough for the grammY bot's use case.
- Migration requires testing every formatting scenario since Telegram's HTML subset has strict rules.
- 3 internal call sites in `telegram.ts` itself -- contained blast radius.

**Next step:** Evaluate `telegramify-markdown` in a test script against real agent output samples before committing to the swap.

---

## Low Confidence

### Debounce: Inline setTimeout-based debounce pattern (duplicated)

**Files:**

- `src/skills/watcher.ts:9-36` (~10 lines of debounce logic)
- `src/task-management/template-watcher.ts:8-25` (~10 lines of debounce logic)

**What it does:** Module-level `debounceTimer` variable with `clearTimeout`/`setTimeout` pattern for debouncing file system events.
**Confidence:** Low
**Migration difficulty:** Easy

**Suggested library:** Built-in one-liner pattern, or `lodash.debounce` / `throttle-debounce` if more features needed.

**Why it's Low:**

- Each instance is only ~10 lines -- well below the 20-line threshold. The pattern is simple, correct, and idiomatic Node.js.
- The duplication is a minor code smell (could extract a shared `debouncedWatch` utility), but not worth adding a dependency for.

**Assessment:** Leave as-is. If more watchers are added, extract a shared utility function rather than adding a library.

---

### Git Operations: Shell-exec wrappers for git/gh CLI

**Files:**

- `src/coding/git-automator.ts:1-73` (73 lines)
- `src/coding/workspace.ts:1-87` (87 lines)

**What it does:** Wraps `execSync` calls to git and gh CLI commands for commit, push, PR creation, worktree management, and repo cloning.
**Confidence:** Low
**Migration difficulty:** Hard

**Suggested library:** [`simple-git`](https://www.npmjs.com/package/simple-git) (npm: ~6.4M weekly downloads, 3800+ stars)

- Provides a fluent, promise-based API for git operations without shell spawning.
- Handles error parsing, progress events, and concurrent operations safely.
- TypeScript types included.

**Why it's Low:**

- The current code deliberately uses `gh` CLI (GitHub's official tool) for PR creation, which `simple-git` doesn't cover -- you'd still need `execSync` for `gh pr create`.
- Shell-based git commands are transparent and debuggable. `simple-git` adds an abstraction layer that obscures what's happening.
- The worktree management code parses `--porcelain` output, which is stable and designed for scripting.
- Migration would be Hard: 2 files, multiple callers, behavioral differences in error handling, and partial coverage (still need `gh` CLI).

**Assessment:** Not worth replacing. The shell approach is appropriate here -- it's transparent, uses stable CLI interfaces, and the `gh` dependency makes a full library swap impractical.

---

## Already Installed But Unused

No cases found where an installed dependency could replace hand-rolled code. The project makes good use of its existing dependencies:

- `cron-parser` is properly used in `src/local-scheduler/scheduler.ts` and `src/task-management/recurring-helpers.ts`
- `gray-matter` is used in `src/task-management/template-sync.ts`
- `yaml` is used throughout for YAML parsing (chunker, skills parser)
- `pino` is used via `src/core/logger.ts` wrapper (not hand-rolled logging)
- `zod` is used for validation
- `chokidar` is used for file watching (the watchers use Node's built-in `fs.watch` for simpler cases)

---

## Skipped

The following were examined but excluded from findings:

| Item                                                        | Why Excluded                                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/bus.ts` (typed event bus)                         | Thin 3-line wrapper over Node's `EventEmitter` with TypeScript generics. Not reimplemented -- just typed.                       |
| `src/rate-limit/limiter.ts` (token rate limiter)            | Domain-specific business logic (session/daily token budget tracking). Not a general rate limiter.                               |
| `src/vault/chunker.ts` (markdown chunker)                   | RAG-specific chunking with custom frontmatter extraction and semantic splitting. No general library covers this exact use case. |
| `src/agent/mcp-schema-proxy.ts` (JSON schema sanitizer)     | Claude API-specific workaround for oneOf/allOf/anyOf rejection. Deeply domain-specific.                                         |
| `src/daemon/execution-lock.ts` (simple boolean lock)        | 35-line module with daily counter. Too simple to warrant a library.                                                             |
| `src/coding/ralph-loop.ts` (iterative coding loop)          | Domain-specific orchestration logic, not a general retry pattern.                                                               |
| `src/health/heartbeat.ts` (heartbeat writer)                | Application-specific health reporting, not a general heartbeat library use case.                                                |
| `src/shared/telegram-notify.ts` (Telegram API call)         | 37-line single-function wrapper around a fetch POST. Not worth a library.                                                       |
| `src/skills/parser.ts` (SKILL.md parser)                    | Domain-specific frontmatter parser for a custom file format.                                                                    |
| `src/task-management/vault-sync.ts:sanitizeFilename()`      | 1-line regex, not a wheel.                                                                                                      |
| `src/channels/telegram.ts:escapeHtml()`                     | 1-line function, standard pattern.                                                                                              |
| `src/daemon/sensors.ts` vs `src/task-management/sensors.ts` | Near-duplicate files (copy-paste), but domain-specific business logic, not a library candidate. Worth deduplicating internally. |
| `src/scheduling/trigger-server.ts:tokenMatches()`           | Duplicated from `src/scheduling/routes/utils.ts`. Internal dedup issue, not a library candidate.                                |
