# Wheel Detector Report

## Summary

- **Scanned:** 1 directory (`src/core/`), 7 source files (791 lines, excluding tests)
- **Candidates found:** 4
- **High confidence replacements:** 1
- **Already installed but unused:** 0
- **Estimated maintenance savings:** Low-to-moderate. The `src/core/` slice is lean infrastructure code. Most files are small and well-scoped. The strongest finding is the atomic write utility; the rest are marginal.

## Already Installed But Unused

No findings. All installed dependencies that are relevant to `src/core/` patterns are already being used (e.g., `pino` for logging, `json5` for config parsing, `zod` is used elsewhere but not needed here).

**Note:** `yaml` and `js-yaml` are both installed as dependencies, and both are used across the broader codebase (outside `src/core/`). This is a duplicate dependency, but it lives outside the scoped scan. Flagged here for awareness: `js-yaml` is used in exactly one file (`src/minions/blueprint-parser.ts`); consolidating to `yaml` would let you drop `js-yaml` and `@types/js-yaml` from `package.json`.

## High Confidence

### Atomic File Writes: `atomic-write.ts` could use `write-file-atomic`

**File:** `src/core/atomic-write.ts:1-41` (41 lines)
**What it does:** Write-to-temp-then-rename pattern for crash-safe file writes. Provides both async (`atomicWriteFile`) and sync (`atomicWriteFileSync`) variants.
**Confidence:** High
**Migration difficulty:** Easy

