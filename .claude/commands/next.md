---
description: "Assess Aura codebase health and recommend highest-impact next development task"
---

# /next — What To Build Next for Aura

Assess the current state of the Aura agent codebase and recommend 1-3 concrete development tasks using the Fix → Remove → Build priority ladder.

## Step 1: Gather Signals (run in parallel)

Read from the Aura codebase at /Users/desha/Aura:

1. `Docs/NORTH-STAR.md` — Vision + "What to Build Next" tiers (High-Impact / Medium-Term / Aspirational)
2. `Docs/plans/INDEX.md` — Scan for recent plans (last 7 days) to understand what's been planned vs shipped
3. `CLAUDE.md` — Current architecture description, conventions, known patterns

Run these commands in /Users/desha/Aura:

4. `git log --oneline -10` — Recent development momentum (what's been shipped)
5. `git status` — Uncommitted work, current branch
6. `npm run typecheck 2>&1 | tail -20` — Compilation health (errors = top priority)
7. `grep -r "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" -c` — Count of known issues in source

## Step 2: Assess Health

Check each layer and flag issues:

| Layer             | What to check                                               | Red flag                                  |
| ----------------- | ----------------------------------------------------------- | ----------------------------------------- |
| **Compilation**   | Does typecheck pass?                                        | Any errors = fix first                    |
| **Dead code**     | Any files/exports with zero importers?                      | Modules that exist but nothing calls them |
| **Broken wiring** | Are declared features actually called from execution paths? | Implemented but never invoked             |
| **Test coverage** | Do existing tests pass? Any test files for deleted code?    | Failing tests or orphaned test files      |
| **Config drift**  | Does CLAUDE.md / NORTH-STAR.md match actual code?           | Docs describe deleted features            |

For each issue found, note: **what's wrong**, **which file(s)**, and **estimated effort** (small/medium/large).

## Step 3: Prioritize Using the Ladder

Apply this strict priority order — never recommend building new features while broken things exist:

### Tier 1: FIX (broken things that silently fail)

- Features that are wired but produce wrong results
- Configs/schedules that parse incorrectly
- Data pipelines where data never arrives at the consumer
- Security issues from code review findings

### Tier 2: REMOVE (dead code and over-engineering)

- Entire modules with zero callers
- Functions that throw "not implemented"
- Abstractions that wrap a single call path
- Test files testing deleted code

### Tier 3: BUILD (new capabilities from the North Star)

- Only after Tiers 1-2 are clear
- Prefer "High-Impact, Buildable Now" items from NORTH-STAR.md
- Prefer items that unlock other items (foundations before features)
- Prefer items with existing plans in Docs/plans/

## Step 4: Output

### VERDICT

> **Do this next:** {single highest-priority item}
> **Tier:** Fix / Remove / Build
> **Why:** {1 sentence on impact — what breaks without this, or what it unlocks}
> **First step:** {the literal code change to make — file path + what to modify}

### RUNNER-UP

> **Then do:** {second priority item}
> **Tier:** Fix / Remove / Build
> **Why:** {1 sentence}

### CODEBASE HEALTH

- **Typecheck:** pass/fail ({N} errors if failing)
- **Uncommitted work:** {summary of git status}
- **Recent momentum:** {what the last 3-5 commits addressed}
- **Known debt:** {count of TODO/FIXME/HACK markers}

### WHAT NOT TO BUILD YET

List 1-2 items from NORTH-STAR.md that are tempting but premature given current health. Explain why briefly.

## Rules

- Be specific about files and line ranges. "Fix the context pipeline" is bad. "Update src/agent/context-summary.ts:21-29 to read from Tasks/\*.md instead of deprecated \_agent/tasks.md" is good.
- If git status shows uncommitted changes, assess whether to commit them first or continue the current work.
- Check if a plan already exists in Docs/plans/ before recommending work — reference it if so.
- Keep the entire output under 400 words. This is a decision tool, not an audit.
- The goal is to make Aura more useful at keeping tasks and projects moving — prioritize features that close the loop between vault data and agent action.
