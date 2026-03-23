---
name: wheel-detector
description: >
  Scans a codebase for hand-rolled implementations that could be replaced by trusted, well-maintained libraries.
  Checks installed dependencies for underused packages, explores codebase for substantial custom code that
  duplicates library functionality, and uses web search to verify replacements. Produces a structured report
  with confidence levels, migration difficulty, and a priority-ranked action plan.
  Use this skill whenever the user asks to "find reinvented wheels", "audit for unnecessary custom code",
  "find code that could use a library instead", "what packages could simplify my code", "find hand-rolled
  implementations", "reduce custom code", "library audit", "find duplicate utilities", or any request to
  identify custom implementations that duplicate existing open-source library functionality. Also trigger
  when the user asks to "simplify the codebase", "reduce maintenance burden", "find things we're doing
  the hard way", "deduplicate code", or "find copy-pasted utilities".
---

# Wheel Detector

Finds hand-rolled code in your codebase that could be replaced by trusted libraries — saving maintenance effort, reducing bugs, and leveraging battle-tested implementations.

## Why This Matters

Hand-rolled code isn't inherently bad. A 5-line utility is fine. But when you've written 80 lines to parse cron expressions, validate emails, manage retry logic, or build a task queue — and a library with thousands of users already handles the edge cases you haven't thought of — that's technical debt hiding in plain sight. Even worse: sometimes the library is already in your `package.json` but nobody's using it. This skill finds both cases systematically.

## How It Works

Four phases, in order:

1. **Inventory** — Read `package.json` to know what's already installed
2. **Discover** — Explore the codebase for hand-rolled candidates
3. **Match** — For each candidate, find library alternatives (prioritizing already-installed deps)
4. **Report** — Structured findings with actionable recommendations

## Phase 1: Inventory (Do This First)

Before scanning any code, read `package.json` (or the project's equivalent dependency manifest). Build a mental map of what libraries are already available. This is the highest-value step because "you already have this installed but aren't using it" is a stronger finding than "you should install this new thing."

Pay special attention to:

- **Utility libraries** that might be underused (`lodash`, `date-fns`, `zod`, `gray-matter`, etc.)
- **Libraries whose scope is broader than their current usage** (e.g., `zod` installed for one schema but not used for other runtime validation)
- **Duplicate libraries** solving the same problem (e.g., both `yaml` and `js-yaml`, or both `got` and `axios`)

Record the full dependency list — you'll cross-reference it against every candidate in Phase 3.

## Phase 2: Discover Candidates

### Scope

Scan the entire codebase by default. If the user specifies a scope (e.g., "just check src/utils/"), honor it.

Ignore these by default:

- `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`
- Generated files (`.d.ts` from codegen, lock files)
- Test files (only flag if the helper is >50 lines and clearly reimplements a test utility)
- Configuration files

### What to Look For

Focus on **substantial** implementations — not every 3-line helper. A good candidate is typically:

- **>20 lines of logic** (not counting imports, types, comments)
- **Solves a general problem** (not deeply domain-specific business logic)
- **Has recognizable patterns** that map to known library categories

Common categories:

| Category             | Signals                                                  | Example Libraries             |
| -------------------- | -------------------------------------------------------- | ----------------------------- |
| Date/time            | Custom parsing, formatting, timezone math, relative time | date-fns, dayjs, luxon        |
| Validation           | Email regex, schema validation, phone parsing            | zod, yup, validator.js        |
| Retry/backoff        | Exponential backoff, retry with jitter, circuit breakers | p-retry, cockatiel            |
| Concurrency          | Semaphores, worker pools, concurrency limiters           | p-queue, p-limit, async-mutex |
| HTTP routing         | Custom request routing, body parsing, middleware         | fastify, hono, express        |
| Atomic file ops      | Write-temp-then-rename, safe writes                      | write-file-atomic             |
| Git operations       | Shell-exec git wrappers                                  | simple-git                    |
| Deep merge/clone     | Recursive object merge, deep copy                        | deepmerge, structuredClone    |
| Markdown/frontmatter | YAML frontmatter extraction, markdown parsing            | gray-matter, marked, remark   |
| Cron parsing         | Cron expression parsing, schedule calculation            | cron-parser, croner           |
| CLI args             | Custom argument parsing                                  | commander, yargs              |
| Glob/path            | Custom glob matching                                     | micromatch, globby            |
| Topological sort     | DAG ordering, dependency resolution                      | toposort                      |

This table isn't exhaustive — use judgment. The key question is: "Does this code solve a general problem that the open-source ecosystem has already solved well?"

### Exploration Strategy

**If you have access to the Agent tool** (i.e., you can spawn subagents), split the codebase into logical chunks and spawn Explore subagents in parallel — one per top-level source directory. Give each explorer a focused prompt asking it to find hand-rolled candidates in its directory (not to suggest libraries — just identify candidates).

**If you can't spawn subagents** (e.g., you're running as a subagent yourself), explore directories sequentially. Start with directories most likely to contain utilities (`shared/`, `utils/`, `lib/`, `core/`, `helpers/`) then work outward. Use Grep to search for patterns like `function retry`, `class Queue`, `deepMerge`, `function debounce`, `createServer`, `frontmatter`, etc.

