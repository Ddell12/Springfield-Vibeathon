# Wheel Detector Report

## Summary

- **Scanned:** 23 directories, 182 source files (under `src/`)
- **Candidates found:** 8
- **High confidence replacements:** 3
- **Already installed but unused:** 1
- **Estimated maintenance savings:** Consolidating frontmatter parsing alone removes ~80 lines of duplicated code across 4 files. Replacing the retry and atomic-write modules eliminates ~100 lines of hand-rolled infrastructure. The duplicate YAML library can be dropped entirely.

---

## Already Installed But Unused

### Frontmatter Parsing: `gray-matter` installed but only used in 1 of 5 frontmatter-parsing locations

**Files:**

- `src/vault/chunker.ts:52-75` (24 lines) -- hand-rolls frontmatter extraction with `yaml` package
- `src/vault/vault-tasks.ts:31-59` (29 lines) -- hand-rolls frontmatter extraction with manual colon-splitting (doesn't even use a YAML parser)
- `src/task-management/vault-ingest.ts:23-50` (28 lines) -- hand-rolls frontmatter extraction with `yaml` package
- `src/skills/parser.ts:27-63` (37 lines) -- hand-rolls frontmatter extraction with `yaml` package
- `src/task-management/template-sync.ts:39` -- **the only file that actually uses `gray-matter`**

**Confidence:** High
**Migration difficulty:** Easy

**What it does:** Each file independently regex-matches `---\n...\n---`, then parses the YAML block. Four of the five locations reimplement what `gray-matter` already does (and is already in `package.json`).

**Why replace:**

- `gray-matter` handles edge cases these implementations miss: CRLF line endings, frontmatter with trailing content on the delimiter line, nested YAML, excerpt extraction
- `vault-tasks.ts` doesn't even use a YAML parser -- it splits on colons, which will break on multi-line values, arrays, or quoted strings containing colons
- The library is already installed and paid for in bundle size
- 5.7M weekly downloads, battle-tested by Gatsby, Astro, VitePress, Netlify

**Next step:** Replace the 4 hand-rolled parsers with `import matter from "gray-matter"`. Each call site becomes `const { data, content } = matter(raw)` -- a 1-line replacement for 20-30 lines of regex + YAML parsing.

---

## High Confidence

### Duplicate YAML Libraries: both `yaml` and `js-yaml` installed

**Files:**

- `src/vault/chunker.ts` -- `import { parse as parseYaml } from "yaml"`
- `src/skills/parser.ts` -- `import { parse as parseYaml } from "yaml"`
- `src/task-management/vault-ingest.ts` -- `import { parse as parseYaml } from "yaml"`
- `src/minions/blueprint-parser.ts` -- `import yaml from "js-yaml"` (the only consumer of `js-yaml`)

**Confidence:** High
**Migration difficulty:** Easy

**What it does:** Two separate YAML parsing libraries are installed. `yaml` (v2) is used in 3 files; `js-yaml` (v4) is used in 1 file. Both solve the same problem.

**Why replace:**

- Unnecessary dependency duplication -- two libraries, two APIs, two sets of potential vulnerabilities
- `yaml` (v2) is the more modern library with full YAML 1.2 compliance, TypeScript support, and better error messages
- If frontmatter parsing is consolidated to `gray-matter` (see above), the direct `yaml` imports may also become unnecessary

**Next step:** Replace `js-yaml` usage in `src/minions/blueprint-parser.ts` with `import { parse } from "yaml"`, then `npm uninstall js-yaml @types/js-yaml`.

---

### Retry Logic: `src/shared/retry.ts` (63 lines)

**File:** `src/shared/retry.ts:1-63`
**Confidence:** High
**Migration difficulty:** Moderate

**What it does:** Custom `withRetry()` with exponential backoff, configurable max attempts, delay caps, and transient error detection (string-matching on error messages for HTTP status codes, DNS errors, socket errors).

**Suggested library:** `p-retry` (npm: ~25M weekly downloads, 850+ GitHub stars)

- Handles exponential backoff, jitter, abort signals, custom retry conditions
- Built-in support for non-retryable errors via `AbortError`
- TypeScript-native, ESM-first, zero dependencies
- Well-tested edge cases (timeout, signal abort, custom `shouldRetry` predicate)

**Why replace:**

- The current `isTransientError()` function uses brittle string matching (`message.includes("502")`) which could false-positive on unrelated strings containing those substrings
- No jitter -- concurrent retries will thundering-herd
- No abort signal support
- `p-retry` separates "should retry?" logic cleanly via a predicate function rather than string matching
- 14 call sites across `src/convex-sync/` and `src/health/` already use `withRetry` -- the API shape is close enough for a mostly mechanical migration

**Why keep (counterargument):** The current implementation is well-tested, centralized in one file, and the transient error list is tailored to Aura's specific failure modes. Migration touches 14+ call sites. The string-matching approach, while crude, works for the known error patterns.

**Next step:** `npm install p-retry`, then refactor `withRetry` to wrap `p-retry` with the existing transient-error detection as a custom `shouldRetry` predicate. This preserves the existing API while gaining jitter, abort support, and battle-tested internals.

---

### Concurrency Limiter: `src/agent/concurrency.ts` (112 lines)

**File:** `src/agent/concurrency.ts:1-112`
**Confidence:** Medium
**Migration difficulty:** Moderate

**What it does:** A counting semaphore (`AgentQueue`) with FIFO queuing, per-channel tracking for observability, and a `queuedRunAgent` wrapper. Limits concurrent agent executions.

**Suggested library:** `p-limit` (npm: 170M weekly downloads) or `p-queue` (npm: ~8M weekly downloads)

- `p-limit` provides a simple concurrency limiter with a functional API
- `p-queue` provides a full queue with concurrency control, priority, pause/resume, events, and introspection

**Why replace:**

- `p-queue` offers priority queuing, pause/resume, size/pending introspection, and event hooks -- all features that would be useful for agent orchestration
- The custom implementation lacks priority support, pause/resume, and timeout per task

**Why keep (counterargument):** The `AgentQueue` class has per-channel observability (`pendingCount(channel)`) which is a custom feature not directly available in `p-limit` or `p-queue`. The implementation is clean, well-tested (28 tests), and tightly integrated with the `AgentRequest` type. At 112 lines including the wrapper function, it's not overly complex. The channel-tracking feature would need to be layered on top of `p-queue`.

**Next step:** If you need priority queuing or pause/resume in the future, migrate to `p-queue`. Otherwise, the current implementation is reasonable to keep.

---

## Medium Confidence

### Atomic File Writes: `src/core/atomic-write.ts` (41 lines)

**File:** `src/core/atomic-write.ts:1-41`
**Confidence:** Medium
**Migration difficulty:** Easy

**What it does:** Write-to-temp-then-rename pattern for both async and sync file writes. Used by vault recurring tasks and heartbeat.

**Suggested library:** `write-file-atomic` (npm: 45.8M weekly downloads, maintained by npm Inc.)

- Handles atomic writes with configurable ownership (uid/gid)
- Handles cross-device rename edge cases (falls back to copy)
- Handles concurrent writes to the same file (uses `imurmurhash` for temp file naming)

**Why replace:**

- `write-file-atomic` handles the cross-device rename case (`EXDEV` error) which the current implementation doesn't
- Handles concurrent writes to the same file more robustly

**Why keep (counterargument):** At 41 lines, the current implementation is trivially simple, easy to understand, and has good test coverage. It only writes to local filesystem paths where cross-device renames are not a concern. Adding a dependency for 41 lines of straightforward code is debatable.

**Next step:** Only worth replacing if you encounter cross-device write issues or concurrent-write bugs. Otherwise, the current code is fine.

---

### Git Operations: `src/coding/git-automator.ts` + `src/coding/workspace.ts` (~160 lines combined)

**Files:**

- `src/coding/git-automator.ts:1-73` -- `commitAll`, `push`, `createPR`, `getHeadSha`
- `src/coding/workspace.ts:1-86` -- `ensureCloned`, `createWorktree`, `cleanupWorktree`, `listWorktrees`

**Confidence:** Medium
**Migration difficulty:** Hard

**What it does:** Shell-exec wrappers around `git` and `gh` CLI commands for the coding pipeline (task factory). Handles cloning, worktree management, committing, pushing, and PR creation.

**Suggested library:** `simple-git` (npm: 6.4M weekly downloads, 3.2K GitHub stars, TypeScript-native)

- Promise-based API, chainable operations
- Built-in error handling and parsing of git output
- No shell injection risks (arguments passed as arrays, not string interpolation)
- Handles edge cases like detached HEAD, merge conflicts, etc.

**Why replace:**

- The current code uses `execSync` with string interpolation (`git push origin ${branch}`), which is a shell injection vector if `branch` contains special characters
- `simple-git` provides proper argument escaping and structured output parsing
- `listWorktrees` manually parses `--porcelain` output (lines 72-85) which `simple-git` handles natively

**Why keep (counterargument):** The code also wraps `gh pr create` which `simple-git` doesn't cover (that's GitHub CLI, not git). The worktree management is thin and straightforward. Migration would be partial at best. The shell injection risk is low since branch names come from internal task IDs, not user input.

