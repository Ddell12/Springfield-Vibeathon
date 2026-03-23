---
name: plan-mode
description: >
  Structured planning workflow for implementation tasks — separates research from execution.
  Replicates Claude Code's native plan mode: read-only codebase exploration, requirement gathering
  via interview, structured markdown plan creation, user approval before any code changes.
  Use this skill whenever the user asks to "plan", "make a plan", "think before coding",
  "design the approach first", or when facing any non-trivial implementation task that touches
  multiple files or has multiple valid approaches. Also trigger when the user says "plan mode",
  "/plan", or "explore first then implement". Even if the user just describes a feature without
  asking for a plan, use this skill if the task is complex enough to benefit from upfront design.
---

# Plan Mode

This skill replicates Claude Code's native plan mode as a structured workflow. The core idea: **separate research from execution** so you understand the problem deeply before writing a single line of code.

Plan mode prevents the most common AI coding failure — "ready, fire, aim" — where you jump into implementation, solve the wrong problem, then waste time undoing work.

## Configuration

- **Model:** Use the `opusplan` model alias. This uses Opus for planning phases (superior reasoning for architecture decisions) and automatically switches to Sonnet for execution (faster, more cost-efficient for code generation).
- **Permission mode:** Always use `bypassPermissions` mode. Plan mode's safety comes from the workflow discipline (read-only during exploration, approval gate before execution) — not from permission prompts. Bypassing permissions eliminates interruptions and lets the agent work autonomously within the structured phases.
- **Plans directory:** Always save plans to the **current project's** plans directory (e.g., `Docs/plans/` or whatever the project convention is). Never save to a global location like `~/.claude/plans/`. Plans belong with the project they describe — they're version-controlled artifacts, not ephemeral session data.

## When to Use This

Use plan mode for any task where jumping straight to code would be risky:

- **Multi-file changes** — touching 3+ files means you need to understand how they connect
- **Multiple valid approaches** — caching (Redis vs in-memory vs file), auth (JWT vs session), state management (Redux vs Context)
- **Unclear requirements** — the user said "make it faster" or "fix the bug" without specifics
- **Architectural decisions** — adding a new system, changing data flow, introducing a pattern
- **Unfamiliar code** — you haven't read the relevant files yet

Skip plan mode for trivial tasks: typo fixes, single-line changes, adding a log statement, or tasks where the user gave very specific instructions.

## Complexity Tiers

Before starting, classify the task:

| Tier    | Files | Process                                        | Agents         | Plan Length   |
| ------- | ----- | ---------------------------------------------- | -------------- | ------------- |
| Simple  | 1-3   | Skip agents. Explore yourself, write lean plan | None           | 30-80 lines   |
| Medium  | 4-8   | One research agent (analyst OR docs)           | 1 agent + you  | 60-200 lines  |
| Complex | 9+    | Full trio (analyst + docs-researcher)          | 2 agents + you | 100-400 lines |

When in doubt, start Simple and escalate if exploration reveals more complexity.

## The Four Phases

```
Phase 1: EXPLORE  ──>  Phase 2: PLAN  ──>  Phase 3: APPROVE + TRACK  ──>  Phase 4: HANDOFF
  (read-only)         (write plan)        (user reviews + Linear)          (contract handoff)
```

### Phase 1: Explore (Read-Only Research)

**Goal:** Deeply understand the codebase and requirements before proposing anything.

**Rules during exploration:**

- Use ONLY read-only tools: `Read`, `Glob`, `Grep`, `WebSearch`, `WebFetch`
- Do NOT edit files, run Bash commands that modify state, or write new files
- Do NOT propose solutions yet — you're gathering information

**What to explore:**

1. **Understand the request** — What exactly does the user want? If unclear, ask clarifying questions before exploring code. Interview the user about edge cases, constraints, and preferences they haven't mentioned.

2. **Map the relevant code** — Find the files, functions, and patterns involved:
   - Use `Glob` to find files by name/pattern
   - Use `Grep` to find usage patterns, imports, and references
   - Use `Read` to understand the actual implementation
   - Follow the dependency chain — if file A imports from B, read B too

