# Claude Agent SDK vs Hermes Agent Parity Report

Date: 2026-04-03

## Purpose

This report answers one question:

What does the Claude Agent SDK already provide out of the box, and what Hermes features would still need to be built to reach Hermes-like feature parity?

The goal is to avoid rebuilding infrastructure the SDK already includes, and to isolate the product/runtime layers Hermes adds on top.

## Executive Summary

The Claude Agent SDK already covers most of Hermes's inner agent harness:

- agent loop
- built-in coding tools
- permissions and approvals
- subagents
- context compaction
- prompt caching
- MCP integration
- skills
- slash commands
- cost tracking
- file checkpointing
- plugin loading
- todo tracking

That means you should not rebuild Hermes's custom equivalents for core loop orchestration, tool execution plumbing, prompt caching, or basic subagent mechanics.

Hermes still adds substantial product infrastructure the SDK does not provide natively:

- multi-surface gateway adapters for Telegram, Slack, WhatsApp, Discord, email, SMS, etc.
- custom execution backends beyond the local Claude tool runtime model
- persistent session database and transcript search across channels
- Hermes-specific memory provider abstraction and sync lifecycle
- provider-routing across OpenRouter, Anthropic-compatible endpoints, local servers, and custom endpoints
- channel-aware delivery, pairing, home-channel routing, and background notifications
- bespoke CLI product surface, setup flows, profile management, and gateway service management

Bottom line:

- If your target is a custom Claude-based coding agent, the SDK gives you the agent runtime already.
- If your target is "Hermes, but powered by Claude Agent SDK", you still need to build the surrounding platform.

## Side-by-Side Parity


| Capability area                             | Claude Agent SDK already has                                                                                             | Hermes has beyond SDK                                                                                      | Rebuild needed for Hermes parity?                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Core autonomous loop                        | Yes. Same Claude Code execution loop, tool execution, multi-step turns, context management.                              | Hermes reimplements this around `AIAgent`.                                                                 | No, use SDK.                                                   |
| Built-in coding tools                       | Yes. File read/edit, bash, web, and other built-ins are already available.                                               | Hermes adds its own registry/toolset abstractions and extra tools.                                         | Partial. Only rebuild Hermes-only tools/policies.              |
| Permission system                           | Yes. Permission modes, allow/deny rules, hooks, runtime approval callback.                                               | Hermes adds custom approval UX per surface.                                                                | Partial. Keep SDK permissions, build product UX.               |
| Clarifying questions                        | Yes via `AskUserQuestion` and `canUseTool`.                                                                              | Hermes has a `clarify` tool and per-surface callbacks.                                                     | Partial. UI integration only.                                  |
| Subagents                                   | Yes. Context-isolated, parallelizable subagents with tool restrictions.                                                  | Hermes adds its own delegation policy, blocked-tool rules, progress relays, credential overrides.          | Partial. Use SDK subagents, rebuild delegation policy/UX only. |
| Skills                                      | Yes. Filesystem `SKILL.md` skills, autonomous invocation, slash invocation.                                              | Hermes adds richer local skill indexing, external skill dirs, skill management tooling.                    | Partial.                                                       |
| Slash commands                              | Yes. Built-in and custom slash commands, including `/compact` and `/clear`.                                              | Hermes builds shared command plumbing across CLI and gateway.                                              | Partial.                                                       |
| MCP                                         | Yes. stdio, HTTP, SSE, SDK MCP servers, tool search, allowed tool wildcards.                                             | Hermes layers runtime config, auth helpers, and operational wrappers.                                      | Partial.                                                       |
| Custom tools                                | Yes. In-process MCP custom tools, annotations, image/resource returns.                                                   | Hermes has many product-specific tools already implemented.                                                | Partial. Port only needed custom tools.                        |
| Tool search / tool context control          | Yes. Tool search is built in and on by default for MCP-heavy setups.                                                     | Hermes has toolsets and manual capability bundles.                                                         | Partial. Toolset UX still needed.                              |
| Prompt caching                              | Yes. Automatic prompt caching in the SDK/Claude Code runtime.                                                            | Hermes adds provider-specific caching logic for Anthropic/OpenRouter.                                      | No for Claude-native builds.                                   |
| Context compaction                          | Yes. Automatic compaction plus `/compact`, compact-boundary messages, hooks.                                             | Hermes adds its own compressor and memory-provider pre-compress hooks.                                     | Partial. Custom memory preservation may still be needed.       |
| Session continuity                          | Yes. Persistent interactive sessions and resumable single-message mode.                                                  | Hermes adds its own SQLite session store, transcript files, lineage, naming, and search.                   | Partial to full, depending on product needs.                   |
| Cost tracking                               | Yes. Detailed token usage and per-model cost data.                                                                       | Hermes adds provider-aware pricing estimation across many vendors.                                         | Partial.                                                       |
| File checkpointing / rewind                 | Yes. Built-in checkpointing and rewind for `Write`/`Edit`/`NotebookEdit`.                                                | Hermes has filesystem checkpoint tooling.                                                                  | No for SDK-native edits.                                       |
| Todo tracking                               | Yes. Built-in `TodoWrite` behavior and stream visibility.                                                                | Hermes has its own todo tool/in-memory planning behavior.                                                  | No for core todo tracking.                                     |
| Hooks                                       | Yes. Hooks for tool use, stopping, compaction, sessions, and more.                                                       | Hermes has some equivalent callback plumbing and plugin hooks.                                             | Partial.                                                       |
| Plugins                                     | Yes. Local plugins can load skills, agents, hooks, MCP servers, commands.                                                | Hermes has its own plugin-style runtime/tool registration.                                                 | Partial.                                                       |
| Multi-model/provider routing                | Not a native focus. SDK is Claude-native.                                                                                | Hermes has extensive provider routing across Anthropic, OpenRouter, local endpoints, and custom providers. | Yes, if you want non-Claude backend flexibility.               |
| Multi-channel messaging gateway             | No native Telegram/Slack/WhatsApp gateway layer in the SDK.                                                              | Hermes has a full gateway subsystem.                                                                       | Yes.                                                           |
| Background process delivery / notifications | Not provided as a product system.                                                                                        | Hermes has gateway delivery routing and watcher flows.                                                     | Yes.                                                           |
| Session search over prior transcripts       | No built-in Hermes-style conversation search/summarization layer.                                                        | Hermes has SQLite FTS-backed session search and summarization.                                             | Yes.                                                           |
| Memory provider abstraction                 | No Hermes-style multi-provider memory manager abstraction.                                                               | Hermes has built-in + external provider orchestration.                                                     | Yes.                                                           |
| Sandboxed execution backends                | SDK gives Claude Code tool/runtime semantics, but not Hermes's Docker/Modal/SSH/Daytona/Singularity backend abstraction. | Hermes has a large execution backend layer.                                                                | Yes, if you need that portability model.                       |
| Gateway auth/pairing/home channels          | No.                                                                                                                      | Hermes has pairing, channel routing, home-channel delivery, per-platform config.                           | Yes.                                                           |
| Product CLI / setup / profiles              | SDK is a library, not a full Hermes product shell.                                                                       | Hermes has a large CLI and operational UX.                                                                 | Yes.                                                           |


