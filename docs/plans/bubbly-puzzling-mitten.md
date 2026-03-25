# Plan: Fix All Builder Gaps — 10/10 E2E Quality

## Context

The Bridges builder feature went through a VibeSDK-inspired major refactor. An E2E assessment as "Sarah, ABA therapist" revealed the pipeline architecture is sound but **13 gaps** prevent a 10/10 experience: a production build blocker, missing UI polish (markdown, syntax highlighting, animations), broken E2B preview, lost sessions on refresh, and zero builder tests. This plan fixes every gap to match the spec at `docs/superpowers/specs/2026-03-24-vibesdk-refactor-design.md`.

---

## Phase A: Production Blockers (~15 min)

### A1. TypeScript Build Error — `src/app/api/agent/approve/route.ts:13`

**Problem:** `string` not assignable to `Id<"sessions">`. Route receives sessionId from JSON body, passes raw string to Convex mutation.

**Fix:**
```ts
import { Id } from "../../../../../convex/_generated/dataModel";
// line 13:
await convex.mutation(api.blueprints.approve, { sessionId: sessionId as Id<"sessions"> });
```

Same pattern needed in:
- `src/app/api/agent/build/route.ts`
- `src/app/api/agent/message/route.ts`

### A2. ESLint Import Sort Errors (28 errors)

**Fix:** Run `npx eslint --fix` on affected files. All errors are `simple-import-sort/imports` — purely mechanical reordering.

### A3. `as any` Type Fix — `convex/sessions.ts:65`

**Problem:** `state: args.state as any` bypasses type checking.

**Fix:** Define `SESSION_STATE_VALIDATOR` using the same union as the schema, use it in `updateState` args:
```ts
// convex/sessions.ts
const SESSION_STATE_VALIDATOR = v.union(
  v.literal("idle"), v.literal("blueprinting"),
  v.literal("template_selecting"), v.literal("phase_generating"),
  v.literal("phase_implementing"), v.literal("deploying"),
  v.literal("validating"), v.literal("finalizing"),
  v.literal("reviewing"), v.literal("complete"),
  v.literal("failed")
);

// In updateState args:
args: {
  sessionId: v.id("sessions"),
  state: SESSION_STATE_VALIDATOR,
  stateMessage: v.string(),
},
handler: async (ctx, args) => {
  await ctx.db.patch(args.sessionId, {
    state: args.state,  // No more `as any`
    stateMessage: args.stateMessage,
  });
```

---

## Phase B: High-Impact UX Fixes (~2 hours)

### B1. Session Persistence via URL — `builder-page.tsx`

**Problem:** `sessionId` in `useState` only. Page refresh loses everything.

**Fix:** Use `useSearchParams` from `next/navigation`:
```tsx
import { useSearchParams, useRouter } from "next/navigation";

export function BuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialSessionId = searchParams.get("session") as Id<"sessions"> | null;
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(initialSessionId);

  const handleSubmit = async (prompt: string) => {
    const id = await startBuild({ title: "New App", query: prompt });
    setSessionId(id);
    router.replace(`/builder?session=${id}`);
  };
```

**Note:** Wrap in `<Suspense>` since `useSearchParams` requires it in Next.js App Router.

### B2. Markdown Rendering — `chat-panel.tsx`

**Problem:** Messages render as plain `<p>` text. Raw markdown (stars, hashes) visible.

**Dependencies:** `react-markdown` and `remark-gfm` already installed.

**Fix:** Replace plain text rendering for assistant/system messages:
```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// For assistant messages (line 96-98):
<div className="prose prose-sm max-w-none text-on-surface dark:prose-invert">
  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
</div>
```