3. **Identify existing patterns** — How does the codebase already handle similar things? Look for:
   - Naming conventions
   - Error handling patterns
   - Test conventions
   - Architecture patterns (see CLAUDE.md and any rules/ files)

4. **Check constraints** — Look for things that limit your options:
   - Build system requirements
   - Framework limitations
   - Cross-slice import rules or other architecture boundaries
   - Existing tests that must continue passing

5. **Research unknowns** — If the task involves unfamiliar APIs or libraries:
   - Use `WebSearch` or `WebFetch` for current documentation
   - Check package.json / requirements.txt for installed versions
   - Read existing usage in the codebase for patterns to follow

**Use sub-agents based on complexity tier:**

- **Simple tier:** Skip sub-agents. Explore yourself with Read/Glob/Grep.
- **Medium tier:** Spawn one agent — codebase-analyst for internal code questions, docs-researcher for external library questions.
- **Complex tier:** Spawn both in parallel while you interview the user.

| Sub-Agent            | Type    | Focus                                                                  | MCP Tools       |
| -------------------- | ------- | ---------------------------------------------------------------------- | --------------- |
| **codebase-analyst** | Explore | Semantic codebase search, pattern discovery, domain tag identification | greptile        |
| **docs-researcher**  | Explore | Library docs, API verification, version compatibility                  | context7, tessl |
| **lead** (you)       | —       | User interview, requirement clarification, synthesis                   | —               |

Spawn from `agents/codebase-analyst.md` and `agents/docs-researcher.md` respectively. After sub-agents report back, synthesize their findings: resolve conflicts, identify connections, and spot gaps. See `references/subagent-patterns.md` for delegation patterns and MCP tool usage.

**Interview the user.** Don't just explore silently. Ask questions as you discover things:

- "I see you're using Express middleware pattern X. Should I follow the same pattern?"
- "There are two ways this could work: A or B. Which do you prefer?"
- "I found an existing utility that does part of this. Should I extend it or create something new?"

### Phase 2: Plan (Write the Plan)

**Goal:** Produce a lean, agent-team-ready plan with YAML frontmatter the user can review.

After exploring, write a plan using the template in
[references/plan-template.md](references/plan-template.md). The plan includes
**YAML frontmatter** (machine-parseable metadata) followed by 6 markdown sections
designed to ground an agent team in real codebase context:

**YAML Frontmatter** (at top of plan file, between `---` markers):

- `plan_version`, `created`, `title`, `status`
- `domain_tags` — drives downstream skill injection (e.g., `[convex, dashboard]`)
- `files.create` / `files.modify` — machine-parseable file lists
- `team_hint` — expected team size and split strategy
- `verification` — pre-flight and audit scores (filled after validation)

**Markdown Body** (6 sections):

1. **Goal** — 2-3 sentences: what and why
2. **Architecture** — Where it fits in the codebase (real slices, real modules)
3. **Files** — Table of paths, Create/Modify action, brief description
4. **Key Types** — Interfaces, function signatures, enums (the contracts)
5. **Integration Points** — Exact functions/exports where new code wires in
6. **Constraints** — Non-obvious gotchas (omit if none)

**Plan writing principles:**

- **Scale detail to complexity.** Simple: 30-80 lines. Medium: 60-200. Complex: 100-400.
  The goal: "lean enough to scan in 2 minutes, detailed enough that the implementer
  never has to guess at an integration point." Over 400 lines means split into multiple plans.
- **Verify every path.** Before writing a path in the plan, confirm it exists
  with Glob or Grep. Never guess file locations or function names.
- **Reference real types.** When extending existing types, name them exactly as
  they appear in the codebase. `interface NewThing extends ExistingThing` is
  grounded; `interface NewThing { field: string }` is not.
- **Name real functions in integration points.** "Hook into the pipeline" is
  vague. "`extract.ts:extractMemories()` — call graph extraction after flat"
  is grounded.
