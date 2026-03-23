---
name: feature-spec
description: Writes a formal feature specification at Docs/specs/ — objective, behavior, boundaries, and technical pointers for plan mode. Use when designing before building: "spec this feature", "write a spec", "requirements". Follows /feature-coach.
argument-hint: "[feature-name or description]"
---

# Feature Spec Skill

Write feature specifications for a solo developer who uses Claude Code plan mode to turn specs into technical plans. Specs define **what** to build and **why** — plan mode figures out **how**.

## Workflow

```
1. GATHER  → Understand the feature from user input + codebase exploration
2. WRITE   → Fill the template at .claude/skills/feature-spec/template.md
3. SAVE    → Write to Docs/specs/YYYY-MM-DD-feature-name.md
4. HANDOFF → User enters plan mode with the spec
```

## Producing the Spec

Read the template at `.claude/skills/feature-spec/template.md`. Copy it to `Docs/specs/YYYY-MM-DD-feature-name.md` (create the directory if needed), then fill every section — replacing placeholders and HTML comments with real content. Do not add, remove, or reorder sections.

Before writing, explore the codebase to ground the spec in reality: read relevant source files, check existing patterns, understand the data model. A spec disconnected from the codebase is useless to plan mode.

## Spec-Writing Guidelines

### Behavior over architecture

Describe what happens, not how to build it. Plan mode decides architecture.

- Good: "When the user sends 'summarize my week', return highlights, blockers, and patterns from the last 7 daily notes"
- Bad: "Create a WeekSummarizer class that uses a strategy pattern"

### File paths are exploration hints

Point plan mode to relevant code, don't prescribe changes.

- Good: "The context pipeline lives in `src/context.ts` — this feature extends context assembly"
- Bad: "Modify `src/context.ts` lines 45-60 to add a new loader function"

### Boundaries are the most important section

The three-tier system (Always / Ask first / Never) is scope control for both you and plan mode:

- **Always**: Invariants plan mode must not break
- **Ask first**: Decisions requiring human review before proceeding
- **Never**: Hard constraints preventing over-engineering or scope creep

When unsure, default to **Ask first**.

### Scenarios are acceptance criteria

Every "When X, then Y" becomes a verification target. Plan mode designs implementation to satisfy all scenarios and includes them as verification steps. Write 3-8 scenarios covering: happy path, edge cases, error conditions.

### Keep specs under 200 lines

Plan mode needs context budget for codebase exploration. A bloated spec crowds out the code it needs to read. If a spec exceeds 200 lines, the feature is too big — split it.

### Scope ruthlessly

- v1 should be embarrassingly simple. If you're not uncomfortable with how little it does, it's too big.
- Every addition needs a subtraction. Adding a requirement? Cut or defer something else.
- "Would I use this today?" — if yes even in simplest form, ship that form.

## After the Spec

1. Enter plan mode (shift+tab twice or `/plan`)
2. Tell plan mode: "Read the spec at `Docs/specs/YYYY-MM-DD-feature-name.md` and create a technical plan"
3. Review the plan — check boundaries are respected and scope matches v1
4. Approve and execute

## Example: Well-Written Spec Sections

**Objective** (concrete, measurable):

> Add a `/recap` command that summarizes the user's week from daily notes. Done = the agent returns a structured markdown summary covering highlights, blockers, and patterns when the user sends "recap my week".

**Desired Behavior** (scenarios, not implementation):

> - When user sends "recap my week", agent reads the last 7 daily notes and returns a summary with Highlights, Blockers, and Patterns sections
> - When fewer than 3 daily notes exist for the period, agent warns about limited data before summarizing
> - When no daily notes exist, agent responds with a helpful message explaining how to create them

**Boundaries** (specific, not generic):

> Always: Vault files outside `_agent/` and `Inbox/` remain read-only
> Ask first: Adding new npm dependencies, changing the system prompt structure
> Never: Sending data to external services, modifying existing daily notes
