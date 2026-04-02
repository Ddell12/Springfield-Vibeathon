"use client";

import { useCallback, useEffect, useState } from "react";

interface UseDeckNavigationReturn {
  currentIndex: number;
  totalCards: number;
  goTo: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function useDeckNavigation(totalCards: number): UseDeckNavigationReturn {
  const [navigationState, setNavigationState] = useState(() => ({
    currentIndex: 0,
    totalCards,
  }));

  const effectiveIndex =
    navigationState.totalCards === totalCards ? navigationState.currentIndex : 0;
  const clampedIndex = (() => {
    if (totalCards === 0) return 0;
    return Math.min(effectiveIndex, totalCards - 1);
  })();

  const goTo = useCallback(
    (index: number) => {
      if (totalCards === 0) return;
      setNavigationState({
        currentIndex: Math.max(0, Math.min(index, totalCards - 1)),
        totalCards,
      });
    },
    [totalCards],
  );

  const goNext = useCallback(() => {
    if (totalCards === 0) return;
    setNavigationState((prev) => ({
      currentIndex:
        prev.totalCards === totalCards
          ? Math.min(prev.currentIndex + 1, totalCards - 1)
          : 1,
      totalCards,
    }));
  }, [totalCards]);

  const goPrev = useCallback(() => {
    if (totalCards === 0) return;
    setNavigationState((prev) => ({
      currentIndex:
        prev.totalCards === totalCards ? Math.max(prev.currentIndex - 1, 0) : 0,
      totalCards,
    }));
  }, [totalCards]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  return {
    currentIndex: clampedIndex,
    totalCards,
    goTo,
    goNext,
    goPrev,
    isFirst: clampedIndex === 0,
    isLast: clampedIndex === totalCards - 1,
  };
}
