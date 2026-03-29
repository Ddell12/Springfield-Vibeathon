# Fix: Flashcard Swiper Arrow Navigation

## Context

Flashcard generation now works (auth fix, assistant message, error states all shipped). But the left/right arrow buttons to navigate between cards don't work — clicking them appears to do nothing, so users can't see all their generated cards.

## Root Cause

**File**: `src/features/flashcards/components/flashcard-swiper.tsx` — lines 33-55

A scroll event listener **fights the button navigation**. When you click the right arrow:

1. `goTo(1)` fires → `currentIndex` updates to 1
2. First `useEffect` (line 26) fires → `scrollIntoView()` smoothly scrolls to card 1
3. The scroll triggers the second `useEffect`'s scroll listener (line 38-47)
4. The listener calculates: `newIndex = Math.round(scrollLeft / container.clientWidth)`
5. `container.clientWidth` is the **full scroll container width** (~1200px), not the card width (~480px with `max-w-md` + padding)
6. So it computes `Math.round(480 / 1200) = 0` → calls `goTo(0)` → **snaps back to card 0**

The button click works correctly, but the scroll listener immediately undoes it.

## Fix

**Remove the scroll listener entirely** (lines 33-55). It's unnecessary because:
- Button clicks update state and call `scrollIntoView()` — working correctly
- Dot indicators call `goTo(i)` directly — working correctly
- Keyboard arrows use `goNext()`/`goPrev()` from the hook — working correctly
- CSS `snap-x snap-mandatory snap-center` handles visual snap alignment

The scroll listener was meant to sync manual swipe gestures back to state, but the math is wrong and it conflicts with all other navigation methods. Without it, touch/drag swiping won't update the dot indicator, but that's a minor cosmetic trade-off vs. completely broken navigation.

## Implementation

**File**: `src/features/flashcards/components/flashcard-swiper.tsx`

Delete lines 33-55 (the second `useEffect` with the scroll listener). Keep lines 26-31 (the `scrollIntoView` effect).

Before:
```typescript
useEffect(() => {
  const container = scrollRef.current;
  if (!container) return;
  const target = container.children[currentIndex] as HTMLElement;
  target?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}, [currentIndex]);

useEffect(() => {
  const container = scrollRef.current;
  if (!container) return;
  let timeout: ReturnType<typeof setTimeout>;
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
  container.addEventListener("scroll", handleScroll, { passive: true });
  return () => {
    container.removeEventListener("scroll", handleScroll);
    clearTimeout(timeout);
  };
}, [currentIndex, cards.length, goTo]);
```

After:
```typescript
useEffect(() => {
  const container = scrollRef.current;
  if (!container) return;
  const target = container.children[currentIndex] as HTMLElement;
  target?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}, [currentIndex]);
```

## Critical files

| File | Change |
|------|--------|
| `src/features/flashcards/components/flashcard-swiper.tsx` | Remove scroll listener (lines 33-55) |

## Verification

1. Navigate to `/flashcards`, generate a deck with 5+ cards
2. Click right arrow → card advances, dot indicator updates
3. Click left arrow → card goes back
4. Click dot indicators → jumps to correct card
5. Keyboard arrows (← →) work
6. Run `npx vitest run` — all tests pass
7. Deploy: `npx convex dev --once` (no Convex changes, but verify Next.js still builds)
