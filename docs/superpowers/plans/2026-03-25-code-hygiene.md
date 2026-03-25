# Code Hygiene: Consolidated Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all issues identified across two independent code reviews (23-item streaming review + 42-item health audit), organized into 7 workstreams from critical → low priority.

**Architecture:** Fixes are organized by subsystem ownership, not severity. Each task is self-contained. Tasks within a workstream are ordered by dependency. Auth-related items are deferred to Phase 6 per CLAUDE.md but tracked here for completeness.

**Tech Stack:** React 19 (Next.js App Router), Convex, Zod, @anthropic-ai/sdk, WebContainer API

**Sources:** `code-review-summary.md` (23 findings), `bridges-codebase-health-audit.html` (42+ findings), Simplify Audit Report (31 findings)

---

## File Map

### Created
- `src/features/builder/lib/schemas/generate.ts` — Zod schema for /api/generate input
- `src/shared/lib/navigation.ts` — shared NAV_ITEMS + isNavActive
- `convex/lib/session_states.ts` — SESSION_STATES const object (underscore, not hyphen — Convex requirement)
- `src/shared/components/error-display.tsx` — shared error page component
- `src/core/clipboard.ts` — shared clipboard + toast utility

### Modified (major)
- `src/features/builder/hooks/use-streaming.ts` — rAF batching, useRef for sessionId, remove dead exports, per-instance activityCounter
- `src/app/api/generate/route.ts` — Zod validation, error sanitization, duplicate message guard, version from session
- `src/features/builder/components/chat-panel.tsx` — memoize ProgressSteps, throttle scroll, fix thinking-done logic, fix type cast
- `src/features/builder/hooks/webcontainer.ts` — reject on SSR instead of never-resolving
- `src/features/builder/components/preview-panel.tsx` — remove allow-same-origin from iframe sandbox
- `convex/http.ts` — restrict CORS to production domain + localhost
- `convex/schema.ts` — remove legacy fields, replace v.any() with proper validators
- `convex/sessions.ts` — use SESSION_STATES constant, add userId scoping comments

### Modified (minor)
- `src/features/sharing/components/share-dialog.tsx` — try/catch clipboard, rename toolTitle→appTitle
- `src/features/builder/components/builder-page.tsx` — rename projectName→appName, use window.location.origin, remove dead ternary
- `src/features/builder/components/blueprint-card.tsx` — remove dead onApprove/onEdit props
- `src/features/dashboard/components/dashboard-sidebar.tsx` — import shared NAV_ITEMS
- `src/shared/components/mobile-nav-drawer.tsx` — import shared NAV_ITEMS
- `src/features/dashboard/components/dashboard-view.tsx` — replace SAMPLE_PROJECTS with Convex query
- `src/env.ts` — fix GOOGLE_API_KEY → GOOGLE_GENERATIVE_AI_API_KEY

### Kept (not deleted)
All existing components are retained — even those currently without production imports. They may be needed in upcoming phases.

---

## Workstream 1: Critical Fixes (must-fix before demo)

### Task 1.1: Token Batching — rAF Throttle in use-streaming.ts

**Files:**
- Modify: `src/features/builder/hooks/use-streaming.ts:63-107`
- Test: `src/features/builder/components/__tests__/chat-panel.test.tsx`

