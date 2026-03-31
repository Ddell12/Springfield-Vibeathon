# Group B: Builder UX Improvements

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Artifact card reopen, preview panel close, background generation UX, flashcard type picker, publish dialog polish

---

## Goals

- Fix the artifact card so clicking it reopens the preview panel
- Fix the X button so it only hides the preview panel (not reset the session)
- Surface background generation status so users can leave and come back
- Replace the standalone `/flashcards` route with an in-builder type picker
- Polish the publish/share dialog so it renders correctly on all screen sizes

---

## 1. Artifact Card — Click to Reopen Preview

### Problem

`ArtifactCard` renders with `icon="disabled_by_default"` and no click handler. The X button in `PreviewColumn` calls `reset()` + `router.push("/builder")`, destroying the session instead of just hiding the panel.

### Fix

Add `previewVisible: boolean` state to `BuilderPage` (default `true`).

**X button behavior:**
- `PreviewColumn`'s `onClose` prop → sets `previewVisible(false)` only
- No `reset()`, no navigation — session stays alive

**Panel rendering:**
- When `previewVisible === true`: existing `ResizablePanelGroup` with both `ChatColumn` + `PreviewColumn`
- When `previewVisible === false`: `ChatColumn` renders alone at full width — `ResizablePanel` / `ResizablePanelGroup` not mounted
- Mobile: X on the preview strip already switches `mobilePanel` back to `"chat"` — no change needed

**Artifact card behavior:**
- `ArtifactCard` gains `onClick?: () => void` prop
- `ChatPanel` passes `onArtifactClick` through to `ArtifactCard`
- `ChatColumn` receives `onArtifactClick` and forwards it
- `BuilderPage` passes `() => setPreviewVisible(true)` as `onArtifactClick`
- Icon changes from `disabled_by_default` → `open_in_new` to signal it is clickable
- Card cursor: `cursor-pointer`, hover: subtle `bg-surface-container` tint

### Prop chain

```
BuilderPage
  → ChatColumn (onArtifactClick)
    → ChatPanel (onArtifactClick)
      → ArtifactCard (onClick)
```

### Affected files

- `src/features/builder/components/builder-page.tsx` — add `previewVisible` state, conditional panel rendering, pass `onArtifactClick`
- `src/features/builder/components/chat-column.tsx` — add `onArtifactClick` prop, thread through
- `src/features/builder/components/chat-panel.tsx` — add `onArtifactClick` prop, pass to `ArtifactCard`
- `src/features/builder/components/artifact-card.tsx` — add `onClick` prop, change icon, add hover styles
- `src/features/builder/components/preview-column.tsx` — `onClose` no longer calls `reset()` — caller handles visibility

---

## 2. Background Generation UX

### Current state

The SSE connection in `useStreaming` is component-scoped. Navigating away disconnects the client. The server-side route handler in `src/app/api/generate/route.ts` continues running (Next.js streaming routes complete their `ReadableStream` regardless of client disconnect — **verify no `request.signal.aborted` early-exit guard exists**).

An existing `recoveredBundle` query in `BuilderPage` already fetches the completed bundle from Convex when the component remounts with `status === "live"` but no `bundleHtml`. This handles the resume case correctly.

### Changes

**Toast copy update** (`builder-page.tsx`):

Replace:
```
"Your app is still building. Check My Apps when it's ready."
```
With:
```
"Building continues in the background — find it in Recents when it's ready."
```

**Sidebar dot indicator** (implemented in Group A, Section 4): The animated teal dot next to in-progress sessions in the sidebar is the primary background indicator. No additional UI needed here.

**Resume flow** (no code change needed): Clicking a recent session link (`/builder/[sessionId]`) triggers `useSessionResume` → `resumeSession` with the recovered bundle. This already works.

### Implementer verify task

Open `src/app/api/generate/route.ts` and confirm there is no pattern like:
```ts
request.signal.addEventListener("abort", () => controller.close());
```
or
```ts
if (request.signal.aborted) return;
```
inside the generation loop. If found, remove it so generation completes server-side after client disconnect.

---

## 3. App-Type Picker in Builder Input Bar

### Replaces `/flashcards` route

The standalone `/flashcards` page is removed (Group A). Flashcard generation moves into the builder as a mode.

### UI

A small pill segmented control added to `InputBar`'s bottom toolbar row, **left of the voice input button**:

