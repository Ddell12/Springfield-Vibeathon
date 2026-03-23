# SDK Specialist (Optional Phase 4 Teammate)

When the codebase under implementation uses `@anthropic-ai/claude-agent-sdk`,
add an additional teammate in Phase 4.

## Detection

Auto-detect SDK agent codebases by checking for:

- `@anthropic-ai/claude-agent-sdk` in `package.json` dependencies
- `claude-agent-sdk` or `claude_agent_sdk` in Python requirements
- Imports from `@anthropic-ai/claude-agent-sdk` in source files

When detected, include the SDK specialist. When not detected, skip it.

## Role

| Teammate Name    | Phase | Focus                                                      |
| ---------------- | ----- | ---------------------------------------------------------- |
| `sdk-specialist` | 4     | SDK-specific code: hooks, MCP servers, sessions, subagents |

The SDK specialist owns all files that directly use SDK APIs (hook definitions,
MCP server setup, subagent definitions). They also follow TDD: they receive the
test-writer's completion report and implement to make SDK-related tests pass.

Spawn as a teammate working in the shared worktree (see §3 of SKILL.md).

See `spawn-prompts.md` > **SDK Specialist** for the full spawn template.

## File Ownership

When an SDK specialist is present, ensure their files don't overlap with
implementer-core or implementer-integration. SDK files typically depend on
core types, so the architect should assign SDK files last in the file plan.
