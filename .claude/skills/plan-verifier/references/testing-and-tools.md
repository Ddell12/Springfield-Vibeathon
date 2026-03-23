# Vitest + grammY + Claude Agent SDK

Last updated: 2026-03-06

---

## Vitest

### Quick Reference

| Item              | Detail                                               |
| ----------------- | ---------------------------------------------------- |
| Package           | `vitest`                                             |
| Mock utilities    | `vi.mock()`, `vi.fn()`, `vi.spyOn()`, `vi.hoisted()` |
| Assertion library | Built-in Chai (`expect`)                             |

**[PROJECT]:** ESM project (`"type": "module"`). Tests colocated in `__tests__/` within each slice.

### Best Practices

- One test file per module in `__tests__/`. Behavior-focused descriptions ("should X when Y").
- `vi.mock('./path.js', () => ({ ... }))` for module replacement. `vi.fn()` for standalone mocks. `vi.spyOn()` to observe without replacing.
- `vi.hoisted()` to define variables used in `vi.mock` factories (factories are hoisted above imports).
- `importOriginal` inside async factory for partial mocking.
- `afterEach(() => vi.restoreAllMocks())` or config `restoreMocks: true`.

### Known Gotchas

1. **`vi.mock()` is hoisted above all imports.** Mock is in place before module under test loads dependencies.

2. **Factory functions cannot reference top-level variables.** Use `vi.hoisted()`:

   ```ts
   // WRONG - fn undefined when factory runs
   const fn = vi.fn();
   vi.mock("./mod.js", () => ({ foo: fn }));

   // CORRECT
   const mocks = vi.hoisted(() => ({ foo: vi.fn() }));
   vi.mock("./mod.js", () => ({ foo: mocks.foo }));
   ```

3. **Default exports need explicit `default` key.** Factory must return `{ default: mockValue }`.

4. **`vi.doMock()` is NOT hoisted.** For per-test mocking, must use dynamic `await import()` after.

5. **TypeScript path aliases in `vi.mock()` may not resolve.** Use relative paths.

### Common Mistakes

- Not restoring mocks between tests (call history accumulates).
- Mocking too much (mock I/O, let pure logic run).
- Using `vi.mock()` when `vi.spyOn()` suffices.
- Testing implementation details instead of observable behavior.

---

## grammY

### Quick Reference

**[PROJECT]:** Used for Telegram bot in `src/channels/telegram.ts`. Access control via middleware.

### Best Practices

- **Always `await next()`** — forgetting `await` is the most common grammY bug. Breaks middleware chain, error handlers, and backpressure.
- Use `Composer` to organize middleware groups.
- Type-narrow with filter queries: `bot.on('message:text', ...)`.
- Always install `bot.catch()` for uncaught errors.
- Use external storage adapters in production — in-memory sessions lost on restart.

### Known Gotchas

1. **Forgetting `await` on `next()`.** Chain executes out of order, errors bypassed.
2. **Memory sessions vanish on restart.** Use persistent adapter in production.
3. **Telegram rate limits.** ~30 msg/s global, ~1 msg/s/chat. Use `@grammyjs/auto-retry` or throttler plugin.

---

## Claude Agent SDK

### Quick Reference

| Item             | Detail                                                 |
| ---------------- | ------------------------------------------------------ |
| Package          | `@anthropic-ai/claude-agent-sdk`                       |
| Permission modes | `acceptAll`, `bypassPermissions`, `dontAsk`, `default` |
| Built-in tools   | Bash, Read, Write, Edit, Glob, Grep, Agent, WebFetch   |
| Hooks            | `PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`    |

**[PROJECT]:** Runs with `bypassPermissions`. PreToolUse hooks enforce writable-dir boundaries. Tools scoped via `cwd: VAULT_PATH`.

### Known Gotchas

1. **[PROJECT] `bypassPermissions` propagates to ALL subagents.** No way to restrict below parent's level.

2. **[PROJECT] PreToolUse hooks are the sole safety net.** If hook import breaks or throws, write restrictions silently disappear.

3. **Dynamic `await import()` strings NOT validated by `tsc --noEmit`.** Verify manually when moving files.

4. **MCP tool schemas with `oneOf`/`anyOf` at top level cause Claude API 400 errors.**

5. **Hook errors can be silent.** Wrap in try/catch with explicit deny on error.

### Common Mistakes

- Not implementing PreToolUse hooks with `bypassPermissions` — gives full system access.
- Putting security logic in PostToolUse (runs AFTER tool executes).
- Not scoping `cwd` on the agent — exposes unintended file system.

---

Sources: [Vitest Mocking Guide](https://vitest.dev/guide/mocking), [grammY Middleware](https://grammy.dev/guide/middleware), [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)