## What You Should Not Rebuild

These are the biggest traps to avoid:

1. Do not rebuild the agent loop.
  The SDK already runs the same execution loop that powers Claude Code.
2. Do not rebuild basic tool orchestration.
  The SDK already includes built-in tools, tool permissions, hooks, and MCP loading.
3. Do not rebuild subagent mechanics from scratch.
  Use SDK subagents, then add your own delegation policy on top.
4. Do not rebuild prompt caching or basic compaction.
  Those are already built into the Claude runtime.
5. Do not rebuild slash command plumbing or basic skills infrastructure.
  The SDK already supports both.
6. Do not rebuild file-rewind infrastructure for SDK-managed edits.
  Use file checkpointing.
7. Do not rebuild todo tracking unless you need a very custom UX.
  The SDK already emits todo activity.

## What Hermes Has That the SDK Does Not Natively Replace

### 1. Multi-channel agent product layer

Hermes is not just a coding agent. It is also a messaging platform runtime:

- Telegram
- Slack
- Discord
- WhatsApp
- Signal
- email
- SMS
- webhook/Home Assistant

If you want Hermes parity, this entire transport and session-routing layer still has to be built.

### 2. Execution backend abstraction

Hermes can push shell/file work through multiple backend types:

- local
- Docker
- Modal
- SSH
- Daytona
- Singularity

The Claude Agent SDK gives you Claude Code tooling behavior, but not Hermes's backend portability layer. If your product requires "same agent, many execution substrates", that is still custom work.

### 3. Persistent session data model

Hermes has a real session system, not just resumability:

- session IDs and lineage
- transcript persistence
- rich session metadata
- title generation
- search across prior sessions
- session source filtering
- gateway-aware reset/expiry policies

The SDK gives continuity and resume semantics, but not Hermes's full application-level session database.

### 4. Memory provider framework

Hermes has a dedicated memory abstraction:

- built-in local memory
- external provider support
- prefetch
- post-turn sync
- compression hooks
- delegation observation hooks

The SDK has skills, hooks, and tools, but not this exact memory-provider lifecycle. If you want Hermes-style long-term memory, you still need to design it.

### 5. Cross-provider model routing

Hermes is built to route across:

- Anthropic-compatible endpoints
- OpenRouter
- local servers
- custom providers
- fallback chains
- context-length probing
- provider-specific pricing estimation

The Claude Agent SDK is optimized for Claude. If your system must be vendor-flexible, Hermes still has a unique layer to replicate.

### 6. Product operations and onboarding

Hermes includes:

- setup wizard
- model/provider setup flows
- profile management
- gateway daemon lifecycle
- plugin management UX
- auth pooling
- service install/uninstall workflows

None of that is the SDK's job.

## Recommended Target Architecture

If the goal is "custom agent with Hermes feature parity, built on Claude Agent SDK", the architecture should look like this:

### Layer 1: Claude-native runtime

Use the SDK directly for:

- query/session lifecycle
- built-in tools
- MCP
- skills
- slash commands
- subagents
- permissions
- hooks
- compaction
- checkpointing
- cost tracking

### Layer 2: Hermes-compat platform services

Build these around the SDK:

- `SessionStore`
  - transcript persistence
  - titles
  - search
  - source metadata
- `MemoryService`
  - local memory
  - optional external memory backends
  - retrieval/sync policies
- `DelegationPolicy`
  - which subagents exist
  - allowed tools per subagent
  - progress reporting
- `TransportAdapters`
  - CLI
  - chat platforms
  - webhook surfaces
- `DeliveryRouter`
  - home channels
  - background notifications
  - per-surface formatting
- `RuntimePolicy`
  - allow/deny rules
  - tool bundles
  - safe defaults by surface

### Layer 3: Hermes-only advanced features

Only add these if you truly need them:

- non-Claude provider routing
- Docker/SSH/Modal execution backends
- gateway pairing and approval workflows
- provider cost normalization across vendors
- custom memory plugins

## MVP-to-Parity Build Order

### Phase 1: Claude-native coding agent

Build first:

- SDK-based CLI agent
- built-in tools
- permissions
- subagents
- MCP
- skills
- slash commands
- checkpointing
- todo tracking

This gets you a strong local coding agent fast.

### Phase 2: Hermes-style application shell

Then add:

- persistent session store
- transcript search
- memory service
- richer delegation policy
- plugin conventions
- custom tool bundles

This gets you close to Hermes's day-to-day operator experience.

### Phase 3: Messaging and platform parity

Then add:

- gateway adapters
- delivery routing
- background notification flows
- auth/pairing
- channel-aware session policies

This is the expensive part of Hermes parity.

### Phase 4: Advanced runtime parity

Only if required:

- Docker/SSH/Modal/Daytona execution layer
- provider-agnostic routing
- external memory-provider plugins
- full operational CLI/setup surface

## Key Gaps To Plan Explicitly

These are the highest-signal "Hermes gap" items:

1. Session database and transcript search
2. Memory provider lifecycle
3. Multi-channel gateway and delivery model
4. Execution backend abstraction
5. Claude-specific runtime wrapped in Hermes-style product UX

## Final Recommendation

The right strategy is:

- adopt the Claude Agent SDK as the runtime
- delete the idea of rebuilding Hermes's inner agent engine
- port only Hermes's surrounding platform features that materially matter to your product

If your first goal is a powerful coding agent, you can probably stop after Phase 1 and Phase 2.

If your goal is true Hermes feature parity, the SDK saves you the hardest runtime work, but you still have a significant platform build remaining.

## Sources

Claude Agent SDK docs:

- Overview: [https://platform.claude.com/docs/en/agent-sdk/overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- Agent loop: [https://platform.claude.com/docs/en/agent-sdk/agent-loop](https://platform.claude.com/docs/en/agent-sdk/agent-loop)
- Permissions: [https://platform.claude.com/docs/en/agent-sdk/permissions](https://platform.claude.com/docs/en/agent-sdk/permissions)
- User input and approvals: [https://platform.claude.com/docs/en/agent-sdk/user-input](https://platform.claude.com/docs/en/agent-sdk/user-input)
- Streaming input: [https://platform.claude.com/docs/en/agent-sdk/streaming-vs-single-mode](https://platform.claude.com/docs/en/agent-sdk/streaming-vs-single-mode)
- MCP: [https://platform.claude.com/docs/en/agent-sdk/mcp](https://platform.claude.com/docs/en/agent-sdk/mcp)
- Custom tools: [https://platform.claude.com/docs/en/agent-sdk/custom-tools](https://platform.claude.com/docs/en/agent-sdk/custom-tools)
- Subagents: [https://platform.claude.com/docs/en/agent-sdk/subagents](https://platform.claude.com/docs/en/agent-sdk/subagents)
- Slash commands: [https://platform.claude.com/docs/en/agent-sdk/slash-commands](https://platform.claude.com/docs/en/agent-sdk/slash-commands)
- Skills: [https://platform.claude.com/docs/en/agent-sdk/skills](https://platform.claude.com/docs/en/agent-sdk/skills)
- Cost tracking: [https://platform.claude.com/docs/en/agent-sdk/cost-tracking](https://platform.claude.com/docs/en/agent-sdk/cost-tracking)
- File checkpointing: [https://platform.claude.com/docs/en/agent-sdk/file-checkpointing](https://platform.claude.com/docs/en/agent-sdk/file-checkpointing)
- Plugins: [https://platform.claude.com/docs/en/agent-sdk/plugins](https://platform.claude.com/docs/en/agent-sdk/plugins)
- Todo tracking: [https://platform.claude.com/docs/en/agent-sdk/todo-tracking](https://platform.claude.com/docs/en/agent-sdk/todo-tracking)

Claude Code hooks reference:

- Hooks: [https://code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)

Hermes architecture references from repository analysis:

- `/tmp/hermes-agent-analysis.xml`
- `run_agent.py`
- `agent/`
- `tools/`
- `gateway/`
- `hermes_cli/`