- **Include verified code at integration points.** Include exact function signatures,
  exact import paths, and exact wiring code for every place new code connects to
  existing code. Do NOT include implementation bodies or test code (the team writes
  those via TDD). DO include: type definitions the implementer must match, the exact
  function call where new code hooks in (with real argument types), barrel export
  additions, bus event subscriptions, and Convex schema additions. Rule of thumb:
  if getting it wrong would cause the implementer to hallucinate an incorrect API,
  include the verified snippet.
- **Domain tags must be accurate.** Use only tags from the known set (see
  `references/domain-skill-map.md`). These drive skill injection in the
  implementation phase.

**Save the plan.** Write it to the current project's plans directory:

- Use `Glob` to find existing plans (e.g., `Docs/plans/*.md`) and match the convention
- Default: `Docs/plans/YYYY-MM-DD-<descriptive-name>.md`
- Never save to `~/.claude/plans/` or any global location — plans live with the project

**Validate the plan (tier-based):**

- **Simple tier:** Run `validate-plan.sh` directly — no sub-agent needed.
- **Medium/Complex tier:** Spawn the plan-reviewer sub-agent from
  `agents/plan-reviewer.md`. It runs `validate-plan.sh`, checks frontmatter,
  and verifies integration points. This is fast (~30s).
- **Complex tier only:** Also recommended: run the `plan-verifier` skill for a full audit.

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/validate-plan.sh <plan-file> <project-root>
```

Fix any errors before presenting. See `references/plan-verification.md` for details.

### Phase 3: Approve + Track (User Reviews)

**Goal:** Get explicit user approval and optionally create tracking issues.

Present the plan to the user and wait for approval. Tell them:

1. Where the plan file is saved
2. They can edit it directly (modify, remove steps, add constraints, reorder)
3. Ask if they want to proceed, modify, or take a different approach entirely

**Do NOT start implementing until the user explicitly approves.** This is the critical gate.

**Optional: Create Linear issues.** If the project uses Linear for tracking and
the user wants it, create issues from the plan's tasks using the Linear MCP tools.
Update the plan's frontmatter `linear.project` field with the project reference.

Common approval responses:

- **"Looks good, go ahead"** → Proceed to Phase 4
- **"Change X"** → Update the plan, re-present
- **"I don't like this approach"** → Go back to Phase 1 or 2 with new direction
- **"Let me think about it"** → Wait. Don't prompt them.

### Phase 4: Handoff (Contract Delivery)

**Goal:** Deliver the plan as a validated contract for implementation.

The plan file with YAML frontmatter is the **contract** between plan-mode and the
implementation phase. The frontmatter enables:

- **Automatic file validation** — the implementation team's researcher validates
  paths before starting
- **Domain skill injection** — `domain_tags` tell the architect which skills to invoke
- **Team sizing** — `team_hint` guides how many implementers to spawn
- **Progress tracking** — `files.create`/`files.modify` lists are cross-referenced
  post-implementation

Present the user with two execution paths:

1. **Agent team** (recommended for 4+ files): Invoke `agent-team-implement`
   which will spawn a researcher, architect, test-writer, implementer, and
   verifier. The plan file's frontmatter feeds directly into the researcher's
   validation step and the architect's skill injection.

2. **Solo execution** (for smaller scope): Use the `executing-plans` skill
   to implement the plan yourself, working through each file sequentially.

Either way, the plan's verified file paths, types, and integration points
prevent hallucinations during implementation.

## MCP Tool Instructions

Available MCP tools for research phases:

| MCP Server   | Tool Pattern                        | Use For                                                               |
| ------------ | ----------------------------------- | --------------------------------------------------------------------- |
| **context7** | `resolve-library-id` → `query-docs` | Library documentation, API signatures, version-specific behavior      |
| **tessl**    | `tessl search`, `tessl install`     | Pre-built usage specs, version-matched APIs, hallucination prevention |
| **greptile** | `search_greptile_comments`          | Semantic codebase search, "how does X work?" questions                |
| **linear**   | `save_issue`, `list_issues`         | Issue tracking, plan-to-issue linking (Phase 3)                       |

**Tessl** distributes "tiles" — versioned bundles of specs, docs, and rules for 10,000+
libraries. Before writing API calls in a plan, check `tessl search <library>`. If a tile
exists, `tessl install <tile>` gives you version-matched patterns that are test-backed.
If Tessl is not installed, fall back to context7 + WebSearch.

**Delegation:** Sub-agents inherit MCP configuration. The codebase-analyst uses greptile;
the docs-researcher uses context7 + tessl. The lead (you) uses Linear for tracking if requested.

If a MCP tool is not configured or returns an error, fall back to standard tools
(Grep/Glob for codebase, WebSearch for docs). Never block on MCP availability.

## Using Subagents During Planning

For large or complex tasks, delegate parts of the exploration to subagents.
Spawn all subagents with `mode: "bypassPermissions"` to match the parent
session's autonomy. Use the same codebase-analyst and docs-researcher from
Phase 1 (see table above), plus a plan-reviewer for post-plan validation:

| Sub-Agent         | Type    | Use For                                         | MCP Tools |
| ----------------- | ------- | ----------------------------------------------- | --------- |
| **plan-reviewer** | Explore | Fast pre-flight validation of plan files (~30s) | —         |

Read `references/subagent-patterns.md` for specific delegation patterns and MCP
tool usage examples.

## Plan Quality Checklist

Before presenting a plan for approval, verify:

- [ ] YAML frontmatter present with `plan_version`, `tier`, `domain_tags`, `files` lists
- [ ] Domain tags are from the known set (see `references/domain-skill-map.md`)
- [ ] Plan body length matches tier (Simple: 30-80, Medium: 60-200, Complex: 100-400)
- [ ] All 5 required sections present (Goal, Architecture, Files, Key Types, Integration Points) + optional Constraints
- [ ] Every "Modify" file path verified via Glob (actually exists)
- [ ] Every "Create" path doesn't already exist (won't overwrite)
- [ ] Types reference real codebase types where extending existing ones
- [ ] Integration point snippets are verified (exact signatures from codebase, not invented)
- [ ] No implementation bodies or test code (only contracts and wiring)
- [ ] No cross-slice imports or architecture violations
- [ ] Validation script passes: `bash ${CLAUDE_SKILL_DIR}/scripts/validate-plan.sh <plan>`
- [ ] Plan-reviewer pre-flight passes (Medium/Complex tiers)

If Complex tier, also run the `plan-verifier` skill (Tier 2). See
`references/plan-verification.md` for details.

## Common Mistakes to Avoid

**Starting to code during exploration.** The whole point is to understand first. If you catch yourself wanting to "just fix this one thing" — stop. Note it in the plan instead.

**Plans that are too vague.** "Update the auth module" is not a plan. "Add `refreshToken()` to `src/auth/session.ts`, called from `src/middleware/auth.ts:handleRequest()` when token age > 50% of TTL" is a plan.

**Plans with no code snippets.** If the plan says "wire into the pipeline" without showing the exact function call and its argument types, the implementer will guess wrong at the integration point. Include verified signatures and wiring code.

**Plans with too much code.** If the plan includes complete function bodies, the implementer will copy-paste untested code. Only include contracts (signatures, types, wiring) — not implementation bodies.

**Skipping the interview.** Users often have preferences and constraints they don't mention upfront. Ask about edge cases, error handling, testing preferences, and backward compatibility before planning.

**Ignoring existing patterns.** The codebase already has conventions. Match them. Don't introduce a new error handling pattern just because you think it's better — unless the user asks for it.

**Monster phases.** If a phase has more than 8-10 tasks, split it. Large phases are hard to verify and hard to revert.

**Missing frontmatter.** Plans without YAML frontmatter work but in degraded mode — no domain skill injection, no automatic file validation, no team sizing hints. Always include frontmatter.
