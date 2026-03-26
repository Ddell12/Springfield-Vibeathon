"use client";

import { useRef, useEffect } from "react";

import { useDeckNavigation } from "../hooks/use-deck-navigation";
import { FlashcardCard } from "./flashcard-card";

interface Card {
  _id: string;
  label: string;
  imageUrl?: string;
  audioUrl?: string;
  sortOrder: number;
}

interface FlashcardSwiperProps {
  cards: Card[];
}

export function FlashcardSwiper({ cards }: FlashcardSwiperProps) {
  const { currentIndex, goTo } = useDeckNavigation(cards.length);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={scrollRef}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {cards.map((card, i) => (
          <div key={card._id} className="w-full flex-none snap-center px-4">
            <FlashcardCard
              label={card.label}
              imageUrl={card.imageUrl}
              audioUrl={card.audioUrl}
              index={i}
              total={cards.length}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? "w-6 bg-primary"
                : "bg-on-surface-variant/30"
            }`}
            aria-label={`Go to card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
