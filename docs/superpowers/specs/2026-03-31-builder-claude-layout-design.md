# Builder UI — Claude.ai Layout Redesign

**Date:** 2026-03-31  
**Status:** Approved  
**Scope:** `src/features/builder/` — empty state, chat panel, preview panel, toolbar removal

---

## Objective

Rebuild the Bridges builder UI to match Claude.ai's layout exactly, using the Bridges design system (Fraunces, Instrument Sans, teal primary, warm canvas). The goal is to give therapists and parents a familiar, calm building experience modeled on the best AI chat UI available.

---

## Approach: Full Layout Rebuild (Option B)

`BuilderPage` keeps all existing hooks and state unchanged. Only the render output changes. `BuilderToolbar` is deleted. Two new column components (`ChatColumn`, `PreviewColumn`) replace the toolbar + panel structure. A new `HomeScreen` component replaces the existing empty-state JSX.

---

## 1. Layout Structure

### Empty state
- `HomeScreen` renders full-viewport (`flex-1 flex flex-col`), canvas background (`bg-canvas`)
- Content centered vertically and horizontally

### Active state
- Two-column flex layout via existing `ResizablePanelGroup`
- `ChatColumn` (left, default 45%) — header + scrollable messages + sticky input
- `PreviewColumn` (right, default 55%) — header + preview/code content
- Mobile: existing single-panel toggle behavior preserved

### Deleted
- `BuilderToolbar` component — removed entirely
- `src/features/builder/components/builder-toolbar.tsx` — deleted
- `BuilderToolbar` import and usage in `BuilderPage` — removed

---

## 2. HomeScreen Component

**File:** `src/features/builder/components/home-screen.tsx`

### Layout
```
[B logo]  Good [morning/afternoon/evening], [FirstName]   ← time-aware, Fraunces display
                                                            ← sub: "Describe what you need"

          ┌──────────────────────────────────────┐
          │  What would you like to build?       │  ← textarea, auto-grow, no ring
          │                                      │
          │  [+] [⚙] [◉ Guided]  Bridges AI [↑]│  ← bottom toolbar
          └──────────────────────────────────────┘

          [AAC Board] [Social Skills] [Articulation]
          [Home Program] [Visual Schedule] [Bridges' choice]

          [ContinueCard if mostRecent exists]
```

### Greeting
- Time ranges: 5–11 = "Good morning", 12–17 = "Good afternoon", 18–23 = "Good evening"
- Name from Clerk `user.firstName`, fallback "there"
- Fraunces, ~36px, weight 400, with `B` logo icon to the left (same gradient circle as sidebar)

### Input card
- `bg-white rounded-2xl shadow-sm max-w-2xl w-full px-4 pt-4 pb-3`
- Textarea: `resize-none min-h-[60px] max-h-[200px]` auto-grows with content, no border, no ring
- Placeholder: "What would you like to build?"
- Bottom toolbar row (always visible below textarea):
  - `+` icon button — reserved for future file attach (disabled, muted)
  - Sliders icon button — reserved for settings (disabled, muted)
  - `Guided` pill: `rounded-full border border-outline-variant/40 text-xs px-3 py-1` — clicking pre-fills textarea with a starter prompt for guided interview mode
  - Spacer (`flex-1`)
  - "Bridges AI" text: `text-xs text-on-surface-variant/50` (muted, non-interactive)
  - Send button: teal gradient circle (`bg-gradient-to-br from-primary to-teal-hover`), disabled until textarea has content, arrow-up icon

### Category chips
- Below the card, `flex flex-wrap justify-center gap-2 mt-3`
- Six chips: `AAC Board`, `Social Skills`, `Articulation`, `Home Program`, `Visual Schedule`, `Bridges' choice`
- Clicking a chip sets the textarea value to a starter prompt:
  - AAC Board → "I need an AAC board for a child who…"
  - Social Skills → "I need a social skills activity about…"
  - Articulation → "I need an articulation practice app for the sound…"
  - Home Program → "I need a home program activity for…"
  - Visual Schedule → "I need a visual schedule for…"
  - Bridges' choice → "Build me something useful for a child with…"
