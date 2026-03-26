import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { useTTS } from "@/hooks/useTTS";

interface StoryPage {
  image: string;
  text: string;
  audioUrl?: string;
}

interface PageViewerProps {
  pages: StoryPage[];
  onPageChange?: (index: number) => void;
}

export function PageViewer({ pages, onPageChange }: PageViewerProps) {
  const [current, setCurrent] = useState(0);
  const { speak, speaking } = useTTS();
  const page = pages[current];

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, idx));
    setCurrent(clamped);
    onPageChange?.(clamped);
  };

  const handleSpeak = () => {
    if (page) speak(page.text);
  };

  if (!page) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Image */}
      <div
        className={cn(
          "w-full rounded-[var(--radius-xl)] overflow-hidden",
          "bg-[var(--color-border)] flex items-center justify-center",
          "min-h-[200px]"
        )}
      >
        {page.image.startsWith("http") || page.image.startsWith("/") ? (
          <img
            src={page.image}
            alt={page.text}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-8xl" role="img" aria-label={page.text}>
            {page.image}
          </span>
        )}
      </div>

      {/* Text + speak */}
      <div className="flex items-start gap-3">
        <p className="flex-1 text-lg font-medium text-[var(--color-text)] leading-relaxed">
          {page.text}
        </p>
        <button
          onClick={handleSpeak}
          disabled={speaking}
          aria-label="Read page aloud"
          className={cn(
            "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
            "bg-[var(--color-primary-bg)] text-[var(--color-primary)]",
            "hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-200",
            "disabled:opacity-40",
            speaking && "animate-pulse"
          )}
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          aria-label="Previous page"
          className={cn(
            "tap-target h-12 w-12 rounded-full flex items-center justify-center",
            "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
            "hover:bg-[var(--color-primary-bg)] transition-colors duration-200",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* Page dots */}
        <div className="flex gap-2" role="tablist" aria-label="Pages">
          {pages.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === current}
              aria-label={`Page ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                i === current
                  ? "w-6 bg-[var(--color-primary)]"
                  : "w-2.5 bg-[var(--color-border)] hover:bg-[var(--color-primary-light)]"
              )}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(current + 1)}
          disabled={current === pages.length - 1}
          aria-label="Next page"
          className={cn(
            "tap-target h-12 w-12 rounded-full flex items-center justify-center",
            "bg-[var(--color-surface-raised)] shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
            "hover:bg-[var(--color-primary-bg)] transition-colors duration-200",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        Page {current + 1} of {pages.length}
      </p>
    </div>
  );
}
