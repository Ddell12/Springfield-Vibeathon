# MCP Tool Catalog

Available MCP servers and their tools for use during planning and implementation.
Sub-agents inherit MCP configuration from the parent session — no extra setup needed.

## Context7 (Library Documentation)

**When to use:** Researching library APIs, verifying function signatures, checking
version compatibility, finding usage examples.

**Tools:**

| Tool                                                | Purpose                                   | Example                                |
| --------------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| `mcp__plugin_context7_context7__resolve-library-id` | Resolve a library name to its context7 ID | Input: `"convex"` → returns library ID |
| `mcp__plugin_context7_context7__query-docs`         | Query documentation with resolved ID      | Input: library ID + question about API |

**Two-step workflow:**

1. Resolve: `resolve-library-id` with the library name (e.g., "convex", "vitest", "hono")
2. Query: `query-docs` with the resolved ID and your specific question

**Best for:** "What's the API for X?", "How do I use Y in version Z?",
"What changed in the latest version?"

**Fallback:** If context7 doesn't have the library, use `WebSearch` + `WebFetch`.

## Greptile (Semantic Codebase Search)

**When to use:** Understanding how the codebase works, finding related patterns,
answering architectural questions, discovering integration points.

**Tools:**

| Tool                                                      | Purpose                         | Example                                        |
| --------------------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| `mcp__plugin_greptile_greptile__search_greptile_comments` | Semantic search across codebase | "How does the memory system extract entities?" |

**Best for:** "How does X work?", "Where is Y implemented?", "What patterns
does the codebase use for Z?" — questions where grep/glob would require
multiple attempts.

**Fallback:** Use `Grep` for exact string matching, `Glob` for file patterns.

## Tessl (Library Spec Registry)

**When to use:** Verifying library API patterns before writing them into a plan,
getting curated test-backed usage specs, preventing API hallucination.

**Setup:** Run `tessl init --agent claude-code` in the project root to configure.

**Tools:**

| Tool            | Purpose                                          | Example                                 |
| --------------- | ------------------------------------------------ | --------------------------------------- |
| `tessl search`  | Find tiles (versioned usage specs) for a library | Input: `"convex"` → matching tiles      |
| `tessl install` | Load a tile's spec into the current session      | Input: tile ID → specs, examples, tests |

**Workflow:**

1. Search: `tessl search <library-name>` to find matching tiles
2. Install: `tessl install <tile-id>` to load the spec
3. Specs include: description, capabilities with test coverage, version-matched API examples
4. Cross-reference with context7 docs and your installed version

**Best for:** "What's the correct API for X in version Y?", "How should I call
this library?", "What are the tested patterns for Z?"

**Fallback:** If Tessl is not installed or doesn't have the library, use context7
for documentation + WebSearch for community examples.

**vs context7:** Tessl provides curated, test-backed specs (higher confidence).
context7 provides raw documentation (broader coverage). Use Tessl first for API
patterns, context7 for conceptual questions and edge cases.

## Linear (Project Management)

**When to use:** Creating tracking issues from plan tasks, linking plans to
Linear projects, checking existing issue status.

**Tools:**

| Tool                                          | Purpose                         |
| --------------------------------------------- | ------------------------------- |
| `mcp__plugin_linear-pm_linear__save_issue`    | Create or update an issue       |
| `mcp__plugin_linear-pm_linear__list_issues`   | List issues with filters        |
| `mcp__plugin_linear-pm_linear__get_issue`     | Get issue details               |
| `mcp__plugin_linear-pm_linear__list_projects` | List available projects         |
| `mcp__plugin_linear-pm_linear__list_teams`    | List teams for issue assignment |

**Workflow for plan tracking:**

1. `list_teams` → get team ID
2. `list_projects` → find or note project
3. For each plan task: `save_issue` with title, description, team, labels
4. Update plan frontmatter with `linear.project` reference

**Note:** Linear tools require auth. If not configured, skip tracking and
note it in the plan summary. Never block on Linear availability.

## Availability Notes

- MCP tools may not be configured in every environment
- Always check tool availability by attempting a call — if it fails, fall back
  to standard tools
- Sub-agents inherit parent MCP configuration automatically
- Never block the pipeline on MCP tool availability — all tools have standard
  tool fallbacks (Grep/Glob for codebase, WebSearch for docs)
