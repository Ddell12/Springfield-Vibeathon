# Fix Flashcard Page Layout + Deck Management UX

## Context

The flashcard page uses a 3-panel `ResizablePanelGroup` (Chat 25% | Preview 50% | Deck List 25%) but the right deck panel is pushed off-screen and unusable. The root cause is the 3-panel layout fighting for horizontal space — two `ResizableHandle` elements consume ~24-32px of extra width, and the combined widths with the sidebar leave the deck panel clipped at the viewport edge.

Beyond the layout bug, the deck panel lacks proper management features (rename, delete) and the "Create New Deck" button is non-functional since deck creation happens via chat. The full user journey for managing decks is incomplete.

**Goal:** Fix the layout, add complete deck management, match the builder page's proven 2-panel pattern, and deliver a polished, production-quality experience.

---

## Step 1: Convert to 2-Panel Layout + Deck Sheet

**File:** `src/features/flashcards/components/flashcard-page.tsx`

Replace the 3-panel `ResizablePanelGroup` with a 2-panel layout matching the builder:
- Chat panel: `defaultSize={30} minSize={20}`
- Preview panel: `defaultSize={70} minSize={30}`

Add a `<Sheet side="right">` overlay for the deck list (using existing `src/shared/components/ui/sheet.tsx`). Add state:
- `deckSheetOpen` — controls the deck sheet
- `renameDeckId` / `renameDeckTitle` — for rename dialog
- `deleteDeckId` / `deleteDeckTitle` — for delete dialog

Wire deck management callbacks:
- `handleRenameDeck(deckId, title)` — opens rename dialog
- `handleDeleteDeck(deckId, title)` — opens delete confirmation dialog
- `handleConfirmRename(newName)` — calls `api.flashcard_decks.update`
- `handleConfirmDelete()` — calls `api.flashcard_decks.remove`, clears activeDeckId if deleted

Add `<DeleteConfirmationDialog>` (reuse from `src/shared/components/delete-confirmation-dialog.tsx`) and `<RenameDeckDialog>` (new, Step 4) at the page level.

---

## Step 2: Add "Decks" Button to Toolbar

**File:** `src/features/flashcards/components/flashcard-toolbar.tsx`

Add prop: `onOpenDeckSheet?: () => void`

In the right section (before Share button), add:
```tsx
<Button variant="ghost" size="sm" onClick={onOpenDeckSheet}>
  <MaterialIcon icon="collections_bookmark" size="sm" />
  Decks
</Button>
```

This gives users a persistent, discoverable entry point to deck management on both mobile and desktop.

---

## Step 3: Enhance DeckList + DeckCard with Management Actions

**File:** `src/features/flashcards/components/deck-list.tsx`

Changes:
- Add props: `onRenameDeck`, `onDeleteDeck`, `onClose` (to close sheet after selection)
- Replace the non-functional "Create New Deck" button with helper text: "Use the chat to create new decks"
- Add a header section with "Your Decks" title and deck count
- Pass management callbacks through to each DeckCard
- On deck select: call `onSelectDeck` + `onClose`

**File:** `src/features/flashcards/components/deck-card.tsx`

Changes:
- Add props: `onRename?: () => void`, `onDelete?: () => void`
- Add a `DropdownMenu` (shadcn) with a `more_vert` trigger icon on hover/focus
- Menu items: "Rename" and "Delete" (with `text-error` styling)
- Use `e.stopPropagation()` on the trigger to prevent card selection when opening menu

---

## Step 4: Create RenameDeckDialog Component

**New file:** `src/features/flashcards/components/rename-deck-dialog.tsx`

Props: `open`, `onOpenChange`, `currentName: string`, `onConfirm: (newName: string) => void`

- Dialog with input field pre-filled with current name
- "Cancel" and "Save" buttons
- Use semantic tokens, `font-headline` for title
- Same visual pattern as `DeleteConfirmationDialog` (rounded-2xl, p-10, etc.)

---

## Step 5: Fix FlashcardCard Proportions

**File:** `src/features/flashcards/components/flashcard-card.tsx`

- Change label from `text-5xl` to `text-2xl md:text-3xl` — still large and readable but proportional
- Add `break-words` to prevent long labels from overflowing
- The card `max-w-sm` is fine for a 70% panel

---

## Step 6: Fix FlashcardSwiper Sizing

**File:** `src/features/flashcards/components/flashcard-swiper.tsx`

- Add `h-full justify-center` to the outer flex container so it centers vertically within the preview panel
- Add `max-w-md mx-auto` constraint to each card wrapper so cards don't stretch too wide in the larger 70% panel

---

## Step 7: Add Deck Context to Preview Panel Header

**File:** `src/features/flashcards/components/flashcard-preview-panel.tsx`

- Add prop: `onOpenDeckSheet?: () => void`
- Query active deck title via `api.flashcard_decks.get`
- Add a subtle top bar inside the preview showing: deck title + "Switch deck" button (opens sheet)
- This gives users context about which deck they're viewing and quick access to switch

---

## Step 8: Verify with agent-browser

After implementation, use `/agent-browser` to:
1. Navigate to `/flashcards`
2. Create a deck via the prompt
3. Verify the 2-panel layout renders correctly (no overflow)
4. Open the deck sheet and verify deck list appears
5. Test rename and delete flows via dropdown menu
6. Verify mobile layout with panel toggle
7. Take screenshots to confirm polished appearance

Iterate until the full user journey is smooth and production-quality.

---

## Critical Files

| File | Action |
|------|--------|
| `src/features/flashcards/components/flashcard-page.tsx` | Major refactor — 2-panel + Sheet + dialogs |
| `src/features/flashcards/components/flashcard-toolbar.tsx` | Add Decks button |
| `src/features/flashcards/components/deck-list.tsx` | Add management callbacks, fix CTA |
| `src/features/flashcards/components/deck-card.tsx` | Add dropdown menu |
| `src/features/flashcards/components/rename-deck-dialog.tsx` | **New** — rename dialog |
| `src/features/flashcards/components/flashcard-card.tsx` | Fix label sizing |
| `src/features/flashcards/components/flashcard-swiper.tsx` | Fix centering/sizing |
| `src/features/flashcards/components/flashcard-preview-panel.tsx` | Add deck context header |
| `src/shared/components/delete-confirmation-dialog.tsx` | Reuse as-is |
| `convex/flashcard_decks.ts` | Already has `update` + `remove` mutations (no changes needed) |

## Reusable Existing Code

- `DeleteConfirmationDialog` from `src/shared/components/delete-confirmation-dialog.tsx`
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` from `src/shared/components/ui/sheet.tsx`
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` from `src/shared/components/ui/dropdown-menu.tsx`
- `Dialog`, `DialogContent`, `DialogTitle` from `src/shared/components/ui/dialog.tsx`
- `MaterialIcon` from `src/shared/components/material-icon.tsx`
- `cn()` from `src/core/utils.ts`
- Convex mutations: `api.flashcard_decks.update`, `api.flashcard_decks.remove`

## Verification

1. `npm run build` — confirm no TypeScript/build errors
2. `npm test` — run existing tests
3. Manual browser verification via `/agent-browser`:
   - Layout fits viewport (no horizontal scroll)
   - Deck sheet opens/closes smoothly
   - Rename dialog saves new name
   - Delete dialog removes deck and its cards
   - Active deck auto-selects after creation
   - Mobile toggle works (Chat/Cards)
   - Deck button in toolbar works on mobile
