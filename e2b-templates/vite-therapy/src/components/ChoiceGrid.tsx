import { Check, X } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/utils";

interface ChoiceOption {
  label: string;
  image?: string;
  correct?: boolean;
}

interface ChoiceGridProps {
  options: ChoiceOption[];
  onSelect: (option: ChoiceOption) => void;
}

export function ChoiceGrid({ options, onSelect }: ChoiceGridProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSelect = (opt: ChoiceOption, idx: number) => {
    setSelected(idx);
    setShowFeedback(true);
    onSelect(opt);
    setTimeout(() => {
      setShowFeedback(false);
      setSelected(null);
    }, 1500);
  };

  const cols = options.length <= 2 ? 2 : options.length <= 4 ? 2 : 3;

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map((opt, i) => {
        const isSelected = selected === i;
        const isCorrect = opt.correct !== false;
        const showResult = isSelected && showFeedback;

        return (
          <button
            key={i}
            onClick={() => !showFeedback && handleSelect(opt, i)}
            disabled={showFeedback}
            className={cn(
              "board-cell relative min-h-[120px] transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
              showResult && isCorrect && "border-[var(--color-success)]! bg-green-50 scale-105",
              showResult && !isCorrect && "border-red-400! bg-red-50 scale-95 opacity-60"
            )}
            aria-label={opt.label}
          >
            {opt.image && (
              <span className="text-4xl mb-1" role="img" aria-hidden>
                {opt.image}
              </span>
            )}
            <span className="text-sm font-semibold text-center">{opt.label}</span>

            {showResult && (
              <span
                className={cn(
                  "absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full text-white",
                  isCorrect ? "bg-[var(--color-success)]" : "bg-red-500"
                )}
              >
                {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