**Suggested library:** [`write-file-atomic`](https://www.npmjs.com/package/write-file-atomic) (npm: ~45M weekly downloads, maintained by npm org)

- Handles the same write-temp-rename pattern
- Supports `chown` option (preserves file ownership on Unix)
- Handles cross-device rename failures (falls back to copy+unlink)
- Supports `mode`, `tmpfileCreated` callback, and `signal` for abort
- v7.0.0 is ESM-native, TypeScript types included

**Why replace:**

- The hand-rolled version doesn't handle cross-device renames (temp and target on different filesystems)
- No file permission preservation
- `write-file-atomic` is battle-tested across the entire npm ecosystem (used by npm CLI itself)
- Zero meaningful bundle cost (tiny package, zero deps in v7)

**Why you might keep it:**

- The current code is simple, correct for same-filesystem use, and has zero dependencies
- 41 lines is not a large maintenance surface
- All 10+ call sites use same-filesystem paths (vault files), so the cross-device edge case may never arise

**Next step:** `npm install write-file-atomic` and replace `atomicWriteFile`/`atomicWriteFileSync` with `writeFileAtomic`/`writeFileAtomicSync`. Update 10+ import sites across `src/agent/`, `src/task-management/`, `src/vault/`, `src/health/`, `src/scheduling/`.

## Medium Confidence

### Deep Merge: `config.ts` hand-rolls `deepMerge`

**File:** `src/core/config.ts:249-268` (20 lines)
**What it does:** Recursive merge of two plain objects. Used exclusively by `mergeConfig()` to overlay user config on defaults.
**Confidence:** Medium
**Migration difficulty:** Easy

**Suggested library:** [`deepmerge`](https://www.npmjs.com/package/deepmerge) (npm: ~30M weekly downloads, 2.7K GitHub stars) or [`deepmerge-ts`](https://www.npmjs.com/package/deepmerge-ts) (TypeScript-first, inferred return types)

- Handles arrays (configurable merge strategy), `Date`, `RegExp`, `Map`, `Set`
- Handles circular references (deepmerge-ts)
- Handles `Symbol` keys

**Why replace:**

- The hand-rolled version doesn't handle arrays intelligently (it just overwrites). If a user's config contains `schedules: [...]`, the merge replaces the default array entirely rather than merging entries.
- `deepmerge` handles edge cases (prototype pollution protection, non-plain objects)

**Why keep:**

- The function is only 20 lines and has exactly one caller (`mergeConfig`)
- Array-overwrite behavior may be intentional for config merging (replacing defaults, not appending)
- Adding a dependency for one 20-line internal function is debatable
- The current implementation is easy to understand and test

**Next step:** If array handling matters, `npm install deepmerge` and replace the internal `deepMerge`. Otherwise, this is fine as-is.

### Typed Event Emitter: `bus.ts` hand-rolls `TypedEventEmitter` interface

**File:** `src/core/bus.ts:63-82` (20 lines)
**What it does:** Generic TypeScript interface that wraps `node:events` `EventEmitter` with type-safe `on`/`off`/`emit`/`once` methods. Instantiated via `createBus()` which casts `new EventEmitter() as AuraBus`.
**Confidence:** Medium
**Migration difficulty:** Moderate

**Suggested library:** [`typed-emitter`](https://www.npmjs.com/package/typed-emitter) (zero runtime code, just types) or [`emittery`](https://www.npmjs.com/package/emittery) (async-first, typed, ~5M weekly downloads)

- `typed-emitter` is literally just the type wrapper pattern, published as a package (zero bytes runtime)
- `emittery` replaces `EventEmitter` entirely with an async-first, typed API

**Why replace:**

- `typed-emitter` does exactly what the hand-rolled interface does, but is a maintained, community-reviewed type definition
- If you ever need async listeners, `emittery` would be a better foundation

**Why keep:**

- The hand-rolled interface is 20 lines of pure types with zero runtime code
- It works perfectly and is well-tested (32 files import from `bus.ts`)
- `typed-emitter` adds a dependency for something that's literally just a type cast
- Switching to `emittery` would require rewriting all 32 consumer files
- This is a case where "just types" doesn't justify a dependency

**Next step:** Keep as-is. This is not worth changing unless you're already migrating to a different event system.

## Low Confidence

### Date/Time Helpers: `sessions.ts` hand-rolls local timestamp formatting

**File:** `src/core/sessions.ts:1-12` (12 lines)
**What it does:** Two functions: `localTimestamp()` returns ISO-ish string in local timezone (e.g., `"2026-02-13T19:30:00.000"`), `localDateKey()` returns `"2026-02-13"`.
**Confidence:** Low
**Migration difficulty:** Easy

**Suggested library:** [`date-fns`](https://www.npmjs.com/package/date-fns) (`format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS")`) or [`dayjs`](https://www.npmjs.com/package/dayjs) (`dayjs().format(...)`)

- Both handle timezone-aware formatting correctly
- Tree-shakeable (date-fns) or tiny (dayjs, 2KB)

**Why replace:**

- The `getTimezoneOffset()` trick is a common source of subtle bugs around DST transitions
- A library would handle edge cases automatically

**Why keep:**

- 12 lines total, two trivially simple functions
- No DST bugs have been reported
- Adding `date-fns` (or `dayjs`) for two one-liners is overkill
- The functions are only used in 4 files

**Next step:** Keep as-is. If a date library is ever added for other reasons, refactor these to use it.

## Internal Duplication

### `sensors.ts` duplicated between `src/daemon/` and `src/task-management/`

While scanning `src/core/` usage patterns, I noticed that `src/daemon/sensors.ts` and `src/task-management/sensors.ts` appear to contain identical or near-identical code (same timestamp patterns, same `SensorObservation` structure, same threshold logic). This is outside the `src/core/` scope but is worth noting as internal duplication that could be consolidated into one shared location.

### Duplicate YAML libraries (outside scope)

Both `yaml` (v2.8.2) and `js-yaml` (v4.1.1) are in `package.json`. `js-yaml` is used in exactly one file (`src/minions/blueprint-parser.ts`). The rest of the codebase uses `yaml`. Consolidating would remove a redundant dependency.

## Skipped

| File                                                 | Reason                                                                                                                                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/logger.ts` (33 lines)                      | Thin wrapper around `pino` (already using a library). Nothing hand-rolled.                                                                                                       |
| `src/core/types.ts` (106 lines)                      | Pure TypeScript interfaces. No logic to replace.                                                                                                                                 |
| `src/core/config.ts` (config loading, env overrides) | Domain-specific config logic. `parseConfigFile` delegates to `json5`. `applyEnvOverrides` is bespoke business logic. `resolveTilde` is 4 lines. None of these warrant a library. |
| `src/core/costs.ts` (19 lines)                       | Single pure function (`checkThreshold`). Trivial.                                                                                                                                |
| `src/core/bus.ts` (event definitions)                | The `BusEvents` interface is domain-specific event typing, not a general problem.                                                                                                |

## Priority Ranking

| Priority | Finding                                  | Impact                                    | Effort                  | Action                                           |
| -------- | ---------------------------------------- | ----------------------------------------- | ----------------------- | ------------------------------------------------ |
| 1        | **Atomic writes** -> `write-file-atomic` | Medium (edge case safety, 10+ call sites) | Easy (drop-in)          | Install and replace                              |
| 2        | **Duplicate YAML libs** (outside scope)  | Low (remove a dep)                        | Easy (change 1 import)  | Consolidate `js-yaml` -> `yaml`                  |
| 3        | **Deep merge** -> `deepmerge`            | Low (1 caller, works fine)                | Easy                    | Optional; keep if array-overwrite is intentional |
| 4        | **Typed emitter** -> `typed-emitter`     | Negligible                                | Moderate (32 consumers) | Skip                                             |
| 5        | **Date helpers** -> `date-fns`           | Negligible                                | Easy                    | Skip unless date lib added for other reasons     |

---

_Generated by the wheel-detector skill. Scoped to `src/core/` per user request._
