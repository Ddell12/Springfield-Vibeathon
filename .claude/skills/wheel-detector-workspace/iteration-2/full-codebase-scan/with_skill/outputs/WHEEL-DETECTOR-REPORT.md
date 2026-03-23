# Wheel Detector Report

## Summary

- **Scanned:** 23 directories, 349 files (182 source + 167 test)
- **Candidates found:** 8
- **High confidence replacements:** 4
- **Already installed but unused:** 2
- **Estimated maintenance savings:** ~400 lines of hand-rolled code eliminated; 5+ frontmatter parser implementations consolidated to 1

## Already Installed But Unused

### Frontmatter Parsing: `gray-matter` installed but only used in 1 of 6 frontmatter-parsing locations

**Files:**

- `src/vault/vault-tasks.ts:31-79` (49 lines) -- hand-rolled line-by-line YAML key:value parser
- `src/vault/vault-tasks.ts:170-212` (42 lines) -- duplicate hand-rolled parser for recurring tasks
- `src/vault/vault-tasks.ts:290-308` (18 lines) -- third copy for project records
- `src/vault/chunker.ts:52-75` (24 lines) -- uses `yaml` package but not `gray-matter`
- `src/skills/parser.ts:27-63` (37 lines) -- uses `yaml` package but not `gray-matter`
- `src/task-management/vault-ingest.ts:23-49` (27 lines) -- uses `yaml` package but not `gray-matter`
- `src/task-management/template-sync.ts:4` -- **the only file that actually uses `gray-matter`**

**What it does:** Each location independently extracts YAML frontmatter from markdown files using `content.match(/^---\n([\s\S]*?)\n---/)` + either hand-rolled line-by-line key:value parsing or the `yaml` package's `parse()`.

**Confidence:** High
**Migration difficulty:** Easy

**Suggested library:** `gray-matter` (npm: 6.8M+ weekly downloads, 3.8k+ stars) -- **already installed**

- Handles YAML, JSON, TOML, and Coffee frontmatter formats
- Returns `{ data, content, matter, stringify() }` -- both parsed data and remaining content in one call
- Battle-tested by Gatsby, Astro, Eleventy, VitePress, and hundreds of other projects
- Handles edge cases the hand-rolled parsers miss (e.g., multiline YAML values, nested objects, arrays)

**Why replace:**

- `vault-tasks.ts` has a hand-rolled key:value parser that splits on `:` -- this silently breaks on YAML values containing colons (timestamps like `due: 2026-03-06T10:00:00`), multiline strings, nested objects, and arrays
- 3 nearly identical copies of the same fragile regex+split parser in `vault-tasks.ts` alone
- `gray-matter` is already in `package.json` and `node_modules` -- zero cost to use it
- Consolidating 6 parsers to use `gray-matter` eliminates ~150 lines of duplicated code

**Next step:** Replace all `content.match(/^---\n.../)` + manual parsing with `import matter from "gray-matter"; const { data, content } = matter(rawContent);`

---

### Duplicate YAML Libraries: both `yaml` and `js-yaml` installed

**Files:**

- `src/vault/chunker.ts:2` -- `import { parse as parseYaml } from "yaml"`
- `src/skills/parser.ts:2` -- `import { parse as parseYaml } from "yaml"`
- `src/task-management/vault-ingest.ts:1` -- `import { parse as parseYaml } from "yaml"`
- `src/minions/blueprint-parser.ts:1` -- `import yaml from "js-yaml"`

**What it does:** Two different YAML parsing libraries are installed and imported across the codebase. `yaml` (v2.8.2) is used in 3 files; `js-yaml` (v4.1.1) is used in 1 file.

**Confidence:** High
**Migration difficulty:** Easy

**Why replace:**

- Having two YAML libraries increases bundle size and cognitive overhead
- Both have the same core API: `parse(string) => object`
- `yaml` (the `yaml` package) is the more modern choice: spec-compliant YAML 1.2, ESM-native, actively maintained
- If all frontmatter parsing moves to `gray-matter` (which uses `js-yaml` internally), the standalone `yaml` import may become unnecessary too

**Next step:** Standardize on `gray-matter` for frontmatter + `yaml` for standalone YAML parsing, then remove `js-yaml` from `package.json`