Keep user messages as plain text (they're short prompts).

**Typography plugin:** Check if `@tailwindcss/typography` is needed. If `prose` classes don't work in Tailwind v4, use ReactMarkdown's `components` prop to style each element with Tailwind utilities instead.

### B3. Syntax Highlighting — `code-panel.tsx`

**Problem:** Code shows as raw `<pre>` with no highlighting.

**Dependency:** Install `prism-react-renderer` (~15KB, client-side, bundles own grammar).

**Fix:**
```tsx
import { Highlight, themes } from "prism-react-renderer";

// Helper to detect language from file extension
function getLanguage(path: string): string {
  const ext = path.split(".").pop();
  const map: Record<string, string> = {
    tsx: "tsx", ts: "typescript", jsx: "jsx", js: "javascript",
    css: "css", json: "json", html: "markup", md: "markdown",
  };
  return map[ext ?? ""] ?? "plain";
}

// Replace raw <pre> (lines 67-69):
<Highlight theme={themes.nightOwl} code={selectedFile.contents} language={getLanguage(selectedFile.path)}>
  {({ style, tokens, getLineProps, getTokenProps }) => (
    <pre style={style} className="p-4 text-xs leading-relaxed">
      {tokens.map((line, i) => (
        <div key={i} {...getLineProps({ line })}>
          <span className="mr-4 inline-block w-8 select-none text-right text-on-surface-variant/30">{i + 1}</span>
          {line.map((token, key) => <span key={key} {...getTokenProps({ token })} />)}
        </div>
      ))}
    </pre>
  )}
</Highlight>
```

### B4. E2B Sandbox Resilience — `convex/e2b.ts`

**Problems:** (1) No timeout extension — sandbox dies during long pipelines. (2) No reconnect on timeout. (3) Blind 2s sleep instead of health check.

**Fixes:**

1. **Timeout extension** — After `Sandbox.create()`, call `sandbox.setTimeout(600_000)` (10 min):
```ts
const sandbox = await Sandbox.create(templateId, { apiKey: process.env.E2B_API_KEY });
await sandbox.setTimeout(600_000); // 10 min to cover full pipeline
```

2. **Reconnect wrapper** — Wrap `Sandbox.connect()` with retry-create logic:
```ts
async function connectOrRecreate(
  sandboxId: string,
  templateName: string,
  files: { filePath: string; fileContents: string }[],
): Promise<{ sandbox: Sandbox; isNew: boolean }> {
  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });
    return { sandbox, isNew: false };
  } catch {
    // Sandbox expired — create fresh one with all current files
    const result = await createAndDeploySandbox(templateName, files);
    const sandbox = await Sandbox.connect(result.sandboxId, { apiKey: process.env.E2B_API_KEY });
    return { sandbox, isNew: true };
  }
}
```

3. **Update `deployToSandbox` in `pipeline.ts`** — If reconnect creates a new sandbox, update session with new sandboxId/previewUrl.

4. **Vite health check** — Replace blind sleep with port check:
```ts
async function waitForVite(sandbox: Sandbox, maxRetries = 5): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await sandbox.commands.run(
      "curl -s -o /dev/null -w '%{http_code}' http://localhost:5173 2>/dev/null || echo '000'",
      { cwd: "/home/user/app" }
    );
    if (result.stdout.trim() === "200") return;
    await new Promise(r => setTimeout(r, 1000));
  }
  // Fallback: Vite may still be starting, continue anyway
}
```

### B5. Preview Panel Error Recovery — `preview-panel.tsx`

Add iframe error handling for stale preview URLs:
```tsx
const [iframeError, setIframeError] = useState(false);

<iframe
  src={session!.previewUrl}
  onError={() => setIframeError(true)}
  onLoad={() => setIframeError(false)}
  // ...
/>
{iframeError && (
  <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
    <p className="text-sm text-on-surface-variant">Preview connection lost. Building...</p>
  </div>
)}
```

---

## Phase C: Polish & Design Refinement (~2 hours)

### C1. Blueprint Card ScrollArea — `blueprint-card.tsx`

Wrap content in `<ScrollArea className="max-h-[60vh]">` (lines 52-101). Component already imported in the file's sibling `chat-panel.tsx`.

### C2. Motion Animations — All builder components

Import from `motion/react` (v12 path). Sanctuary spec: ≥300ms, `cubic-bezier(0.4, 0, 0.2, 1)`.

**Chat messages** (`chat-panel.tsx`):
```tsx
import { motion, AnimatePresence } from "motion/react";
const SANCTUARY_EASE = [0.4, 0, 0.2, 1];

// Wrap each message:
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: SANCTUARY_EASE }}
>
```

**Blueprint card** (`blueprint-card.tsx`):
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.96 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.4, ease: SANCTUARY_EASE }}
>
```

**Phase timeline** (`phase-timeline.tsx`): Pulse on active phase bar:
```tsx
<motion.div
  className={cn("h-3 rounded-full", STATUS_COLORS[phase.status])}
  animate={isActive ? { opacity: [0.7, 1, 0.7] } : {}}
  transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
