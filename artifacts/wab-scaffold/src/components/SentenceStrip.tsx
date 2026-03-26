import { Volume2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTTS } from "@/hooks/useTTS";

interface WordChip {
  label: string;
  audioUrl?: string;
}

interface SentenceStripProps {
  words: WordChip[];
  onPlay: () => void;
  onClear: () => void;
}

export function SentenceStrip({ words, onPlay, onClear }: SentenceStripProps) {
  const { speak, speaking } = useTTS();

  const handlePlay = () => {
    const sentence = words.map((w) => w.label).join(" ");
    speak(sentence);
    onPlay();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-[var(--radius-lg)]",
        "bg-[var(--color-primary-bg)] min-h-[64px]"
      )}
      role="region"
      aria-label="Sentence strip"
    >
      <div className="flex flex-1 flex-wrap gap-1.5 min-h-[40px] items-center">
        {words.length === 0 ? (
          <span className="text-sm text-[var(--color-text-muted)] italic px-1">
            Tap words to build a sentence
          </span>
        ) : (
          words.map((word, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold",
                "bg-[var(--color-primary)] text-white"
              )}
            >
              {word.label}
            </span>
          ))
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handlePlay}
          disabled={words.length === 0 || speaking}
          aria-label="Read sentence aloud"
          className={cn(
            "tap-target h-10 w-10 rounded-full transition-all duration-200",
            "bg-[var(--color-primary)] text-white",
            "hover:bg-[var(--color-primary-light)] disabled:opacity-40 disabled:cursor-not-allowed",
            speaking && "animate-pulse"
          )}
        >
          <Volume2 className="h-5 w-5" />
        </button>

        <button
          onClick={onClear}
          disabled={words.length === 0}
          aria-label="Clear sentence"
          className={cn(
            "tap-target h-10 w-10 rounded-full transition-all duration-200",
            "bg-[var(--color-border)] text-[var(--color-text-muted)]",
            "hover:bg-red-100 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
