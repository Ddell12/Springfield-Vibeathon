# Claude Agent SDK — Codebase-Specific Patterns

Patterns specific to this codebase's usage of `@anthropic-ai/claude-agent-sdk`.
For general SDK usage (query setup, streaming, session management, subagents),
Claude already has this knowledge — only codebase-specific conventions are documented here.

---

## Hook Implementation

Hooks intercept tool calls for validation, logging, and control.

### PreToolUse — Validate Before Execution

```typescript
import type { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

const enforceWriteBoundary: HookCallback = async (input) => {
  const { tool_name, tool_input } = input as PreToolUseHookInput;

  const filePath = (tool_input as Record<string, unknown>).file_path;
  if (typeof filePath !== "string") {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse" as const,
        permissionDecision: "deny" as const,
        permissionDecisionReason: `${tool_name}: missing file_path`,
      },
    };
  }

  if (!isPathAllowed(filePath)) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse" as const,
        permissionDecision: "deny" as const,
        permissionDecisionReason: `Write to ${filePath} denied — outside allowed dirs`,
      },
    };
  }

  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse" as const,
      permissionDecision: "allow" as const,
    },
  };
};
```

### Composing Hooks

```typescript
import type { HookEvent, HookCallbackMatcher } from "@anthropic-ai/claude-agent-sdk";

type Hooks = Partial<Record<HookEvent, HookCallbackMatcher[]>>;

function buildHooks(): Hooks {
  return {
    PreToolUse: [
      { matcher: "Write|Edit", hooks: [enforceWriteBoundary] },
      { matcher: "Bash", hooks: [enforceBashSafety] },
      { hooks: [auditLog] }, // Catch-all (no matcher)
    ],
    PostToolUse: [{ hooks: [costTracker] }],
    Stop: [{ hooks: [cleanup] }],
  };
}
```

### Hook Return Values

| Return                                                                                            | Effect                                           |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `{ continue: true }`                                                                              | No decision — let other hooks or defaults handle |
| `{ hookSpecificOutput: { hookEventName, permissionDecision: "allow" } }`                          | Explicitly allow                                 |
| `{ hookSpecificOutput: { hookEventName, permissionDecision: "deny", permissionDecisionReason } }` | Block with reason                                |
| `{ hookSpecificOutput: { hookEventName, permissionDecision: "allow" }, updatedInput }`            | Allow with modified input                        |

Always include `hookEventName` in `hookSpecificOutput`. Matchers use pipe-separated
tool names: `"Read|Write|Edit|Grep|Glob"`.

## MCP Server Creation

### In-Process SDK Server

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const server = createSdkMcpServer({
  name: "my-server",
  version: "1.0.0",
  tools: [
    tool({
      name: "lookup",
      description: "Look up a value by key",
      schema: z.object({
        key: z.string().describe("The key to look up"),
      }),
      handler: async ({ key }) => {
        const value = await db.get(key);
        return { content: [{ type: "text", text: JSON.stringify(value) }] };
      },
    }),
  ],
});

// Register in query options
const options = {
  mcpServers: {
    "my-server": server,
  },
};
```

### Tool Handler Pattern

Tool handlers return `CallToolResult`:

```typescript
handler: async (input) => {
  try {
    const result = await doWork(input);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${String(err)}` }],
      isError: true,
    };
  }
};
```
