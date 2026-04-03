import { describe, expect, it } from "vitest";

import { ageRangeFromAge } from "../config";

describe("ageRangeFromAge", () => {
  it("maps ages 2-4 to '2-4'", () => {
    expect(ageRangeFromAge(2)).toBe("2-4");
    expect(ageRangeFromAge(4)).toBe("2-4");
  });

  it("maps ages 5 and above to '5-7'", () => {
    expect(ageRangeFromAge(5)).toBe("5-7");
    expect(ageRangeFromAge(10)).toBe("5-7");
    expect(ageRangeFromAge(12)).toBe("5-7");
  });
});
