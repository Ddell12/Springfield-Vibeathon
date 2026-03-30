# Fix: Builder Generation Silent Failure

## Summary
Add timeout protection to the SSE streaming client and improve error propagation on client disconnect.

## Files to Change

### 1. `src/features/builder/hooks/use-streaming.ts`

**Add constants** after imports (line 8), before the reducer:
```typescript
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 min overall limit
const INACTIVITY_TIMEOUT_MS = 60 * 1000;      // 60s between SSE events
```

**Add timeout setup** before the `while (true)` loop at line 424:
```typescript
let timedOut = false;
const overallTimer = setTimeout(() => { timedOut = true; controller.abort(); }, GENERATION_TIMEOUT_MS);
let inactivityTimer = setTimeout(() => { timedOut = true; controller.abort(); }, INACTIVITY_TIMEOUT_MS);
```

**Reset inactivity timer** inside the `while (true)` loop, after `if (done) break;` (after line 426):
```typescript
clearTimeout(inactivityTimer);
inactivityTimer = setTimeout(() => { timedOut = true; controller.abort(); }, INACTIVITY_TIMEOUT_MS);
```

**Update AbortError handling** in catch block (line 452):
- Current: `if (err instanceof Error && err.name === "AbortError") return;`
- New:
```typescript
if (err instanceof Error && err.name === "AbortError") {
  if (timedOut) {
    flushTokenBuffer();
    dispatch({ type: "ERROR_RESPONSE", error: "Generation timed out — please try again" });
  }
  return;
}
```

**Add finally block** after catch (after line 455):
```typescript
finally {
  clearTimeout(overallTimer);
  clearTimeout(inactivityTimer);
}
```

Note: `timedOut`, `overallTimer`, and `inactivityTimer` are declared inside `generate()` but before the `while` loop, so they're in scope for both the catch and finally blocks. The `flushTokenBuffer` function is already available via `useCallback` in the hook.

### 2. `src/app/api/generate/route.ts`

**Add error SSE event on client disconnect** at line 145, before `failSession()`:
```typescript
try { send("error", { message: "Client disconnected" }); } catch { /* stream may be closed */ }
```

## Verification
```bash
cd /Users/desha/Springfield-Vibeathon/.worktrees/fix-e2e-issues && npx tsc --noEmit 2>&1 | head -30
```

## Commit
```
fix(builder): add generation timeout and improve error propagation

- Add 5-minute overall timeout and 60s inactivity timeout to SSE stream
- Dispatch ERROR_RESPONSE on timeout instead of hanging silently
- Send error SSE event on client disconnect before failing session
```

## Risk Assessment
- **Low risk**: Timeouts are generous (5 min overall, 60s inactivity) and only affect stalled generations
- **No breaking changes**: Existing behavior preserved for successful generations and user-initiated aborts
- **Edge case**: The `send()` call on client disconnect may silently fail (wrapped in try/catch), which is expected since the stream may already be closed