---

## High Confidence

### Retry/Backoff: Hand-rolled retry with exponential backoff

**File:** `src/shared/retry.ts:1-63` (63 lines)
**What it does:** Custom `withRetry()` function with exponential backoff, max attempts, delay cap, and transient error detection (checks error message strings for HTTP status codes, network errors)
**Confidence:** High
**Migration difficulty:** Moderate

**Suggested library:** [`p-retry`](https://www.npmjs.com/package/p-retry) (npm: 13.6M weekly downloads, 850+ stars)

- Handles exponential backoff, jitter, abort signals, custom retry conditions
- Built-in `AbortError` for non-retryable errors (cleaner than string matching)
- Integrates with `node-retry` under the hood for battle-tested retry strategies
- TypeScript support, ESM-native, zero-dependency (2KB)

**Why replace:**

- Current `isTransientError()` checks error strings via `includes()` -- fragile, misses structured error objects
- No jitter support (all concurrent retries hit at the same time)
- No abort signal support
- No `onFailedAttempt` hook for logging/metrics
- `p-retry` handles all of this in 2KB

**Why keep (counterargument):** The current implementation is simple, well-tested, and the string-matching approach works for the specific error types encountered. Migration requires updating ~8 call sites across `convex-sync/` and `health/`.

**Next step:** `npm install p-retry` and create a thin wrapper that maps current `RetryOptions` to `p-retry` options

---

### Atomic File Writes: Hand-rolled write-temp-then-rename

**File:** `src/core/atomic-write.ts:1-41` (41 lines)
**What it does:** Two functions (`atomicWriteFile` async + `atomicWriteFileSync`) that write to a UUID-named `.tmp` file, then rename to the target path. Cleanup on error.
**Confidence:** High
**Migration difficulty:** Easy

**Suggested library:** [`write-file-atomic`](https://www.npmjs.com/package/write-file-atomic) (npm: 45.8M weekly downloads, maintained by npm org)

- Same write-temp-then-rename pattern, plus:
- Configurable ownership (uid/gid)
- Configurable file mode
- `chown` support for atomic ownership changes
- Signal-safe cleanup
- Used by npm itself

**Why replace:**

- Current implementation doesn't handle cross-device renames (different filesystems)
- No configurable file permissions
- `write-file-atomic` is maintained by the npm team and handles edge cases around temp file cleanup during crashes/signals

**Why keep (counterargument):** The current 41-line implementation is dead simple, easy to understand, and cross-device rename is unlikely in this project (vault and agent dir are on the same filesystem). The sync variant isn't available in `write-file-atomic`.

**Next step:** `npm install write-file-atomic` and replace `atomicWriteFile` -- keep `atomicWriteFileSync` as-is since the library doesn't offer a sync API

---

### Git Operations: Shell-exec git wrappers

**Files:**

- `src/coding/git-automator.ts:1-72` (72 lines) -- `commitAll`, `push`, `createPR`, `getHeadSha`
- `src/coding/workspace.ts:1-86` (86 lines) -- `ensureCloned`, `createWorktree`, `cleanupWorktree`, `listWorktrees`

**What it does:** Thin wrappers around `execSync("git ...")` for commit, push, clone, worktree management, and PR creation (via `gh` CLI)
**Confidence:** Medium
**Migration difficulty:** Moderate

**Suggested library:** [`simple-git`](https://www.npmjs.com/package/simple-git) (npm: 1.5M weekly downloads, 3.3k+ stars)

- Async API with promise chaining
- Built-in error handling and parsing of git output
- Supports all git commands including worktrees
- AbortController support for cancellation
- Progress events for long-running operations

**Why replace:**

- `execSync` blocks the event loop -- dangerous in a daemon with HTTP server and channel adapters running
- No error parsing: raw stderr becomes the error message
- `listWorktrees` manually parses `--porcelain` output (30 lines) -- `simple-git` does this natively
- `createPR` shells out to `gh` which is a separate concern from git operations

**Why keep (counterargument):** These are thin wrappers with minimal logic. `simple-git` wouldn't replace the `gh pr create` calls. The `execSync` usage is intentional for the coding pipeline which runs in isolation. Migrating 158 lines of working code adds a dependency for marginal benefit.

**Next step:** `npm install simple-git` and refactor `workspace.ts` first (biggest win: async worktree operations + parsed output)

---

## Medium Confidence

### Concurrency Control: Hand-rolled counting semaphore

**File:** `src/agent/concurrency.ts:1-111` (111 lines)
**What it does:** `AgentQueue` class -- a counting semaphore with FIFO queuing, per-channel observability, and a `queuedRunAgent` wrapper
**Confidence:** Medium
**Migration difficulty:** Moderate

**Suggested library:** [`p-limit`](https://www.npmjs.com/package/p-limit) (npm: 170M weekly downloads) or [`p-queue`](https://www.npmjs.com/package/p-queue) (npm: 5.8M weekly downloads)

- `p-limit` provides concurrency limiting with `activeCount` and `pendingCount`
- `p-queue` adds priority queuing, pause/resume, timeout, events, and concurrency control

**Why replace:**

- `p-limit` handles the core counting semaphore in ~50 lines of battle-tested code
- `p-queue` would also provide timeout and priority features useful for agent scheduling

**Why keep (counterargument):** The current implementation adds per-channel observability (`pendingCount(channel)`) which neither library provides natively. The `queuedRunAgent` wrapper is tightly coupled to the agent's type signatures. At 111 lines with good tests, the maintenance burden is low.

**Next step:** Only consider if adding features like priority queuing or timeout -- the current implementation is adequate

---

### Topological Sort: Hand-rolled DAG ordering

**Files:**

- `src/minions/runner.ts:13-32` (20 lines) -- `topologicalSort()`
- `src/minions/runner.ts:34-40` (7 lines) -- `getReadySteps()`
- `src/minions/blueprint-parser.ts:48-70` (23 lines) -- cycle detection via DFS

**What it does:** Topological sort of blueprint steps by dependencies, ready-step detection for wave-based parallel execution, and circular dependency detection
**Confidence:** Low
**Migration difficulty:** Moderate

**Suggested library:** [`toposort`](https://www.npmjs.com/package/toposort) (npm: 4.9M weekly downloads, 500+ stars)

- Sorts directed acyclic graphs
- Throws on cycles (built-in cycle detection)
- Tiny package, well-tested

**Why replace:**

- `toposort` provides both sorting and cycle detection in one call
- Would eliminate ~50 lines of graph traversal code

**Why keep (counterargument):** The hand-rolled implementations are small, well-tested, and tightly coupled to the `BlueprintStep` type. The `getReadySteps()` function provides wave-based scheduling which `toposort` doesn't handle. Adopting the library would still require custom code for ready-step detection.

**Next step:** Only worth doing as part of a larger minions refactor -- the current code works fine

---

## Internal Duplication

### Frontmatter Parsing (Critical -- 6 separate implementations)

This is the most significant internal duplication in the codebase:

| File                                        | Method                                   | Lines |
| ------------------------------------------- | ---------------------------------------- | ----- |
| `src/vault/vault-tasks.ts:31-79`            | Hand-rolled line-by-line key:value split | 49    |
| `src/vault/vault-tasks.ts:170-212`          | Same hand-rolled parser (copy-pasted)    | 42    |
| `src/vault/vault-tasks.ts:290-308`          | Same hand-rolled parser (copy-pasted)    | 18    |
| `src/vault/chunker.ts:52-75`                | Regex + `yaml` package                   | 24    |
| `src/skills/parser.ts:27-63`                | Regex + `yaml` package                   | 37    |
| `src/task-management/vault-ingest.ts:23-49` | Regex + `yaml` package                   | 27    |
| `src/task-management/template-sync.ts:4`    | Uses `gray-matter` (correct approach)    | 1     |

**Total duplicated code:** ~197 lines across 6 implementations

The 3 hand-rolled parsers in `vault-tasks.ts` use naive line-by-line splitting that breaks on standard YAML features (nested objects, arrays, multiline strings, values containing colons). The 3 `yaml`-based parsers are more robust but still duplicate the regex extraction pattern.

**Recommendation:** Create a single `parseFrontmatter(content: string)` utility using `gray-matter` in `src/shared/` or `src/core/`, then replace all 6 implementations. This is the single highest-ROI change in this report.

### Frontmatter Generation (3 implementations)

| File                                      | Function                   | Lines |
| ----------------------------------------- | -------------------------- | ----- |
| `src/task-management/vault-sync.ts:25-48` | `buildFrontmatter()`       | 24    |
| `src/vault/recurring-tasks.ts:107-126`    | inline frontmatter builder | 20    |
| `src/memory/commitments.ts:145-163`       | inline frontmatter builder | 19    |

Each manually constructs YAML frontmatter by string concatenation. Consider using `gray-matter`'s `stringify()` function or a shared builder utility.

---

## Skipped

| Candidate                                                       | Why Skipped                                                                                                                                                                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/bus.ts` (typed EventEmitter)                          | 89 lines but it's a thin typed wrapper around Node's `EventEmitter` -- the type overlay is the value, not the emitter itself. Libraries like `mitt` or `emittery` don't provide the same TypeScript integration. |
| `src/local-scheduler/` (SQLite-based cron scheduler)            | Domain-specific integration of `better-sqlite3` + `cron-parser` -- both are already used correctly. The scheduler logic is business-specific.                                                                    |
| `src/minions/blueprint-parser.ts:93-95` (`interpolateTemplate`) | 3-line `{{var}}` replacement. Too small to warrant a library.                                                                                                                                                    |
| `src/scheduling/trigger-server.ts` (HTTP server)                | Hand-rolled `http.createServer` with routing. Could use Hono/Fastify but deeply integrated with daemon lifecycle and ~15 route handlers. Migration cost outweighs benefit for an internal-only server.           |
| `src/vault/chunker.ts` (markdown chunking)                      | Domain-specific logic for RAG chunking with enriched preambles. No off-the-shelf library matches the exact requirements.                                                                                         |
| `src/daemon/sensor-loop.ts`                                     | Simple `setInterval` wrapper with domain-specific sweep logic.                                                                                                                                                   |

---

## Priority Ranking

| Priority | Finding                                                                               | Impact                                                           | Effort                                      | ROI        |
| -------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- | ---------- |
| 1        | **Consolidate 6 frontmatter parsers to `gray-matter`** (already installed)            | High -- eliminates ~197 lines of duplicated/fragile code         | Easy -- 2-3 hours, mechanical replacement   | Highest    |
| 2        | **Remove `js-yaml` duplicate** -- standardize on `yaml` or let `gray-matter` cover it | Medium -- removes duplicate dependency                           | Easy -- 30 minutes, one file change         | High       |
| 3        | **Replace `withRetry` with `p-retry`**                                                | Medium -- gains jitter, abort signals, structured error handling | Moderate -- 8 call sites to update          | Medium     |
| 4        | **Replace `atomicWriteFile` with `write-file-atomic`**                                | Low-Medium -- gains edge case handling                           | Easy -- drop-in for async variant           | Medium     |
| 5        | **Replace git `execSync` wrappers with `simple-git`**                                 | Medium -- unblocks event loop, gains parsed output               | Moderate -- 158 lines across 2 files        | Low-Medium |
| 6        | **Consolidate frontmatter generation** (3 builders)                                   | Low -- reduces duplication                                       | Easy -- 1 hour                              | Low-Medium |
| 7        | **Consider `p-limit` for AgentQueue**                                                 | Low -- existing code works well                                  | Moderate -- loses per-channel observability | Low        |
| 8        | **Consider `toposort` for DAG ordering**                                              | Low -- existing code works well                                  | Moderate -- loses wave scheduling           | Low        |

---

## Sources

- [gray-matter on npm](https://www.npmjs.com/package/gray-matter)
- [gray-matter on GitHub](https://github.com/jonschlinkert/gray-matter)
- [p-retry on npm](https://www.npmjs.com/package/p-retry)
- [write-file-atomic on npm](https://www.npmjs.com/package/write-file-atomic)
- [write-file-atomic on GitHub](https://github.com/npm/write-file-atomic)
- [simple-git on npm](https://www.npmjs.com/package/simple-git)
- [simple-git on GitHub](https://github.com/steveukx/git-js)
- [toposort on npm](https://www.npmjs.com/package/toposort)
- [p-limit on npm](https://www.npmjs.com/package/p-limit)
