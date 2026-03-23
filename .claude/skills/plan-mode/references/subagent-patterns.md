# Subagent Patterns for Planning

## When to Use Subagents

Subagents run in separate context windows. This matters because exploration can consume thousands of tokens reading files — tokens that would otherwise fill your main context and degrade performance during the planning and execution phases.

**Tier-based guidance:**

| Tier    | Files | Subagent Strategy                                         |
| ------- | ----- | --------------------------------------------------------- |
| Simple  | 1-3   | No subagents. Explore yourself with Read/Glob/Grep        |
| Medium  | 4-8   | One subagent for the most-needed area (analyst OR docs)   |
| Complex | 9+    | Full trio: codebase-analyst + docs-researcher in parallel |

When in doubt, start without subagents and escalate if exploration reveals more complexity than expected.

**Don't use subagents when:**

- You just need to read 1-2 specific files
- You already know which files to look at
- The task is classified as Simple tier

## The Exploration Trio

For non-trivial tasks, launch three specialized sub-agents in parallel:

| Sub-Agent            | Type    | Focus                                                    | MCP Tools         | Prompt Source                |
| -------------------- | ------- | -------------------------------------------------------- | ----------------- | ---------------------------- |
| **codebase-analyst** | Explore | Semantic codebase search, pattern discovery, domain tags | greptile          | `agents/codebase-analyst.md` |
| **docs-researcher**  | Explore | Library docs, API verification, version compatibility    | context7, tessl   | `agents/docs-researcher.md`  |
| **lead** (you)       | —       | User interview, requirement clarification, synthesis     | Linear (optional) | —                            |

### Spawning the Trio

```
[codebase-analyst - Explore]: "Investigate [area]. Use greptile MCP for
semantic search to understand how [subsystem] works. Report domain tags,
architecture fit, files to touch, integration points, and constraints.
Follow the report format in your prompt."

[docs-researcher - Explore]: "Research [library/API]. Check the installed
version in package.json, find existing usage in the codebase, then query
context7 for API signatures and compatibility. Report version info,
verified signatures, gotchas, and recommendations."

[lead - you]: Interview the user about edge cases, constraints, and
preferences while sub-agents explore.
```

### MCP Tool Delegation

**Codebase Analyst** uses greptile for broad semantic queries:

```
Tool: mcp__plugin_greptile_greptile__search_greptile_comments
Query: "how does the memory extraction pipeline work"
```

Falls back to Grep/Glob if greptile is unavailable.

**Docs Researcher** uses context7 for library documentation:

```
Step 1: mcp__plugin_context7_context7__resolve-library-id
  library: "convex"

Step 2: mcp__plugin_context7_context7__query-docs
  libraryId: <resolved-id>
  query: "how to define indexes on tables"
```

Falls back to WebSearch/WebFetch if context7 is unavailable.

## Additional Delegation Patterns

### Pattern: Deep-Dive Research

For a single complex subsystem, use one focused codebase-analyst:

```
[codebase-analyst - Explore]: "Thoroughly investigate the payment processing
system. Use greptile to understand:
1. Data flow from checkout to payment confirmation
2. How errors and retries are handled
3. Which third-party APIs are called
4. What database tables are involved
5. How the system is tested

Report domain tags, architecture fit, and all integration points."
```

### Pattern: Plan Pre-Flight

After writing the plan, spawn the plan-reviewer for fast validation:

```
[plan-reviewer - Explore]: "Validate the plan at Docs/plans/2026-03-07-my-plan.md
against the project root at /path/to/project. Run validate-plan.sh, check
YAML frontmatter, verify integration points, and check for cross-slice
import violations. Report pass/fail with specifics."
```

### Pattern: External Research with Version Check

When the task involves unfamiliar libraries:

```
[docs-researcher - Explore]: "Research the Stripe Connect API for marketplace
payments. Check our installed stripe version in package.json first, then use
context7 to look up:
1. How to create connected accounts
2. How to split payments between platform and sellers
3. Webhook events we need to handle
4. Any gotchas for our installed version

Fall back to WebSearch if context7 doesn't have Stripe docs."
```

### Pattern: Library Spec Verification with Tessl

When the plan includes API calls to libraries, verify them before writing:

```
[docs-researcher - Explore]: "Verify the API patterns for [library] v[version].
1. Run `tessl search [library]` for curated specs
2. If a tile exists, `tessl install [tile]` and extract:
   - Exact function signatures
   - Required imports
   - Version-specific behavior
3. Cross-reference with context7 docs
4. Flag any discrepancies between tessl spec and context7 docs

Report verified signatures we can include in the plan's Integration Points."
```

## Combining Subagent Results

After subagents report back, synthesize their findings into your plan. The subagents give you the raw information; your job is to:

1. **Resolve conflicts** — if subagent findings disagree, investigate further
2. **Identify connections** — how do the subsystems interact?
3. **Spot gaps** — what did the subagents miss?
4. **Inform trade-offs** — use the findings to choose between approaches
5. **Merge domain tags** — combine tags from codebase-analyst with any the docs-researcher surfaced
6. **Cross-reference versions** — ensure docs-researcher's API signatures match what the codebase-analyst found in actual usage