```
[ App ]  [ Flashcards ]  🎤  ────────────  Bridges AI  [▲]
```

- Active pill: teal fill (`bg-primary text-white`)
- Inactive pill: ghost (`border border-outline-variant/40 text-on-surface-variant`)
- Hidden (replaced by single icon) when `isGenerating === true` to save toolbar space
- Pill labels: "App" and "Flashcards"

### State

`BuilderPage` owns `mode: "app" | "flashcards"` (default `"app"`).

Prop chain:
```
BuilderPage (mode, onModeChange)
  → ChatColumn (mode, onModeChange)
    → InputBar (mode, onModeChange)
```

### Prompt behavior

In `BuilderPage.handleGenerate`, when `mode === "flashcards"`, prepend a mode tag to the prompt before passing to `generate()`:

```ts
const finalPrompt = mode === "flashcards"
  ? `[FLASHCARD MODE] ${prompt}`
  : prompt;
generate(finalPrompt, blueprint ?? undefined, patientId ?? undefined);
```

The existing agent system prompt in `src/features/builder/lib/agent-prompt.ts` should be updated to handle `[FLASHCARD MODE]` — generating a flashcard-style React app rather than a general therapy app. The WAB scaffold and SSE pipeline are unchanged.

### Placeholder text

`InputBar` placeholder changes based on mode:
- `"app"` → `"What would you like to build…"`
- `"flashcards"` → `"Describe the flashcard set you want to build…"`

### Affected files

- `src/features/builder/components/builder-page.tsx` — add `mode` state, update `handleGenerate`
- `src/features/builder/components/chat-column.tsx` — thread `mode` + `onModeChange` props
- `src/features/builder/components/input-bar.tsx` — add pill UI, `mode` + `onModeChange` props
- `src/features/builder/lib/agent-prompt.ts` — add flashcard mode handling

---

## 4. Publish / Share Dialog Polish

### Problem

The `ShareDialog` likely misaligns because it renders inside the `ResizablePanelGroup` DOM subtree, which creates a nested stacking context that clips the dialog.

### Fixes

**Portal:** Confirm `ShareDialog` uses shadcn/ui `Dialog` → `DialogPortal`. `DialogPortal` renders at `document.body` by default, bypassing any stacking context from the resizable panels. If it does not use `DialogPortal`, add it.

**Sizing:**
- Dialog content: `max-w-md w-full mx-auto`
- Padding: `p-6`
- No full-width stretching on large screens

**Backdrop:** `bg-black/50 backdrop-blur-sm` (shadcn default — verify it's not been overridden)

**CTA button:** The primary publish/deploy button inside the dialog gets `bg-gradient-to-br from-primary to-primary-container text-white` to match DESIGN.md brand CTA.

**Button label rename:** "Publish" → "Share & Publish" for clarity.

**Mobile bottom-sheet:** On screens `< md`, the dialog slides up from the bottom:
- Add `data-[state=open]:slide-in-from-bottom` animation class
- Dialog content: `sm:rounded-2xl rounded-t-2xl mt-auto sm:mt-0` so it anchors to bottom on mobile

### Affected files

- `src/shared/components/share-dialog.tsx` — portal verification, sizing, CTA gradient, mobile animation
- `src/features/builder/components/preview-column.tsx` — rename button label to "Share & Publish"

---

## 5. Affected Files Summary

### Modified
- `src/features/builder/components/builder-page.tsx`
- `src/features/builder/components/chat-column.tsx`
- `src/features/builder/components/chat-panel.tsx`
- `src/features/builder/components/artifact-card.tsx`
- `src/features/builder/components/preview-column.tsx`
- `src/features/builder/components/input-bar.tsx`
- `src/features/builder/lib/agent-prompt.ts`
- `src/shared/components/share-dialog.tsx`
- `src/app/api/generate/route.ts` (verify only — remove abort guard if present)

### Deleted
- `src/app/(app)/flashcards/` (route directory — done in Group A)

### Test updates
- `artifact-card.test.tsx` — add click handler test
- `preview-column.test.tsx` — update close behavior test
- `input-bar.test.tsx` — add mode picker render + toggle tests

---

## 6. Out of Scope

- Group A (sidebar, routes, header)
- Group C (patient detail, session notes, billing, session email, mobile time overflow)
- Group D (caregiver QA screenshots)
- Full publish pipeline changes (Vercel deploy logic unchanged)
