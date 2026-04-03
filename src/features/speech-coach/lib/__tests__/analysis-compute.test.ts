import { describe, expect, it } from "vitest";

import { computeCueDistribution } from "../analysis-compute";

const ATTEMPTS = [
  { targetLabel: "sun", outcome: "correct" as const, retryCount: 0, timestampMs: 1000 },
  { targetLabel: "sock", outcome: "correct" as const, retryCount: 1, timestampMs: 2000 },
  { targetLabel: "soap", outcome: "approximate" as const, retryCount: 2, timestampMs: 3000 },
  { targetLabel: "sand", outcome: "incorrect" as const, retryCount: 3, timestampMs: 4000 },
  { targetLabel: "seal", outcome: "no_response" as const, retryCount: 3, timestampMs: 5000 },
];

describe("computeCueDistribution", () => {
  it("returns zero percentages for empty attempts", () => {
    const result = computeCueDistribution([]);
    expect(result.spontaneous).toBe(0);
    expect(result.model).toBe(0);
    expect(result.phoneticCue).toBe(0);
    expect(result.directCorrection).toBe(0);
  });

  it("correctly maps retryCount 0 to spontaneous", () => {
    const result = computeCueDistribution(ATTEMPTS);
    // 1 out of 5 attempts had retryCount 0
    expect(result.spontaneous).toBe(20);
  });

  it("correctly maps retryCount 1 to model", () => {
    const result = computeCueDistribution(ATTEMPTS);
    // 1 out of 5 attempts had retryCount 1
    expect(result.model).toBe(20);
  });

  it("correctly maps retryCount 2 to phoneticCue", () => {
    const result = computeCueDistribution(ATTEMPTS);
    // 1 out of 5 attempts had retryCount 2
    expect(result.phoneticCue).toBe(20);
  });

  it("correctly maps retryCount 3+ to directCorrection", () => {
    const result = computeCueDistribution(ATTEMPTS);
    // 2 out of 5 attempts had retryCount >= 3
    expect(result.directCorrection).toBe(40);
  });

  it("percentages sum to 100 for non-empty input", () => {
    const result = computeCueDistribution(ATTEMPTS);
    const total = result.spontaneous + result.model + result.phoneticCue + result.directCorrection;
    expect(total).toBe(100);
  });
});
