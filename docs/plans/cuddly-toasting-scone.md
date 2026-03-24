# Fix Tool Rendering + Credit Depletion Issues

## Context

After Phase 4 visual verification, two issues remain:
1. **Tool preview shows "This tool couldn't be displayed"** even when the AI successfully creates a tool config
2. **Anthropic API credits deplete rapidly** — even with a fresh key and credits, the balance hits zero within a few messages

---

## Bug 1: Tool Config Schema Mismatch

**Root cause:** The Zod schema for `TokenBoardConfig` expects `celebrationAnimation: z.boolean()`, but the seed data stores strings (`"confetti"`, `"stars"`), and the AI system prompt gives no type hint — so Claude generates strings too. The `ToolConfigSchema.safeParse(config)` in `tool-renderer.tsx` fails silently, falling through to "This tool couldn't be displayed."

### Fix

**File:** `src/features/therapy-tools/types/tool-configs.ts` line 36

Change `celebrationAnimation` from boolean to a string enum with a default:

```diff
- celebrationAnimation: z.boolean(),
+ celebrationAnimation: z.enum(["confetti", "stars", "bounce", "none"]).default("confetti"),
```

This matches what both the seed data and Claude actually generate. The token board component should use this string to pick an animation style (or just treat any truthy value as "animate").

**File:** `convex/templates/seed.ts` — no change needed (seed data is already correct with strings)

**File:** `convex/agents/bridges.ts` — update system prompt (line ~33) to specify the enum:

```diff
- Config: title, totalTokens (3/5/10), earnedTokens, tokenIcon, reinforcers (id, label, icon), celebrationAnimation.
+ Config: title, totalTokens (3/5/10), earnedTokens, tokenIcon, reinforcers (id, label, icon), celebrationAnimation ("confetti" | "stars" | "bounce" | "none").
```

**File:** `src/features/therapy-tools/components/token-board.tsx` — update to use the string enum instead of boolean for celebration logic. Check current usage and adjust the conditional (e.g., `config.celebrationAnimation !== "none"` instead of `config.celebrationAnimation === true`).

### Additional robustness: Make safeParse failure more helpful

**File:** `src/features/therapy-tools/components/tool-renderer.tsx` lines 39-47

Add a dev-mode console warning when safeParse fails, so future mismatches are easier to debug:

```ts
if (!result.success) {
  if (process.env.NODE_ENV === "development") {
    console.warn("ToolRenderer: config validation failed", result.error.format());
  }
  return (
    <div className="p-8 text-center text-muted">
      This tool couldn&apos;t be displayed.
    </div>
  );
}
```

---

## Bug 2: Rapid Credit Depletion

**Root causes (multiple):**

1. **`maxSteps: 5`** — each user message can trigger up to 5 sequential LLM calls, each sending the full context (system prompt + history + tool definitions + accumulated results)
2. **React Strict Mode double-fires** — in dev mode, the thread-creation `useEffect` fires twice on mount, potentially creating orphan threads and duplicate API calls
3. **No guard against concurrent thread creation** — the `createThread` call has no `isCreating` guard, so rapid re-renders can spawn multiple threads

### Fix A: Reduce maxSteps from 5 to 3

**File:** `convex/agents/bridges.ts` line 180

```diff
- maxSteps: 5,
+ maxSteps: 3,
```

The typical flow only needs 2-3 steps: search knowledge → create tool → respond. This cuts worst-case API calls per message from 5 to 3.

### Fix B: Guard thread creation against double-fire

**File:** `src/app/(app)/builder/page.tsx` lines 16-28

Replace the two separate `useEffect` hooks with a single merged one that guards against concurrent creation:

```tsx
const isCreatingRef = useRef(false);

useEffect(() => {
  // Rehydrate persisted state first
  useBuilderState.persist.rehydrate();
}, []);

useEffect(() => {
  if (!threadId && !isCreatingRef.current) {
    isCreatingRef.current = true;
    createThread({}).then((id) => {
      setThreadId(id);
      isCreatingRef.current = false;
    });
  }
}, [threadId]);
```

The `isCreatingRef` prevents React Strict Mode's double-fire from creating two threads.

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/therapy-tools/types/tool-configs.ts` | `celebrationAnimation`: boolean → string enum |
| `src/features/therapy-tools/components/token-board.tsx` | Update celebration logic to use string enum |
| `src/features/therapy-tools/components/tool-renderer.tsx` | Add dev-mode console warning on safeParse failure |
| `convex/agents/bridges.ts` | Update system prompt type hint + reduce `maxSteps` to 3 |
| `src/app/(app)/builder/page.tsx` | Add `isCreatingRef` guard against double thread creation |

## Verification

1. `npx vitest run` — all 164 tests pass
2. Open `http://localhost:3005/builder`, send "Make a token board with 5 stars" → AI responds → **tool preview renders the token board** (not "couldn't be displayed")
3. Check browser console — no safeParse warnings for valid configs
4. Check Convex dashboard — only 1 thread created per builder page load (not 2)
5. Monitor Anthropic credit usage — should be ~3x less per message than before