/>
```

**Loading state** (`chat-panel.tsx`): Typing dots animation for pipeline working states.

### C3. Phase Timeline Enhancement — `phase-timeline.tsx`

Current: h-2 colored bars with hover tooltip only.

**Enhancements:**
1. Increase height to `h-3`
2. Add phase name labels below each segment (truncated)
3. Add status icon: checkmark (completed), spinner (active), dot (pending)
4. Add `onPhaseClick` callback prop → wire to code panel file filtering in `builder-page.tsx`
5. Active phase: glowing ring via `ring-2 ring-primary/50`

### C4. Loading/Progress UX Improvements

**Chat panel** (lines 128-139):
- Replace single spinner with step indicator: "Phase 2 of 4 — Generating components..."
- Add typing dots animation (three pulsing dots) as fake assistant message while working
- Use `session.currentPhaseIndex` and `session.phasesRemaining` for progress

**Code panel** — Show `<Skeleton>` shimmer blocks when state is generating but no files exist yet.

**Preview panel** — Animated pulsing placeholder during deploying state.

### C5. File Icons by Extension — `code-panel.tsx`

Replace hardcoded `description` icon (line 51) with extension-based lookup:
```ts
function getFileIcon(path: string): string {
  const ext = path.split(".").pop();
  const map: Record<string, string> = {
    tsx: "code", ts: "code", jsx: "code", js: "code",
    css: "palette", json: "data_object", html: "web", md: "description",
  };
  return map[ext ?? ""] ?? "draft";
}
```

---

## Phase D: Builder Component Tests (~1.5 hours)

Create `src/features/builder/components/__tests__/` with tests following existing patterns (see `src/features/landing/components/__tests__/hero-section.test.tsx`).

**Mocking pattern** (shared across all builder tests):
```tsx
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));
```

### Test files:
1. **`builder-page.test.tsx`** — Renders 3 panels. Shows timeline when phases exist.
2. **`chat-panel.test.tsx`** — Shows suggestion chips (no session). Renders messages. Shows blueprint card. Shows error state.
3. **`code-panel.test.tsx`** — Empty state. File list renders. File selection works.
4. **`preview-panel.test.tsx`** — Placeholder (no preview). Iframe with URL. Device toggle.
5. **`blueprint-card.test.tsx`** — Renders fields. Approve calls mutation. Request changes toggle.
6. **`phase-timeline.test.tsx`** — Correct segment count. Status colors applied.

---

## Phase E: Verification

### E1. Build & Lint
```bash
npx eslint . --max-warnings=0    # Zero errors
npx tsc --noEmit                  # Zero type errors
npm run build                     # Production build succeeds
```

### E2. Tests
```bash
npx vitest run                    # All tests pass (existing 119 + new ~30)
```

### E3. Visual Verification (agent-browser)
1. Navigate to `/builder`
2. Verify: Sanctuary design, suggestion chips, empty states
3. Click suggestion chip → verify blueprint generation progress
4. Verify: Markdown renders in chat, blueprint card has scroll area
5. Approve blueprint → verify phase timeline appears
6. Verify: Code panel shows syntax-highlighted files with correct icons
7. Verify: Preview iframe loads E2B sandbox
8. Refresh page → verify session persists via URL param
9. Verify: All animations smooth (≥300ms, cubic-bezier easing)

### E4. Convex Deploy
```bash
npx convex dev --once             # Deploy schema + function changes
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/app/api/agent/approve/route.ts` | A1: Type cast fix |
| `src/app/api/agent/build/route.ts` | A1: Type cast fix |
| `src/app/api/agent/message/route.ts` | A1: Type cast fix |
| `convex/sessions.ts` | A3: State union validator, remove `as any` |
| `src/features/builder/components/builder-page.tsx` | B1: URL session persistence, C3: phase click wiring |
| `src/features/builder/components/chat-panel.tsx` | B2: Markdown rendering, C2: animations, C4: loading UX |
| `src/features/builder/components/code-panel.tsx` | B3: Syntax highlighting, C4: skeleton states, C5: file icons |
| `convex/e2b.ts` | B4: Timeout extension, reconnect, Vite health check |
| `convex/pipeline.ts` | B4: Handle sandbox reconnect in deployToSandbox |
| `src/features/builder/components/preview-panel.tsx` | B5: Error recovery, C2: animations |
| `src/features/builder/components/blueprint-card.tsx` | C1: ScrollArea, C2: entrance animation |
| `src/features/builder/components/phase-timeline.tsx` | C3: Labels, click, status icons, C2: pulse animation |
| `src/features/builder/components/__tests__/*.test.tsx` | D: 6 new test files |
| 26+ files (convex/, src/) | A2: ESLint import sort auto-fix |

## Dependencies to Install

| Package | Purpose |
|---------|---------|
| `prism-react-renderer` | Syntax highlighting in code panel |

`react-markdown` and `remark-gfm` are already installed.

## Reusable Existing Utilities

| Utility | Location | Used For |
|---------|----------|----------|
| `cn()` | `src/core/utils.ts` | Class merging everywhere |
| `ScrollArea` | `src/shared/components/ui/scroll-area.tsx` | Blueprint card scroll |
| `Skeleton` | `src/shared/components/ui/skeleton.tsx` | Loading states in code panel |
| `motion` | `motion/react` (installed) | All animations |
| `MaterialIcon` mock | `src/features/landing/components/__tests__/` | Test pattern reference |
