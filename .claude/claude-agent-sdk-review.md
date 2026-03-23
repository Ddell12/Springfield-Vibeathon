# Claude Agent SDK Review Checklist

Use this reference when reviewing agents built with `@anthropic-ai/claude-agent-sdk` (TypeScript) or `claude-agent-sdk` (Python). Covers SDK-specific patterns, security boundaries, and common pitfalls.

---

## Table of Contents

1. [Permission & Security Model](#1-permission--security-model)
2. [Tool Configuration](#2-tool-configuration)
3. [Hook Implementation](#3-hook-implementation)
4. [Session Management](#4-session-management)
5. [MCP Server Configuration](#5-mcp-server-configuration)
6. [Subagent Architecture](#6-subagent-architecture)
7. [System Prompt Design](#7-system-prompt-design)
8. [Error Handling & Resilience](#8-error-handling--resilience)
9. [Cost & Resource Controls](#9-cost--resource-controls)
10. [Structured Outputs](#10-structured-outputs)
11. [Streaming & Message Handling](#11-streaming--message-handling)
12. [Configuration & Settings](#12-configuration--settings)
13. [Common Anti-Patterns](#13-common-anti-patterns)

---

## 1. Permission & Security Model

### Critical

- **`bypassPermissions` without `allowedTools` restriction**: If `permissionMode: "bypassPermissions"` is used, there MUST be a constrained `allowedTools` list. Without it, the agent has unrestricted access to Bash, Write, Edit, etc. with zero approval.
- **`allowDangerouslySkipPermissions` set to `true`**: Required when using `bypassPermissions` but is a red flag in production. Verify it's intentional and that tool restrictions compensate.
- **Missing `canUseTool` callback in default mode**: When `permissionMode: "default"`, all tool calls prompt for approval unless `canUseTool` handles them. In headless/API contexts, this causes hangs.
- **Secrets in `env` option**: Check that API keys, tokens, or credentials passed via `options.env` are sourced from environment variables or secret managers, never hardcoded.

### High

- **Overly broad `allowedTools`**: Review whether the agent actually needs Write, Edit, and Bash. Read-only agents (reviewers, analyzers) should only get `["Read", "Glob", "Grep"]`.
- **`cwd` pointing to sensitive directories**: The `cwd` determines the agent's working directory and default scope. Should not be `/`, `$HOME`, or contain secrets.
- **No `PreToolUse` hooks for file boundary enforcement**: If the agent writes files, there should be hooks validating that paths stay within allowed directories.
- **Bash commands not validated**: If Bash is in `allowedTools`, a `PreToolUse` hook should block destructive commands (`rm -rf`, `DROP TABLE`, `chmod 777`, etc.).

### Medium

- **`acceptEdits` mode without path validation hooks**: `acceptEdits` auto-approves file writes. Without hooks restricting write paths, the agent can write anywhere under `cwd`.
- **`disallowedTools` as sole defense**: `disallowedTools` is a deny-list. Prefer `allowedTools` (allow-list) as the primary control, using `disallowedTools` only as a supplement.

---

## 2. Tool Configuration

### Critical

- **`Task` in `allowedTools` without `agents` defined**: If the agent can spawn subagents (`Task` tool) but no agent definitions exist, it will use default agents which may have broader permissions than intended.
- **Missing tool for required capability**: e.g., agent prompt says "search the codebase" but `Grep`/`Glob` not in `allowedTools`.

### High

- **Redundant tools that widen attack surface**: Including both `Write` and `Edit` when only `Edit` is needed. `Write` can overwrite entire files; `Edit` does precise replacements.
- **`WebFetch`/`WebSearch` without justification**: These tools make external network requests. Only include if the agent genuinely needs web access.
- **`tools` preset without override**: Using `tools: { type: 'preset', preset: 'claude_code' }` gives the agent ALL Claude Code tools. Prefer explicit `allowedTools` for production agents.

### Medium

- **Tool list not matching system prompt guidance**: If the system prompt tells the agent to "never run shell commands" but Bash is in `allowedTools`, the constraint is advisory only.

---

## 3. Hook Implementation

### Critical

- **Hook returns `{ continue: true }` instead of deny on violation**: A hook that detects a violation (blocked path, dangerous command) but returns `{ continue: true }` instead of `permissionDecision: "deny"` is a no-op security check.
- **Missing `hookEventName` in `hookSpecificOutput`**: The SDK requires `hookEventName` to route hook decisions. Omitting it silently drops the decision.
- **Deny hook returning allow**: If a deny hook also returns `permissionDecision: "allow"` in a different code path, the allow overrides the deny for matching calls.

### High

- **`PreToolUse` hook not checking `tool_name`**: A hook registered for `"Write|Edit"` via matcher still receives the input — but if it checks `tool_input.command` (a Bash field), it silently does nothing for Write/Edit.
- **Swallowed errors in hooks**: Hooks that `try/catch` and return `{}` on error silently bypass security checks. Log the error and still return a deny decision if the check couldn't be performed.
- **Matcher too broad (empty or `".*"`)**: An unscoped matcher fires on every tool call. This can cause latency if the hook does I/O.
- **`updatedInput` without `permissionDecision: "allow"`**: Input modifications only apply when the hook also returns `allow`. Without it, the modification is silently ignored.

### Medium

- **No `PostToolUse` audit logging**: For compliance and debugging, tool results should be logged.
- **`Stop` hook that can throw**: If the `Stop` hook throws, the session may not cleanly terminate. Always wrap in try/catch.
- **Multiple hooks with conflicting decisions**: If one hook returns `allow` and another returns `deny` for the same tool call, `deny` wins — but the intent may be unclear. Document precedence.

---

## 4. Session Management

### Critical

- **Session ID stored insecurely**: Session IDs allow resuming conversations with full context. If persisted, they should be treated as sensitive tokens.
- **No session TTL/expiry**: Sessions that never expire accumulate stale context and can be resumed unexpectedly.

### High

- **`resume` without validating session ownership**: When resuming, verify the session belongs to the requesting user/channel. Don't allow cross-user session resumption.
- **Missing `forkSession` for parallel branches**: If the same session is resumed by multiple callers simultaneously, they'll conflict. Use `forkSession: true` for parallel exploration.
- **`continue: true` (auto-resume latest) in multi-user contexts**: This resumes the most recent session regardless of who started it.

### Medium

- **Not capturing `session_id` from init message**: The session ID is only available in the `system`/`init` message. If missed, session resume won't work.
- **`resumeSessionAt` used without understanding**: This resumes at a specific message UUID, which can skip important context. Prefer plain `resume` unless rewinding is intentional.

---

## 5. MCP Server Configuration

### Critical

- **Stdio MCP server running with elevated privileges**: `McpStdioServerConfig` spawns a subprocess. Verify the `command` doesn't run as root or with unnecessary permissions.
- **MCP server `env` leaking secrets**: Environment variables passed to MCP servers may contain secrets. Ensure only necessary vars are included.

### High

- **Missing `strictMcpConfig: true`**: Without strict mode, MCP configuration errors are silently ignored. Enable strict mode to catch misconfigurations.
- **External MCP servers (SSE/HTTP) without auth headers**: `McpSSEServerConfig` and `McpHttpServerConfig` support `headers` for auth. Verify authentication is configured for non-local servers.
- **In-process SDK MCP server (`type: "sdk"`) without input validation**: Tools defined via `tool()` + `createSdkMcpServer()` should validate inputs via Zod schemas, but verify the handlers also validate business logic.

### Medium

- **MCP server not health-checked**: No verification that MCP servers are actually connected. Use `query.mcpServerStatus()` to verify.
- **Too many MCP servers**: Each connected server adds latency to tool resolution. Only connect what's needed.

---

## 6. Subagent Architecture

### Critical

- **Subagent with `permissionMode: "bypassPermissions"` and no tool restriction**: Subagents inherit the parent's permission mode. If the parent uses `bypassPermissions`, subagents do too — with potentially broader tool access.
- **Subagents can spawn further subagents**: If a subagent definition includes `Task` in its tools, it can spawn nested subagents, creating an unbounded recursion risk.

### High

- **`AgentDefinition.description` is vague**: The description determines when the model invokes the subagent. Vague descriptions lead to the wrong agent being used.
- **`AgentDefinition.prompt` missing critical context**: Subagents don't inherit the parent's conversation history. Their prompt must be self-contained with all necessary context.
- **No `model` specified on subagent**: Without explicit model, subagents use the parent's model. For cost control, use `"haiku"` for simple tasks.
- **Subagent tools broader than needed**: A "code-reviewer" subagent should only have `["Read", "Glob", "Grep"]`, not `["Read", "Write", "Edit", "Bash"]`.

### Medium

- **No `maxTurns` or `maxBudgetUsd` on parent when subagents enabled**: Subagent turns count toward the parent's budget. Without limits, costs can spiral.
- **`parent_tool_use_id` not tracked**: For debugging and audit, correlate subagent messages with the parent tool call that spawned them.

---

## 7. System Prompt Design

### Critical

- **System prompt contains secrets**: API keys, tokens, internal URLs, or database connection strings in the system prompt are visible in the transcript and can be logged.
- **Using `systemPrompt: { type: 'preset', preset: 'claude_code' }` without understanding**: The Claude Code preset includes extensive instructions. Verify it's appropriate for your use case vs. a custom prompt.

### High

- **System prompt contradicts tool configuration**: e.g., prompt says "you cannot modify files" but Write/Edit are in `allowedTools`. The tools always win over prompt instructions.
- **Missing `settingSources: ["project"]` when using CLAUDE.md**: Without this, CLAUDE.md files are not loaded even if `preset: 'claude_code'` is set.
- **Overly long system prompt**: Excessively long prompts consume context window and increase costs. Keep essential instructions concise.

### Medium

- **`append` field in preset not used for project-specific instructions**: When using the preset, add agent-specific behavior via `append` rather than replacing the entire system prompt.
- **No identity/role definition**: The system prompt should clearly define what the agent is, its boundaries, and its behavior.

---

## 8. Error Handling & Resilience

### Critical

- **`error_during_execution` result not handled**: The `SDKResultMessage` can have `subtype: "error_during_execution"`. If unhandled, the caller doesn't know the agent failed.
- **No try/catch around the `query()` iteration**: The async generator can throw. Unhandled exceptions crash the process.

### High

- **`error_max_turns` silently swallowed**: When the agent hits `maxTurns`, it returns a result with `subtype: "error_max_turns"`. The caller should inform the user the response may be incomplete.
- **`error_max_budget_usd` not surfaced**: Budget exhaustion means the agent stopped mid-task. The user should be notified.
- **Missing `abortController` for timeout/cancellation**: Long-running agents should have an abort mechanism. Without it, there's no way to cancel a stuck agent.

### Medium

- **No fallback model configured**: If the primary model is unavailable, `fallbackModel` provides automatic failover.
- **`is_error` field not checked on result**: Even `subtype: "success"` results can have `is_error: true`.

---

## 9. Cost & Resource Controls

### Critical

- **No `maxBudgetUsd` set**: Without a budget cap, a single agent session can consume unlimited API credits.
- **No `maxTurns` set**: Without a turn limit, agents can loop indefinitely (especially with tool errors that retry).

### High

- **Budget too high for the task**: A simple read-only analysis should not have a $50 budget. Match budget to expected complexity.
- **No cost monitoring/alerting**: `SDKResultMessage.total_cost_usd` should be logged and monitored. Set up alerts for cost spikes.
- **`modelUsage` not tracked**: Per-model usage breakdown helps identify if expensive models are being used for simple tasks.

### Medium

- **Subagents not included in cost accounting**: Subagent costs contribute to the parent's `total_cost_usd` but aren't separately visible unless tracked via hooks.
- **No daily/per-user cost aggregation**: For multi-user agents, aggregate and cap costs per user.

---

## 10. Structured Outputs

### High

- **Schema too complex for task**: Deeply nested schemas with many required fields cause validation failures. Keep schemas focused.
- **`error_max_structured_output_retries` not handled**: If the agent can't produce valid output after retries, the caller must handle the failure.
- **`structured_output` not validated on the caller side**: Even though the SDK validates against the schema, runtime validation (Zod `safeParse`, Pydantic `model_validate`) catches edge cases.

### Medium

- **Required fields for data that may not exist**: If the agent might not find all requested information, make those schema fields optional.
- **No Zod/Pydantic for type safety**: Using raw JSON Schema loses compile-time type checking. Prefer Zod (TS) or Pydantic (Python).

---

## 11. Streaming & Message Handling

### High

- **Only checking `message.type === "result"`**: Intermediate `assistant` messages contain the actual text content. Ignoring them means no streaming output.
- **Not handling all result subtypes**: `success`, `error_max_turns`, `error_during_execution`, `error_max_budget_usd`, `error_max_structured_output_retries` — each needs handling.
- **`includePartialMessages: true` without handling `stream_event`**: Enabling partial messages without processing them wastes resources.

### Medium

- **Not extracting text from `message.message.content` blocks**: Assistant messages contain content blocks (`text`, `tool_use`, `tool_result`). Only `text` blocks should be surfaced to users.
- **`SDKCompactBoundaryMessage` not handled**: When context compaction occurs, the agent may lose earlier context. Log these events for debugging.
- **`permission_denials` array not checked**: The result message includes all tool uses that were denied. Review these for security audit.

---

## 12. Configuration & Settings

### High

- **`settingSources` not explicitly set**: When omitted, NO filesystem settings are loaded (including CLAUDE.md). This is the safe default but may break expectations.
- **Using `settingSources: ["user"]` in production**: Loading user-level settings in production means behavior changes based on the deploying user's personal config.
- **Missing env isolation**: The `env` option defaults to `process.env`. In multi-tenant contexts, this leaks the host process environment to the agent.

### Medium

- **Config cached globally without invalidation**: If config is loaded once at startup and cached, runtime changes to config files have no effect.
- **`executable` not set in cross-platform contexts**: Auto-detection may pick the wrong runtime. Set explicitly for Docker/CI.

---

## 13. Common Anti-Patterns

### Architecture

- **God agent**: One agent with all tools and a massive system prompt. Break into focused subagents.
- **No hooks**: An agent in production without any PreToolUse hooks has zero runtime safety checks.
- **Hardcoded paths**: Paths to vault dirs, config files, etc. should be configurable, not hardcoded.

### Security

- **Trusting tool_input blindly**: The model generates tool inputs. Always validate in hooks before execution.
- **Logging full tool_input**: Tool inputs may contain file contents or user data. Truncate or redact sensitive fields.
- **No rate limiting on agent invocations**: A user can trigger unlimited agent sessions without cost/rate controls.

### Resilience

- **No session cleanup on error**: If the agent throws mid-session, ensure session state is still saved or cleaned up.
- **Sync I/O at module top level**: `fs.readFileSync` at import time blocks the event loop and fails in serverless contexts. Use lazy loading.
- **MCP servers not cleaned up**: If the process exits without cleanup, MCP server subprocesses may be orphaned.

### Cost

- **Using Opus for everything**: Default to Sonnet or Haiku for routine tasks. Reserve Opus for complex reasoning.
- **No budget difference between channels**: A Telegram quick-answer should have a lower budget than a CLI deep-analysis session.
- **Subagent spawning in a loop**: Without maxTurns, the parent can spawn subagents repeatedly on error.
