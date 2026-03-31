import { describe, expect, it } from "vitest";

import {
  accuracyColor,
  accuracyLabel,
  calculateAccuracy,
  formatDuration,
  getSignatureDelayDays,
  isLateSignature,
} from "../lib/session-utils";

describe("formatDuration", () => {
  it("returns minutes for values under 60", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(1)).toBe("1 min");
    expect(formatDuration(59)).toBe("59 min");
  });

  it("returns hours only for exact multiples of 60", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(120)).toBe("2h");
  });

  it("returns hours and minutes for mixed values", () => {
    expect(formatDuration(90)).toBe("1h 30min");
    expect(formatDuration(75)).toBe("1h 15min");
    expect(formatDuration(150)).toBe("2h 30min");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0 min");
  });
});

describe("calculateAccuracy", () => {
  it("calculates percentage correctly", () => {
    expect(calculateAccuracy(8, 10)).toBe(80);
    expect(calculateAccuracy(3, 4)).toBe(75);
    expect(calculateAccuracy(10, 10)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(calculateAccuracy(1, 3)).toBe(33);
    expect(calculateAccuracy(2, 3)).toBe(67);
  });

  it("returns null for zero trials", () => {
    expect(calculateAccuracy(0, 0)).toBeNull();
  });

  it("returns null for undefined trials", () => {
    expect(calculateAccuracy(5, undefined)).toBeNull();
    expect(calculateAccuracy(undefined, undefined)).toBeNull();
  });

  it("returns null for undefined correct", () => {
    expect(calculateAccuracy(undefined, 10)).toBeNull();
  });

  it("handles zero correct with nonzero trials", () => {
    expect(calculateAccuracy(0, 10)).toBe(0);
  });
});

describe("accuracyColor", () => {
  it("returns success token for 80 and above", () => {
    expect(accuracyColor(80)).toBe("text-success");
    expect(accuracyColor(100)).toBe("text-success");
    expect(accuracyColor(95)).toBe("text-success");
  });

  it("returns caution token for 60-79", () => {
    expect(accuracyColor(60)).toBe("text-caution");
    expect(accuracyColor(79)).toBe("text-caution");
    expect(accuracyColor(70)).toBe("text-caution");
  });

  it("returns error token for below 60", () => {
    expect(accuracyColor(59)).toBe("text-error");
    expect(accuracyColor(0)).toBe("text-error");
    expect(accuracyColor(30)).toBe("text-error");
  });

  it("returns muted for null", () => {
    expect(accuracyColor(null)).toBe("text-muted-foreground");
  });
});

describe("accuracyLabel", () => {
  it("returns percentage with check mark for 80+", () => {
    expect(accuracyLabel(80)).toBe("80% \u2713");
    expect(accuracyLabel(100)).toBe("100% \u2713");
  });

  it("returns plain percentage for below 80", () => {
    expect(accuracyLabel(79)).toBe("79%");
    expect(accuracyLabel(50)).toBe("50%");
    expect(accuracyLabel(0)).toBe("0%");
  });

  it("returns em dash for null", () => {
    expect(accuracyLabel(null)).toBe("\u2014");
  });
});

describe("isLateSignature", () => {
  it("returns false when signedAt is on same day as sessionDate", () => {
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-28T12:00:00Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(false);
  });

  it("returns false when signedAt is within 24h of end of sessionDate", () => {
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-29T22:59:00Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(false);
  });

  it("returns true when signedAt is >24h after end of sessionDate", () => {
    const sessionDate = "2026-03-25";
    const signedAt = new Date("2026-03-28T12:00:00Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(true);
  });

  it("returns false when signedAt is exactly at the 24h boundary (not more than)", () => {
    const sessionDate = "2026-03-28";
    // Exactly 48h after start of day = exactly 24h after end of day (midnight next next day)
    // Start of 2026-03-28 = T00:00:00Z, +48h = 2026-03-30T00:00:00Z
    // That is exactly 24h after end of session day, NOT more than 24h
    const signedAt = new Date("2026-03-30T00:00:00Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(false);
  });

  it("returns true when signedAt is 1ms past the 24h boundary", () => {
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-30T00:00:00.001Z").getTime();
    expect(isLateSignature(signedAt, sessionDate)).toBe(true);
  });

  it("returns false when signedAt is undefined", () => {
    expect(isLateSignature(undefined, "2026-03-28")).toBe(false);
  });

  it("returns false when sessionDate is empty", () => {
    expect(isLateSignature(Date.now(), "")).toBe(false);
  });
});

describe("getSignatureDelayDays", () => {
  it("returns 0 for same-day signature", () => {
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-28T18:00:00Z").getTime();
    expect(getSignatureDelayDays(signedAt, sessionDate)).toBe(0);
  });

  it("returns 3 for signature 3 days late", () => {
    const sessionDate = "2026-03-25";
    const signedAt = new Date("2026-03-28T12:00:00Z").getTime();
    expect(getSignatureDelayDays(signedAt, sessionDate)).toBe(3);
  });

  it("returns null when signedAt is undefined", () => {
    expect(getSignatureDelayDays(undefined, "2026-03-28")).toBeNull();
  });

  it("returns 0 when sessionDate is empty string", () => {
    expect(getSignatureDelayDays(Date.now(), "")).toBeNull();
  });

  it("returns 0 when signedAt is before session date (clamped)", () => {
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-27T12:00:00Z").getTime();
    expect(getSignatureDelayDays(signedAt, sessionDate)).toBe(0);
  });

  it("returns 1 for signature the following calendar day", () => {
    const sessionDate = "2026-03-28";
    const signedAt = new Date("2026-03-29T06:00:00Z").getTime();
    expect(getSignatureDelayDays(signedAt, sessionDate)).toBe(1);
  });
});
