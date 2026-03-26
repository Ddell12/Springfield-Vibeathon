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
  const [currentIndex, setCurrentIndex] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect -- reset index when deck size changes */
  useEffect(() => { setCurrentIndex(0); }, [totalCards]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, totalCards - 1)));
    },
    [totalCards],
  );

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, totalCards - 1));
  }, [totalCards]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

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
    currentIndex,
    totalCards,
    goTo,
    goNext,
    goPrev,
    isFirst: currentIndex === 0,
    isLast: currentIndex === totalCards - 1,
  };
}
