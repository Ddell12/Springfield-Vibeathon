# Builder UX Humanization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all technical jargon in the builder chat with warm, accessible language for therapists and parents of ASD children.

**Architecture:** Client-side message translation layer converts technical SSE events to warm user-facing messages. A timer-based narration hook (called ONLY in `BuilderPage`, result passed down as props) auto-advances friendly progress messages during generation. Notable SSE events (image/speech) override the timer via a dedicated `overrideMessage` prop rather than re-translating from activities (since `use-streaming.ts` converts `image_generated`/`speech_generated` to `Activity.type: "file_written"`, losing the original event type). Server-side auto-retry silently recovers from build failures. The Code tab becomes a hidden "View source" button.

**Tech Stack:** React 19 hooks, Vitest + React Testing Library, Next.js API route (Node.js runtime)

**Spec:** `docs/superpowers/specs/2026-03-27-builder-ux-humanization-design.md`

---

### Task 1: Create the Activity Message Translation Layer

**Files:**
- Create: `src/features/builder/lib/activity-messages.ts`
- Create: `src/features/builder/lib/__tests__/activity-messages.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/builder/lib/__tests__/activity-messages.test.ts
import { describe, expect, it } from "vitest";

import { mapActivityToUserMessage } from "../activity-messages";

describe("mapActivityToUserMessage", () => {
  it("translates thinking activity to warm message", () => {
    expect(
      mapActivityToUserMessage({ event: "activity", type: "thinking", message: "Understanding your request..." })
    ).toBe("Reading your description...");
  });

  it("suppresses writing_file activities (returns null)", () => {
    expect(
      mapActivityToUserMessage({ event: "activity", type: "writing_file", message: "Built src/App.tsx (2 files)" })
    ).toBeNull();
  });

  it("suppresses file_written activities (returns null)", () => {
    expect(
      mapActivityToUserMessage({ event: "activity", type: "file_written", message: "Built src/components/Foo.tsx (3 files)" })
    ).toBeNull();
  });

  it("translates bundling status to warm message", () => {
    expect(
      mapActivityToUserMessage({ event: "status", status: "bundling" })
    ).toBe("Putting everything together...");
  });

  it("returns null for generating status (timer handles it)", () => {
    expect(
      mapActivityToUserMessage({ event: "status", status: "generating" })
    ).toBeNull();
  });

  it("translates successful complete activity", () => {
    expect(
      mapActivityToUserMessage({ event: "activity", type: "complete", message: "App is live and ready!" })
    ).toBe("Your app is ready!");
  });

  it("suppresses build failure complete activity", () => {
    expect(
      mapActivityToUserMessage({ event: "activity", type: "complete", message: "Build failed: esbuild error xyz" })
    ).toBeNull();
  });

  it("translates image_generated to warm message", () => {
    expect(
      mapActivityToUserMessage({ event: "image_generated", label: "reward star" })
    ).toBe("Creating pictures for your app...");
  });

  it("translates speech_generated to warm message", () => {
    expect(
      mapActivityToUserMessage({ event: "speech_generated", text: "Great job!" })
    ).toBe("Recording friendly voices...");
  });

  it("translates stt_enabled to warm message", () => {
    expect(
      mapActivityToUserMessage({ event: "stt_enabled" })
    ).toBe("Voice input is ready!");
  });

  it("translates 'Almost ready...' thinking to warm variant", () => {
    expect(
      mapActivityToUserMessage({ event: "activity", type: "thinking", message: "Almost ready..." })
    ).toBe("Almost there...");
  });

  it("returns generic warm message for unknown thinking messages", () => {
    expect(
      mapActivityToUserMessage({ event: "activity", type: "thinking", message: "Some unknown server message" })
    ).toBe("Working on your app...");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/lib/__tests__/activity-messages.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```ts
// src/features/builder/lib/activity-messages.ts

/**
 * Translates technical SSE events into warm, user-facing messages.
 * Returns null for events that should be suppressed from the user.
 *
 * The server continues to emit technical events for logging/debugging.
 * This layer is the only place user-facing activity language is defined.
 */

interface ActivityEvent {
  event: string;
  type?: string;
  message?: string;
  status?: string;
  label?: string;
  text?: string;
}

