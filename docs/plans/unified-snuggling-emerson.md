# Plan: Flashcard UI — Mirror Builder Layout + Deck Panel

## Context

The flashcard page currently has a completely different layout from the builder page. The builder has a polished two-phase UI (centered prompt screen -> toolbar + resizable panels), while flashcards has a minimal toolbar and always-visible panels with the empty state buried inside the preview panel. The mobile experience also differs: builder uses toolbar toggle, flashcards uses a floating chat button.

The goal is to make the flashcard page a near-copy of the builder layout, adding the DeckList as a third panel on the right side.

## Visual Target

**Desktop (active session):**
```
┌────────────────────────────────────────────────────────────┐
│ [←] [+] Untitled Deck ● Generating...           [Share]   │  ← FlashcardToolbar
├──────────────┬─────────────────────────┬───────────────────┤
│              │                         │                   │
│  Chat Panel  │   Flashcard Preview     │   Deck List       │
│  (25%)       │   (FlashcardSwiper)     │   (25%)           │
│              │   (50%)                 │                   │
│              │                         │   • Deck 1        │
│  Messages    │   [← card →]            │   • Deck 2        │
│  Input       │                         │   [+ New Deck]    │
│              │                         │                   │
└──────────────┴─────────────────────────┴───────────────────┘
```

