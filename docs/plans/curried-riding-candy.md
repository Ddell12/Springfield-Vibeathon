# React Performance Fixes — Vercel Best Practices Audit

## Context

A Vercel React Best Practices audit identified 7 actionable performance issues in the Bridges codebase. These are pure optimizations — no behavior changes, no new dependencies. The fixes target bundle size (CRITICAL), request waterfalls (CRITICAL), server-side rendering (HIGH), and unnecessary re-renders (MEDIUM).

---

## Fix 1: Dynamic import CodeDrawer (CRITICAL — bundle size)

**File:** `src/features/builder/components/builder-page.tsx`

CodeDrawer is only shown when user toggles to "code" view. Currently statically imported, adding to the initial JS bundle.

- Add `import dynamic from "next/dynamic"`
- Replace `import { CodeDrawer } from "./code-drawer"` with:
  ```tsx
  const CodeDrawer = dynamic(
    () => import("./code-drawer").then((m) => ({ default: m.CodeDrawer })),
    {
      loading: () => (
        <div className="flex h-full items-center justify-center bg-surface-container-lowest">
          <span className="text-sm text-on-surface-variant">Loading code view...</span>
        </div>
      ),
    }
  );
  ```
- The `.then(m => ({ default: m.CodeDrawer }))` pattern is needed because CodeDrawer uses a named export (project convention).

---

## Fix 2: Parallelize Convex file upserts (CRITICAL — waterfall)

**File:** `src/app/api/generate/route.ts`

Sequential `await convex.mutation()` calls inside the file loop add ~100ms per file. The mutations are independent writes.

- Keep `send()` calls in the loop (SSE events must stream immediately)
- Collect mutation promises instead of awaiting each one
- `Promise.all()` after the loop

```tsx
const mutationPromises: Promise<unknown>[] = [];
for (const block of finalMessage.content) {
  if (block.type === "tool_use" && block.name === "write_file") {
    const input = block.input as { path: string; contents: string };
    collectedFiles.push(input);
    send("file_complete", { path: input.path, contents: input.contents, version });

    mutationPromises.push(
      convex.mutation(api.generated_files.upsert, {
        sessionId: sessionId as Id<"sessions">,
        path: input.path,
        contents: input.contents,
        version,
      })
    );
    version++;
  }
}
await Promise.all(mutationPromises);
```

---

## Fix 3: Server component layout (HIGH — server-side perf)

**Files:** `src/app/(app)/layout.tsx` + new `src/app/(app)/sidebar-wrapper.tsx`

The entire `(app)` layout is client-side just for `usePathname()`. Extracting a tiny client wrapper lets the layout render on the server.

**New file** `src/app/(app)/sidebar-wrapper.tsx`:
```tsx
"use client";

import { usePathname } from "next/navigation";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";

export function SidebarWrapper() {
  const pathname = usePathname();
  if (pathname?.startsWith("/builder")) return null;
  return <DashboardSidebar />;
}
```

**Modified** `src/app/(app)/layout.tsx` — remove `"use client"`, remove `usePathname` import, import `SidebarWrapper` instead:
```tsx
import { SidebarWrapper } from "./sidebar-wrapper";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarWrapper />
      <main id="main-content" className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
```

---

## Fix 4: useMemo for buildFileTree (MEDIUM — re-render)

**File:** `src/features/builder/components/code-drawer.tsx`

`buildFileTree()` is O(n x depth) and runs every render (search keystrokes, file clicks).

- Add `useMemo` to React import: `import { useMemo, useState } from "react"`
- Change line 128: `const fileTree = useMemo(() => buildFileTree(files), [files]);`

---

## Fix 5: Narrow auto-scroll dependencies (MEDIUM — re-render)

**File:** `src/features/builder/components/chat-panel.tsx`

Scroll effect fires on every `files` change during generation — redundant DOM operations.

- Change line 87 deps from `[messages, isGenerating, files]` to `[messages?.length, isGenerating]`

---

## Fix 6: Merge thinking indicator effects (MEDIUM — re-render)

**File:** `src/features/builder/components/thinking-indicator.tsx`

Two separate effects for the same concern create a one-frame race where stale elapsed value flashes.

- Replace both effects (lines 15-32) with one:
  ```tsx
  useEffect(() => {
    if (!isThinking || !startTime) {
      return;
    }
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isThinking, startTime]);
  ```

---

## Fix 7: Stabilize useCallback in useStreaming (MEDIUM — re-render)

**File:** `src/features/builder/hooks/use-streaming.ts`

`generate` callback depends on `[options]` — an object that's a new reference every render, defeating memoization.

- After `const abortRef` (line 63), add:
  ```tsx
  const onFileCompleteRef = useRef(options?.onFileComplete);
  onFileCompleteRef.current = options?.onFileComplete;
  ```
- Replace both `options?.onFileComplete(path, contents)` calls (lines 139-141 and 177-179) with `onFileCompleteRef.current?.(path, contents)`
- Change useCallback deps from `[options]` to `[]`

---

## Implementation Order

| Order | Fix | Risk | Effort |
|-------|-----|------|--------|
| 1 | Fix 3 — Server layout | None | 5 min |
| 2 | Fix 1 — Dynamic CodeDrawer | None | 3 min |
| 3 | Fix 2 — Parallel upserts | Low | 3 min |
| 4 | Fix 7 — Stable useCallback | Low | 3 min |
| 5 | Fix 4 — useMemo fileTree | None | 1 min |
| 6 | Fix 5 — Scroll deps | None | 1 min |
| 7 | Fix 6 — Merge effects | None | 2 min |

Fixes 4-7 are independent and can be done in any order.

## Verification

1. `npm run build` — confirms no TypeScript or build errors
2. `npm run dev` — manual smoke test:
   - Navigate dashboard/builder — sidebar shows/hides correctly (Fix 3)
   - Enter a prompt, generate an app — files stream, preview loads (Fixes 2, 7)
   - Toggle code view — CodeDrawer opens with loading state (Fix 1)
   - Watch thinking indicator — timer starts at 0, no flash (Fix 6)
   - Check chat scrolls on new messages, not on file writes (Fix 5)
3. `npx vitest run` — existing tests still pass
