# Implementation Conventions

> These conventions are extracted from the project CLAUDE.md for worktree agent
> convenience. Agents in worktrees auto-load CLAUDE.md, but this reference ensures
> conventions are available in the spawn prompt context.

Coding patterns and conventions extracted from the Aura codebase. Follow these
when writing new code or modifying existing files.

---

## Module System

- **ESM throughout** — `"type": "module"` in package.json
- **Local imports must use `.js` extensions** — `import { foo } from "./bar.js"`
- **Node builtins use `node:` prefix** — `import { resolve } from "node:path"`

## Import Ordering

Group imports in this order, with a blank line between groups:

1. Node builtins (`node:path`, `node:fs`, `node:os`)
2. External packages (`@anthropic-ai/claude-agent-sdk`, `grammy`, `json5`)
3. Local imports (`./config.js`, `../types.js`)

Alphabetical within each group.

## Naming Conventions

| Element          | Convention  | Example                              |
| ---------------- | ----------- | ------------------------------------ |
| Files            | kebab-case  | `memory-flush.ts`, `atomic-write.ts` |
| Types/Interfaces | PascalCase  | `AuraConfig`, `ChannelCallbacks`     |
| Functions        | camelCase   | `buildHooks`, `assembleContext`      |
| Constants        | UPPER_SNAKE | `VAULT_PATH`, `MAX_IDENTITY_LINES`   |
| Variables        | camelCase   | `sessionKey`, `composioEnabled`      |

## TypeScript Patterns

- **Interfaces over type aliases** for object shapes — `interface Foo {}` not `type Foo = {}`
- **Explicit return types** on exported functions
- **Avoid `any`** — use `unknown` with narrowing instead
- **Type assertions use `as`** — prefer narrowing over casting
- **`Record<string, unknown>`** for untyped objects, not `any` or `object`

## File Structure

- **Files under 200 lines** — split when approaching this limit
- **One primary export per file** — a file named `sessions.ts` exports session-related functions
- **Named exports preferred** over default exports
- **Types in dedicated files** when shared — `types.ts` for cross-module types

## Error Handling

- **try/catch with typed narrowing**:
  ```typescript
  try {
    // ...
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err) {
      // handle specific error
    }
  }
  ```
- **Never swallow errors silently** — at minimum, log them
- **Use early returns** for guard clauses

## Config Pattern

- Config via `AuraConfig` interface + `loadConfig()` from `src/config.ts`
- Config values merged: defaults -> file overrides -> env overrides
- Use `resolveTilde()` for paths that may start with `~`
- Access specific config via dedicated exports: `VAULT_PATH`, `AGENT_DIR`, etc.

## Function Design

- **Pure functions preferred** — side effects isolated to thin wrappers
- **Async/await over raw promises** — no `.then()` chains
- **Destructure function parameters** when there are 3+ related args
- **Guard clauses at the top** — return early for invalid states

## Logging

- Use `createLogger(name)` from `src/logger.ts`
- Log objects first, message string second: `log.info({ key: value }, "message")`
- Truncate large values in logs: `.slice(0, 200)`

## Directory Conventions

| Directory                | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `src/`                   | All TypeScript source code                               |
| `src/agent/`             | Agent-specific modules (hooks, tools, prompt, subagents) |
| `src/channels/`          | Channel adapters (CLI, Telegram, etc.)                   |
| `src/<slice>/__tests__/` | Colocated test files per slice                           |
| `src/container/`         | Container/sandbox modules                                |

## Common Patterns to Reuse

- **`atomicWriteFile()`** from `src/atomic-write.ts` for safe file writes
- **`loadConfig()` / `getDefaultConfig()`** for configuration
- **`buildHooks()`** pattern for SDK hook composition
- **`createLogger()`** for structured logging
- **`ChannelCallbacks`** interface for adapter contracts
- **`SessionStore`** interface for session persistence abstraction