**Also look for internal duplication** — the same utility function copy-pasted across multiple files (e.g., 4 different `formatCurrency()` implementations, 3 separate frontmatter parsers). Internal duplication is a reinvented wheel too, just reinventing your own code.

### Deduplication

If multiple files import from the same utility module, that's one candidate, not many. Deduplicate by source location.

## Phase 3: Match Libraries

For each candidate from Phase 2, find library alternatives.

### Step 1: Check already-installed dependencies

Cross-reference every candidate against the dependency list from Phase 1. If a candidate reimplements something that an installed library already does, that's an "Already Installed But Unused" finding — the strongest category. These are free wins: no new dependency, no bundle size increase, just use what you're already paying for.

### Step 2: Suggest library alternatives

For each candidate, suggest a well-known library replacement. For established libraries you're confident about (e.g., `p-retry` for retry logic, `p-limit` for concurrency), your training knowledge is sufficient.

If web search or Context7 tools are available, use them to verify your top suggestions — libraries get deprecated, new ones emerge, download counts change. But don't block on this; a good suggestion from training knowledge is better than no suggestion.

When evaluating libraries, consider:

- GitHub stars (>500 preferred, >1000 strong signal)
- Recent maintenance (commits in last 6 months)
- Weekly downloads (>10k preferred)
- TypeScript support (if the project uses TypeScript)
- No known critical vulnerabilities

### Step 3: Rate each finding

**Confidence:**

- **High** — Library is widely used, clearly covers the use case, hand-rolled code has known gaps. Migration is straightforward.
- **Medium** — Library fits, but hand-rolled code is simple enough that the benefit is marginal, or migration requires refactoring.
- **Low** — A library exists but the hand-rolled code is tailored enough that a swap is non-trivial, or the library is less established.

**Migration difficulty:**

- **Easy** — Drop-in replacement, change imports. <1 hour.
- **Moderate** — Refactor callers, adjust types/patterns. 1-4 hours.
- **Hard** — Deeply integrated, many callers, behavioral differences. >4 hours.

## Phase 4: Report

Generate a structured report. Save it as `WHEEL-DETECTOR-REPORT.md` in the project root (or a docs directory). Also present a summary in the conversation.

### Per-Finding Format

```markdown
### [Category]: [Brief description]

**File:** `src/utils/retry.ts:15-68` (54 lines)
**What it does:** Custom retry with exponential backoff, max attempts, and jitter
**Confidence:** High
**Migration difficulty:** Easy

**Suggested library:** `p-retry` (npm: 2.1M weekly downloads, 850+ stars)

- Handles exponential backoff, jitter, abort signals, custom retry conditions
- Already handles edge cases the current implementation misses (e.g., non-retryable errors)

**Why replace:**

- Current implementation doesn't distinguish retryable vs non-retryable errors
- No abort signal support
- p-retry is 1.2KB and has zero dependencies

**Next step:** `npm install p-retry` and replace usage in 3 call sites
```

### Report Structure

```markdown
# Wheel Detector Report

## Summary

- **Scanned:** {N} directories, {M} files
- **Candidates found:** {X}
- **High confidence replacements:** {Y}
- **Already installed but unused:** {Z}
- **Estimated maintenance savings:** {description}

## Already Installed But Unused

[Highest-value section — libraries already in package.json that could replace hand-rolled code]

## High Confidence

[findings...]

## Medium Confidence

[findings...]

## Low Confidence

[findings...]

## Internal Duplication

[Utilities copy-pasted across multiple files that should be consolidated]

## Skipped

[Brief list of things considered but excluded, with why]

## Priority Ranking

[Ordered list: what to tackle first based on impact × ease]
```

Note: "Already Installed But Unused" comes first because those are the highest-ROI findings — zero new dependencies, just use what's already there.

## Important Guidelines

- **Don't flag business logic.** A function that calculates insurance premiums using company-specific rules isn't a "reinvented wheel" — it's domain logic.
- **Don't recommend obscure libraries.** A library with 12 stars and no commits in 2 years is worse than hand-rolled code.
- **Respect existing choices.** If the project already uses a library ecosystem (e.g., lodash), suggest additions from that ecosystem first.
- **Consider bundle size.** For frontend/edge code, don't recommend heavyweight libraries.
- **Check the runtime.** Make sure suggested libraries work in the project's environment.
- **Be honest about marginal cases.** If a 15-line utility works fine, say so. The goal is to reduce maintenance burden, not maximize dependency count.
- **Include a "Why keep" counterargument** for Medium and Low findings — this builds trust and helps the user make informed decisions.
