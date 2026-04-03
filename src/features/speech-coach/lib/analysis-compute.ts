type RawAttempt = {
  targetLabel: string;
  outcome: "correct" | "approximate" | "incorrect" | "no_response";
  retryCount: number;
  timestampMs: number;
};

export type CueDistribution = {
  spontaneous: number;  // % with retryCount = 0
  model: number;        // % with retryCount = 1
  phoneticCue: number;  // % with retryCount = 2
  directCorrection: number; // % with retryCount >= 3
};

/**
 * Compute cue level distribution from raw attempt data.
 * Cue level mapping: 0 = spontaneous, 1 = model, 2 = phonetic cue, 3+ = direct correction.
 * Returns percentages rounded to nearest integer; sums to 100 for non-empty input.
 */
export function computeCueDistribution(attempts: RawAttempt[]): CueDistribution {
  if (attempts.length === 0) {
    return { spontaneous: 0, model: 0, phoneticCue: 0, directCorrection: 0 };
  }
  const counts = { spontaneous: 0, model: 0, phoneticCue: 0, directCorrection: 0 };
  for (const a of attempts) {
    if (a.retryCount === 0) counts.spontaneous++;
    else if (a.retryCount === 1) counts.model++;
    else if (a.retryCount === 2) counts.phoneticCue++;
    else counts.directCorrection++;
  }
  const total = attempts.length;
  return {
    spontaneous: Math.round((counts.spontaneous / total) * 100),
    model: Math.round((counts.model / total) * 100),
    phoneticCue: Math.round((counts.phoneticCue / total) * 100),
    directCorrection: Math.round((counts.directCorrection / total) * 100),
  };
}
