import { useEffect, useState } from "react";

/**
 * Returns a CSS className that triggers a celebration animation
 * when `trigger` transitions to true. The animation class is
 * applied for `durationMs` then removed.
 */
export function useAnimation(
  trigger: boolean,
  durationMs: number = 600
): string {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (trigger) {
      setAnimating(true);
      const t = setTimeout(() => setAnimating(false), durationMs);
      return () => clearTimeout(t);
    }
  }, [trigger, durationMs]);

  return animating ? "animate-[bounce-in_400ms_cubic-bezier(0.34,1.56,0.64,1)]" : "";
}