**Next step:** Consider adopting `simple-git` if git operations expand beyond the current scope. For now, at minimum, switch from string interpolation to `execFileSync` with argument arrays to eliminate the shell injection risk.

---

## Low Confidence

### File Watcher Debounce Pattern (copy-pasted across 2 files)

**Files:**

- `src/skills/watcher.ts:1-51`
- `src/task-management/template-watcher.ts:1-36`

**Confidence:** Low
**Migration difficulty:** Easy

**What it does:** Both files implement the exact same pattern: `node:fs.watch()` + `clearTimeout/setTimeout` debounce + watcher lifecycle (`start`/`stop`). The code structure is nearly identical -- module-level `watcher` and `debounceTimer` variables, a `start*Watcher` function, and a `stop*Watcher` function.

**Why consolidate:**

- This is internal duplication, not a missing library. The two files are ~90% identical in structure.
- A generic `createDebouncedWatcher(dir, filter, callback, debounceMs)` utility would eliminate the duplication.

**Why keep (counterargument):** Each watcher has different filter logic (`.md` vs `SKILL.md`) and different callbacks. The files are short (36 and 51 lines). Abstracting them might be over-engineering for two instances.

**Next step:** If a third watcher is ever needed, extract a shared `createDebouncedWatcher` utility into `src/core/` or `src/shared/`. For now, the duplication is tolerable.