export function mapActivityToUserMessage(evt: ActivityEvent): string | null {
  if (evt.event === "activity") {
    switch (evt.type) {
      case "thinking":
        if (evt.message?.includes("Almost ready")) return "Almost there...";
        if (evt.message?.includes("Understanding")) return "Reading your description...";
        return "Working on your app...";

      case "writing_file":
      case "file_written":
        // Suppressed — users don't care about file paths
        return null;

      case "complete":
        // Disambiguate success vs. failure by message content
        if (evt.message?.startsWith("Build failed")) return null;
        return "Your app is ready!";

      default:
        return null;
    }
  }

  if (evt.event === "status") {
    if (evt.status === "bundling") return "Putting everything together...";
    // "generating" and other statuses are handled by the timer narration
    return null;
  }

  if (evt.event === "image_generated") return "Creating pictures for your app...";
  if (evt.event === "speech_generated") return "Recording friendly voices...";
  if (evt.event === "stt_enabled") return "Voice input is ready!";

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/lib/__tests__/activity-messages.test.ts`
Expected: All 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/lib/activity-messages.ts src/features/builder/lib/__tests__/activity-messages.test.ts
git commit -m "feat: add activity message translation layer for warm UX"
```

---

### Task 2: Create the Progress Narration Hook

**Files:**
- Create: `src/features/builder/hooks/use-progress-narration.ts`
- Create: `src/features/builder/hooks/__tests__/use-progress-narration.test.ts`

**Design note:** The hook accepts an `overrideMessage` string prop instead of trying to re-translate from `activities[]`. This is because `use-streaming.ts` converts `image_generated`/`speech_generated` SSE events into `Activity` objects with `type: "file_written"`, losing the original event identity. The caller (`builder-page.tsx`) translates SSE events via `mapActivityToUserMessage` at the `handleEvent` level and passes notable overrides directly to this hook.

- [ ] **Step 1: Write the failing tests**

```ts
// src/features/builder/hooks/__tests__/use-progress-narration.test.ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useProgressNarration } from "../use-progress-narration";

describe("useProgressNarration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when status is idle", () => {
    const { result } = renderHook(() => useProgressNarration("idle"));
    expect(result.current).toBeNull();
  });

  it("returns null when status is live", () => {
    const { result } = renderHook(() => useProgressNarration("live"));
    expect(result.current).toBeNull();
  });

  it("returns first stage message when generation starts", () => {
    const { result } = renderHook(() => useProgressNarration("generating"));
    expect(result.current).toBe("Reading your description...");
  });

  it("advances to second stage after 5 seconds", () => {
    const { result } = renderHook(() => useProgressNarration("generating"));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Designing the layout...");
  });

  it("advances through all stages on 5s intervals", () => {
    const { result } = renderHook(() => useProgressNarration("generating"));

    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Designing the layout...");

    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Adding the fun parts...");

    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Making it interactive...");

    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Putting on the finishing touches...");

    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Almost there...");
  });

  it("stays on last stage indefinitely", () => {
    const { result } = renderHook(() => useProgressNarration("generating"));
    act(() => { vi.advanceTimersByTime(60000); });
    expect(result.current).toBe("Almost there...");
  });

  it("overrides timer when overrideMessage is provided", () => {
    const { result, rerender } = renderHook(
      ({ status, override }) => useProgressNarration(status, override),
      { initialProps: { status: "generating" as const, override: undefined as string | undefined } }
    );

    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe("Designing the layout...");

    // Simulate an image_generated override from parent
    rerender({ status: "generating" as const, override: "Creating pictures for your app..." });
    expect(result.current).toBe("Creating pictures for your app...");

    // After 3 seconds, timer resumes
    rerender({ status: "generating" as const, override: undefined });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current).not.toBe("Creating pictures for your app...");
  });

  it("resets to null when status changes from generating to live", () => {
    const { result, rerender } = renderHook(
      ({ status }) => useProgressNarration(status),
      { initialProps: { status: "generating" as const } }
    );
    expect(result.current).toBe("Reading your description...");

    rerender({ status: "live" as const });
    expect(result.current).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/hooks/__tests__/use-progress-narration.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```ts
// src/features/builder/hooks/use-progress-narration.ts
"use client";

import { useEffect, useRef, useState } from "react";

import type { StreamingStatus } from "./use-streaming";

const NARRATION_STAGES = [
  "Reading your description...",
  "Designing the layout...",
  "Adding the fun parts...",
  "Making it interactive...",
  "Putting on the finishing touches...",
  "Almost there...",
] as const;

const STAGE_INTERVAL_MS = 5_000;
const OVERRIDE_DURATION_MS = 3_000;

/**
 * Returns a warm, user-facing progress message during generation.
 * Auto-advances through narration stages on a 5s timer.
 *
 * The optional `overrideMessage` prop lets the parent inject notable events
 * (image generated, audio recorded, bundling) that temporarily replace the
 * timer message. After OVERRIDE_DURATION_MS, the timer resumes.
 *
 * Call this hook ONLY in BuilderPage — pass the result down as a prop.
 * Do NOT call in both ChatPanel and BuilderPage (creates two timers).
 */
export function useProgressNarration(
  status: StreamingStatus,
  overrideMessage?: string,
): string | null {
  const [stageIndex, setStageIndex] = useState(0);
  const [activeOverride, setActiveOverride] = useState<string | null>(null);
  const overrideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOverrideRef = useRef<string | undefined>(undefined);

  const isGenerating = status === "generating";

  // Reset when generation starts
  useEffect(() => {
    if (isGenerating) {
      setStageIndex(0);
      setActiveOverride(null);
      prevOverrideRef.current = undefined;
    }
  }, [isGenerating]);

  // Auto-advance timer stages
  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      setStageIndex((prev) =>
        prev < NARRATION_STAGES.length - 1 ? prev + 1 : prev
      );
    }, STAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isGenerating]);

  // Handle override messages from parent (translated SSE events)
  useEffect(() => {
    if (!isGenerating) return;

    if (overrideMessage && overrideMessage !== prevOverrideRef.current) {
      prevOverrideRef.current = overrideMessage;
      setActiveOverride(overrideMessage);

      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
      overrideTimeoutRef.current = setTimeout(() => {
        setActiveOverride(null);
        overrideTimeoutRef.current = null;
      }, OVERRIDE_DURATION_MS);
    } else if (!overrideMessage && prevOverrideRef.current) {
      prevOverrideRef.current = undefined;
      // Don't clear activeOverride immediately — let the timeout handle it
    }
  }, [overrideMessage, isGenerating]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    };
  }, []);

  if (!isGenerating) return null;

  return activeOverride ?? NARRATION_STAGES[stageIndex];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/hooks/__tests__/use-progress-narration.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/hooks/use-progress-narration.ts src/features/builder/hooks/__tests__/use-progress-narration.test.ts
