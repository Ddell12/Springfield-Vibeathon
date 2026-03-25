import { useCallback, useRef } from "react";

/**
 * Audio playback hook with iOS Safari autoplay handling.
 * On iOS, audio can only play after a user gesture, so we
 * create the Audio element lazily on first play().
 */
export function useSound(src?: string): { play: () => void } {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!src) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(src);
    }

    // Reset to start if already playing
    audioRef.current.currentTime = 0;

    // Play with catch for autoplay restrictions
    audioRef.current.play().catch(() => {
      // Autoplay blocked — silently ignore (common on iOS first interaction)
    });
  }, [src]);

  return { play };
}
