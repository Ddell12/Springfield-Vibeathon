# Task 1: Fix Builder Generation Silent Failure

## Changes

### 1. Client-side: `use-streaming.ts`

**Add constants** (after imports, before type exports ~line 10):
```typescript
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 min overall
const INACTIVITY_TIMEOUT_MS = 60 * 1000;      // 60s between events
```

**Modify `generate()` function** (lines 370-456):

Before the `while (true)` read loop (after `let buffer = ""`), add:
```typescript
let timedOut = false;
const overallTimer = setTimeout(() => {
  timedOut = true;
  controller.abort();
}, GENERATION_TIMEOUT_MS);
let inactivityTimer = setTimeout(() => {
  timedOut = true;
  controller.abort();
}, INACTIVITY_TIMEOUT_MS);
```

Inside the read loop, after each successful `reader.read()` (right after `if (done) break;`), reset the inactivity timer:
```typescript
clearTimeout(inactivityTimer);
inactivityTimer = setTimeout(() => {
  timedOut = true;
  controller.abort();
}, INACTIVITY_TIMEOUT_MS);
```

Replace the catch block (line 451-454) with:
```typescript
} catch (err) {
  if (err instanceof Error && err.name === "AbortError") {
    if (timedOut) {
      flushTokenBuffer();
      dispatch({ type: "ERROR_RESPONSE", error: "Generation timed out — please try again" });
    }
    // If not timedOut, user cancelled — return silently
    return;
  }
  flushTokenBuffer();
  dispatch({ type: "ERROR_RESPONSE", error: extractErrorMessage(err) });
} finally {
  clearTimeout(overallTimer);
  clearTimeout(inactivityTimer);
}
```

### 2. Server-side: `route.ts`

In the catch block's `isClientDisconnect` branch (line 144-146), add a `try { send(...) }` before `failSession`:

```typescript
if (isClientDisconnect) {
  console.log(`[generate] Client disconnected: ${errSummary.slice(0, 200)}`);
  try { send("error", { message: "Client disconnected" }); } catch { /* stream already closed */ }
  await failSession(convex, sessionId, new Error("Client disconnected during generation"));
}
```

## Verification

- `npx tsc --noEmit` to confirm compilation
- No test changes needed (UI/network behavior)

## Risk Assessment

- Low risk. Timeouts are generous (5min overall, 60s inactivity). The `finally` block ensures timers are always cleaned up.
- The server-side send in the disconnect path is wrapped in try/catch since the stream may already be closed — this is fire-and-forget.
