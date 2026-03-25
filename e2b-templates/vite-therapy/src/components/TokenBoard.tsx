import { Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

interface TokenBoardProps {
  goal: number;
  earned: number;
  onEarn: () => void;
  icon?: string;
}

export function TokenBoard({
  goal,
  earned,
  onEarn,
  icon,
}: TokenBoardProps) {
  const [justEarned, setJustEarned] = useState(-1);
  const prevEarned = useRef(earned);

  useEffect(() => {
    if (earned > prevEarned.current) {
      setJustEarned(earned - 1);
      const t = setTimeout(() => setJustEarned(-1), 600);
      prevEarned.current = earned;
      return () => clearTimeout(t);
    }
    prevEarned.current = earned;
  }, [earned]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3">
        {Array.from({ length: goal }, (_, i) => {
          const isEarned = i < earned;
          const isNext = i === earned;
          const isAnimating = i === justEarned;

          return (
            <button
              key={i}
              onClick={isNext ? onEarn : undefined}
              disabled={!isNext}
              aria-label={
                isEarned
                  ? `Star ${i + 1} earned`
                  : isNext
                    ? `Tap to earn star ${i + 1}`
                    : `Star ${i + 1} locked`
              }
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                isEarned
                  ? "bg-[var(--color-celebration)] shadow-[0_0_16px_rgba(255,215,0,0.5)] scale-100"
                  : "bg-[var(--color-border)]",
                isNext && !isEarned && "ring-2 ring-[var(--color-primary)] ring-offset-2 cursor-pointer hover:scale-110 active:scale-95",
                !isNext && !isEarned && "opacity-50",
                isAnimating && "animate-[bounce-in_400ms_cubic-bezier(0.34,1.56,0.64,1)]"
              )}
            >
              {icon ? (
                <span className="text-2xl">{isEarned ? icon : "☆"}</span>
              ) : isEarned ? (
                <Star className="h-7 w-7 fill-amber-800 text-amber-800" />
              ) : (
                <Star className="h-7 w-7 text-gray-400" />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-sm font-medium text-[var(--color-text-muted)]">
        {earned} / {goal} stars
      </p>

      {earned >= goal && (
        <div className="text-5xl animate-bounce" role="img" aria-label="Celebration!">
          🎉
        </div>
      )}
    </div>
  );
}
