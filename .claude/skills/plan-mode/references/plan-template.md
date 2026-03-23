# Plan Template for Agent Team Consumption

This template produces plans optimized for the `agent-team-implement` skill.
The plan grounds the team in real codebase context — preventing hallucinations
by anchoring every section in verified file paths, real types, and actual
integration points.

## YAML Frontmatter Schema

Every plan starts with YAML frontmatter between `---` markers. This metadata is
machine-parseable and drives downstream automation:

| Field                       | Required | Description                                            |
| --------------------------- | -------- | ------------------------------------------------------ |
| `plan_version`              | Yes      | Schema version (currently `1`)                         |
| `created`                   | Yes      | ISO date (`YYYY-MM-DD`)                                |
| `title`                     | Yes      | Human-readable feature name                            |
| `status`                    | Yes      | One of: `draft`, `approved`, `in-progress`, `complete` |
| `tier`                      | Yes      | `simple` (1-3 files), `medium` (4-8), `complex` (9+)   |
| `domain_tags`               | Yes      | List of tags from known set (see below)                |
| `team_hint.size`            | No       | Expected team size (e.g., `3-7`)                       |
| `team_hint.estimated_files` | No       | Total files to create + modify                         |
| `files.create`              | Yes      | List of `{ path }` objects for new files               |
| `files.modify`              | Yes      | List of `{ path }` objects for existing files          |
| `verification.preflight`    | No       | Filled by plan-reviewer (pass/fail)                    |
| `verification.score`        | No       | Filled by plan-verifier (0-100)                        |

**Known domain tags:** `convex`, `dashboard`, `trigger`, `sdk`, `api`, `testing`,
`channels`, `memory`, `scheduling`, `agents`, `vault`, `daemon`, `skills`,
`security`, `health`, `integrations`, `scripts`

## Template

````markdown
---
plan_version: 1
created: YYYY-MM-DD
title: "Feature Name"
status: draft
tier: medium # simple (1-3 files), medium (4-8), complex (9+)
domain_tags: [tag1, tag2] # Known: convex, dashboard, trigger, sdk, api, testing, channels, memory, scheduling, agents, vault, daemon, skills, security, health, integrations
team_hint:
  size: 3-7
  estimated_files: N
files:
  create:
    - path: src/slice/new-file.ts
  modify:
    - path: src/slice/existing.ts
verification:
  preflight: null # Filled by plan-reviewer
  score: null # Filled by plan-verifier
---

# [Feature Name]

## Goal

[2-3 sentences. What are we building and why? One clear outcome.]

## Architecture

[Short paragraph or bullet list. How the new code fits into the existing
system. Name real slices, real modules, real patterns. This is the most
important section — it anchors the architect in reality.]

- [Where in the codebase this lives (slice, directory)]
- [How it connects to existing systems]
- [Key pattern to follow (name the most similar existing feature)]

## Files

| File                   | Action        | What                |
| ---------------------- | ------------- | ------------------- |
| `real/path/to/file.ts` | Create/Modify | [Brief description] |

[Include every file you expect to be created or modified. The architect
refines this, but starting with real paths prevents invented module names.
Mark new files as "Create", existing files as "Modify".]

## File Structure

[For plans creating 3+ new files: directory tree showing where new files sit
relative to existing code. Omit for simple plans.]

## Key Types

[The contracts. Function signatures, type shapes, important enums. Use
real type names from the codebase where extending existing types. These
are what tests will assert against.]

```typescript
// Use actual codebase conventions (interfaces vs types, naming patterns)
interface NewThing {
  field: ExistingType; // reference real types
}

function newCapability(input: InputType): OutputType;
```

## Integration Points

[Where new code touches existing code. Name exact functions, exports,
or bus events. This prevents "works in isolation but doesn't wire up".]

- `src/slice/file.ts:functionName()` — [how new code connects here]
- `src/other/index.ts` — [barrel export needed]
- Bus event: `domain:event_name` — [who emits, who listens]

## Constraints

[Things the team would get wrong without being told. Omit entirely if
there are no non-obvious gotchas. Only include codebase-specific gotchas,
not general programming knowledge.]
````

## What Makes a Good Plan

**Length matches tier.** Simple: 30-80 lines. Medium: 60-200. Complex: 100-400.
Over 400 lines means you should split into multiple plans.

**Real paths verified against the codebase.** Every file path in the plan
should come from a Glob/Grep result, not from guessing.

**Types that extend existing types.** Reference real type names from the
codebase. `interface NewThing extends ExistingThing` grounds the architect
better than inventing from scratch.

**Integration points name real functions with verified code.** "Hook into the
existing pipeline" is vague. Include the exact function signature, import path,
and wiring code for every place new code connects to existing code.

**Use `- [ ]` checkboxes** for task items within phases to enable progress
tracking during implementation.

## What TO Include

- Exact function signatures at integration points (verified from codebase)
- Import paths with `.js` extensions (ESM convention)
- Barrel export additions (`index.ts` changes)
- Bus event wiring (`bus.on('domain:event', handler)`)
- Convex schema definitions (new tables, indexes)
- `- [ ]` checkboxes for trackable tasks

## What NOT to Include

- Implementation bodies (the team writes code via TDD — only include contracts)
- Test code (the test-writer designs tests from the plan's contracts)
- Step-by-step execution instructions (that's the solo `executing-plans` format)
- Commit messages, line numbers for insertions, design rationale essays
- General programming knowledge Claude already has
