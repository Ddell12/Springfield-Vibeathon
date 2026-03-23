# src/core/ Hand-Rolled Code Audit

Scanned all 7 source files in `/Users/desha/Aura/src/core/`. Below are findings where existing libraries could replace hand-rolled implementations, ordered by impact.

---

## 1. `atomic-write.ts` -- Replace with `write-file-atomic`

**File:** `/Users/desha/Aura/src/core/atomic-write.ts` (41 lines)

**What it does:** Writes to a temp file (`{path}.{uuid}.tmp`), then renames into place. Cleans up the temp file on failure.

**Library alternative:** [`write-file-atomic`](https://www.npmjs.com/package/write-file-atomic) (~4M weekly downloads, maintained by npm/GitHub). Provides the same write-tmp-then-rename pattern plus:

- `fsync` before rename (prevents data loss on power failure -- the hand-rolled version skips this)
- Configurable `chown` to preserve file ownership
- Built-in `mode` support
- Sync variant included

**Verdict:** Medium impact. The missing `fsync` is a real durability gap for vault writes. Straightforward drop-in replacement. The sync variant maps to `atomicWriteFileSync`.

---

## 2. `config.ts` -- `deepMerge()` could use `deepmerge` or `lodash.merge`

**File:** `/Users/desha/Aura/src/core/config.ts`, lines 249-268

**What it does:** Recursive plain-object merge (defaults + file overrides). Arrays are replaced wholesale (not concatenated).

**Library alternatives:**

- [`deepmerge`](https://www.npmjs.com/package/deepmerge) (~30M weekly downloads). Default behavior concatenates arrays, but you can pass `arrayMerge: (_, source) => source` to get the current replace-array semantics.
- [`lodash.merge`](https://www.npmjs.com/package/lodash.merge) -- similar, but mutates the target.

**Verdict:** Low impact. The hand-rolled version is only 20 lines and correct for its use case. A library would add a dependency for marginal benefit. Acceptable as-is unless deeper merge scenarios arise (e.g., merging arrays of schedule configs with deduplication).

---

## 3. `config.ts` -- `resolveTilde()` could use `untildify`

**File:** `/Users/desha/Aura/src/core/config.ts`, lines 363-369

**What it does:** Expands `~` and `~/...` to the user's home directory.

**Library alternative:** [`untildify`](https://www.npmjs.com/package/untildify) (~10M weekly downloads, 3 lines of code, maintained by sindresorhus).

**Verdict:** Very low impact. The hand-rolled version is 6 lines and fully correct. The library is equally trivial. No strong reason to change.

---

## 4. `sessions.ts` -- `localTimestamp()` / `localDateKey()` could use `date-fns` or `dayjs`

**File:** `/Users/desha/Aura/src/core/sessions.ts` (12 lines)

**What it does:** Generates an ISO-ish local timestamp by subtracting `getTimezoneOffset()` and stripping the trailing `Z`. Also derives a `YYYY-MM-DD` date key from it.

**Potential issues with the hand-rolled approach:**

- DST transitions: The offset is captured at one instant but used to shift the date, which can produce incorrect results during the ~1 hour around DST changes.
- No explicit timezone -- relies on the system timezone, which may differ between dev and production machines.

**Library alternatives:**

- [`date-fns`](https://www.npmjs.com/package/date-fns) with `date-fns-tz` -- `formatInTimeZone(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss.SSS")`.
- [`dayjs`](https://www.npmjs.com/package/dayjs) with its `timezone` plugin -- `dayjs().tz(tz).format()`.
- [`luxon`](https://www.npmjs.com/package/luxon) -- `DateTime.now().setZone(tz).toISO()`.

**Verdict:** Medium impact. The DST edge case is a real (if rare) correctness risk. If the codebase grows more timezone-sensitive logic (scheduling, daily notes keyed by date), a proper date library would prevent subtle bugs. `date-fns` is the lightest option and tree-shakeable.

---

## 5. `bus.ts` -- Typed EventEmitter wrapper is fine (no change needed)

**File:** `/Users/desha/Aura/src/core/bus.ts` (89 lines)

**What it does:** Wraps Node's `EventEmitter` with a `TypedEventEmitter<BusEvents>` interface for type-safe `on`/`emit`/`off`.

**Library alternatives:**

- [`eventemitter3`](https://www.npmjs.com/package/eventemitter3) -- faster, but still lacks native TS generics.
- [`mitt`](https://www.npmjs.com/package/mitt) -- tiny, type-safe, but only supports `Map<string, handler[]>` (no wildcard, no `once`).
- [`emittery`](https://www.npmjs.com/package/emittery) -- fully typed, async-first, but different API surface.
- [`typed-emitter`](https://www.npmjs.com/package/typed-emitter) -- a thin type-only wrapper over `EventEmitter`, doing exactly what this file does.

**Verdict:** No change recommended. The hand-rolled `TypedEventEmitter` interface is a well-known TypeScript pattern (16 lines of types). It has zero runtime cost and keeps full compatibility with Node's `EventEmitter`. The `typed-emitter` package would save ~16 lines but add a dependency for pure type definitions.

---

## 6. `logger.ts` -- Already uses `pino` (no change needed)

**Verdict:** This is already library-backed. No hand-rolling detected.

---

## 7. `costs.ts` -- Trivial helper (no change needed)

**Verdict:** A single 3-line pure function (`checkThreshold`). No library applies.

---

## 8. `types.ts` -- Pure type definitions (no change needed)

**Verdict:** Interface/type declarations only. No runtime logic to replace.

---

## Summary Table

| File                       | Hand-rolled code            | Suggested library          | Impact   | Recommendation                               |
| -------------------------- | --------------------------- | -------------------------- | -------- | -------------------------------------------- |
| `atomic-write.ts`          | write-tmp-rename (no fsync) | `write-file-atomic`        | Medium   | **Replace** -- fixes fsync gap               |
| `sessions.ts`              | local timezone math         | `date-fns` + `date-fns-tz` | Medium   | **Replace** -- fixes DST edge case           |
| `config.ts` (deepMerge)    | recursive object merge      | `deepmerge`                | Low      | Keep as-is (or replace if merge logic grows) |
| `config.ts` (resolveTilde) | tilde expansion             | `untildify`                | Very low | Keep as-is                                   |
| `bus.ts`                   | TypedEventEmitter types     | `typed-emitter`            | None     | Keep as-is                                   |
| `logger.ts`                | n/a (uses pino)             | n/a                        | None     | Already library-backed                       |
| `costs.ts`                 | threshold check             | n/a                        | None     | Too trivial for a library                    |
| `types.ts`                 | n/a (type defs only)        | n/a                        | None     | No runtime code                              |

**Top recommendations:**

1. Replace `atomic-write.ts` with `write-file-atomic` to gain `fsync` durability.
2. Replace `sessions.ts` date math with `date-fns`/`date-fns-tz` to eliminate DST edge cases.
