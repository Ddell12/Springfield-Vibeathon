import { describe, expect, it } from "vitest";

import { shouldNormalizePasswordAuthError } from "../passwordAuth";

describe("shouldNormalizePasswordAuthError", () => {
  it("normalizes missing or invalid credential errors during sign-in", () => {
    expect(
      shouldNormalizePasswordAuthError(
        new Error("InvalidAccountId"),
        "sign-in",
      ),
    ).toBe(true);
    expect(
      shouldNormalizePasswordAuthError(new Error("InvalidAountId"), "sign-in"),
    ).toBe(true);
    expect(
      shouldNormalizePasswordAuthError(new Error("InvalidSecret"), "sign-in"),
    ).toBe(true);
    expect(
      shouldNormalizePasswordAuthError(
        new Error("TooManyFailedAttempts"),
        "sign-in",
      ),
    ).toBe(true);
  });

  it("only suppresses missing-account errors for reset requests", () => {
    expect(
      shouldNormalizePasswordAuthError(new Error("InvalidAccountId"), "reset"),
    ).toBe(true);
    expect(
      shouldNormalizePasswordAuthError(new Error("InvalidSecret"), "reset"),
    ).toBe(false);
  });

  it("maps missing-account verification lookups to invalid-code handling", () => {
    expect(
      shouldNormalizePasswordAuthError(
        new Error("InvalidAccountId"),
        "reset-verification",
      ),
    ).toBe(true);
    expect(
      shouldNormalizePasswordAuthError(
        new Error("InvalidAccountId"),
        "email-verification",
      ),
    ).toBe(true);
  });
});
