# Flashcard Swiper Navigation Bug Analysis

## Problem Summary
The left/right arrow buttons to navigate between flashcards don't work correctly — users can't see all 10 generated cards when swiping.

## Root Cause Analysis

### Issue 1: Scroll Listener Competing with Button Navigation (CRITICAL)
**File**: `src/features/flashcards/components/flashcard-swiper.tsx` (lines 33-55)

The component has TWO competing navigation mechanisms:
1. **Button-based navigation**: `goTo()` function called by left/right arrows
2. **Scroll-based navigation**: `handleScroll` listener that calls `goTo()` based on scroll position

**The Problem:**
```typescript
const handleScroll = () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.clientWidth;
    const newIndex = Math.round(scrollLeft / cardWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < cards.length) {
      goTo(newIndex);
    }
  }, 100);
};
```

When a user clicks the right arrow button:
1. `goTo(currentIndex + 1)` is called → state updates to `currentIndex = 1`
2. The `useEffect` hook (lines 26-31) then calls `scrollIntoView()` to scroll to the new card
3. The scroll event fires → `handleScroll` listener is triggered
4. After 100ms, `handleScroll` calculates the new index based on `scrollLeft / cardWidth`
5. **But `cardWidth = container.clientWidth`** — which is the full viewport width, not the individual card width!

This means the index calculation is wrong. If viewport width is 1200px and we're scrolling card widths of 448px (max-w-md = 28rem), the division produces an incorrect index.

### Issue 2: Incorrect Card Width Calculation (CRITICAL)
The card container structure:
```typescript
<div
  ref={scrollRef}
  className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
  style={{ scrollbarWidth: "none" }}
>
  {cards.map((card, i) => (
    <div key={card._id} className="mx-auto w-full max-w-md flex-none snap-center px-4">
      {/* card content */}
    </div>
  ))}
</div>
```

**The Problem:**
- Each card wrapper has `w-full` (100% of parent width) + `max-w-md` (28rem = 448px)
- The container has `snap-mandatory` CSS scroll-snap
- When calculating index from scroll position, the code uses `container.clientWidth` which is NOT the actual card width being scrolled

**Expected calculation:**
```
actualCardWidth = max-w-md + px-4 * 2 = 448 + 32 = ~480px
newIndex = Math.round(scrollLeft / ~480)
```

**Actual calculation:**
```
newIndex = Math.round(scrollLeft / container.clientWidth)
// This is viewport width, not card width!
```

### Issue 3: Dependency Chain Issue
**File**: `src/features/flashcards/components/flashcard-swiper.tsx` (lines 26-31, 33-55)

The scroll listener depends on `[currentIndex, cards.length, goTo]` (line 55), but:
- Every time `currentIndex` changes, the listener is re-registered
- This creates rapid scroll listener registration/deregistration cycles
- The 100ms debounce timeout can interfere with rapid button clicks

## Component Flow Diagram

```
User clicks right arrow
    ↓
goTo(currentIndex + 1) → state updates
    ↓
useEffect (line 26) fires → scrollIntoView()
    ↓
scroll event fires
    ↓
handleScroll() debounces for 100ms
    ↓
Calculates index using WRONG cardWidth (container.clientWidth)
    ↓
May call goTo() with incorrect index
    ↓
State updates incorrectly
```

## Data Flow Check

✓ **Cards are fetched correctly**: `flashcard_cards.ts` listByDeck uses `.take(200)` so 10 cards are retrieved
✓ **Cards are passed correctly**: FlashcardPreviewPanel passes cards array to FlashcardSwiper
✓ **Navigation hook works**: useDeckNavigation handles index bounds correctly
✓ **Button handlers are correct**: goTo() functions are properly bound

The issue is purely in the scroll-to-index conversion logic.

## CSS Snap Details

The swiper uses CSS scroll-snap:
- `snap-x snap-mandatory` on container
- `snap-center` on card wrappers

This should naturally snap to one card per scroll, but the JavaScript scroll listener is trying to calculate position, which fails due to the cardWidth mismatch.

## Impact

- Users can only navigate to cards that happen to align with the broken index calculation
- Most cards become unreachable via arrow buttons
- Keyboard shortcuts (arrow keys) also fail because they use `goTo()` which triggers the same broken scroll logic
- Dot indicators may show the wrong card as selected

## Solution Approach

The scroll listener needs to be either:
1. **Removed entirely** (recommended) — let CSS scroll-snap handle alignment, buttons just update state
2. **Fixed** — calculate actual card width correctly, or use a ResizeObserver to track it
3. **Debounced differently** — use a flag to prevent scroll listener from firing after button clicks

### Recommended Fix (Option 1 - Simplest)

Remove the scroll listener entirely. The button clicks should be sufficient:
- Click arrow → update state
- useEffect calls scrollIntoView() → browser handles smooth scroll + snap
- No scroll event listener needed

This reduces complexity and eliminates the conflict.

## Files Involved

1. `/Users/desha/Springfield-Vibeathon/src/features/flashcards/components/flashcard-swiper.tsx` — Main issue
2. `/Users/desha/Springfield-Vibeathon/src/features/flashcards/hooks/use-deck-navigation.ts` — Navigation state (working correctly)
3. `/Users/desha/Springfield-Vibeathon/src/features/flashcards/components/flashcard-preview-panel.tsx` — Parent component (working correctly)
4. `/Users/desha/Springfield-Vibeathon/src/features/flashcards/components/flashcard-card.tsx` — Card component (working correctly)

## Next Steps for Implementation

1. Analyze if scroll listener serves any purpose (synchronizing state with manual scroll)
2. If not needed, remove both useEffect hooks from flashcard-swiper.tsx
3. Test that arrow buttons work for all 10 cards
4. Test that keyboard shortcuts work
5. Test that dot indicators correctly show active card
