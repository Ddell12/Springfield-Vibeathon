# Reinvented Wheels Audit

**Codebase:** `/Users/desha/Aura`
**Date:** 2026-03-06
**Scope:** `src/`, `dashboard/`, `convex/`

---

## Severity Levels

- **HIGH** — Duplicated across 3+ locations, or reimplements something a dependency already provides
- **MEDIUM** — Duplicated across 2 locations, or a non-trivial utility that could be consolidated
- **LOW** — Minor duplication or borderline-justified custom code

---

## 1. YAML Frontmatter Parsing (HIGH)

**Three separate hand-rolled frontmatter parsers**, all doing `content.match(/^---\n([\s\S]*?)\n---/)` followed by YAML parse:

| File                                     | Function                       | Approach                                                     |
| ---------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| `src/vault/chunker.ts:52`                | `extractAndParseFrontmatter()` | Uses `yaml` package, returns structured `ParsedFrontmatter`  |
| `src/task-management/vault-ingest.ts:23` | `parseTaskFrontmatter()`       | Uses `yaml` package, returns `VaultTaskData`                 |
| `src/vault/vault-tasks.ts:31`            | `parseTaskFrontmatter()`       | **Hand-rolled line-by-line YAML parser** (no library at all) |

Meanwhile, `gray-matter` is already installed and used in exactly one place (`src/task-management/template-sync.ts:4`). gray-matter handles the `---` delimiter extraction, YAML parsing, and body separation in a single call.

**Recommendation:** Standardize on `gray-matter` for all frontmatter extraction. Write one shared `parseFrontmatter(content: string)` that returns `{ data, body }`, then let each consumer pick the fields it needs. Delete the hand-rolled regex+YAML patterns. At minimum, `vault-tasks.ts` should stop doing line-by-line YAML parsing when two YAML libraries are already installed.

---

## 2. Two YAML Libraries (MEDIUM)

Both `yaml` (v2.8.2) and `js-yaml` (v4.1.1) are in `dependencies`:

| Package   | Used In                                                                               |
| --------- | ------------------------------------------------------------------------------------- |
| `yaml`    | `src/vault/chunker.ts`, `src/task-management/vault-ingest.ts`, `src/skills/parser.ts` |
| `js-yaml` | `src/minions/blueprint-parser.ts` (single file)                                       |

**Recommendation:** Pick one. `yaml` is the more modern package (YAML 1.2, better TypeScript types). Migrate `blueprint-parser.ts` from `js-yaml` to `yaml` and remove `js-yaml` + `@types/js-yaml` from dependencies.

---

## 3. Relative Time Formatting (HIGH)

**Four independent implementations** of "X minutes/hours/days ago":

| Location                                                                 | Function                |
| ------------------------------------------------------------------------ | ----------------------- |
| `src/agents/team-status.ts:10`                                           | `formatRelativeTime()`  |
| `dashboard/src/lib/date-utils.ts:1`                                      | `formatDistanceToNow()` |
| `dashboard/src/features/scheduling/components/pending-jobs-queue.tsx:44` | `relativeTime()`        |
| `dashboard/src/features/scheduling/components/system-cron-card.tsx:28`   | `relativeTime()`        |

