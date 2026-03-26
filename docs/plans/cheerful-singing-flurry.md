# Fix Skipped Code Review Findings

## Context

A prior code review flagged 7 findings as "not worth fixing." After re-analysis, the user wants all fixable items addressed. Items 4 (stringly-typed icon keys in LLM prompt) and 5 (set_app_name blocking mutation) are intentional design choices and remain excluded. The remaining 5 are small, safe improvements.

## Changes

### 1. Add `extractErrorMessage()` helper to `src/core/utils.ts`

**Why:** 6 sites repeat `err instanceof Error ? err.message : "Unknown error"` with inconsistent fallbacks (`String(err)`, `"WebContainer boot failed"`, etc.). A shared helper standardizes this.

**File:** `src/core/utils.ts`

Add after the existing `cn()` function:
```ts
/** Extract a human-readable message from an unknown caught value. */
export function extractErrorMessage(err: unknown, fallback = "Unknown error"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return fallback;
}
```

Then replace at these 6 sites:

| File | Line | Current | New |
|------|------|---------|-----|
| `src/app/api/generate/route.ts` | 181 | `` `Error: ${err instanceof Error ? err.message : String(err)}` `` | `` `Error: ${extractErrorMessage(err)}` `` |
| `src/app/api/generate/route.ts` | 460 | `error instanceof Error ? error.message : "Unknown error"` | `extractErrorMessage(error)` |
| `src/features/builder/hooks/use-streaming.ts` | 282 | `err instanceof Error ? err.message : "Unknown error"` | `extractErrorMessage(err)` |
| `src/features/builder/hooks/use-webcontainer.ts` | 79 | `err instanceof Error ? err.message : "WebContainer boot failed"` | `extractErrorMessage(err, "WebContainer boot failed")` |
| `src/features/builder/hooks/use-postmessage-bridge.ts` | 61 | `err instanceof Error ? err.message : "Unknown error"` | `extractErrorMessage(err)` |
| `src/features/builder/hooks/use-postmessage-bridge.ts` | 87 | `err instanceof Error ? err.message : "Unknown error"` | `extractErrorMessage(err)` |

**Note:** `sse-events.ts:47` uses `String(d.message ?? "Unknown error")` on a parsed object field, not a caught error — leave it as-is.

---

### 2. Extract `settleInBatches` to `src/core/utils.ts`

**Why:** Currently a private function in `route.ts` (lines 127-136). Moving it to shared utils makes it available if a second call site appears and keeps route.ts focused on request handling.

**File:** `src/core/utils.ts` — add:
```ts
/** Run promise-returning thunks in sequential batches, collecting all settled results. */
export async function settleInBatches<T>(
  thunks: (() => Promise<T>)[],
  batchSize: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < thunks.length; i += batchSize) {
    const batch = thunks.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map((fn) => fn()));
    results.push(...settled);
  }
  return results;
}
```

**File:** `src/app/api/generate/route.ts` — delete the local `settleInBatches` function (lines 127-136) and add `settleInBatches` to the import from `@/core/utils`.

---

### 3. Wire up toolbar name editing in `BuilderPage`

**Why:** `BuilderToolbar` has a fully coded rename UI (input field, blur/Enter/Escape handlers) but `BuilderPage` never passes the 3 required props. The rename button is clickable but does nothing — a UX gap.

**File:** `src/features/builder/components/builder-page.tsx`

a) Add `useMutation` to the Convex import (line 3):
```ts
import { useAction, useMutation, useQuery } from "convex/react";
```

b) Add state + mutation after `publishApp` (around line 40):
```ts
const updateTitle = useMutation(api.sessions.updateTitle);
const [isEditingName, setIsEditingName] = useState(false);
```

c) Add handler after `handleRetry` (around line 110):
```ts
const handleNameEditEnd = async (name: string) => {
  setIsEditingName(false);
  const trimmed = name.trim();
  if (!trimmed || trimmed === appName || !sessionId) return;
  try {
    await updateTitle({ sessionId: sessionId as Id<"sessions">, title: trimmed });
  } catch {
    toast.error("Failed to rename app");
  }
};
```

d) Pass the 3 props to `<BuilderToolbar>` (after line 160, the `projectName` prop):
```tsx
isEditingName={isEditingName}
onNameEditStart={() => setIsEditingName(true)}
onNameEditEnd={handleNameEditEnd}
```

**Backend:** `sessions.updateTitle` mutation already exists at `convex/sessions.ts:77-87` — no backend changes needed.

---

### 4. Cap npm install output buffer in `use-webcontainer.ts`

**Why:** `installOutput` accumulates unbounded during `npm install`. While the 60s timeout provides a practical limit, a simple ring buffer prevents memory issues if Vite/npm ever gets chatty.

**File:** `src/features/builder/hooks/use-webcontainer.ts`

Replace the output accumulation (lines 51-57) with a capped buffer:
```ts
const MAX_OUTPUT_CHARS = 50_000; // ~50KB cap
let installOutput = "";
installProcess.output.pipeTo(
  new WritableStream({
    write(chunk) {
      installOutput += chunk;
      if (installOutput.length > MAX_OUTPUT_CHARS) {
        installOutput = installOutput.slice(-MAX_OUTPUT_CHARS);
      }
    },
  })
).catch(() => {/* stream may close early */});
```

---

### 5. NOT fixing (intentional design decisions)

- **BuilderToolbarProps sprawl** — 15 props with one caller is fine. Refactoring to context/grouped objects adds indirection with no benefit. Revisit if a second consumer appears.
- **Stringly-typed icon keys** — inside LLM prompt template strings, not runtime code.
- **`set_app_name` blocking mutation** — intentional for immediate UI feedback.

---

## Files Modified

| File | Change |
|------|--------|
| `src/core/utils.ts` | Add `extractErrorMessage()` + `settleInBatches()` |
| `src/app/api/generate/route.ts` | Import shared utils, delete local `settleInBatches`, use `extractErrorMessage` at 2 sites |
| `src/features/builder/hooks/use-streaming.ts` | Use `extractErrorMessage` at 1 site |
| `src/features/builder/hooks/use-webcontainer.ts` | Use `extractErrorMessage` at 1 site, cap output buffer |
| `src/features/builder/hooks/use-postmessage-bridge.ts` | Use `extractErrorMessage` at 2 sites |
| `src/features/builder/components/builder-page.tsx` | Add name editing state, mutation, handler, pass props |

## Verification

1. **Type check:** `npx tsc --noEmit` — ensure no regressions from import changes
2. **Unit tests:** `npx vitest run` — all 252+ tests should still pass
3. **Manual test (name editing):** Open builder with a session, click project name, type new name, press Enter — name updates in toolbar and persists on page reload
4. **Manual test (error paths):** Trigger a generation error (e.g., disconnect network) — error message should still display correctly in chat panel