**Why:** `setStreamingText(prev + token)` fires on every SSE chunk (~100/sec), causing full re-renders of ChatPanel including scroll effects. Visible jank during generation. Both reviews flagged this (Review #1: Critical #1, Audit: not separate but implied by token streaming path).

**Best practice (researched):** Vercel AI SDK uses `experimental_throttle` to batch. The general React pattern is ref-based buffering + requestAnimationFrame flush — collapses N tokens per frame into 1 render (capped at 60fps).

- [ ] **Step 1: Fix global activityCounter → useRef per instance**

Move `let activityCounter = 0` (line 63) inside the hook as a useRef. This fixes cross-instance ID collisions and StrictMode double-fire.

```typescript
// BEFORE (line 63):
let activityCounter = 0;

// AFTER (inside useStreaming function body, after other useRef declarations):
const activityCounterRef = useRef(0);
```

Update the `addActivity` callback (line 81):
```typescript
const addActivity = useCallback(
  (type: Activity["type"], message: string, path?: string) => {
    const id = `activity-${++activityCounterRef.current}`;
    setActivities((prev) => [
      ...prev,
      { id, type, message, path, timestamp: Date.now() },
    ]);
  },
  []
);
```

- [ ] **Step 2: Add rAF-based token batching**

Add refs for buffering and rAF ID after the existing refs:

```typescript
const tokenBufferRef = useRef("");
const rafIdRef = useRef<number>();
```

Replace the token case in `handleEvent` (line 104-106):

```typescript
case "token":
  tokenBufferRef.current += d.token as string;
  if (!rafIdRef.current) {
    rafIdRef.current = requestAnimationFrame(() => {
      setStreamingText(tokenBufferRef.current);
      rafIdRef.current = undefined;
    });
  }
  break;
```

Reset the buffer when starting a new generation (in the `generate` function, around line 164 where `setStreamingText("")` is called):

```typescript
setStreamingText("");
tokenBufferRef.current = "";
```

Add cleanup: cancel any pending rAF when aborting. In the existing abort logic or a useEffect cleanup:

```typescript
// Inside generate, in the abort controller setup area:
if (rafIdRef.current) {
  cancelAnimationFrame(rafIdRef.current);
  rafIdRef.current = undefined;
}
```

- [ ] **Step 3: Remove dead previewUrl export**

Delete line 73 (`const previewUrl: string | null = null;`) and remove `previewUrl` from the return object (line 237). Also remove it from the `UseStreamingReturn` interface (line 27).

Also update tests that reference `previewUrl`:
- `use-streaming.test.ts:41-43` — remove the `previewUrl is null initially` test
- `chat-panel.test.tsx:21` — remove `previewUrl: null` from the `useStreaming` mock return value

- [ ] **Step 4: Use useRef for sessionId in generate callback**

Replace the sessionId closure with a ref to prevent stale closures when sessionId updates mid-stream:

```typescript
// Add after existing refs:
const sessionIdRef = useRef(sessionId);
sessionIdRef.current = sessionId;
```

Update the `generate` callback to read from ref (line 174):
```typescript
body: JSON.stringify({
  prompt,
  sessionId: sessionIdRef.current ?? undefined,
}),
```

Remove `sessionId` from the useCallback dependency array (line 228):
```typescript
[handleEvent]
```

- [ ] **Step 5: Run tests to verify**

Run: `npx vitest run src/features/builder/ --reporter=verbose`
Expected: All existing tests pass (token batching is an internal optimization, no API change needed in tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/builder/hooks/use-streaming.ts
git commit -m "perf: add rAF token batching, fix global state, remove dead exports in use-streaming"
```

---

### Task 1.2: Input Validation + Error Sanitization in route.ts

**Files:**
- Create: `src/features/builder/lib/schemas/generate.ts`
- Modify: `src/app/api/generate/route.ts:20-199`
- Test: (manual — SSE route not unit-testable without MSW integration)

**Why:** No input validation (10MB string → LLM = $$$), raw error.message leaked to client (exposes Anthropic request IDs, Convex table names), duplicate messages on retry. Review #1: Critical #4, #5, High #3, #4, #6. Audit: Critical #2.

**Best practice (researched):** Zod `.safeParse()` for validation, generic error categories to client with full logging server-side.

- [ ] **Step 1: Create Zod schema for generate input**

```typescript
// src/features/builder/lib/schemas/generate.ts
import { z } from "zod";

export const GenerateInputSchema = z.object({
  query: z.string().min(1, "Prompt is required").max(10_000, "Prompt too long (max 10,000 characters)").optional(),
  prompt: z.string().min(1).max(10_000).optional(),
  sessionId: z.string().optional(),
}).refine(
  (data) => data.query || data.prompt,
  { message: "Either query or prompt is required" }
);

export type GenerateInput = z.infer<typeof GenerateInputSchema>;
```

- [ ] **Step 2: Add validation to route handler**

Replace lines 20-29 in route.ts:

```typescript
import { GenerateInputSchema } from "@/features/builder/lib/schemas/generate";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = GenerateInputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const query = parsed.data.query ?? parsed.data.prompt!;
  const providedSessionId = parsed.data.sessionId as Id<"sessions"> | undefined;
```

- [ ] **Step 3: Sanitize error messages**

Replace the catch block (lines 185-199):

```typescript
} catch (error) {
  // Log full detail server-side only
  console.error("[generate] Error:", error instanceof Error ? error.stack : error);

  // Send generic message to client — never expose internals
  const clientMessage = "Generation failed — please try again";

  try {
    await convex.mutation(api.sessions.setFailed, {
      sessionId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } catch (persistError) {
    console.error("[generate] Failed to persist error state:", persistError);
  }

  send("error", { message: clientMessage });
}
```

- [ ] **Step 4: Fix duplicate message on retry**

Before persisting the user message (line 52-57), check if this session already has a user message with the same content in recent history. Since we're using ConvexHttpClient (no reactive queries), the simplest fix is to make message creation idempotent by only creating when we also create the session:

```typescript
// Only persist user message for NEW sessions (not retries on existing ones)
if (!providedSessionId) {
  await convex.mutation(api.messages.create, {
    sessionId,
    role: "user",
    content: query,
    timestamp: Date.now(),
  });
}
```

- [ ] **Step 5: Fix version — fetch from session's latest file version**

Replace `let version = 1;` (line 68) with a query to get the next version:

```typescript
// Get latest version for this session to support multi-turn
// Uses existing generated_files.list query (convex/generated_files.ts:37-44)
const existingFiles = await convex.query(api.generated_files.list, { sessionId });
let version = existingFiles.length > 0
  ? Math.max(...existingFiles.map(f => f.version ?? 0)) + 1
  : 1;
```

- [ ] **Step 6: Run the app to verify SSE streaming still works**

Run: `npm run dev`
Test: Send a prompt, verify streaming works, check that error messages are generic, verify input validation rejects empty/huge prompts.

- [ ] **Step 7: Commit**

```bash
git add src/features/builder/lib/schemas/generate.ts src/app/api/generate/route.ts
git commit -m "security: add Zod input validation, sanitize SSE errors, fix duplicate messages and version tracking"
```

---

### Task 1.3: Parallelize Post-LLM Mutations + Unblock SSE File Writes

**Files:**
- Modify: `src/app/api/generate/route.ts:154-180`
- Modify: `src/features/builder/hooks/use-streaming.ts:129-131`

**Why (Simplify Audit #2, #3):** After the LLM stream finishes, three independent Convex mutations run sequentially (persist assistant message, persist system message, update session to live), adding ~0.5s before the `done` SSE event. Also, each `file_complete` SSE event triggers `await onFileCompleteRef.current(path, contents)` which blocks the stream reader — if 5 files come through, the stream pauses for 5 sequential filesystem operations.

- [ ] **Step 1: Wrap post-LLM mutations in Promise.all**

In `route.ts`, after the file mutation promises (around line 154-180), replace the sequential calls:

```typescript
// BEFORE (sequential):
if (assistantText.trim()) {
  await convex.mutation(api.messages.create, { ... });
}
if (collectedFiles.length > 0) {
  await convex.mutation(api.messages.create, { ... });
}
await convex.mutation(api.sessions.setLive, { sessionId });

// AFTER (parallel):
const postLlmPromises: Promise<unknown>[] = [];

if (assistantText.trim()) {
  postLlmPromises.push(
    convex.mutation(api.messages.create, {
      sessionId, role: "assistant", content: assistantText.trim(), timestamp: Date.now(),
    })
  );
}
if (collectedFiles.length > 0) {
  const fileList = collectedFiles.map((f) => f.path).join(", ");
  postLlmPromises.push(
    convex.mutation(api.messages.create, {
      sessionId, role: "system",
      content: `Built ${collectedFiles.length} file${collectedFiles.length > 1 ? "s" : ""}: ${fileList}`,
      timestamp: Date.now(),
    })
  );
}
postLlmPromises.push(convex.mutation(api.sessions.setLive, { sessionId }));
await Promise.all(postLlmPromises);
```

- [ ] **Step 2: Fire onFileComplete without awaiting in use-streaming.ts**

In the `handleEvent` callback, change the `file_complete` case (around line 129-131):

```typescript
// BEFORE:
await onFileCompleteRef.current?.(path, contents);

// AFTER (fire-and-forget — errors handled by the WebContainer hook):
onFileCompleteRef.current?.(path, contents);
```

Remove the `async` from the `handleEvent` callback if the `await` above was the only reason it was async. Also update the SSE reader loop to not await `handleEvent` if it's no longer async.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generate/route.ts src/features/builder/hooks/use-streaming.ts
git commit -m "perf: parallelize post-LLM mutations, unblock SSE reader from file writes"
```

---

### Task 1.4: Fix WebContainer SSR Never-Resolving Promise

**Files:**
- Modify: `src/features/builder/hooks/webcontainer.ts:5-9`

**Why:** `getWebContainer()` returns `new Promise(() => {})` during SSR — a promise that **never resolves or rejects**. Any caller that awaits it hangs forever. Audit: Critical #6.

**Best practice (researched):** WebContainer is browser-only WASM. On server, either return null or reject with a clear error. Never return a pending promise.

- [ ] **Step 1: Replace never-resolving promise with rejection**

```typescript
export function getWebContainer(): Promise<WebContainer> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("WebContainer is only available in the browser")
    );
  }

  if (!_promise) {
    _promise = WebContainer.boot({
      coep: "credentialless",
      forwardPreviewErrors: "exceptions-only",
    });
  }

  return _promise;
}
```

- [ ] **Step 2: Verify callers handle rejection**

Check that `useWebContainer` (the hook that calls `getWebContainer`) has a `.catch()` or try/catch around the call. If not, add one.

- [ ] **Step 3: Commit**

```bash
git add src/features/builder/hooks/webcontainer.ts
git commit -m "fix: reject instead of hang on SSR WebContainer access"
```

---

### Task 1.5: Fix Unhandled Clipboard/Share Promises

**Files:**
- Modify: `src/features/sharing/components/share-dialog.tsx:38`
- Modify: `src/features/builder/components/builder-page.tsx` (if clipboard calls exist)

**Why:** `navigator.clipboard.writeText()` and `navigator.share()` called without try/catch. Toast shows "Copied!" even when operation fails. Audit: Critical #5.

**Note:** Task 8.4 later extracts a shared `copyToClipboard` utility. This task adds try/catch first; Task 8.4 will refactor to the shared utility. If executing both, the agent on 8.4 should use the utility pattern directly.

- [ ] **Step 1: Wrap clipboard calls in share-dialog.tsx**

Find the clipboard call and wrap it:

```typescript
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(activeUrl);
    toast.success("Link copied!");
  } catch {
    // Fallback for browsers without clipboard API
    toast.error("Failed to copy — try selecting and copying manually");
  }
};
```

- [ ] **Step 2: Apply same pattern to any other clipboard/share calls**

Search for all `navigator.clipboard` and `navigator.share` calls in the codebase and wrap each in try/catch.

- [ ] **Step 3: Commit**

```bash
git add src/features/sharing/components/share-dialog.tsx src/features/builder/components/builder-page.tsx
git commit -m "fix: handle clipboard/share API failures gracefully"
```

---

### Task 1.6: Fix Env Key Mismatch

**Files:**
- Modify: `src/env.ts:8`

**Why:** `env.ts` validates `GOOGLE_API_KEY` but the AI SDK expects `GOOGLE_GENERATIVE_AI_API_KEY`. Env validation passes but runtime fails when generating images. Audit: Critical #4. Also documented in CLAUDE.md gotchas.

- [ ] **Step 1: Fix the env var name**

```typescript
// src/env.ts line 8
// BEFORE:
GOOGLE_API_KEY: z.string().min(1),
// AFTER:
GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
```

Also update the `runtimeEnv` mapping (line 18):
```typescript
// BEFORE:
GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
// AFTER:
GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
```

- [ ] **Step 2: Commit**

```bash
git add src/env.ts
git commit -m "fix: align env var name GOOGLE_GENERATIVE_AI_API_KEY with AI SDK expectation"
```

---

## Workstream 2: Chat Panel Performance + Correctness

### Task 2.1: Memoize ProgressSteps + Fix Thinking-Done Logic

**Files:**
- Modify: `src/features/builder/components/chat-panel.tsx:115-192,219,230-232,300-302`
- Test: `src/features/builder/components/__tests__/chat-panel.test.tsx`

**Why:** ProgressSteps re-renders on every token (not memoized, runs 4x `.some()` at streaming frequency). "Thinking done" triggers too early. Auto-scroll fires on every token causing jitter. Review #1: Medium #7, #8, #11. Audit: implied.

- [ ] **Step 1: Extract and memoize ProgressSteps**

Wrap `ProgressSteps` in `React.memo` and fix the thinking-done logic:

```typescript
const ProgressSteps = memo(function ProgressSteps({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return null;

  const steps: { type: Activity["type"]; label: string; done: boolean }[] = [
    {
      type: "thinking",
      label: "Understanding request",
      // Only done when writing has actually started (not just any non-thinking event)
      done: activities.some((a) => a.type === "writing_file" || a.type === "file_written" || a.type === "complete"),
    },
    {
      type: "writing_file",
      label: "Generating code",
      done: activities.some((a) => a.type === "file_written"),
    },
    {
      type: "file_written",
      label: "Files written",
      done: activities.some((a) => a.type === "complete"),
    },
    {
      type: "complete",
      label: "Ready!",
      done: activities.some((a) => a.type === "complete"),
    },
  ];

  // ... rest unchanged
});
```

Add `memo` to imports: `import { memo, useEffect, useRef, useState } from "react";`

- [ ] **Step 2: Hoist ActivityCard iconMap outside component (Simplify Audit #11)**

The `iconMap` object in `ActivityCard` (chat-panel.tsx ~line 78-91) is recreated on every render during streaming (~100x/sec). Hoist it to module scope:

```typescript
// Module-level — outside the component (matches actual icons at chat-panel.tsx:78-91)
const ACTIVITY_ICONS: Record<Activity["type"], React.ReactNode> = {
  thinking: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  writing_file: <FileCode2 className="h-4 w-4 animate-pulse text-amber-500" />,
  file_written: <FileCode2 className="h-4 w-4 text-green-600" />,
  complete: <CheckCircle2 className="h-4 w-4 text-green-600" />,
};
```

Then reference `ACTIVITY_ICONS[activity.type]` inside the component.

- [ ] **Step 3: Throttle auto-scroll**

Replace the scroll useEffect (lines 230-232) with a throttled version:

```typescript
// Auto-scroll — throttled to avoid jitter from token-frequency updates
const lastScrollRef = useRef(0);
useEffect(() => {
  const now = Date.now();
  if (now - lastScrollRef.current < 200) return; // Max 5 scrolls/sec
  lastScrollRef.current = now;
  scrollEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
}, [messages, streamingText, activities, status]);
```

- [ ] **Step 4: Replace hand-crafted spinner in preview-panel.tsx (Simplify Audit #12)**

`preview-panel.tsx:46-59` has a hand-crafted SVG spinner. Replace with `<Loader2 className="h-6 w-6 animate-spin" />` from lucide-react, which is already used in chat-panel.tsx.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/features/builder/components/__tests__/ --reporter=verbose`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/builder/components/chat-panel.tsx src/features/builder/components/preview-panel.tsx
git commit -m "perf: memoize ProgressSteps, hoist iconMap, throttle scroll, use Lucide spinner"
```

---

## Workstream 3: Security Hardening

### Task 3.1: Fix iframe Sandbox

**Files:**
- Modify: `src/features/builder/components/preview-panel.tsx:35`

**Why:** `sandbox="allow-scripts allow-same-origin"` combined effectively defeats the sandbox — embedded page can remove its own sandbox attribute. Review #1: Medium #14. Audit: not flagged separately but related to security section.

**Best practice (researched):** MDN warns this combination is dangerous. WebContainer iframes already run on a different origin (`*.webcontainer-api.io`), so `allow-same-origin` is unnecessary for cross-origin preview. Remove it.

- [ ] **Step 1: Remove allow-same-origin**

```typescript
// BEFORE:
sandbox="allow-scripts allow-same-origin"

// AFTER:
sandbox="allow-scripts"
```

- [ ] **Step 2: Test that WebContainer preview still renders**

Run the dev server, generate an app, verify the preview iframe loads correctly without allow-same-origin.

- [ ] **Step 3: Commit**

```bash
git add src/features/builder/components/preview-panel.tsx
git commit -m "security: remove allow-same-origin from preview iframe sandbox"
```

---

### Task 3.2: Restrict CORS on Convex HTTP Router

**Files:**
- Modify: `convex/http.ts:35,48`

**Why:** `Access-Control-Allow-Origin: "*"` allows any website to hit the RAG search API. Audit: Critical #3.

- [ ] **Step 1: Restrict CORS to known origins**

**Important:** `httpAction` runs in Convex's V8 runtime, NOT Node.js. `process.env` is NOT available. Hardcode the allowed origins:

```typescript
// At top of convex/http.ts
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "https://bridges-vibeathon.vercel.app", // production
]);

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get("Origin") ?? "";
  return ALLOWED_ORIGINS.has(origin) ? origin : "";
}
```

Update both route handlers: replace `"Access-Control-Allow-Origin": "*"` with `"Access-Control-Allow-Origin": getCorsOrigin(request)`. Pass `request` through from the handler args.

- [ ] **Step 2: Deploy and test**

Run: `npx convex dev`
Test: Verify the RAG search endpoint still works from localhost.

- [ ] **Step 3: Commit**

```bash
git add convex/http.ts
git commit -m "security: restrict CORS to known origins on Convex HTTP router"
```

---

## Workstream 4: Props Cleanup

### Task 4.1: Remove Dead Props from BlueprintCard

**Files:**
- Modify: `src/features/builder/components/blueprint-card.tsx:10-11`

**Why:** `onApprove` and `onEdit` props defined but never passed. Review #1: Low #17.

- [ ] **Step 1: Remove dead props from interface and component**

Remove `onApprove?: () => void;` and `onEdit?: () => void;` from the props interface. Remove any conditional UI that uses them.

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/features/builder/ --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add src/features/builder/components/blueprint-card.tsx
git commit -m "chore: remove dead onApprove/onEdit props from BlueprintCard"
```

---

## Workstream 5: Architecture Cleanup

### Task 5.1: Add SESSION_STATES Constant

**Files:**
- Create: `convex/lib/session_states.ts` (underscore, not hyphen — Convex file naming rule)
- Modify: `convex/sessions.ts`

**Why:** States "idle", "generating", "live", "failed" scattered as magic strings. Easy to typo with zero type safety. Audit: Architecture #3.

- [ ] **Step 1: Create session states constant** (note: `convex/lib/` directory must be created first)

```typescript
// convex/lib/session_states.ts
export const SESSION_STATES = {
  IDLE: "idle",
  GENERATING: "generating",
  LIVE: "live",
  FAILED: "failed",
} as const;

export type SessionState = (typeof SESSION_STATES)[keyof typeof SESSION_STATES];
```

- [ ] **Step 2: Update sessions.ts to use constant**

Replace magic string literals in `convex/sessions.ts` with `SESSION_STATES.IDLE`, `SESSION_STATES.GENERATING`, etc. Import from the new file.

- [ ] **Step 3: Update route.ts to use constant (if sending state strings)**

Import `SESSION_STATES` in the route handler if it sends state strings in SSE events.

- [ ] **Step 4: Commit**

```bash
git add convex/lib/session_states.ts convex/sessions.ts
git commit -m "refactor: replace magic state strings with SESSION_STATES constant"
```

---

### Task 5.2: Centralize Navigation Items

**Files:**
- Create: `src/shared/lib/navigation.ts`
- Modify: `src/features/dashboard/components/dashboard-sidebar.tsx`
- Modify: `src/shared/components/mobile-nav-drawer.tsx`

**Why:** `NAV_ITEMS` and `isNavActive()` duplicated identically in two files. Classic DRY violation. Audit: Architecture #4. Also duplicated in `header.tsx` and `marketing-header.tsx` (navLinks arrays).

- [ ] **Step 1: Create shared navigation module** (note: `src/shared/lib/` directory must be created first)

```typescript
// src/shared/lib/navigation.ts
import { Home, Wrench, LayoutGrid, FolderOpen } from "lucide-react";

export const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Builder", href: "/builder", icon: Wrench },
  { label: "Templates", href: "/templates", icon: LayoutGrid },
  { label: "My Apps", href: "/apps", icon: FolderOpen },
] as const;

export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}
```

- [ ] **Step 2: Update both components to import from shared**

Replace local `NAV_ITEMS` and `isNavActive` in both `dashboard-sidebar.tsx` and `src/shared/components/mobile-nav-drawer.tsx` with imports from `@/shared/lib/navigation`.

- [ ] **Step 3: Run tests and verify navigation**

Run: `npm run dev` — verify sidebar and mobile nav still work.

- [ ] **Step 4: Commit**

```bash
git add src/shared/lib/navigation.ts src/features/dashboard/components/dashboard-sidebar.tsx src/shared/components/mobile-nav-drawer.tsx
git commit -m "refactor: centralize NAV_ITEMS and isNavActive into shared module"
```

---

### Task 5.3: Fix Naming Inconsistencies

**Files:**
- Modify: `src/features/sharing/components/share-dialog.tsx:21` — `toolTitle` → `appTitle`
- Modify: `src/features/builder/components/builder-page.tsx:65-66` — `projectName` → `appName`
- Modify: `src/features/builder/components/builder-page.tsx:137` — hardcoded domain → `window.location.origin`
- Modify: `src/features/builder/components/builder-page.tsx:111` — remove dead ternary

**Why:** CLAUDE.md says "app" replaces "tool" everywhere. Hardcoded `bridges.app` domain should use runtime origin. Dead ternary always evaluates to 70. Review #1: Low #18, #19, #20, #21.

- [ ] **Step 1: Rename toolTitle → appTitle in share-dialog.tsx**

Update the prop name in the interface and all usages.

- [ ] **Step 2: Rename projectName → appName in builder-page.tsx**

Update the variable name and any references.

- [ ] **Step 3: Replace hardcoded domain**

```typescript
// BEFORE:
publishedUrl={`https://bridges.app/tool/${sessionId ?? "preview"}`}

// AFTER:
publishedUrl={`${window.location.origin}/app/${sessionId ?? "preview"}`}
```

- [ ] **Step 4: Fix dead defaultSize ternary**

```typescript
// BEFORE:
defaultSize={viewMode === "preview" ? 70 : 35}

// AFTER (this panel only renders when viewMode === "preview"):
defaultSize={70}
```

- [ ] **Step 5: Update callers of share-dialog if prop name changed**

Search for `<ShareDialog` and update `toolTitle` → `appTitle` at all call sites.

- [ ] **Step 6: Run tests**

Run: `npx vitest run --reporter=verbose`

- [ ] **Step 7: Commit**

```bash
git add src/features/sharing/components/share-dialog.tsx src/features/builder/components/builder-page.tsx
git commit -m "chore: fix naming conventions (app not tool/project), remove dead ternary, use dynamic origin"
```

---

## Workstream 6: Schema Cleanup

### Task 6.1: Remove Legacy Pipeline Fields from Schema

**Files:**
- Modify: `convex/schema.ts:14-25,42-44,98`

**Why:** 9+ fields from the deleted pipeline still in schema: `currentPhaseIndex`, `phasesRemaining`, `mvpGenerated`, `templateName`, `blueprintId`, `lastGoodState`, `failureReason`, `sandboxId`, `previewUrl` (on sessions), `phaseId`, `purpose`, `status` (on files), `exampleFragment` (on templates). Audit: Architecture #6.

**Best practice (researched):** Convex schema removal requires: (1) make field optional, (2) run migration to clear data, (3) remove from schema. Since these fields are already `v.optional()`, we can skip step 1.

- [ ] **Step 1: Check if any code still reads these fields**

Run grep for each legacy field:
```
currentPhaseIndex, phasesRemaining, mvpGenerated, templateName,
blueprintId, lastGoodState, failureReason, sandboxId (on sessions),
phaseId, purpose, status (on files), exampleFragment
```

Only remove fields that have zero code references beyond the schema definition itself.

- [ ] **Step 2: Create migration to clear field data**

Note: `@convex-dev/migrations` is NOT installed in this project. Use a simple `internalMutation` approach:
```typescript
export const cleanLegacySessionFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();
    for (const session of sessions) {
      // Patch to remove legacy fields by setting to undefined
      await ctx.db.patch(session._id, {
        currentPhaseIndex: undefined,
        phasesRemaining: undefined,
        mvpGenerated: undefined,
        templateName: undefined,
        blueprintId: undefined,
        failureReason: undefined,
        lastGoodState: undefined,
      });
    }
  },
});
```

- [ ] **Step 3: Run migration, then remove fields from schema**

After migration completes, remove the legacy fields from `convex/schema.ts`.

- [ ] **Step 4: Replace v.any() with proper validators where possible**

For `blueprint` field: Replace `v.any()` with a proper Convex validator:
```typescript
blueprint: v.optional(v.object({
  name: v.string(),
  description: v.string(),
  features: v.optional(v.array(v.string())),
  targetAge: v.optional(v.string()),
  therapyType: v.optional(v.string()),
})),
```

For `appState.value`: Keep as `v.any()` — this stores arbitrary user-defined state. Add a comment explaining why.

- [ ] **Step 5: Deploy and verify**

Run: `npx convex dev`
Verify: No schema errors, app still functions.

- [ ] **Step 6: Commit**

```bash
git add convex/schema.ts convex/migrations/
git commit -m "chore: remove 9 legacy pipeline fields from schema, add blueprint validator"
```

---

## Workstream 7: Dashboard + Minor Polish

### Task 7.1: Replace Hardcoded SAMPLE_PROJECTS

**Files:**
- Modify: `src/features/dashboard/components/dashboard-view.tsx:24-49`

**Why:** Fake projects displayed even though Convex has real sessions. Confuses new users. Audit: Tech Debt #3.

- [ ] **Step 1: Replace SAMPLE_PROJECTS with Convex query**

Delete the `SAMPLE_PROJECTS` array (lines 24-49). Replace the rendering section with a Convex query for real sessions:

```typescript
const sessions = useQuery(api.sessions.list);
```

Map sessions to the project card format, showing real data. If no sessions exist, show an empty state encouraging the user to create their first app.

- [ ] **Step 2: Add empty state UI**

```tsx
{sessions?.length === 0 && (
  <div className="flex flex-col items-center gap-4 py-12 text-center">
    <p className="text-on-surface-variant">No apps yet — describe what you'd like to build!</p>
    <Link href="/builder">
      <Button>Create Your First App</Button>
    </Link>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/components/dashboard-view.tsx
git commit -m "fix: replace hardcoded sample projects with real Convex session data"
```

---

### Task 7.2: Remove Fake Code Panel Status Bar

**Files:**
- Modify: `src/features/builder/components/code-panel.tsx` (around line 141-157 per audit)

**Why:** Hardcoded "UTF-8", "Ln 1, Col 1", "Spaces: 2" don't reflect actual editor state. Misleading UI. Audit: Architecture #7.

- [ ] **Step 1: Remove the fake status bar**

Delete the hardcoded status bar section entirely. It's misleading and adds no value.

- [ ] **Step 2: Commit**

```bash
git add src/features/builder/components/code-panel.tsx
git commit -m "chore: remove misleading fake status bar from code panel"
```

---

## Workstream 8: Code Quality (Simplify Audit Additions)

### Task 8.1: Extract Shared Error Display Component

**Files:**
- Create: `src/shared/components/error-display.tsx`
- Modify: `src/app/error.tsx`
- Modify: `src/app/(app)/builder/error.tsx`
- Modify: `src/app/(marketing)/error.tsx`

**Why (Simplify Audit #6):** Three near-identical error pages (~95% same JSX). Only differences: component name, title text, whether error.message is shown.

- [ ] **Step 1: Create shared ErrorDisplay component**

```typescript
// src/shared/components/error-display.tsx
"use client";

interface ErrorDisplayProps {
  title?: string;
  subtitle?: string;
  showMessage?: boolean;
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorDisplay({
  title = "Something went wrong",
  subtitle = "An unexpected error occurred.",
  showMessage = false,
  error,
  reset,
}: ErrorDisplayProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-on-surface-variant">{subtitle}</p>
      {showMessage && error.message && (
        <p className="text-sm text-on-surface-variant/60">{error.message}</p>
      )}
      <button
        onClick={reset}
        className="rounded-lg bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Slim down all three error pages to use ErrorDisplay**

Each becomes ~5 lines.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/error-display.tsx src/app/error.tsx src/app/\(app\)/builder/error.tsx src/app/\(marketing\)/error.tsx
git commit -m "refactor: extract shared ErrorDisplay component from 3 identical error pages"
```

---

### Task 8.2: Fix Stringly-Typed Status Props

**Files:**
- Modify: `src/features/builder/components/preview-panel.tsx:12`
- Modify: `src/features/builder/components/builder-toolbar.tsx:23`

**Why (Simplify Audit #9):** `state: string` and `status: string` should use the `StreamingStatus` type that already exists in `use-streaming.ts`. Currently comparing against "generating", "live", "idle" with no type safety.

- [ ] **Step 1: Import and use StreamingStatus type**

```typescript
import type { StreamingStatus } from "@/features/builder/hooks/use-streaming";
```

Replace `state: string` / `status: string` with `state: StreamingStatus` / `status: StreamingStatus` in the props interfaces.

- [ ] **Step 2: Commit**

```bash
git add src/features/builder/components/preview-panel.tsx src/features/builder/components/builder-toolbar.tsx
git commit -m "types: use StreamingStatus type instead of string for status props"
```

---

### Task 8.3: Hoist buildSystemPrompt to Module-Level Constant

**Files:**
- Modify: `src/features/builder/lib/agent-prompt.ts`

**Why (Simplify Audit #14):** `buildSystemPrompt()` returns a static string literal but allocates a new ~7KB string on every API call. Since it has no parameters or dynamic content, cache it as a module-level constant.

- [ ] **Step 1: Cache the prompt at module level**

```typescript
// At the bottom of agent-prompt.ts, or convert the function:
let _cachedPrompt: string | null = null;

export function buildSystemPrompt(): string {
  if (!_cachedPrompt) {
    _cachedPrompt = buildSystemPromptInner();
  }
  return _cachedPrompt;
}

// Rename the existing function to buildSystemPromptInner (private)
function buildSystemPromptInner(): string {
  return `...`; // existing template literal
}
```

Alternatively, if the function truly has no dynamic content, just export a `const`:

```typescript
export const SYSTEM_PROMPT = `...`; // the template literal
export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/builder/lib/agent-prompt.ts
git commit -m "perf: cache buildSystemPrompt result as module-level constant"
```

---

### Task 8.4: Extract Shared Clipboard Utility

**Files:**
- Create: `src/core/clipboard.ts`
- Modify: `src/features/sharing/components/share-dialog.tsx`
- Modify: `src/features/builder/components/code-panel.tsx`
- Modify: `src/features/builder/components/publish-success-modal.tsx`

**Why (Simplify Audit #8):** The clipboard + toast pattern is repeated 5x across the codebase. Extract to a shared utility.

- [ ] **Step 1: Create clipboard utility**

```typescript
// src/core/clipboard.ts
import { toast } from "sonner";

export async function copyToClipboard(text: string, successMessage = "Copied!") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Failed to copy — try selecting and copying manually");
  }
}
```

- [ ] **Step 2: Replace all clipboard+toast patterns with the utility**

Update all 5 call sites to use `copyToClipboard(url, "Link copied!")`.

- [ ] **Step 3: Commit**

```bash
git add src/core/clipboard.ts src/features/sharing/components/share-dialog.tsx src/features/builder/components/code-panel.tsx src/features/builder/components/publish-success-modal.tsx
git commit -m "refactor: extract shared copyToClipboard utility (was repeated 5x)"
```

---

### Task 8.5: Use Blueprint Zod Schema in Production Code

**Files:**
- Modify: `src/features/builder/hooks/use-streaming.ts:68`
- Modify: `src/features/builder/components/chat-panel.tsx:199`
- Modify: `src/features/builder/components/blueprint-card.tsx:9`

**Why (Simplify Audit #15, #30):** `TherapyBlueprintSchema` Zod type exists in `schemas/index.ts` but is only imported by tests. The entire SSE→UI pipeline for blueprints is untyped (`Record<string, unknown>`).

- [ ] **Step 1: Import and use the typed Blueprint in use-streaming.ts**

```typescript
import type { TherapyBlueprint } from "@/features/builder/lib/schemas";

// Replace Record<string, unknown> with TherapyBlueprint | null
const [blueprint, setBlueprint] = useState<TherapyBlueprint | null>(null);
```

In the SSE handler where blueprint data arrives, parse with `TherapyBlueprintSchema.safeParse()`:

```typescript
case "blueprint": {
  // Blueprint data is nested under d.data (see use-streaming.ts:136)
  const parsed = TherapyBlueprintSchema.safeParse(d.data);
  if (parsed.success) setBlueprint(parsed.data);
  break;
}
```

- [ ] **Step 2: Update ChatPanel and BlueprintCard prop types**

Change `blueprint: Record<string, unknown> | null` to `blueprint: TherapyBlueprint | null` in both components' props.

- [ ] **Step 3: Commit**

```bash
git add src/features/builder/hooks/use-streaming.ts src/features/builder/components/chat-panel.tsx src/features/builder/components/blueprint-card.tsx
git commit -m "types: use TherapyBlueprint Zod schema for blueprint data throughout SSE pipeline"
```

---

### Task 8.6: Fix Minor Code Quality Issues

**Files (various):**
- `src/features/dashboard/components/project-card.tsx:52` — raw `<img>` → `<Image>` from next/image
- `src/features/builder/components/code-panel.tsx` — replace hardcoded `bg-[#1b1e22]`, `text-slate-*` with design tokens
- `src/features/dashboard/components/templates-tab.tsx` — replace raw gradients with semantic tokens
- `src/core/config.ts` — clean up unused `APP_NAME`/`APP_DESCRIPTION` if confirmed dead

**Why (Simplify Audit #20-27):** Inconsistent patterns: raw img tags, hardcoded colors, unused config constants.

- [ ] **Step 1: Fix raw img tag**

```typescript
// BEFORE:
<img src={project.thumbnail} ...>

// AFTER:
import Image from "next/image";
<Image src={project.thumbnail} alt={project.title} width={...} height={...} />
```

- [ ] **Step 2: Replace hardcoded colors with design tokens**

In `code-panel.tsx`, replace `bg-[#1b1e22]` with `bg-surface` (or appropriate semantic token), replace `text-slate-400` with `text-on-surface-variant`.

- [ ] **Step 3: Commit**

```bash
git add src/features/dashboard/components/project-card.tsx src/features/builder/components/code-panel.tsx
git commit -m "chore: fix raw img tag, replace hardcoded colors with design tokens"
```

---

## Intentionally Excluded (Low Impact / Out of Scope)

These items from the reviews were evaluated and intentionally excluded from this plan:

| Finding | Reason for Exclusion |
|---------|---------------------|
| Review #13: Prompt injection via raw query | WebContainer sandboxing mitigates. Full prompt injection defense requires content filtering — separate effort. |
| Simplify #16: WebContainer lifecycle (stale files on nav) | Complex fix requiring WebContainer teardown/re-init logic. Track as separate task. |
| Simplify #20: Inconsistent icon systems (Material vs Lucide) | Cosmetic — requires landing page redesign to unify. |
| Simplify #26: Gradient button pattern inconsistency | Extract to CSS utility class — low ROI for now. |
| Simplify #29: Section-narrating JSX comments | Style preference — removing 30+ comments is churn with no functional benefit. |
| Simplify #31: Templates data mismatch (hardcoded vs Convex) | Will be addressed when dashboard is wired to real data in Phase 5. |

---

## Deferred Items (Phase 6 — Auth)

These are tracked but intentionally deferred per CLAUDE.md ("Don't add auth until Phase 6"):

- [ ] Add `ctx.auth.getUserIdentity()` to all Convex functions
- [ ] Scope `sessions.list` and `apps.list` to authenticated user via `tokenIdentifier`
- [ ] Add auth middleware to `/api/generate` route (Clerk auth header validation)
- [ ] Restrict CORS to production domain only (remove localhost)

---

## Summary

| Workstream | Tasks | Priority | Est. Commits |
|------------|-------|----------|-------------|
| 1. Critical Fixes | 1.1–1.6 | Must-fix before demo | 6 |
| 2. Chat Panel Perf | 2.1 | Should-fix before sharing | 1 |
| 3. Security Hardening | 3.1–3.2 | Should-fix before sharing | 2 |
| 4. Props Cleanup | 4.1 | Nice to have | 1 |
| 5. Architecture Cleanup | 5.1–5.3 | Nice to have | 3 |
| 6. Schema Cleanup | 6.1 | Nice to have | 1 |
| 7. Dashboard Polish | 7.1–7.2 | Nice to have | 2 |
| 8. Code Quality | 8.1–8.6 | Nice to have (polish) | 6 |
| **Total** | **18 tasks** | | **22 commits** |

**Sources consolidated:** code-review-summary.md (23 findings), bridges-codebase-health-audit.html (42+ findings), Simplify Audit Report (31 findings). 6 low-impact items intentionally excluded with rationale.
