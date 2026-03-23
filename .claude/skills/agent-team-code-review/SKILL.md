---
name: agent-team-code-review
description: >
  Runs parallel multi-perspective code review with 4 specialist agents (security, performance,
  correctness, maintainability). Use for thorough reviews: "review code", "review PR", "team
  review", /team-review.
---

# Agent Team Code Review

Orchestrate a parallel code review using an agent team. Four specialized reviewers
examine code from different angles simultaneously, then findings are synthesized
into a prioritized report.

## Workflow

### 1. Determine Review Scope

Identify what to review based on the user's request:

- **PR review**: `git diff main...HEAD` or a specific PR number via `gh pr diff <number>`
- **Staged changes**: `git diff --cached`
- **Unstaged changes**: `git diff`
- **Specific files/dirs**: Read the files directly
- **Recent commits**: `git log -n <count> --oneline` then `git diff <range>`

If the scope is ambiguous, ask the user.

### 2. Create the Agent Team

Create a team named `code-review-{short-descriptor}` with 4 reviewer teammates.

Use `TeamCreate` to initialize the team, then spawn teammates via the `Task` tool
with `team_name` set and `subagent_type: "general-purpose"`. Use `model: "sonnet"`
for each teammate to balance speed and cost.

Each teammate's spawn prompt MUST include:

- The exact review scope (files, diff range, PR number)
- Their assigned review domain and what to focus on
- Instruction to read `references/review-checklists.md` from the skill directory for their domain's checklist
- Instruction to report findings with severity ratings: **Critical**, **High**, **Medium**, **Low**
- Instruction to use `SendMessage` to share findings with the lead when done
- Instruction to challenge other reviewers' findings if they receive messages about them

### 3. Reviewer Roles

Spawn these 4 teammates:

| Teammate Name          | Domain              | Focus                                                         |
| ---------------------- | ------------------- | ------------------------------------------------------------- |
| `security-reviewer`    | Security            | Vulnerabilities, auth flaws, data exposure, injection vectors |
| `performance-reviewer` | Performance         | N+1 queries, memory leaks, unbounded operations, caching      |
| `correctness-reviewer` | Correctness & Logic | Edge cases, race conditions, error handling, type safety      |
| `quality-reviewer`     | Maintainability     | Naming, duplication, patterns, test coverage, dead code       |

### 4. Create Tasks

Use `TaskCreate` to create one task per reviewer (e.g., "Security review of auth module changes").
Assign each task to the corresponding teammate via `TaskUpdate` with `owner`.

Also create a synthesis task owned by the lead, blocked by all 4 review tasks.

### 5. Coordinate and Synthesize

Wait for all reviewers to complete. As findings arrive:

- If a reviewer reports a **Critical** finding, broadcast it to other reviewers for cross-validation
- Let reviewers challenge each other's findings — a finding that survives challenge is higher confidence

Once all reviews are done, synthesize into a single report.

### 6. Deliver the Report

Present findings to the user in this format:

```
## Code Review Summary

**Scope**: [what was reviewed]
**Reviewers**: security, performance, correctness, quality

### Critical Issues
[Findings rated Critical — must fix before merge]

### High Priority
[Findings rated High — should fix before merge]

### Medium Priority
[Findings rated Medium — fix soon]

### Low Priority / Suggestions
[Findings rated Low — nice to have]

### Positive Observations
[Things done well worth calling out]
```

Deduplicate findings that multiple reviewers flagged. When the same issue was caught
by multiple reviewers, note that — it increases confidence.

### 7. Cleanup

Shut down all teammates via `SendMessage` with `type: "shutdown_request"`, then
call `TeamDelete` to clean up team resources.

## Reviewer Spawn Prompt Template

Use this template when spawning each reviewer, filling in the bracketed values:

```
You are the [DOMAIN] reviewer on a code review team. Your job is to review code
changes through the lens of [DOMAIN].

**Review scope**: [SCOPE DESCRIPTION — files, diff command, or PR reference]

**Your checklist**: Read the file at [SKILL_DIR]/references/review-checklists.md
and follow the [DOMAIN] section.

**How to work**:
1. Read/diff the code in scope
2. Apply your domain checklist systematically
3. Rate each finding: Critical, High, Medium, or Low
4. When done, send your findings to the team lead via SendMessage
5. If you receive findings from other reviewers to cross-validate, assess whether
   you agree or disagree and respond with your assessment

**Output format for each finding**:
- **[Severity]** — file:line — Short description
  - Why it matters: [explanation]
  - Suggested fix: [concrete suggestion]
```

## SDK Agent Review Mode

When the codebase under review is an agent built with `@anthropic-ai/claude-agent-sdk`,
add a 5th reviewer teammate:

| Teammate Name  | Domain             | Focus                                                                                                       |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `sdk-reviewer` | Agent SDK Patterns | Permission model, hook implementation, session management, cost controls, MCP config, subagent architecture |

The SDK reviewer's spawn prompt should reference `references/claude-agent-sdk-review.md`
instead of the general checklists. This file covers 13 review domains specific to
SDK agents: permissions, tools, hooks, sessions, MCP, subagents, system prompts,
error handling, cost controls, structured outputs, streaming, configuration, and
common anti-patterns.

**Detection**: Auto-detect SDK agent codebases by checking for:

- `@anthropic-ai/claude-agent-sdk` in `package.json` dependencies
- `claude-agent-sdk` or `claude_agent_sdk` in Python requirements
- Imports from `@anthropic-ai/claude-agent-sdk` or `claude_agent_sdk` in source files
- Usage of `query()` function with `Options`/`ClaudeAgentOptions`

When detected, always include the SDK reviewer as a 5th teammate. When not detected,
skip it — the 4 standard reviewers are sufficient.

## References

- **Review checklists**: `references/review-checklists.md` — Domain-specific checklists for each reviewer role (security, performance, correctness, quality).
- **Claude Agent SDK checklist**: `references/claude-agent-sdk-review.md` — SDK-specific review checklist covering permissions, hooks, sessions, MCP, subagents, cost controls, and common anti-patterns. Only used by the SDK reviewer for agent codebases.