Each has slightly different thresholds and formatting (some include days, some don't, some show seconds).

**Recommendation:** The dashboard already has `formatDistanceToNow` in `dashboard/src/lib/date-utils.ts` -- the two component-local `relativeTime()` functions should import from there. On the `src/` side, create a single `formatRelativeTime()` in `src/shared/` or `src/core/` and import it in `team-status.ts`.

---

## 4. Currency Formatting (HIGH)

**Four separate `formatCurrency()` functions** in the dashboard, each with different behavior:

| File                                                               | Behavior                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `dashboard/src/app/finance/page.tsx:55`                            | `toLocaleString` with 2 decimal places, manual sign        |
| `dashboard/src/app/today/page.tsx:55`                              | `Intl.NumberFormat` with 0 decimals, returns dash for null |
| `dashboard/src/features/finance/components/cash-flow-chart.tsx:18` | Abbreviates to `$Xk` for values >= 1000                    |
| `dashboard/src/features/finance/components/net-worth-chart.tsx:18` | Identical to cash-flow-chart (copy-paste)                  |

**Recommendation:** Create `dashboard/src/lib/format-utils.ts` with two variants: `formatCurrency(value, opts?)` for full display and `formatCurrencyCompact(value)` for chart axis labels. Import everywhere.

---

## 5. File Watcher Boilerplate (MEDIUM)

Two structurally identical file-watching modules with inline debounce:

| File                                      | Watches                                  |
| ----------------------------------------- | ---------------------------------------- |
| `src/skills/watcher.ts`                   | `.claude/skills/` for `SKILL.md` changes |
| `src/task-management/template-watcher.ts` | Templates directory for `.md` changes    |

Both use `node:fs.watch` with identical patterns: module-level `watcher` + `debounceTimer` variables, `start*()` / `stop*()` exports, same debounce logic, same error handling shape.

Meanwhile, `chokidar` (v5) is already installed and used in `src/vault/watcher-hub.ts` for more robust file watching.

**Recommendation:** Extract a generic `createFileWatcher(dir, filter, onChange, debounceMs)` into `src/shared/` that returns `{ start, stop }`. Both watchers become 3-line call sites. Consider whether `chokidar` should replace raw `fs.watch` here too (chokidar handles editor temp-file noise and cross-platform quirks).

---

## 6. Status Badge/Color Mapping (MEDIUM)

**Five separate status-to-color mapping functions** in dashboard scheduling components:

| File                            | Function             |
| ------------------------------- | -------------------- |
| `trigger-runs-table.tsx:45`     | `statusBadge()`      |
| `system-cron-card.tsx:39`       | `statusDot()`        |
| `pending-jobs-queue.tsx:30`     | `statusColor()`      |
| `cron-detail-panel.tsx:33`      | `statusBadgeClass()` |
| `cron-run-history-table.tsx:38` | `statusBadge()`      |

All map status strings (completed, failed, running, etc.) to Tailwind color classes.

**Recommendation:** Create a shared `getStatusStyle(status: string): { color, label, badgeClass }` in `dashboard/src/features/scheduling/lib/` and import it in all five components.

---

## 7. `formatDate` Duplication in Dashboard (LOW)

`formatDate()` exists in two places:

| Location                                                                | Behavior                                                                           |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `dashboard/src/lib/date-utils.ts:23`                                    | `date.toLocaleString()` (full datetime)                                            |
| `dashboard/src/features/finance/components/account-transactions.tsx:23` | `toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })` |

**Recommendation:** Add a `formatShortDate()` variant to the existing `date-utils.ts` and use it from the finance component.

---

## 8. Raw HTTP Server as Micro-Framework (LOW)

`src/scheduling/trigger-server.ts` is a 200+ line hand-rolled HTTP router on top of `node:http.createServer`. It manually:

- Parses URL paths and routes to handlers
- Reads request bodies with size limits
- Handles HMAC auth verification
- Returns JSON responses

This is not inherently wrong for a small internal server, but it has grown to 10+ route handlers imported from `src/scheduling/routes/`. At this scale, a minimal framework like `Hono` (3KB, zero deps, same API style) would reduce boilerplate and improve maintainability.

**Recommendation:** Not urgent, but if the route count continues to grow, consider migrating to Hono. It would eliminate the manual body parsing, routing, and content-type handling.

---

## 9. `deepMerge` in config.ts (LOW)

`src/core/config.ts:253` has a hand-rolled `deepMerge()` function. This is a common utility available in many packages, but the implementation is small (15 lines) and only used in one place (`mergeConfig`). Additionally, `JSON.parse(JSON.stringify(config))` is used on line 278 for deep cloning instead of `structuredClone()`.

**Recommendation:** Replace `JSON.parse(JSON.stringify(...))` with `structuredClone()` (available in Node 17+, this project runs Node 22). The `deepMerge` is small enough to keep, but note it doesn't handle arrays (treats them as atomic values).

---

## 10. `escapeHtml` in telegram.ts (LOW)

`src/channels/telegram.ts:52` has a 1-line `escapeHtml()` that replaces `&`, `<`, `>`. This is fine for Telegram's limited HTML subset, but if HTML escaping is ever needed elsewhere, it should be shared. No action needed currently.

---

## 11. Custom Token Rate Limiting vs. Convex Rate Limiter (LOW)

The project has `@convex-dev/rate-limiter` (v0.3.2) installed as a dependency, yet `src/rate-limit/limiter.ts` implements a fully custom token-budget rate limiter with session and daily limits. These serve different purposes -- the Convex rate limiter is for API-level rate limiting, while the custom one is for LLM token budgets -- so this is **not** true duplication, but worth noting for awareness.

---

## Summary Table

| #   | Finding                     | Severity | Locations              | Action                     |
| --- | --------------------------- | -------- | ---------------------- | -------------------------- |
| 1   | Frontmatter parsing x3      | HIGH     | 3 files in src/        | Consolidate on gray-matter |
| 2   | Two YAML libraries          | MEDIUM   | package.json           | Drop js-yaml               |
| 3   | Relative time formatting x4 | HIGH     | 1 src/ + 3 dashboard/  | Consolidate per project    |
| 4   | Currency formatting x4      | HIGH     | 4 dashboard files      | Extract to lib/            |
| 5   | File watcher boilerplate x2 | MEDIUM   | 2 src/ files           | Extract generic watcher    |
| 6   | Status badge mapping x5     | MEDIUM   | 5 dashboard components | Extract shared helper      |
| 7   | formatDate x2               | LOW      | 2 dashboard files      | Use existing date-utils    |
| 8   | Raw HTTP micro-framework    | LOW      | trigger-server.ts      | Consider Hono if growing   |
| 9   | deepMerge + JSON clone      | LOW      | config.ts              | Use structuredClone        |
| 10  | escapeHtml                  | LOW      | telegram.ts            | Fine as-is                 |
| 11  | Custom rate limiter         | LOW      | rate-limit/            | Not true duplication       |

**Estimated cleanup effort:** Items 1-6 are each 15-30 minutes of work. Total: ~2-3 hours for all HIGH and MEDIUM items.
