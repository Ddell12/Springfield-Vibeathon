/**
 * Shared progress trail hook for both Classic and Adventure session modes.
 * Returns how many of the current 5-attempt window have been completed.
 * Resets to 0 after each milestone (every 5 correct attempts).
 */
export function useProgressTrail(totalCorrect: number): { filled: number; total: number } {
  return { filled: totalCorrect % 5, total: 5 };
}
