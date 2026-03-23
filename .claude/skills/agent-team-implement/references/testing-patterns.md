# Testing Patterns

Test framework, structure, and conventions used in the Aura codebase.

---

## Framework

- **Vitest** — run with `npx vitest run`
- Config: default Vitest config (no custom vitest.config.ts required)
- TypeScript tests run directly via Vitest's built-in transform

## File Location & Naming

- Tests are **colocated** in each slice's `__tests__/` directory
- Naming: `{module-name}.test.ts` — matches the source file being tested
- Example: `src/agent/hooks.ts` -> `src/agent/__tests__/hooks.test.ts`
- Example: `src/memory/extract.ts` -> `src/memory/__tests__/extract.test.ts`

## Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("moduleName", () => {
  beforeEach(() => {
    // Reset mocks between tests
    vi.clearAllMocks();
  });

  describe("functionName", () => {
    it("does expected behavior in normal case", () => {
      // Arrange
      const input = createInput();

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toEqual(expected);
    });

    it("handles edge case", () => {
      // ...
    });

    it("throws on invalid input", () => {
      expect(() => functionName(null)).toThrow();
    });
  });
});
```

### Conventions

- `describe()` blocks group by module, then by function
- `it()` descriptions use verb-first phrasing: "returns X when Y", "throws on invalid input"
- **Arrange-Act-Assert** pattern within each test
- One assertion concept per test (multiple `expect` calls are fine if testing the same concept)

## Mocking

### Module Mocks with `vi.mock()`

```typescript
// Mock an entire module
vi.mock("../config.js", () => ({
  loadConfig: vi.fn(() => ({
    /* mock config */
  })),
  VAULT_PATH: "/mock/vault",
}));

// Mock with actual module as base
vi.mock("../permissions.js", async () => {
  const actual = await vi.importActual<typeof import("../permissions.js")>("../permissions.js");
  return {
    ...actual,
    loadPermissions: vi.fn(() => ({
      /* override */
    })),
  };
});
```

### Hoisted Mocks for Cross-Reference

When mock functions need to be referenced in both `vi.mock()` factories and test
assertions, use `vi.hoisted()`:

```typescript
const { mockInfo, mockError } = vi.hoisted(() => ({
  mockInfo: vi.fn(),
  mockError: vi.fn(),
}));

vi.mock("../logger.js", () => ({
  createLogger: () => ({
    info: mockInfo,
    error: mockError,
  }),
}));

// Later in tests:
expect(mockInfo).toHaveBeenCalledWith(
  expect.objectContaining({ tool_name: "Read" }),
  expect.stringContaining("audit"),
);
```

### Function Mocks

```typescript
const mockCallback = vi.fn();
const mockAsync = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

// Override for specific test
mockAsync.mockRejectedValueOnce(new Error("disk full"));
```

### Reset Between Tests

```typescript
beforeEach(() => {
  mockInfo.mockClear(); // Clear call history
  mockError.mockClear();
  // OR
  vi.clearAllMocks(); // Clear all mocks at once
});
```

## Common Test Patterns

### Testing Hook Callbacks

```typescript
const baseInput = {
  session_id: "test-session",
  transcript_path: "/tmp/test",
  cwd: "/tmp",
};

const input: PreToolUseHookInput = {
  ...baseInput,
  hook_event_name: "PreToolUse",
  tool_name: "Write",
  tool_input: { file_path: "/some/path.md" },
  tool_use_id: "tu-1",
};

const result = await hook(input, "tu-1", { signal: AbortSignal.abort() });
expect(result).toHaveProperty("hookSpecificOutput.permissionDecision", "deny");
```

### Testing Config/File Operations

```typescript
// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

// Or mock specific behavior
import { readFile } from "fs/promises";
const mockReadFile = readFile as ReturnType<typeof vi.fn>;
mockReadFile.mockResolvedValue("file contents");
```

### Type Assertions for Mocks

```typescript
// Cast to access mock methods
const hookOutput = (result as Record<string, unknown>).hookSpecificOutput as
  | Record<string, unknown>
  | undefined;

if (hookOutput) {
  expect(hookOutput.permissionDecision).not.toBe("deny");
} else {
  expect(result).toHaveProperty("continue", true);
}
```

## What to Test

### Always Test

- **Public API** — exported functions and their return values
- **Happy path** — normal expected usage
- **Edge cases** — empty inputs, boundary values, null/undefined
- **Error cases** — invalid inputs, thrown errors, rejected promises
- **Side effects** — that mocked functions were called with correct args

### Skip Testing

- Private implementation details (test through the public API)
- Third-party library behavior
- Type-only exports (interfaces, type aliases)

## Assertion Patterns

```typescript
// Exact equality
expect(result).toEqual({ key: "value" });

// Partial matching
expect(result).toEqual(expect.objectContaining({ key: "value" }));

// String matching
expect(message).toContain("error");
expect(message).toMatch(/pattern/);

// Property existence
expect(result).toHaveProperty("nested.path", expectedValue);

// Function call verification
expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).not.toHaveBeenCalled();

// Error testing
expect(() => fn()).toThrow("message");
await expect(asyncFn()).rejects.toThrow();
```

## Convex Test Patterns

For testing Convex backend functions (queries, mutations, actions), use
`convex-test` with `@edge-runtime/vm`.

### Setup

Tests for Convex functions live in `convex/**/__tests__/` and run in the
`convex` Vitest project (edge-runtime environment).

```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema.js";
import { api, internal } from "../_generated/api.js";

describe("myModule", () => {
  it("creates a record", async () => {
    const t = convexTest(schema);

    // Seed test data using t.run()
    await t.run(async (ctx) => {
      await ctx.db.insert("myTable", {
        field: "value",
        // Must match schema validators exactly
      });
    });

    // Call queries/mutations via t.query() / t.mutation()
    const result = await t.query(api.myModule.list);
    expect(result).toHaveLength(1);

    // Call internal functions
    await t.mutation(internal.myModule.internalUpdate, { id: result[0]._id });
  });
});
```

### Key Patterns

- Use `convexTest(schema)` — always pass the schema
- `t.query()`, `t.mutation()`, `t.action()` — NOT `.handler(ctx as any, ...)`
- `t.run(async (ctx) => ctx.db.insert(...))` for seeding — data must match validators
- Import from `api` (public) or `internal` (internal functions)
- Each test gets a fresh database — no cleanup needed

## React Component Testing

For dashboard React components, use React Testing Library (RTL).

```typescript
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, afterEach } from "vitest";

// Explicit cleanup — required in dashboard test setup
afterEach(() => {
  cleanup();
});

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent data={mockData} />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  it("handles user interaction", async () => {
    const user = userEvent.setup();
    render(<MyComponent onAction={mockFn} />);
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(mockFn).toHaveBeenCalled();
  });
});
```

## When to Invoke Domain Skills for Testing

- If writing tests for `convex/` functions -> invoke skill: "convex-dev" for
  schema validation, function patterns, and edge-runtime setup
- If writing tests for React/dashboard components -> invoke skill: "frontend-design"
  for component patterns and accessibility testing
- If testing Trigger.dev tasks -> invoke skill: "trigger-manager" for task
  mocking and run simulation patterns
