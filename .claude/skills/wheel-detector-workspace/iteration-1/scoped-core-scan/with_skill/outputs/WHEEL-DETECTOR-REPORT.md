# Wheel Detector Report

## Summary

- **Scanned:** 1 directory (`src/core/`), 7 source files (excluding tests)
- **Candidates found:** 4
- **High confidence replacements:** 1
- **Medium confidence replacements:** 2
- **Low confidence replacements:** 1
- **Estimated maintenance savings:** Minor. `src/core/` is lean infrastructure code; most files are small and purpose-built. The strongest win is replacing `atomic-write.ts` entirely with an established library.

## High Confidence

### Atomic File Writing: Custom write-temp-rename pattern

**File:** `src/core/atomic-write.ts:1-41` (41 lines, ~30 lines of logic)
**What it does:** Implements atomic file writes (async + sync) via write-to-temp-then-rename with UUID-based temp filenames and cleanup-on-error.
**Confidence:** High
**Migration difficulty:** Easy

**Suggested library:** `write-file-atomic` (npm: ~50M weekly downloads, maintained by npm org) or `atomically` (TypeScript-native rewrite of write-file-atomic)

- Handles write-temp-rename atomically with configurable ownership (uid/gid)
- Serializes concurrent writes to the same file (prevents race conditions the current code doesn't handle)
- Battle-tested — used internally by npm itself
- `atomically` is written in TypeScript, so types ship with the package

**Why replace:**

- Current implementation doesn't serialize concurrent writes to the same file — two parallel `atomicWriteFile()` calls targeting the same path can race
- No fsync/fdatasync before rename — on crash, the temp file may have incomplete data that gets renamed into place
- `write-file-atomic` handles both of these edge cases
- Zero-dependency, tiny footprint

**Callers:** 6 files import from `core/atomic-write` (`agent.ts`, `context-summary.ts`, `vault-sync.ts`, `recurring-tasks.ts`, `heartbeat.ts`, and a test)

**Next step:** `npm install write-file-atomic @types/write-file-atomic` (or `npm install atomically` for TS-native) and update 6 import sites. The API is nearly identical — `writeFileAtomic(filename, data, callback)` / `writeFileAtomicSync(filename, data)`.

---

## Medium Confidence

### Deep Merge: Hand-rolled recursive object merge

**File:** `src/core/config.ts:249-268` (20 lines of logic across `isPlainObject` + `deepMerge`)
**What it does:** Recursively merges two plain objects, with source values overriding target values. Used by `mergeConfig()` to layer user config over defaults.
**Confidence:** Medium
**Migration difficulty:** Easy

**Suggested library:** `deepmerge-ts` (npm: ~3.4M weekly downloads, 273 stars) or `deepmerge` (npm: ~60M weekly downloads, 2.7k stars)

- `deepmerge-ts` provides fully inferred TypeScript return types
- Handles edge cases: circular references, prototype pollution, symbol keys, arrays, Maps, Sets
- `deepmerge` is the classic, more widely used option

**Why replace:**

- Current implementation is simple and works for the config use case, but doesn't handle: arrays (overwrites rather than merging), circular references, or non-enumerable properties
- Only 1 call site (`mergeConfig`), so the blast radius of a bug is low
- The hand-rolled version is only 20 lines and its simplicity is actually a feature for this narrow use case

**Why keep (counterargument):**

- The current code is intentionally simple — it only needs to merge config objects, not arbitrary data. Arrays-overwrite-not-merge is actually the desired behavior for config (e.g., replacing the entire `toolkits` array).
- Adding a library for 20 lines used in exactly 1 place is marginal.

**Next step:** If you choose to replace: `npm install deepmerge-ts`, then `import { deepmerge } from "deepmerge-ts"` and replace the custom `deepMerge` + `isPlainObject` functions. Verify that array-overwrite behavior is preserved (deepmerge-ts merges arrays by default — you'd need a custom merge strategy to override).

---

### Typed Event Emitter: Custom TypedEventEmitter interface

**File:** `src/core/bus.ts:63-82` (20 lines of type definitions)
**What it does:** Defines a `TypedEventEmitter<Events>` generic interface that wraps Node's `EventEmitter` with type-safe `on`/`off`/`emit`/`once` signatures. Used as the backbone for the entire `AuraBus` event system (14 importers).
**Confidence:** Medium
**Migration difficulty:** Moderate

**Suggested library:** `typed-emitter` (npm: ~3M weekly downloads, zero runtime code — types only) or `eventemitter3` (npm: ~30M weekly downloads, includes typed generics)

- `typed-emitter` is literally just TypeScript type definitions over Node's EventEmitter — exactly what this code does, but maintained and tested by the community
- `eventemitter3` provides its own implementation with built-in TypeScript generics, higher performance, and works in both Node and browser

**Why replace:**

- `typed-emitter` is a drop-in: same concept (type wrapper over EventEmitter), zero runtime cost, community-maintained types
- The hand-rolled interface could miss edge cases in EventEmitter's API (e.g., `rawListeners`, `prependListener`, `setMaxListeners`)

**Why keep (counterargument):**

- The current code is 20 lines of pure types + 3 lines of factory function. It works. It's well-understood by the team.
- Switching to `eventemitter3` would change the underlying emitter implementation, which is a bigger change than just types.
- `typed-emitter` adds a dependency for something that's effectively free to maintain.

**Next step:** If replacing with `typed-emitter`: `npm install typed-emitter`, then change `TypedEventEmitter<BusEvents>` to use the library's type. The `createBus()` function stays the same. If replacing with `eventemitter3`: more refactoring needed since it's a different emitter class.

---

## Low Confidence

### Local Timestamp Helpers: Manual timezone offset math

**File:** `src/core/sessions.ts:1-12` (12 lines, ~8 lines of logic)
**What it does:** Generates local-timezone ISO timestamps by manually subtracting `getTimezoneOffset()` from UTC, then stripping the `Z` suffix. Also derives a date key (`YYYY-MM-DD`).
**Confidence:** Low
**Migration difficulty:** Easy

**Suggested library:** `date-fns` (npm: ~25M weekly downloads, 35k stars) — specifically `format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSS")` and `format(new Date(), "yyyy-MM-dd")`

- Handles DST transitions correctly (the offset-subtraction approach can produce wrong results during DST switchover in rare edge cases)
- Tree-shakeable — only import the functions you use

**Why replace:**

- The manual offset math (`new Date(now.getTime() - off * 60_000)`) is a known footgun during DST transitions
- `date-fns/format` handles this correctly and is widely understood

**Why keep (counterargument):**

- This is 8 lines of code with 2 callers
- Adding `date-fns` (even tree-shaken) for two formatting calls is heavy-handed
- The DST edge case is theoretical for this use case (session timestamps, not billing)
- `Intl.DateTimeFormat` (built-in, zero dependencies) could also solve this without a library

**Next step:** If the DST edge case matters, the lightest fix is using `Intl.DateTimeFormat` (built-in) rather than adding a dependency. If you already use `date-fns` elsewhere in the project, then consolidate.

---

## Already Installed But Unused

No cases found where an already-installed dependency could replace hand-rolled code in `src/core/`. The project already uses `pino` for logging (not hand-rolled), `json5` for config parsing (not hand-rolled), and `cron-parser` for cron expressions.

## Skipped

| File                                     | Reason                                                                        |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `src/core/types.ts`                      | Pure TypeScript interfaces — no logic to replace                              |
| `src/core/logger.ts`                     | Already uses `pino` library — not hand-rolled                                 |
| `src/core/costs.ts`                      | 3 lines of domain-specific threshold logic — too small and too specific       |
| `src/core/config.ts` (env overrides)     | `applyEnvOverrides()` is domain-specific config wiring, not a general problem |
| `src/core/config.ts` (path constants)    | Static path resolution — not a library concern                                |
| `src/core/config.ts` (`resolveTilde`)    | 4-line utility; libraries exist (`untildify`) but it's not worth a dependency |
| `src/core/config.ts` (`parseConfigFile`) | 4 lines wrapping `json5.parse()` — already uses a library                     |
| `src/core/bus.ts` (event definitions)    | The `BusEvents` interface is domain-specific type declarations                |
| `src/core/__tests__/*`                   | Test files excluded per skill rules (all under 50 lines of helper code)       |
