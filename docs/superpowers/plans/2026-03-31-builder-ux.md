# Builder UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix artifact card click-to-reopen, make X hide the preview panel instead of resetting the session, add flashcard/app type picker in the input bar, and polish the share/publish dialog.

**Architecture:** `BuilderPage` gains `previewVisible` and `mode` state. `ArtifactCard` gets an `onClick` prop. `PreviewColumn`'s `onClose` becomes a pure hide (no `reset()`). `InputBar` gains a two-pill type selector. `ShareDialog` gets `DialogPortal` and mobile bottom-sheet styles.

**Tech Stack:** Next.js 16, React, Tailwind v4, shadcn/ui (`Dialog`, `DialogPortal`), Vitest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/features/builder/components/artifact-card.tsx` | Modify | Add `onClick` prop, change icon, hover styles |
| `src/features/builder/components/chat-panel.tsx` | Modify | Thread `onArtifactClick` to `ArtifactCard` |
| `src/features/builder/components/chat-column.tsx` | Modify | Thread `onArtifactClick` and `mode`/`onModeChange` props |
| `src/features/builder/components/input-bar.tsx` | Modify | Add mode picker pill UI |
| `src/features/builder/components/preview-column.tsx` | Modify | `onClose` no longer calls reset — caller owns visibility |
| `src/features/builder/components/builder-page.tsx` | Modify | Add `previewVisible` + `mode` state, conditional panel rendering |
| `src/features/builder/lib/agent-prompt.ts` | Modify | Handle `[FLASHCARD MODE]` prefix in system prompt |
| `src/shared/components/share-dialog.tsx` | Modify | Portal fix, sizing, mobile bottom-sheet, CTA gradient |

---

## Task 1: Fix ArtifactCard — add onClick and update icon

**Files:**
- Modify: `src/features/builder/components/artifact-card.tsx`
- Modify: `src/features/builder/components/__tests__/artifact-card.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/features/builder/components/__tests__/artifact-card.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ArtifactCard } from "../artifact-card";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

