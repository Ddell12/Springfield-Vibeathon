---
name: agent-team-implement
description: >
  Coordinates a multi-agent team for large feature implementation using TDD
  (tests first, then code), with research, design, shared worktree isolation,
  and automated verification. Use when implementing features with 4+ files,
  building new modules, or when the user says "implement with a team", "build
  this feature", "team implement", "implement this plan", "execute this plan",
  "build from spec", "parallel implementation", "TDD implementation", or any
  multi-file feature request that would benefit from parallel agent work. Even
  for moderately complex features, consider using this skill — the verification
  phase alone catches issues that manual review misses.
---

# Agent Team Implementation (TDD)

Orchestrate a phased implementation using an agent team and Test-Driven
Development. Tests are written **before** implementation code — the Red-Green
cycle ensures every line of production code exists to satisfy a test. A
dedicated verifier agent provides automated quality gates after merge.

**TDD phases**: Research -> Design -> Write Tests (Red) -> Implement (Green) -> Merge -> Verify (feedback loop)

**Prerequisite**: Agent teams are experimental. Ensure `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
is enabled in settings.json or environment before proceeding.

## Workflow

### 1. Understand Scope

Determine what to build based on the user's request:

- **New feature**: Greenfield code — new files, types, exports
- **Refactor**: Restructure existing code while preserving behavior
- **Module/integration**: Wire a new capability into the existing system
- **Bug fix**: Targeted change with regression test

If the scope is ambiguous, ask the user. Identify affected files, constraints,
backward compatibility requirements, and expected deliverables.

If a plan file exists (e.g., in `Docs/plans/`), read it and pass its content to
the architect in Phase 2 as additional context alongside the research report.
Also share the plan's Goal and Architecture sections with the researcher so they
know where to focus exploration.

For the plan file format that maximizes team success, see
[references/plan-file-format.md](references/plan-file-format.md).

#### Domain Skill Injection

If the plan file includes YAML frontmatter with `domain_tags`, use these to drive
skill invocations throughout the pipeline. Read `references/domain-skill-map.md`
(located at `.claude/skills/plan-mode/references/domain-skill-map.md`) for the
mapping table. The researcher validates frontmatter, the architect invokes domain
skills, and the verifier cross-references against the plan.

Plans without frontmatter still work in degraded mode — the architect falls back
to hardcoded conditionals in `references/spawn-prompts.md`.

### 2. Create the Agent Team

Create a team named `implement-{short-descriptor}` (e.g., `implement-webhook-auth`).

Use `TeamCreate` to initialize the team, then spawn teammates via the `Agent` tool
with `team_name` and `name` set. Use `subagent_type: "Explore"` for read-only agents
(researcher, architect), and `subagent_type: "general-purpose"` for agents that
write code.

Use `mode: "plan"` for implementer agents (Phase 4) to require plan approval before
they start writing code. The implementer submits a plan showing which files they'll
create/modify and how — the lead reviews and approves before implementation begins.

**Critical lead behavior:** Do NOT implement tasks yourself. Wait for each teammate
to send their completion report via `SendMessage` before advancing to the next phase.
The lead coordinates and reviews — it does not write production code.

**Broadcast messages:** Use `SendMessage` with `type: "broadcast"` to announce phase
transitions to all teammates at once. Use sparingly — broadcast token cost scales
with team size.

#### Model Selection

Use the least powerful model that can handle each role to conserve cost and speed:

| Complexity | Model | When to Use |
|------------|-------|-------------|
| Mechanical | Haiku/fast | Isolated functions, clear specs, 1-2 files |
| Standard | Sonnet | Multi-file coordination, pattern matching |
| Judgment | Opus | Architecture, design, complex review |

**Per-role defaults:**
- **Researcher**: Sonnet (broad reading, pattern recognition)
- **Architect**: Opus (design judgment, cross-system understanding)
- **Test-writer**: Sonnet (mechanical from the design plan)
- **Implementer**: Sonnet for standard tasks, Opus if task requires integration judgment
- **Verifier**: Sonnet (checklist execution)

**Complexity signals:** Touches 1-2 files with a complete spec → cheap model.
Touches multiple files with integration concerns → standard model. Requires design
judgment or broad codebase understanding → most capable model.

### 3. Worktree Isolation

Create a shared worktree before spawning any writing agents. All writing agents
(Phases 3-5) work inside this worktree directory.

**Use the `superpowers:using-git-worktrees` skill** to set up the worktree. Invoke
it with branch name `implement-<descriptor>`. The skill handles:

- Directory selection (existing `.worktrees/` > CLAUDE.md preference > ask user)
- `.gitignore` verification (prevents tracking worktree contents)
- Dependency installation (`npm install`, etc.)
- Baseline test verification (ensures clean starting point)

After the worktree skill completes, run the team-specific health check:

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/worktree-health.sh <worktree-path> implement-<descriptor>
```