git commit -m "feat: add progress narration hook with timer-based warm messages"
```

---

### Task 3: Update ChatPanel — Remove Jargon, Wire Narration

**Files:**
- Modify: `src/features/builder/components/chat-panel.tsx`
- Modify: `src/features/builder/components/__tests__/chat-panel.test.tsx`

- [ ] **Step 1: Update the test file for new strings**

In `chat-panel.test.tsx`, add/update tests:

```ts
// Add after existing tests in the describe block:

it("shows warm narration message during generation (not raw activity)", () => {
  render(
    <ChatPanel
      {...defaultProps}
      sessionId="session_123"
      status="generating"
      activities={[
        { id: "a1", type: "file_written", message: "Built src/App.tsx (1 file)", timestamp: 1, path: "src/App.tsx" },
      ]}
    />
  );
  // Should NOT show file path
  expect(screen.queryByText(/src\/App\.tsx/)).toBeNull();
  // Should show warm narration from useProgressNarration
  expect(screen.getByRole("status")).toBeTruthy();
});

it("shows warm success message when live", () => {
  render(<ChatPanel {...defaultProps} sessionId="session_123" status="live" activities={[]} />);
  expect(screen.getByText(/your app is ready/i)).toBeTruthy();
  expect(screen.getByText(/try it out/i)).toBeTruthy();
});