describe("ArtifactCard", () => {
  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<ArtifactCard title="My App" isGenerating={false} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it("shows open_in_new icon when onClick provided", () => {
    render(<ArtifactCard title="My App" isGenerating={false} onClick={vi.fn()} />);
    expect(screen.getByTestId("icon")).toHaveTextContent("open_in_new");
  });
  it("shows no spinner when not generating", () => {
    render(<ArtifactCard title="My App" isGenerating={false} onClick={vi.fn()} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("shows spinner when generating", () => {
    render(<ArtifactCard title="My App" isGenerating={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
npm test -- src/features/builder/components/__tests__/artifact-card.test.tsx
```
Expected: FAIL — no onClick, wrong icon

- [ ] **Step 3: Update artifact-card.tsx**

```tsx
// src/features/builder/components/artifact-card.tsx
"use client";

import { cn } from "@/core/utils";
import { MaterialIcon } from "@/shared/components/material-icon";

interface ArtifactCardProps {
  title: string;
  isGenerating: boolean;
  onClick?: () => void;
}

export function ArtifactCard({ title, isGenerating, onClick }: ArtifactCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border border-outline-variant/30 bg-surface px-4 py-3 text-left transition-colors",
          onClick ? "cursor-pointer hover:bg-surface-container active:scale-[0.99]" : "cursor-default",
        )}
      >
        <div>
          <p className="text-sm font-medium text-on-surface">{title}</p>
          <p className="text-xs text-on-surface-variant">Therapy app</p>
        </div>
        {onClick && (
          <MaterialIcon
            icon="open_in_new"
            size="sm"
            className="text-on-surface-variant/50"
          />
        )}
      </button>
      {isGenerating && (
        <div
          role="status"
          aria-label="Building your app"
          className="ml-1 h-6 w-6 animate-spin rounded-full border-2 border-dashed border-primary/40"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
npm test -- src/features/builder/components/__tests__/artifact-card.test.tsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/artifact-card.tsx \
        src/features/builder/components/__tests__/artifact-card.test.tsx
git commit -m "feat(builder): artifact card click-to-reopen with open_in_new icon"
```

---

## Task 2: Thread onArtifactClick through ChatPanel and ChatColumn

**Files:**
- Modify: `src/features/builder/components/chat-panel.tsx`
- Modify: `src/features/builder/components/chat-column.tsx`

- [ ] **Step 1: Update chat-panel.tsx**

In `ChatPanelProps`, add `onArtifactClick?: () => void`. Pass it to `ArtifactCard`:

```tsx
// In ChatPanelProps interface, add:
onArtifactClick?: () => void;

// In the function signature:
export function ChatPanel({
  // ... existing props ...
  onArtifactClick,
}: ChatPanelProps) {

// Change the ArtifactCard render:
{(isGenerating || isLive) && (
  <ArtifactCard
    title={appTitle}
    isGenerating={isGenerating}
    onClick={isLive ? onArtifactClick : undefined}
  />
)}
```

**Note:** `onClick` is only wired when `isLive` (not while generating) — while generating the card is informational only.

- [ ] **Step 2: Update chat-column.tsx**

In `ChatColumnProps`, add `onArtifactClick?: () => void`. Thread it to `ChatPanel`:

```tsx
// In ChatColumnProps interface, add:
onArtifactClick?: () => void;

// In function signature and ChatPanel usage:
<ChatPanel
  // ... existing props ...
  onArtifactClick={onArtifactClick}
/>
```

- [ ] **Step 3: Run existing tests**

```bash
npm test -- src/features/builder/components/__tests__/chat-panel.test.tsx
```
Expected: PASS (no breaking changes, new prop is optional)

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/components/chat-panel.tsx \
        src/features/builder/components/chat-column.tsx
git commit -m "feat(builder): thread onArtifactClick from BuilderPage through ChatColumn to ArtifactCard"
```

---

## Task 3: Add previewVisible state to BuilderPage

**Files:**
- Modify: `src/features/builder/components/builder-page.tsx`
- Modify: `src/features/builder/components/preview-column.tsx`

- [ ] **Step 1: Update PreviewColumn — onClose no longer resets**

In `src/features/builder/components/preview-column.tsx`, the `onClose` prop signature stays the same (`onClose?: () => void`). No code change needed in this file — the behavior change is entirely in `BuilderPage` which controls what `onClose` does.

- [ ] **Step 2: Update BuilderPage**

Add `previewVisible` state. Change the desktop panel rendering to conditionally show `PreviewColumn`. Change `onClose` to set `previewVisible(false)` instead of resetting. Pass `onArtifactClick` to `ChatColumn`.

```tsx
// In BuilderPage, add state after existing useState declarations:
const [previewVisible, setPreviewVisible] = useState(true);

// Show preview again when bundle first arrives (in case it was hidden)
// Already handled by: useEffect(() => { if (bundleHtml) startTransition(() => setViewMode("preview")); }, [bundleHtml]);
// Add alongside it:
useEffect(() => {
  if (bundleHtml) setPreviewVisible(true);
}, [bundleHtml]);

// Desktop ResizablePanelGroup — change the PreviewColumn section:
{previewVisible ? (
  <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
    <ResizablePanel defaultSize={45} minSize={20}>
      <ChatColumn
        // ... existing props ...
        onArtifactClick={() => setPreviewVisible(true)}
      />
    </ResizablePanel>
    <ResizableHandle withHandle />
    <ResizablePanel defaultSize={55} minSize={20}>
      <PreviewColumn
        // ... existing props ...
        onClose={() => setPreviewVisible(false)}
      />
    </ResizablePanel>
  </ResizablePanelGroup>
) : (
  <div className="flex flex-1 min-h-0 overflow-hidden">
    <ChatColumn
      // ... existing props ...
      onArtifactClick={() => setPreviewVisible(true)}
    />
  </div>
)}
```

**Also update** the toast copy for in-app navigation away during generation (find the existing `toast.info` call in the `useEffect` cleanup):

```tsx
// Change from:
toast.info("Your app is still building. Check My Apps when it's ready.", { duration: 5000 });
// To:
toast.info("Building continues in the background — find it in Recents when it's ready.", { duration: 6000 });
```

**Also verify** `src/app/api/generate/route.ts` has no `request.signal.aborted` early-exit guard inside the generation loop. If it does, remove it.

- [ ] **Step 3: Run builder page tests**

```bash
npm test -- src/features/builder/components/__tests__/preview-column.test.tsx
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/components/builder-page.tsx
git commit -m "feat(builder): X hides preview panel only, artifact card click reopens it, background generation toast"
```

---

## Task 4: Add mode picker to InputBar

**Files:**
- Modify: `src/features/builder/components/input-bar.tsx`
- Modify: `src/features/builder/components/chat-column.tsx`
- Modify: `src/features/builder/components/builder-page.tsx`
- Modify: `src/features/builder/lib/agent-prompt.ts`

- [ ] **Step 1: Write failing test for InputBar mode picker**

```tsx
// Add to src/features/builder/components/__tests__/input-bar test (or create if not exists):
// Assuming file: src/features/builder/components/__tests__/input-bar-mode.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { InputBar } from "../input-bar";

vi.mock("@/shared/components/voice-input", () => ({
  VoiceInput: () => <button type="button">Voice</button>,
}));
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: any) => <span>{icon}</span>,
}));

describe("InputBar mode picker", () => {
  it("renders App and Flashcards mode buttons", () => {
    render(
      <InputBar
        value="" onChange={vi.fn()} onSubmit={vi.fn()}
        isGenerating={false} mode="app" onModeChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /app/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /flashcards/i })).toBeInTheDocument();
  });
  it("calls onModeChange with 'flashcards' when Flashcards clicked", () => {
    const onModeChange = vi.fn();
    render(
      <InputBar
        value="" onChange={vi.fn()} onSubmit={vi.fn()}
        isGenerating={false} mode="app" onModeChange={onModeChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /flashcards/i }));
    expect(onModeChange).toHaveBeenCalledWith("flashcards");
  });
  it("hides mode picker when isGenerating is true", () => {
    render(
      <InputBar
        value="" onChange={vi.fn()} onSubmit={vi.fn()}
        isGenerating={true} mode="app" onModeChange={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /flashcards/i })).not.toBeInTheDocument();
  });
  it("changes placeholder text in flashcards mode", () => {
    render(
      <InputBar
        value="" onChange={vi.fn()} onSubmit={vi.fn()}
        isGenerating={false} mode="flashcards" onModeChange={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText(/describe the flashcard set/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
npm test -- src/features/builder/components/__tests__/input-bar-mode.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Update InputBar**

Add `mode` and `onModeChange` props. Add pill buttons in the toolbar:

```tsx
// src/features/builder/components/input-bar.tsx
// Add to InputBarProps:
mode?: "app" | "flashcards";
onModeChange?: (mode: "app" | "flashcards") => void;

// In the function signature, add mode = "app" and onModeChange defaults

// Change placeholder logic:
const resolvedPlaceholder =
  mode === "flashcards"
    ? "Describe the flashcard set you want to build…"
    : placeholder ?? "What would you like to build?";

// In the textarea, change placeholder={placeholder} to placeholder={resolvedPlaceholder}

// In the toolbar div (after VoiceInput), add mode picker before flex-1:
{!isGenerating && onModeChange && (
  <div className="flex rounded-full border border-outline-variant/30 overflow-hidden">
    {(["app", "flashcards"] as const).map((m) => (
      <button
        key={m}
        type="button"
        aria-label={m === "app" ? "App" : "Flashcards"}
        onClick={() => onModeChange(m)}
        className={cn(
          "px-2.5 py-0.5 text-xs font-medium transition-colors",
          mode === m
            ? "bg-primary text-white"
            : "text-on-surface-variant hover:bg-surface-container-low",
        )}
      >
        {m === "app" ? "App" : "Flashcards"}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 4: Update ChatColumn to accept and pass mode props**

```tsx
// In ChatColumnProps, add:
mode?: "app" | "flashcards";
onModeChange?: (mode: "app" | "flashcards") => void;

// In InputBar usage inside ChatColumn:
<InputBar
  value={input}
  onChange={setInput}
  onSubmit={handleSubmit}
  placeholder={...}
  isGenerating={status === "generating"}
  showGuidedPill
  mode={mode}
  onModeChange={onModeChange}
/>
```

- [ ] **Step 5: Update BuilderPage to own mode state**

```tsx
// In BuilderPage, add after existing useState:
const [mode, setMode] = useState<"app" | "flashcards">("app");

// Update handleGenerate to prepend mode tag:
const handleGenerate = useCallback((prompt: string, blueprint?: TherapyBlueprint) => {
  lastPromptRef.current = prompt;
  setPendingPrompt(prompt);
  setGenerationStartTime(Date.now());
  const finalPrompt = mode === "flashcards" ? `[FLASHCARD MODE] ${prompt}` : prompt;
  generate(finalPrompt, blueprint ?? undefined, patientId ?? undefined);
}, [generate, patientId, mode]);

// Pass to both ChatColumn usages:
<ChatColumn
  // ... existing props ...
  mode={mode}
  onModeChange={setMode}
/>
```

- [ ] **Step 6: Update agent-prompt.ts to handle flashcard mode**

Find `src/features/builder/lib/agent-prompt.ts` and add flashcard handling. Locate where the system prompt is defined and add this paragraph:

```
When the user's message starts with "[FLASHCARD MODE]", generate a flashcard application instead of a general therapy app. A flashcard app should:
- Display one card at a time with a question on the front and answer on the back
- Include flip animation on card click
- Have navigation controls (Previous / Next)
- Track progress (e.g., "Card 3 of 12")
- Use large, readable text suitable for children
- Support at minimum 5-20 card pairs
Strip the "[FLASHCARD MODE]" prefix before using the rest of the message as the topic.
```

- [ ] **Step 7: Run tests**

```bash
npm test -- src/features/builder/components/__tests__/input-bar-mode.test.tsx
```
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/builder/components/input-bar.tsx \
        src/features/builder/components/chat-column.tsx \
        src/features/builder/components/builder-page.tsx \
        src/features/builder/lib/agent-prompt.ts \
        src/features/builder/components/__tests__/input-bar-mode.test.tsx
git commit -m "feat(builder): add App/Flashcards mode picker in input bar, [FLASHCARD MODE] prompt prefix"
```

---

## Task 5: Polish ShareDialog

**Files:**
- Modify: `src/shared/components/share-dialog.tsx`
- Modify: `src/features/builder/components/preview-column.tsx`

- [ ] **Step 1: Read ShareDialog**

Open `src/shared/components/share-dialog.tsx` and check:
1. Does it use `DialogPortal`? If not, wrap `DialogContent` with `DialogPortal`
2. Does `DialogContent` have a `max-w-md` class? Add if not
3. Does the primary CTA button have `bg-gradient-to-br from-primary to-primary-container text-white`? Apply if not
4. Does `DialogContent` have mobile slide-up classes?

- [ ] **Step 2: Apply fixes**

The key changes in `share-dialog.tsx`:

```tsx
// Ensure DialogContent has these classes:
<DialogContent className="max-w-md w-full sm:rounded-2xl rounded-t-2xl mt-auto sm:mt-0 data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-0">

// Primary action button (publish/deploy):
<Button className="bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90">
  Share & Publish
</Button>
```

`DialogPortal` is included by default in shadcn/ui's `Dialog` — if the file uses the shadcn `Dialog` primitive directly, it's already portaled. Verify by checking if `DialogContent` uses `DialogPortal` or `DialogOverlay`. If it renders a plain `<div>`, replace with shadcn `Dialog`.

- [ ] **Step 3: Update Publish button label in preview-column.tsx**

```tsx
// In preview-column.tsx, find the Publish button and change label:
<Button
  size="sm"
  aria-label="Share & Publish"
  onClick={onPublish}
  className="h-8 bg-gradient-to-br from-primary to-primary-container px-3 text-xs font-semibold text-white shadow-sm hover:opacity-90"
>
  Share & Publish
</Button>
```

- [ ] **Step 4: Run preview-column tests**

```bash
npm test -- src/features/builder/components/__tests__/preview-column.test.tsx
```
Expected: PASS (update any test asserting "Publish" text to "Share & Publish")

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/share-dialog.tsx \
        src/features/builder/components/preview-column.tsx
git commit -m "fix(builder): ShareDialog portal/sizing/mobile fix, rename Publish to Share & Publish"
```

---

## Task 6: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test 2>&1 | tail -20
```
Expected: All tests pass

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: No errors