For details on why a single worktree is used and how file ownership works, see
[references/worktree-guide.md](references/worktree-guide.md).

### 4. Team Roles

Spawn these 5 teammates in phases — each phase depends on the previous one:

| Teammate Name | Phase | Focus                                                       |
| ------------- | ----- | ----------------------------------------------------------- |
| `researcher`  | 1     | Patterns, reusable code, dependencies, test patterns        |
| `architect`   | 2     | Interfaces, file plan, data flow, file ownership, test plan |
| `test-writer` | 3     | Tests first — define expected behavior from the design plan |
| `implementer` | 4     | All implementation files — make tests pass                  |
| `verifier`    | 5     | Typecheck, tests, lint, structural checks — feedback loop   |

**Scaling implementers:** For large scope (6+ files), spawn two implementers
(`implementer-1`, `implementer-2`) split by **domain or module** — not by
"core vs integration." The architect assigns file ownership; the skill doesn't
prescribe the split. Both run in parallel during Phase 4.

For Claude Agent SDK codebases, see [references/sdk-specialist.md](references/sdk-specialist.md)
for an optional additional Phase 4 teammate.

### 5. Create Tasks with Dependencies

Use `TaskCreate` to set up the TDD dependency chain:

```
Task 1: Research codebase patterns        -> owner: researcher
Task 2: Design implementation + test plan -> owner: architect        (after Task 1)
Task 3: Write tests (Red phase)           -> owner: test-writer      (after Task 2)
Task 4: Implement to pass tests (Green)   -> owner: implementer      (after Task 3)
Task 5: Verify (typecheck + test + lint)  -> owner: verifier         (after Task 4)
Task 6: Merge worktree branch             -> owner: lead             (after Task 5)
```

If using two implementers, split Task 4 into 4a and 4b (both after Task 3,
Task 5 after both 4a and 4b).

Teammates should use `TaskUpdate` to mark their task as completed when done, and
check `TaskList` for any newly unblocked work they can pick up.

### 6. Phase 1 — Research

Spawn `researcher` with `subagent_type: "Explore"` (read-only). They explore:

- Existing patterns, conventions, and the most similar feature as reference
- Reusable code (types, utilities, helpers) to leverage
- Dependency map — which modules will be affected
- Import/export patterns and module boundaries
- **Existing test patterns** — test file locations, mock patterns, test utilities

The researcher sends a structured research report via `SendMessage`.

See [references/spawn-prompts.md](references/spawn-prompts.md) -> "Researcher".

### 7. Phase 2 — Design

Pass the research report to `architect`. For domain-specific knowledge, the
architect references plan-verifier's domain files (e.g.,
`.claude/skills/plan-verifier/references/convex.md` for Convex features) when
available. See `references/spawn-prompts.md` for the domain tag -> skill mapping.

They produce:

- **File plan**: Exact files to create or modify, with action and assigned owner
- **Interface definitions**: Types, function signatures, exports
- **Data flow**: How data moves through the new code
- **Test plan**: What to test, import paths, expected behaviors

**File ownership is the critical output.** Every file must be assigned to exactly
one agent to prevent merge conflicts.

See [references/spawn-prompts.md](references/spawn-prompts.md) -> "Architect".

### 8. Phase 3 — Write Tests (Red)

Spawn `test-writer` in the shared worktree. They write tests based on the design
plan's interfaces. Tests import from source paths that **don't exist yet** — this
is the Red phase. Do NOT run tests yet.

See [references/spawn-prompts.md](references/spawn-prompts.md) -> "Test Writer".

### 9. Phase 4 — Implementation (Green)

Spawn `implementer` (or two implementers for large scope) with `mode: "plan"` in
the shared worktree. Each receives the design plan, file assignments, research
report, and test-writer's completion report.

Review their implementation plans before approving. Implementers write code that
**satisfies the existing tests** — matching exact function signatures, export
paths, return shapes, and error handling the tests expect.

See [references/spawn-prompts.md](references/spawn-prompts.md) -> "Implementer".

#### Handling Implementer Status

Implementers report one of four statuses. Handle each appropriately:

- **DONE**: Proceed to spec compliance review (Phase 4.5).
- **DONE_WITH_CONCERNS**: Read the concerns before proceeding. If about correctness
  or scope, address them first. If observations (e.g., "file is getting large"),
  note and proceed.
- **NEEDS_CONTEXT**: Provide the missing context and message the implementer to continue.
- **BLOCKED**: Assess the blocker:
  1. Context problem → provide more context, message implementer
  2. Task too hard for model → re-dispatch with a more capable model
  3. Task too large → break into smaller pieces
  4. Plan itself is wrong → escalate to the user

**Never** ignore an escalation or force the same approach to retry without changes.

### 9.5. Phase 4.5 — Spec Compliance Review

After each implementer reports DONE, verify they built what was requested — nothing
more, nothing less. This happens **before** the automated verification in Phase 5.

The lead (or a dedicated reviewer subagent) performs spec compliance:

1. **Read the actual code** — do not trust the implementer's report alone
2. Compare implementation to the design plan's requirements line by line
3. Check for **missing requirements** (things skipped or claimed but not done)
4. Check for **extra/unneeded work** (over-engineering, unrequested features)
5. Check for **misunderstandings** (right feature, wrong interpretation)

If issues found: message the implementer with specific file:line references and
what needs to change. Re-review after fixes. Repeat until spec-compliant.

Only proceed to Phase 5 once spec compliance passes for all implementers.

### 10. Phase 5 — Verification (feedback loop)

Spawn `verifier` in the shared worktree after all implementers complete. The
verifier runs the full quality checklist and reports results back to the lead.

The verification flow:

1. Verifier runs typecheck, tests, lint, and structural checks
2. If issues found → verifier reports them to the lead
3. Lead routes fixes: merge issues → lead fixes; implementation bugs → message
   implementer to fix; test bugs → message test-writer (rare)
4. Verifier re-runs checks after fixes
5. Repeat until all checks pass

The verifier uses the `scripts/verify.sh` script for the automated checks and
the [references/verification-checklist.md](references/verification-checklist.md)
for the full structural verification.

The verifier also runs `scripts/check-file-ownership.sh` to validate that all
planned files exist and no unplanned files were created.

See [references/spawn-prompts.md](references/spawn-prompts.md) -> "Verifier".

### 11. Phase 6 — Merge Worktree Branch

**Pre-merge gate:** Before merging, confirm ALL writing agents (test-writer,
implementer(s), verifier) have sent their completion report via `SendMessage`
AND their task is marked completed via `TaskUpdate`. Check with `TaskList` —
every Phase 3-5 task must show completed status. Do NOT merge while any writing
agent is still active, even if the verifier has passed. An active agent's
in-progress work will be lost when the worktree is cleaned up.

Once the verifier reports all-clear AND all writing agents are confirmed done,
merge the worktree branch:

```bash
git merge implement-<descriptor> --no-ff -m "merge: implement-<descriptor> worktree"
npm install
```

On conflict: list conflicted files with `git diff --name-only --diff-filter=U`,
resolve trivially if possible, otherwise ask the user.

After merge, run `bash ${CLAUDE_SKILL_DIR}/scripts/verify.sh` one final time
from the main working directory to confirm everything still passes post-merge.

### 12. Deliver Summary

Present the implementation report using the template in
[references/summary-template.md](references/summary-template.md).

### 13. Finish & Cleanup

Use the **`superpowers:finishing-a-development-branch`** skill to complete the
work. It presents structured options (merge to main, create PR, or cleanup) and
handles the integration path the user chooses.

Then clean up the team:

1. Send `shutdown_request` to each teammate
2. Call `TeamDelete`
3. Run: `bash ${CLAUDE_SKILL_DIR}/scripts/cleanup-worktree.sh <descriptor>`

See [references/cleanup-guide.md](references/cleanup-guide.md) for the full procedure.

## Small Scope Optimization

After the architect delivers the file plan, if there are **3 or fewer files**,
collapse Phases 3-5 into a single `implementer` agent working in the shared
worktree. The single agent still follows TDD order: write tests first, then
implementation, then self-verify with `scripts/verify.sh`. This avoids
coordination overhead while preserving TDD discipline and verification.

## Red Flags

**Never:**
- Start implementation on main/master without explicit user consent
- Skip spec compliance review (Phase 4.5) — catching over/under-building early
  is cheaper than debugging later
- Proceed with unfixed issues from any review stage
- Dispatch multiple implementers writing to the same files (merge conflicts)
- Ignore an implementer's BLOCKED or NEEDS_CONTEXT status
- Let implementer self-review replace actual review (both are needed)
- Start quality verification before spec compliance passes
- Move to the next phase while any review has open issues
- Merge while any writing agent is still active

**If implementer asks questions:** Answer clearly and completely. Provide
additional context if needed. Don't rush them into implementation.

**If reviewer finds issues:** Implementer fixes them, reviewer reviews again.
Repeat until approved. Don't skip the re-review.

**If implementer fails task:** Message them with specific corrections rather
than re-spawning. Only re-spawn if the session is unrecoverable.

## Known Limitations

See [references/known-limitations.md](references/known-limitations.md) for the
full list of experimental limitations and cost considerations.

## Integration

**Required workflow skills:**
- **superpowers:using-git-worktrees** — REQUIRED: Set up isolated workspace (Phase 3)
- **superpowers:finishing-a-development-branch** — REQUIRED: Complete development after all phases

**Teammates should use:**
- **superpowers:test-driven-development** — TDD discipline for test-writer and implementers

**Pairs well with:**
- **superpowers:writing-plans** — Creates the plan this skill executes
- **superpowers:requesting-code-review** — Final code review after merge
- **superpowers:subagent-driven-development** — Alternative for serial (non-team) execution
