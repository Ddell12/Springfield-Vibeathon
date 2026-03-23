---
name: update-plan-refs
description: >
  Refreshes the plan-verifier reference files with current best practices and gotchas for the tech
  stack (Convex, Next.js, Trigger.dev, shadcn/ui, Tailwind, Vitest, grammY, Claude Agent SDK).
  Uses Context7 for up-to-date documentation and web search for recent gotchas. Trigger when the
  user says "update plan refs", "refresh references", "update tech stack docs", or when a reference
  file is more than 90 days old. Also trigger after discovering a new gotcha during plan execution.
---

# Update Plan References

Refreshes the tech stack reference files used by the plan-verifier skill. Each reference file lives in `.claude/skills/plan-verifier/references/` and contains best practices, known gotchas, and common plan mistakes for a library.

## When to Run

- Manually: user says "update plan refs" or "refresh references"
- After discovering a new gotcha during plan execution
- When a reference file's `Last updated` date is > 90 days old

## Reference Files

| File                   | Libraries                        | Context7 IDs                       |
| ---------------------- | -------------------------------- | ---------------------------------- |
| `convex.md`            | Convex                           | resolve "convex"                   |
| `nextjs.md`            | Next.js App Router               | resolve "next.js"                  |
| `trigger-dev.md`       | Trigger.dev                      | resolve "@trigger.dev/sdk"         |
| `ui-stack.md`          | shadcn/ui, Tailwind CSS v4       | resolve "shadcn-ui", "tailwindcss" |
| `testing-and-tools.md` | Vitest, grammY, Claude Agent SDK | resolve "vitest", "grammy"         |

## Update Process

For each reference file that needs updating:

### 1. Preserve `[PROJECT]`-Tagged Items

Read the current file. Extract all items marked `[PROJECT]` — these are verified project-specific gotchas that must survive updates.

### 2. Research Current State

For each library in the file:

1. **Context7**: Call `resolve-library-id` then `query-docs` with focused queries:
   - "common mistakes gotchas breaking changes"
   - "best practices patterns"
   - The specific API areas most relevant to this project

2. **Web Search**: Search for `"{library} gotchas common mistakes {current year}"` and `"{library} breaking changes {current year}"`

3. **Trigger.dev MCP** (for trigger-dev.md only): Call `mcp__trigger__search_docs` for latest patterns

### 3. Merge and Write

Merge new findings with preserved project-specific gotchas. Update the `Last updated:` date. Write the file.

Structure each reference file consistently:

````markdown
# {Library Name}

Last updated: {YYYY-MM-DD}

## Quick Reference

| Pattern | Correct | Wrong |
| ------- | ------- | ----- |
| ...     | ...     | ...   |

## Best Practices

### {Category}

- ...

## Known Gotchas

- `[PROJECT]` {gotcha from real project experience}
- {gotcha from docs/research}

## Common Plan Mistakes

Things AI plan generators frequently get wrong:

- ...

## API Patterns

```{lang}
// Correct
...

// Wrong (common mistake)
...
```
````

```

### 4. Parallel Execution

Spawn one subagent per reference file for parallel updates. Each subagent handles the full research + merge + write cycle for its file.

## Adding a New Reference File

If the project adopts a new library:

1. Create `references/{library}.md` following the template above
2. Add it to `references/README.md`
3. Add Context7 resolution info to the table above
4. Update the plan-verifier SKILL.md Phase 3.2 if needed
```