---

## Internal Duplication

### Frontmatter Parsing (4 independent implementations)

This is the most significant internal duplication finding. Four files independently implement the same `^---\n([\s\S]*?)\n---` regex + YAML parse pattern:

| File                                   | Lines | YAML Engine        | Notes                                  |
| -------------------------------------- | ----- | ------------------ | -------------------------------------- |
| `src/vault/chunker.ts`                 | 24    | `yaml` v2          | Returns structured `ParsedFrontmatter` |
| `src/vault/vault-tasks.ts`             | 29    | Manual colon-split | No YAML parser at all -- fragile       |
| `src/task-management/vault-ingest.ts`  | 28    | `yaml` v2          | Returns `VaultTaskData`                |
| `src/skills/parser.ts`                 | 37    | `yaml` v2          | Returns `ParsedSkill`                  |
| `src/task-management/template-sync.ts` | 1     | `gray-matter`      | The correct approach                   |

`template-sync.ts` already uses `gray-matter` (which is installed). The other 4 files should follow suit.

### Inline Truncation Pattern (3 locations)

Three files implement ad-hoc string truncation with `"..."` suffix:

- `src/memory/retrieval.ts:143` -- `m.content.slice(0, 200) + "..."`
- `src/memory/retrieval.ts:158` -- `msg.content.slice(0, MSG_CAP) + "..."`
- `src/agent/agent.ts:80` -- `msg.content.slice(0, MSG_CAP) + "..."`

This is minor (single-expression pattern) and not worth extracting unless it grows.

---

## Skipped

| Item                                                 | Why Skipped                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/core/bus.ts` (EventEmitter wrapper)             | Thin typed wrapper over `node:events` -- adds type safety, not reimplementing            |
| `src/daemon/execution-lock.ts` (35 lines)            | Simple boolean lock with daily counter -- domain-specific, too simple for a library      |
| `src/core/logger.ts` (pino wrapper)                  | Already uses pino; just provides a factory function                                      |
| `src/rate-limit/convex-client.ts`                    | Thin Convex adapter, not reimplementing rate limiting                                    |
| `src/vault/daily-note-generator.ts`                  | Domain-specific markdown template builder, not a general problem                         |
| `src/channels/telegram.ts:escapeHtml()`              | 5-line utility, not worth a dependency                                                   |
| `src/core/config.ts` (`JSON5` usage)                 | Already using the `json5` library correctly                                              |
| Date formatting in `daily-note-generator.ts`         | Simple `pad()` and `toLocaleDateString()` calls, not complex enough for date-fns         |
| `src/minions/blueprint-parser.ts` (topological sort) | DFS cycle detection is ~20 lines of validation logic, domain-specific to blueprint steps |

---

## Priority Ranking

Ordered by impact multiplied by ease of migration:

| #   | Action                                               | Impact                                                                                                                 | Effort                                                      | ROI     |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------- |
| 1   | **Consolidate frontmatter parsing to `gray-matter`** | High -- eliminates 4 duplicated parsers, fixes fragile colon-splitting in `vault-tasks.ts`, uses already-installed dep | Easy -- ~1 hour                                             | Highest |
| 2   | **Remove `js-yaml`, standardize on `yaml` v2**       | Medium -- eliminates duplicate dependency                                                                              | Easy -- 15 min, 1 file change                               | High    |
| 3   | **Replace `withRetry` with `p-retry`**               | Medium -- gains jitter, abort signals, proper non-retryable error handling                                             | Moderate -- 14 call sites to update                         | Medium  |
| 4   | **Fix shell injection in git-automator**             | Medium -- security improvement                                                                                         | Easy -- switch `execSync` to `execFileSync` with args array | Medium  |
| 5   | **Consider `p-queue` for AgentQueue**                | Low -- only if priority/pause features needed                                                                          | Moderate -- requires wrapping for channel tracking          | Low     |
| 6   | **Consider `write-file-atomic`**                     | Low -- only if cross-device writes become an issue                                                                     | Easy -- drop-in                                             | Low     |
| 7   | **Extract shared watcher utility**                   | Low -- only 2 instances of duplication                                                                                 | Easy -- but premature until 3rd watcher needed              | Low     |