it("shows soft error without raw error text", () => {
  render(<ChatPanel {...defaultProps} error="esbuild: Unexpected token at line 42" />);
  expect(screen.getByText(/we hit a small bump/i)).toBeTruthy();
  expect(screen.getByText(/want to try again/i)).toBeTruthy();
  // Raw error should NOT be visible
  expect(screen.queryByText(/esbuild/i)).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/components/__tests__/chat-panel.test.tsx`
Expected: FAIL — new assertions don't match current strings

- [ ] **Step 3: Modify chat-panel.tsx**

Changes to `src/features/builder/components/chat-panel.tsx`:

**IMPORTANT:** Do NOT call `useProgressNarration` in this component. The hook is called ONLY in `builder-page.tsx` (Task 7). ChatPanel receives narration via a new `narrationMessage` prop.

1. **Remove** `FileBadges` import (line 21):
```ts
// DELETE: import { FileBadges } from "./file-badges";
```

2. **Add `narrationMessage` prop** to `ChatPanelProps` interface:
```ts
narrationMessage?: string | null;
```
And add to the destructured props.

3. **Remove** the `FileBadges` rendering block (lines 167-174)

4. **Replace** the activity pill block (lines 176-184) AND the starting generation block (lines 186-194) with a single narration pill:
```tsx
{/* Warm progress narration during generation */}
{isGenerating && narrationMessage && (
  <div
    className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3"
    role="status"
    aria-live="polite"
  >
    <MaterialIcon icon="progress_activity" size="xs" className="animate-spin text-primary" />
    <span className="text-sm text-on-surface-variant">
      {narrationMessage}
    </span>
  </div>
)}
```

6. **Update** the success state block (lines 196-209):
```tsx
{/* Success state */}
{isLive && (
  <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3 dark:bg-primary/10">
    <MaterialIcon icon="check_circle" size="sm" className="text-primary" filled />
    <div>
      <p className="text-sm font-medium text-primary dark:text-primary-fixed-dim">
        Your app is ready!
      </p>
      <p className="text-xs text-primary/70 dark:text-primary-fixed-dim/70">
        Try it out! Tell me if you&apos;d like any changes.
      </p>
    </div>
  </div>
)}
```

7. **Update** the error state block (lines 211-229):
```tsx
{/* Error state */}
{error && (
  <div className="rounded-xl bg-destructive/10 p-4">
    <p className="text-sm font-medium text-destructive">
      We hit a small bump
    </p>
    <p className="mt-1 text-xs text-destructive/80">Want to try again?</p>
    {onRetry && (
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-destructive hover:text-destructive"
        onClick={onRetry}
      >
        Try again
      </Button>
    )}
  </div>
)}
```

- [ ] **Step 4: Update ALL existing tests that match old strings**

In `chat-panel.test.tsx`, these specific tests will break and need updates:

**Line 105-113** — `"shows error message when error is set"`: Currently asserts `screen.getByText(/Claude API unavailable/i)`. Raw error is now hidden. Change to:
```ts
it("shows soft error message when error is set", () => {
  render(
    <ChatPanel {...defaultProps} status="failed" error="Claude API unavailable" />
  );
  expect(screen.getByText(/we hit a small bump/i)).toBeTruthy();
  // Raw error text should NOT be visible to user
  expect(screen.queryByText(/Claude API unavailable/i)).toBeNull();
});
```

**Line 134-143** — `"shows Retry button"`: Currently asserts `screen.getByRole("button", { name: /retry/i })`. Button text changes from "Retry" to "Try again" which does NOT match `/retry/i`. Change to:
```ts
expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
```

**Line 146-155** — `"does not show Retry button"`: Same pattern — change `/retry/i` to `/try again/i`.

**Line 166-173** — `"shows starting indicator"`: Currently asserts `screen.getByText(/Starting generation/)`. This block is replaced by the narration pill. Change to:
```ts
it("shows narration pill when generating with no activities", () => {
  render(<ChatPanel {...defaultProps} status="generating" narrationMessage="Reading your description..." />);
  expect(screen.getByRole("status")).toBeTruthy();
  expect(screen.getByText(/reading your description/i)).toBeTruthy();
});
```

**Line 176-194** — `"shows activity cards for file_written"` and `"shows activity message"`: FileBadges removed, raw activity text suppressed. Replace both with:
```ts
it("does NOT show raw file paths or activity messages during generation", () => {
  render(
    <ChatPanel
      {...defaultProps}
      status="generating"
      narrationMessage="Designing the layout..."
      activities={[
        { id: "a1", type: "file_written", message: "Wrote App.tsx", path: "src/App.tsx", timestamp: Date.now() },
      ]}
    />
  );
  expect(screen.queryByText(/App\.tsx/)).toBeNull();
  expect(screen.queryByText(/Edited/)).toBeNull();
  expect(screen.getByText(/designing the layout/i)).toBeTruthy();
});
```

**Also update `defaultProps`** to include `narrationMessage: null`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/components/__tests__/chat-panel.test.tsx`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/builder/components/chat-panel.tsx src/features/builder/components/__tests__/chat-panel.test.tsx
git commit -m "feat: replace technical jargon with warm narration in ChatPanel"
```

---

### Task 4: Update PreviewPanel — Soften All Strings

**Files:**
- Modify: `src/features/builder/components/preview-panel.tsx`
- Modify: `src/features/builder/components/__tests__/preview-panel.test.tsx`

- [ ] **Step 1: Update tests for new strings**

In `preview-panel.test.tsx`, update these specific tests:

```ts
// Update "Building your app..." test (line 20-23):
it("shows 'Creating your app...' spinner when generating and no preview", () => {
  render(<PreviewPanel bundleHtml={null} state="generating" />);
  expect(screen.getByText(/creating your app/i)).toBeTruthy();
});

// Update "shows error message when state is failed" test (line 32-35):
// Currently asserts: screen.getByText(/build crashed/i) — raw error shown
// After change: fixed string, no raw error exposed
it("shows soft error message when state is failed", () => {
  render(<PreviewPanel bundleHtml={null} state="failed" error="Build crashed" />);
  expect(screen.getByText(/something didn.t look right/i)).toBeTruthy();
  // Raw error should NOT be visible
  expect(screen.queryByText(/build crashed/i)).toBeNull();
});

// Update the "shows default error" test (line 37-40):
it("shows soft error message when failed without error prop", () => {
  render(<PreviewPanel bundleHtml={null} state="failed" />);
  expect(screen.getByText(/something didn.t look right/i)).toBeTruthy();
});

// Add new test for build-failed state:
it("shows warm build-failed message without technical jargon", () => {
  render(<PreviewPanel bundleHtml={null} state="live" buildFailed={true} onRetry={vi.fn()} />);
  expect(screen.getByText(/something didn.t look right/i)).toBeTruthy();
  expect(screen.getByText(/want to try again/i)).toBeTruthy();
  // Must NOT show developer jargon
  expect(screen.queryByText(/build error/i)).toBeNull();
  expect(screen.queryByText(/code panel/i)).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/components/__tests__/preview-panel.test.tsx`
Expected: FAIL — old strings still in component

- [ ] **Step 3: Modify preview-panel.tsx**

Apply these string replacements in `src/features/builder/components/preview-panel.tsx`:

1. Line 89: `"Building your app..."` → `"Creating your app..."`

2. Lines 121: `{error ?? "Something went wrong"}` → `{error ? "Something didn't look right" : "Something didn't look right"}`
   Simplify to: `"Something didn't look right"`

3. Lines 128-134: Replace the entire build-failed / no-preview block:
```tsx
<p className="text-sm font-medium">
  Something didn&apos;t look right
</p>
<p className="max-w-sm text-center text-xs text-muted-foreground">
  Want to try again? Just tap the button below.
</p>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/components/__tests__/preview-panel.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/preview-panel.tsx src/features/builder/components/__tests__/preview-panel.test.tsx
git commit -m "feat: soften PreviewPanel strings for non-technical users"
```

---

### Task 5: Update BuilderToolbar — Code Tab → "View Source" Button

**Files:**
- Modify: `src/features/builder/components/builder-toolbar.tsx`
- Modify: `src/features/builder/components/__tests__/builder-toolbar.test.tsx`

- [ ] **Step 1: Update existing tests and add new tests**

In `builder-toolbar.test.tsx`, these existing tests will break:

**Line 131-133** — `"status='generating' shows 'Loading Live Preview' indicator"`: String changes. Update to:
```ts
it("status='generating' shows 'Building your app' indicator", () => {
  render(<BuilderToolbar {...baseProps} status="generating" />);
  expect(screen.getByText(/building your app/i)).toBeInTheDocument();
});
```

**Line 164-170** — `"view toggle Preview/Code calls onViewChange"`: Code tab no longer exists. Replace with:
```ts
it("'View source' button calls onViewChange('code')", () => {
  const onViewChange = vi.fn();
  render(<BuilderToolbar {...baseProps} onViewChange={onViewChange} status="live" hasFiles={true} />);
  fireEvent.click(screen.getByRole("button", { name: /view source/i }));
  expect(onViewChange).toHaveBeenCalledWith("code");
});
```

**Add new tests:**

```ts
it("does not render 'Code' tab in segmented control", () => {
  render(<BuilderToolbar {...baseProps} />);
  expect(screen.queryByRole("tab", { name: /code/i })).not.toBeInTheDocument();
});

it("shows 'View source' button when live with files", () => {
  render(
    <BuilderToolbar {...baseProps} status="live" hasFiles={true} />
  );
  expect(screen.getByRole("button", { name: /view source/i })).toBeInTheDocument();
});

it("hides 'View source' button when generating", () => {
  render(
    <BuilderToolbar {...baseProps} status="generating" hasFiles={true} />
  );
  expect(screen.queryByRole("button", { name: /view source/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/builder/components/__tests__/builder-toolbar.test.tsx`
Expected: FAIL

- [ ] **Step 3: Modify builder-toolbar.tsx**

1. **Add `hasFiles` prop** to `BuilderToolbarProps` interface:
```ts
hasFiles?: boolean;
```

2. **Add to destructured props:**
```ts
hasFiles,
```

3. **Remove the "Code" tab** from the desktop segmented control (lines 158-185). The `<div role="tablist">` should only contain the "Preview" button. Remove the "Code" `<button role="tab">` entirely.

4. **Update status pill text** (line 117):
```tsx
Building your app&#8230;
```

5. **Add "View source" button** in the right section (before the Share button, around line 220):
```tsx
{!isGenerating && hasFiles && (
  <Button
    variant="ghost"
    size="sm"
    className="min-h-[44px] gap-1.5 rounded-md px-3 text-xs font-semibold text-on-surface-variant transition-all active:scale-95"
    onClick={() => onViewChange("code")}
    aria-label="View source"
    title="View source code"
  >
    <MaterialIcon icon="code" size="sm" />
    <span className="hidden sm:inline">Source</span>
  </Button>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/builder/components/__tests__/builder-toolbar.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/builder-toolbar.tsx src/features/builder/components/__tests__/builder-toolbar.test.tsx
git commit -m "feat: replace Code tab with 'View source' button for power users"
```

---

### Task 6: Update CodePanel — Minimal String Cleanup

**Files:**
- Modify: `src/features/builder/components/code-panel.tsx`
- Modify: `src/features/builder/components/__tests__/code-panel.test.tsx`

- [ ] **Step 1: Update test assertion**

In `code-panel.test.tsx`, find any test that asserts on `"Generating your files"` and change to:

```ts
expect(screen.getByText(/building/i)).toBeTruthy();
```

- [ ] **Step 2: Modify code-panel.tsx**

Line 39: Change `"Generating your files&#8230;"` to `"Building&#8230;"`

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/features/builder/components/__tests__/code-panel.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/builder/components/code-panel.tsx src/features/builder/components/__tests__/code-panel.test.tsx
git commit -m "feat: soften CodePanel string for power-user view"
```

---

### Task 7: Wire Everything in BuilderPage

**Files:**
- Modify: `src/features/builder/components/builder-page.tsx`
- Modify: `src/features/builder/components/__tests__/builder-page.test.tsx`

**Design note:** This is the ONLY component that calls `useProgressNarration`. It also translates the latest notable activity into an `overrideMessage` for the hook using `mapActivityToUserMessage`. The narration result is passed down as props to `ChatPanel` and `PreviewPanel`.

- [ ] **Step 1: Modify builder-page.tsx**

1. **Add imports:**
```ts
import { mapActivityToUserMessage } from "../lib/activity-messages";
import { useProgressNarration } from "../hooks/use-progress-narration";
```

2. **Compute the override message from the latest activity** (after the `useStreaming()` call, around line 71). This translates notable SSE events (image_generated → "Creating pictures...", etc.) at the point where we still have access to the original event identity via the `handleEvent` path in `use-streaming.ts`:
```ts
// Translate latest activity for notable event overrides (images, audio, bundling)
const latestActivity = activities[activities.length - 1];
const overrideMessage = latestActivity
  ? mapActivityToUserMessage({ event: "activity", type: latestActivity.type, message: latestActivity.message })
  : undefined;

const narrationMessage = useProgressNarration(status, overrideMessage ?? undefined);
```

Note: For `image_generated` and `speech_generated`, `use-streaming.ts` stores the translated message directly in `Activity.message` (e.g., `"Generated image: reward star"`). The `mapActivityToUserMessage` function will return `null` for `file_written` type, so the override won't fire for plain file writes — only for `thinking` type activities. To handle image/speech overrides properly, we also need to check the raw `handleEvent` path. **Alternative simpler approach:** In `use-streaming.ts`, the `image_generated` handler (line 290) already creates a message `"Generated image: ${label}"`. Instead of trying to re-translate, add a `useRef` in `builder-page.tsx` that captures SSE-level notable events:

Actually, the simplest correct fix: translate at the SSE event level in `use-streaming.ts`'s `handleEvent`. When `image_generated`, `speech_generated`, or `stt_enabled` events arrive, also call `mapActivityToUserMessage` and store the result in a new state field `notableMessage`:

**Revised approach — add `notableMessage` state to `useStreaming`:**

In `src/features/builder/hooks/use-streaming.ts`, add a new field to the state and expose it:

a. Add to `StreamingState`: `notableMessage: string | null;`
b. Add to `initialState`: `notableMessage: null`
c. Add action: `| { type: "SET_NOTABLE_MESSAGE"; message: string | null }`
d. In reducer: `case "SET_NOTABLE_MESSAGE": return { ...state, notableMessage: action.message };`
e. In `START_GENERATION`: reset `notableMessage: null`
f. In `handleEvent`, after the existing `image_generated` case (line 290), add:
```ts
dispatch({ type: "SET_NOTABLE_MESSAGE", message: "Creating pictures for your app..." });
```
g. Similarly for `speech_generated` (line 294):
```ts
dispatch({ type: "SET_NOTABLE_MESSAGE", message: "Recording friendly voices..." });
```
h. For `stt_enabled` (line 298):
```ts
dispatch({ type: "SET_NOTABLE_MESSAGE", message: "Voice input is ready!" });
```
i. For the `status` event when `bundling` (line 244):
```ts
dispatch({ type: "SET_NOTABLE_MESSAGE", message: "Putting everything together..." });
```
j. Return `notableMessage` from the hook.

Then in `builder-page.tsx`:
```ts
const { ..., notableMessage } = useStreaming();
const narrationMessage = useProgressNarration(status, notableMessage ?? undefined);
```

3. **Pass `hasFiles` to `BuilderToolbar`** (around line 271). Add this prop:
```tsx
hasFiles={files.length > 0}
```

4. **Pass `narrationMessage` to `ChatPanel`** as a new prop:
```tsx
narrationMessage={narrationMessage}
```
(Do this for both mobile and desktop instances.)

5. **Pass `narrationMessage` to `PreviewPanel`** instead of raw activity message. Replace:
```tsx
activityMessage={activities[activities.length - 1]?.message}
```
with:
```tsx
activityMessage={narrationMessage ?? undefined}
```
(Do this for both the mobile and desktop `PreviewPanel` instances — around lines 320 and 369.)

- [ ] **Step 2: Modify use-streaming.ts — add notableMessage state**

Add the `notableMessage` field to the streaming state and dispatch it for `image_generated`, `speech_generated`, `stt_enabled`, and `status:bundling` events as described above. This is a small additive change — no existing behavior is altered, just a new state field.

- [ ] **Step 3: Update builder-page tests if needed**

Check `builder-page.test.tsx` for any assertions on old strings or raw activity messages and update accordingly.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/builder/components/__tests__/builder-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/builder-page.tsx src/features/builder/hooks/use-streaming.ts src/features/builder/components/__tests__/builder-page.test.tsx
git commit -m "feat: wire progress narration hook into BuilderPage with notable event overrides"
```

---

### Task 8: Auto-Retry Build Failure in route.ts

**Files:**
- Modify: `src/app/api/generate/route.ts`

- [ ] **Step 1: Restructure the bundle worker try/catch (lines 185-212)**

Replace the current try/catch/finally block with the auto-retry pattern:

```ts
const release = await acquireBuildSlot();
try {
  let bundleHtml: string;
  try {
    bundleHtml = await runBundleWorker(buildDir!);
    if (bundleHtml.length < 200) throw new Error("bundle HTML is suspiciously small");
  } catch (firstError) {
    // First failure — retry silently after 1s
    const firstMsg = firstError instanceof Error ? firstError.message : String(firstError);
    console.error("[generate] Bundle worker failed (attempt 1):", firstMsg.slice(0, 500));

    await new Promise((r) => setTimeout(r, 1000));

    try {
      bundleHtml = await runBundleWorker(buildDir!);
      if (bundleHtml.length < 200) throw new Error("bundle HTML is suspiciously small");
    } catch (secondError) {
      // Second failure — give up gracefully
      const secondMsg = secondError instanceof Error ? secondError.message : String(secondError);
      console.error("[generate] Bundle worker failed (attempt 2):", secondMsg.slice(0, 500));
      send("activity", { type: "complete", message: "We're having a little trouble — your app may need a small tweak" });
      // buildSucceeded stays false
      bundleHtml = ""; // signal no bundle
    }
  }

  if (bundleHtml && bundleHtml.length >= 200) {
    send("activity", { type: "thinking", message: "Almost ready..." });
    send("bundle", { html: bundleHtml });
    buildSucceeded = true;

    // Persist bundle for session resume
    try {
      await convex.mutation(api.generated_files.upsertAutoVersion, {
        sessionId,
        path: "_bundle.html",
        contents: bundleHtml,
      });
    } catch (err) {
      console.error("[generate] Failed to persist bundle:", err);
    }
  }
} finally {
  release();
}
```

- [ ] **Step 2: Update persisted messages (lines 244-266)**

Replace the assistant message (lines 244-253):
```ts
if (fileArray.length > 0) {
  const friendlyMsg = buildSucceeded
    ? "Your app is ready! Try it out and let me know if you'd like any changes."
    : "I created your app but the preview needs a small fix. Try sending a follow-up message.";
  postLlmPromises.push(
    convex.mutation(api.messages.create, {
      sessionId,
      role: "assistant",
      content: friendlyMsg,
      timestamp: Date.now(),
    }),
  );
}
```

**Remove** the system message block entirely (lines 256-266 — the one that lists file paths).

- [ ] **Step 3: Run the full test suite to check for regressions**

Run: `npx vitest run`
Expected: All existing tests PASS (route.ts has no unit tests, but downstream components shouldn't break)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: auto-retry build failures silently, soften persisted messages"
```

---

### Task 9: Run Full Test Suite and Fix Regressions

**Files:** Any test files that fail

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`

- [ ] **Step 2: Fix any failing tests**

Common expected failures:
- `file-badges.test.tsx` — should still pass since component is unchanged, just no longer rendered
- `thinking-indicator.test.tsx` — unchanged, should pass
- Any test matching old strings like `"Starting generation"`, `"App is live and ready"`, `"Something went wrong"`, `"Building your app"` — update to new warm strings

- [ ] **Step 3: Run tests again to confirm all green**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit any test fixes**

```bash
git add -A
git commit -m "test: fix test assertions for humanized UX strings"
```

---

### Task 10: Manual Verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Open builder and trigger generation**

Navigate to `/builder`, enter "Create a simple token board for good behavior rewards", and verify:
- No file paths appear in the chat (no `src/App.tsx`, no `file_written` messages)
- Warm narration messages auto-advance every ~5 seconds
- The "Code" tab is gone from the toolbar
- When generation completes, you see "Your app is ready!" (not "App is live and ready!")
- If you click "Source" in the toolbar (only visible after build), the code panel opens

- [ ] **Step 3: Verify error handling**

If a build fails, verify:
- No "Build failed: esbuild..." message appears
- The error message says "We hit a small bump" + "Want to try again?"

- [ ] **Step 4: Final commit if any tweaks were needed**

```bash
git add -A
git commit -m "fix: final UX tweaks from manual verification"
```