- Chip style: `rounded-full border border-outline-variant/30 bg-surface text-sm px-4 py-2 hover:bg-surface-raised transition-colors`

### Guided mode
- When `Guided` pill is clicked (or user submits with `guided=true` flag): launches existing `InterviewController` flow
- When a category chip pre-fills textarea + user submits normally: bypasses interview, calls `handleGenerate` directly

### ContinueCard
- Existing component, rendered below chips if `mostRecent` exists and not dismissed

---

## 3. ChatColumn Component

**File:** `src/features/builder/components/chat-column.tsx`

### Header
```
[≡]   Untitled App  ↓
```
- Height: `h-12 px-4 flex items-center gap-3 border-b border-outline-variant/20`
- Left: sidebar collapse icon (purely decorative, `text-on-surface-variant/50`)
- Title: `<button>` inline rename — clicking swaps to `<Input>`, blur/Enter saves via `updateTitle` mutation
- Chevron `↓`: decorative, `text-on-surface-variant/40`, no action

### Messages area
- `flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4`
- Scroll anchor div at bottom

### Message components (see Section 5)

### PatientContextCard
- Rendered at top of messages area if `patientId` exists (unchanged)

### Input bar
- See Section 6 — sticky at bottom of `ChatColumn`

---

## 4. PreviewColumn Component

**File:** `src/features/builder/components/preview-column.tsx`

### Header
```
[👁] [</>]    v1      [↺]  [Copy ↓]  [Publish]  [✕]
```
- Height: `h-12 px-3 flex items-center gap-2 border-b border-outline-variant/20`
- **Eye tab** (Preview): icon button, active = `text-primary`, inactive = `text-on-surface-variant`
- **Code tab** (`</>`): icon button, same active/inactive treatment
- Active tab indicated by `border-b-2 border-primary` underline
- **Version label** (`v1`): static label, `text-xs text-on-surface-variant/50`, shown only when bundle exists. No counter — always "v1".
- **Refresh** icon: reruns `onRetry`, disabled during generation
- **Copy** button + dropdown chevron: copies bundle HTML to clipboard
- **Publish** button: primary teal (`bg-gradient-to-br from-primary to-teal-hover text-white`), calls existing `onShare` flow. Label: "Publish"
- **X** close: calls `onNewChat` to reset back to HomeScreen

### Content
- `flex-1 overflow-hidden`
- When `viewMode === "preview"`: renders existing `<PreviewPanel />`
- When `viewMode === "code"`: renders existing `<CodePanel />`
- No changes to PreviewPanel or CodePanel internals

---

## 5. Message Styles

### UserMessage (redesigned)
```
[SL]  ████████████████████████
      I want to build an AAC board
      ████████████████████████
```
- Layout: `flex items-start gap-3` (left-aligned, same as Claude)
- Avatar: `w-8 h-8 rounded-full bg-on-surface text-surface flex items-center justify-center text-xs font-semibold flex-shrink-0` — user initials from Clerk
- Bubble: `bg-on-surface/90 text-surface rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] text-sm`

### AssistantMessage (redesigned)
```
[B]  I'll create a comprehensive AAC board...

     **Key Features**
     - 80 core words with Fitzgerald colors
```
- Layout: `flex items-start gap-3`
- Logo: `w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0` — shows "B"
- Text: plain markdown via existing `ReactMarkdown`, no bubble wrapper, `text-foreground text-sm`

### ArtifactCard (new, replaces inline success state)
```
┌─────────────────────────────────────────┐
│  AAC Board — Core Words      [⊠ close]  │
│  Therapy app                            │
└─────────────────────────────────────────┘
```
- `border border-outline-variant/30 rounded-xl px-4 py-3 bg-surface flex items-center justify-between`
- Title: session title or blueprint title, `text-sm font-medium`
- Subtitle: "Therapy app", `text-xs text-on-surface-variant`
- Close icon: `⊠` (octagon X), `text-on-surface-variant/50 hover:text-on-surface-variant`
- Shown when `status === "generating"` or `status === "live"`
- Replaces existing inline success state

