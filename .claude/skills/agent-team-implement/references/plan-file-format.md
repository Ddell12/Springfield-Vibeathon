# Plan File Format for Agent Team Implementation

Plan files live in `Docs/plans/` and are consumed by the agent team skill.
They ground the researcher and architect in real codebase context to prevent
hallucinations. A good plan says WHAT to build and WHERE it fits — not HOW
to code it (that's the team's job).

## YAML Frontmatter (Contract Layer)

Plans can include YAML frontmatter at the top (between `---` markers) that
enables machine-parseable metadata for the implementation pipeline. This is
the **contract** between `plan-mode` and `agent-team-implement`.

The canonical frontmatter schema is defined in
`.claude/skills/plan-mode/references/plan-template.md`.

```yaml
---
plan_version: 1
created: YYYY-MM-DD
title: "Feature Name"
status: draft | approved | in-progress | complete
domain_tags: [convex, dashboard, trigger, sdk, api, testing]
team_hint:
  size: 3-7
  estimated_files: N
files:
  create:
    - path: src/slice/new-file.ts
  modify:
    - path: src/slice/existing.ts
verification:
  preflight: pass | fail | null
  score: null
---
```

### Key Fields

- **domain_tags**: Drives skill injection — the architect invokes skills matching
  these tags (e.g., `convex` -> "convex-dev" skill). See domain-skill-map.md.
- **files**: Machine-parseable file lists. The researcher validates these against
  the codebase; the verifier cross-references post-implementation.
- **team_hint**: Guides team sizing. `size: 3` means 1 implementer; `size: 5+`
  means split into 2 implementers.
- **verification**: Filled by the plan-reviewer (preflight) and plan-verifier (score).

### Backward Compatibility

Plans without YAML frontmatter still work in **degraded mode**:

- No automatic domain skill injection (architect uses hardcoded conditionals)
- No file list validation by the researcher
- No team sizing hints (lead decides based on file count)
- The researcher detects missing frontmatter and proceeds with standard exploration

Always prefer plans with frontmatter for the full pipeline benefits.

## Required Sections

### 1. Goal (2-3 sentences)

What are we building and why? One clear outcome statement.

```
## Goal

Add graph-based relationships to the memory system so agents can traverse
connected knowledge (entities + relationships) instead of only doing flat
vector search.
```

### 2. Architecture Overview (short paragraph or bullet list)

How the new code fits into the existing system. Name real slices, real modules,
real patterns. This is the single most important section for preventing
hallucinations — it anchors the architect in reality.

```
## Architecture

- New Convex tables `entities` and `relationships` in `convex/schema.ts`
- Extraction pipeline in `src/memory/graph-extract.ts` (runs after existing
  flat extraction in `src/memory/extract.ts`)
- Retrieval in `src/memory/graph-retrieval.ts` (parallel with flat search
  in `src/memory/retrieval.ts`, merged into system prompt)
- Thin Convex adapter in `src/convex-sync/graph.ts`
```

### 3. Files (table: path, action, description)

Approximate file list. The architect will refine this, but starting with real
paths prevents invented module names.

```
## Files

| File | Action | What |
|------|--------|------|
| `convex/schema.ts` | Modify | Add entities + relationships tables |
| `convex/memory/graph.ts` | Create | CRUD functions for graph tables |
| `src/memory/graph-extract.ts` | Create | LLM extraction pipeline |
| `src/memory/graph-retrieval.ts` | Create | 2-hop traversal + merge |
| `src/memory/extract.ts` | Modify | Hook graph extraction after flat |
| `src/memory/retrieval.ts` | Modify | Parallel graph search |
| `src/convex-sync/graph.ts` | Create | Thin adapter |
```

### 4. Key Types / Interfaces

The contracts. Function signatures, type shapes, important enums. These are
what tests will assert against, so getting them right here saves the most
rework. Use real type names from the codebase where extending existing types.

```
## Key Types

interface Entity {
  name: string;
  type: "person" | "project" | "concept" | "tool";
  embedding: number[];
  confidence: number;
}

interface Relationship {
  source: Id<"entities">;
  relationship: string; // e.g. "works_on", "depends_on"
  destination: Id<"entities">;
  memoryIds: string[];
  confidence: number;
}

// Extends existing MemoryContext from src/memory/retrieval.ts
interface MemoryContext {
  // ...existing fields
  graphContext: string; // NEW - formatted graph traversal results
}
```

### 5. Integration Points

Where new code touches existing code. Name the exact functions, exports, or
bus events. This prevents the "works in isolation but doesn't wire up" failure.

```
## Integration Points

- `src/memory/extract.ts:extractMemories()` — call graph extraction after
  flat extraction completes
- `src/memory/retrieval.ts:buildMemoryContext()` — add parallel graph search,
  merge results into `graphContext` field
- `src/agent/tools.ts` — add `graph_query` MCP tool
- `src/memory/index.ts` — re-export graph modules from barrel
```

### 6. Constraints / Gotchas (only if they exist)

Things the team would get wrong without being told. Omit this section entirely
if there are no non-obvious gotchas.

```
## Constraints

- Convex vector indexes need `dimensions: 1536` (OpenAI embedding size)
- `(api as any)` cast needed until `npx convex dev` regenerates types
- Graph search must not block flat search — run in parallel with Promise.all
- Entity names should be lowercased and deduplicated before insert
```

## What NOT to Include

- **Full implementation code** — the team writes code via TDD
- **Test code** — the test-writer designs tests from the architect's plan
- **Step-by-step execution instructions** — that's the solo `executing-plans` format
- **Commit messages** — the lead handles git workflow
- **Line numbers for insertions** — the researcher finds the right spots
- **Design rationale essays** — keep it to facts the team needs

## Size Guide

A good plan file for the agent team skill is **40-120 lines**. If it's longer,
you're probably including implementation details that belong in the TDD cycle.
If it's shorter, you're probably missing types or integration points that will
cause hallucinations.
