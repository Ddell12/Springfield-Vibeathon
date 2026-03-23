# Domain Skill Map

Maps plan `domain_tags` to skills and reference files. Used by both `plan-mode`
(architect guidance) and `agent-team-implement` (conditional skill injection).

## Mapping Table

| Domain Tag     | Skills to Invoke           | Reference Files (plan-verifier)                                                                            | Notes                                          |
| -------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `convex`       | convex-dev, convex-helpers | `.claude/skills/plan-verifier/references/convex.md`                                                        | Schema, queries, mutations, actions            |
| `dashboard`    | frontend-design            | `.claude/skills/plan-verifier/references/ui-stack.md`, `.claude/skills/plan-verifier/references/nextjs.md` | React, shadcn/ui, Tailwind, Next.js App Router |
| `trigger`      | trigger-manager            | `.claude/skills/plan-verifier/references/trigger-dev.md`                                                   | Trigger.dev tasks, schedules, deployments      |
| `sdk`          | _(read sdk-specialist.md)_ | `.claude/skills/agent-team-implement/references/claude-agent-sdk-implement.md`                             | Claude Agent SDK hooks, MCP, sessions          |
| `testing`      | vitest-testing             | `.claude/skills/plan-verifier/references/testing-and-tools.md`                                             | Vitest, convex-test, RTL                       |
| `api`          | _(none)_                   | —                                                                                                          | REST/HTTP endpoints, Hono routes               |
| `channels`     | _(none)_                   | —                                                                                                          | Telegram, Discord, CLI adapters                |
| `memory`       | _(none)_                   | —                                                                                                          | Memory extraction, retrieval, graph            |
| `scheduling`   | trigger-manager            | `.claude/skills/plan-verifier/references/trigger-dev.md`                                                   | Cron jobs, Trigger.dev schedules               |
| `agents`       | _(none)_                   | —                                                                                                          | Multi-agent system, orchestration              |
| `vault`        | _(none)_                   | —                                                                                                          | Obsidian vault, indexer, RAG                   |
| `daemon`       | _(none)_                   | —                                                                                                          | Daemon lifecycle, observers, triage            |
| `skills`       | skill-creator              | —                                                                                                          | Skill files, watcher, sync                     |
| `security`     | _(none)_                   | —                                                                                                          | Permissions, PreToolUse hooks                  |
| `health`       | _(none)_                   | —                                                                                                          | Heartbeat, health-push, PM2                    |
| `integrations` | _(none)_                   | —                                                                                                          | Composio, Firecrawl, Playwright                |
| `scripts`      | _(none)_                   | —                                                                                                          | Shell scripts, skill scripts, automation       |

## How to Use

### During Planning (plan-mode)

The architect reads domain tags from the codebase-analyst's report and includes
them in the plan's YAML frontmatter. This drives skill invocations during
implementation.

### During Implementation (agent-team-implement)

1. **Researcher** extracts domain_tags from plan frontmatter
2. **Architect** invokes skills from the mapping table above
3. **Test Writer** invokes testing-related skills (vitest-testing, convex-dev for Convex tests)
4. **Implementer** invokes implementation skills matching their file assignments
5. **Verifier** references plan-verifier domain files for convention checking

### Fallback Behavior

If plan-verifier is not installed, the reference files column is unavailable.
Skills still work independently — they just won't have the project-specific
domain references that plan-verifier provides.

If a skill listed in the table is not installed, skip it silently. Never block
on missing skills.

### Inferring Domain Tags from File Paths

When no frontmatter is available, infer domain tags from file paths:

| Path Pattern                        | Inferred Tag        |
| ----------------------------------- | ------------------- |
| `convex/`                           | convex              |
| `dashboard/`                        | dashboard           |
| `src/trigger/` or `src/scheduling/` | trigger, scheduling |
| `src/agent/`                        | sdk                 |
| `src/channels/`                     | channels            |
| `src/memory/`                       | memory              |
| `src/vault/`                        | vault               |
| `src/daemon/`                       | daemon              |
| `src/skills/`                       | skills              |
| `src/security/`                     | security            |
| `src/health/`                       | health              |
| `src/integrations/`                 | integrations        |
| `**/__tests__/**` or `**/*.test.ts` | testing             |
| `.claude/skills/*/scripts/`         | scripts             |