### Generation spinner
- Shown below `ArtifactCard` during `status === "generating"`
- Dotted-circle spinner: `w-6 h-6 rounded-full border-2 border-dashed border-primary/40 animate-spin`
- Existing `ProgressCard` and `ThinkingIndicator` replaced by this simpler treatment

### SystemMessage
- Unchanged: centered pill, `text-xs text-on-surface-variant`

### BlueprintCard
- Unchanged — still appears inline when blueprint is available

---

## 6. InputBar Component

**File:** `src/features/builder/components/input-bar.tsx`

Shared between `HomeScreen` and `ChatColumn`.

```
┌──────────────────────────────────────────┐
│  Reply to Bridges AI…                    │  ← textarea
│                                          │
│  [+] [⚙] [◉ Guided]    Bridges AI  [↑] │  ← action row
└──────────────────────────────────────────┘
```

### Props
```ts
interface InputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  isGenerating: boolean;
  showGuidedPill?: boolean;
  onGuidedClick?: () => void;
}
```

### Card container
- `bg-white rounded-2xl shadow-sm border border-outline-variant/20 px-4 pt-3 pb-3`
- In `ChatColumn`: `mx-4 mb-4 sticky bottom-0`
- In `HomeScreen`: `max-w-2xl w-full` (centered)

### Textarea
- `resize-none min-h-[24px] max-h-[200px] w-full bg-transparent border-0 outline-none text-sm placeholder:text-on-surface-variant/40`
- Auto-grows via `scrollHeight`
- `Enter` submits (without Shift), `Shift+Enter` adds newline

### Action row
- `flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/10`
- `+` button: `text-on-surface-variant/50`, disabled, opacity-50
- `VoiceInput` component: existing component, transcribes to textarea value
- `Guided` pill: shown when `showGuidedPill` is true
- `flex-1` spacer
- "Bridges AI" text: `text-xs text-on-surface-variant/40`
- Send/Stop button: teal gradient circle `w-8 h-8`
  - Send state: arrow-up icon, disabled when empty or generating (no stop mechanism exists)

---

## 7. Component File Changes

### New files
- `src/features/builder/components/home-screen.tsx`
- `src/features/builder/components/chat-column.tsx`
- `src/features/builder/components/preview-column.tsx`
- `src/features/builder/components/input-bar.tsx`
- `src/features/builder/components/artifact-card.tsx`

### Modified files
- `src/features/builder/components/builder-page.tsx` — layout rebuild, toolbar removal
- `src/features/builder/components/chat-panel.tsx` — message styles updated, input removed (moved to InputBar)

### Deleted files
- `src/features/builder/components/builder-toolbar.tsx`

### Unchanged files
- `src/features/builder/components/preview-panel.tsx`
- `src/features/builder/components/code-panel.tsx`
- `src/features/builder/components/blueprint-card.tsx`
- `src/features/builder/components/continue-card.tsx`
- `src/features/builder/components/patient-context-card.tsx`
- `src/features/builder/components/progress-card.tsx`
- `src/features/builder/components/interview/` (all files)
- All hooks, schemas, constants

---

## 8. Mobile Behavior

- Mobile: `ChatColumn` and `PreviewColumn` still toggle via the existing mobile panel mechanism
- The toggle control (Chat / Preview pills) moves into `ChatColumn` header when `isMobile` is true
- `InputBar` renders at bottom of whichever panel is active

---

## 9. Tests to Update

- `__tests__/builder-page.test.tsx` — remove `BuilderToolbar` assertions
- `__tests__/builder-toolbar.test.tsx` — delete (component deleted)
- `__tests__/chat-panel.test.tsx` — update message bubble selectors
- New tests: `home-screen.test.tsx`, `input-bar.test.tsx`, `artifact-card.test.tsx`