**Desktop (no session — prompt screen):**
```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│          What flashcards would you like to create?         │
│        Describe them and AI will generate images & audio   │
│                                                            │
│        [  Describe the flashcards you want...  🪄 ]       │
│                                                            │
│   [colors] [farm animals] [emotions] [foods] [body parts] │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Steps

### Step 1: Add `reset` to `useFlashcardStreaming` hook

**File:** `src/features/flashcards/hooks/use-flashcard-streaming.ts`

- Add `reset` function that clears sessionId, status, activityMessage
- Update `UseFlashcardStreamingReturn` interface to include `reset`
- Pattern: same as builder's `useStreaming` reset

```ts
const reset = useCallback(() => {
  abortRef.current?.abort();
  setStatus("idle");
  setSessionId(null);
  setActivityMessage("");
}, []);
```

### Step 2: Extract `FLASHCARD_SUGGESTIONS` to constants

**New file:** `src/features/flashcards/lib/constants.ts`

Move the `FLASHCARD_SUGGESTIONS` array from `flashcard-preview-panel.tsx` (lines 14-20) into a dedicated constants file, mirroring `src/features/builder/lib/constants.ts`.

### Step 3: Create `FlashcardToolbar` component

**New file:** `src/features/flashcards/components/flashcard-toolbar.tsx`

Copy from `src/features/builder/components/builder-toolbar.tsx` with these changes:

**Keep:**
- `<header>` with same classes: `"flex h-12 flex-shrink-0 items-center justify-between bg-surface-container-lowest px-3 shadow-sm"`
- Left section: gradient back button (`Link` to `/dashboard`), new chat button, editable project name, status indicator pill
- Center section (mobile): chat/preview toggle tablist (builder lines 123-152)
- Right section: Share button only

**Remove:**
- Preview/Code segmented control (builder lines 157-184)
- Device size icons (builder lines 189-206)
- URL bar pill (builder lines 211-214)
- Publish button and `isPublishing` prop
- `view`, `onViewChange`, `deviceSize`, `onDeviceSizeChange` props

**Props:**
```ts
interface FlashcardToolbarProps {
  status: FlashcardStreamingStatus;
  projectName: string;
  isEditingName?: boolean;
  onNameEditStart?: () => void;
  onNameEditEnd?: (name: string) => void;
  onShare?: () => void;
  onNewChat?: () => void;
  isMobile?: boolean;
  mobilePanel?: "chat" | "preview";
  onMobilePanelChange?: (panel: "chat" | "preview") => void;
}
```

### Step 4: Simplify `FlashcardPreviewPanel`

**File:** `src/features/flashcards/components/flashcard-preview-panel.tsx`

- Remove the empty state block (lines 40-57) — moves to FlashcardPage prompt screen
- Remove the inline DeckList sidebar (lines 72-74) — becomes its own panel
- Remove `hasSession`, `onSuggestionSelect` props
- Keep only `activeDeckId` prop
- Simplified component just renders FlashcardSwiper or a loading/empty state

### Step 5: Rewrite `FlashcardPage` to mirror `BuilderPage`

**File:** `src/features/flashcards/components/flashcard-page.tsx`

This is the main change. Copy the `BuilderPage` structure (from `src/features/builder/components/builder-page.tsx`):

**Add state:**
```ts
const isMobile = useIsMobile();
const [mobilePanel, setMobilePanel] = useState<"chat" | "preview">("chat");
const [isEditingName, setIsEditingName] = useState(false);
const [promptInput, setPromptInput] = useState("");
```

**Phase gate:** `const showPromptScreen = !sessionId && status === "idle";`

**Phase 1 (prompt screen):** Copy builder lines 225-268, adapt text/suggestions for flashcards:
- Heading: "What flashcards would you like to create?"
- Subtitle: "Describe them and AI will generate images and audio for each card."
- Use `FLASHCARD_SUGGESTIONS` from constants
- Same pill-shaped input with send button

**Phase 2 (toolbar + panels):**
- `<FlashcardToolbar>` at top
- Content wrapper: `<div className="min-h-0 flex-1 bg-surface-container-low p-2">`
- Mobile: single panel toggled via toolbar (chat or preview), same pattern as builder lines 298-323
- Desktop: 3-panel `ResizablePanelGroup`:
  - Chat (25%, min 20%) in `rounded-2xl bg-surface-container-lowest`
  - Preview/Swiper (50%, min 30%) in `rounded-2xl bg-surface-container-lowest`
  - DeckList (25%, min 15%, max 30%) in `rounded-2xl bg-surface-container-lowest`

**Session name:** Query `api.sessions.get` for title, fallback "Untitled Deck"

**Title editing:** Copy builder pattern with `api.sessions.updateTitle` mutation

**New chat handler:**
```ts
const handleNewChat = () => {
  reset();
  setActiveDeckId(null);
  window.location.href = "/flashcards?new=1";
};
```

**Delete:** `MobileFlashcardLayout` component (replaced by toolbar-driven mobile layout)

### Step 6: Verify and polish

- Verify `FlashcardChatPanel` renders correctly inside the new `rounded-2xl bg-surface-container-lowest` wrapper
- Test mobile panel toggle works
- Confirm DeckList renders properly as its own panel
- Verify prompt screen matches builder's visual style

## Critical Files

| File | Action |
|------|--------|
| `src/features/flashcards/hooks/use-flashcard-streaming.ts` | Add `reset` function |
| `src/features/flashcards/lib/constants.ts` | **New** — extract suggestions |
| `src/features/flashcards/components/flashcard-toolbar.tsx` | **New** — adapted from builder-toolbar |
| `src/features/flashcards/components/flashcard-preview-panel.tsx` | Simplify (remove empty state + deck list) |
| `src/features/flashcards/components/flashcard-page.tsx` | Major rewrite to mirror builder-page |
| `src/features/flashcards/components/flashcard-chat-panel.tsx` | Minor verification |

## Reference Files (copy patterns from)

| File | What to copy |
|------|-------------|
| `src/features/builder/components/builder-toolbar.tsx` | Toolbar structure, gradient back button, editable name, status pill, mobile toggle |
| `src/features/builder/components/builder-page.tsx` | Two-phase pattern, prompt screen, panel layout, mobile toggle, session name derivation |

## Verification

1. `npm run build` — no type errors
2. Navigate to `/flashcards` — see centered prompt screen (like builder empty state)
3. Submit a prompt — toolbar appears, 3-panel layout shows
4. Verify mobile toggle works (resize browser or use devtools)
5. Verify DeckList panel shows decks and selecting one changes the swiper
6. Click "New chat" — returns to prompt screen
7. Compare side-by-side with `/builder` — layout should be visually consistent
