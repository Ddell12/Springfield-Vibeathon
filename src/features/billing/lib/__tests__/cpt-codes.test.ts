import { describe, expect, it } from "vitest";

import {
  CPT_CODES,
  type CptCode,
  getCptByCode,
  getDefaultCptCode,
} from "../cpt-codes";

describe("CPT_CODES", () => {
  it("contains exactly 9 SLP-relevant codes", () => {
    expect(CPT_CODES).toHaveLength(9);
  });

  it("every entry has code, description, and defaultPos", () => {
    for (const entry of CPT_CODES) {
      expect(entry.code).toMatch(/^\d{5}$/);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.defaultPos).toMatch(/^\d{2}$/);
    }
  });

  it("includes 92507 (individual treatment)", () => {
    const found = CPT_CODES.find((c) => c.code === "92507");
    expect(found).toBeDefined();
    expect(found!.description).toContain("individual");
  });
});

describe("getCptByCode", () => {
  it("returns matching entry for valid code", () => {
    const result = getCptByCode("92507");
    expect(result).toBeDefined();
    expect(result!.code).toBe("92507");
  });

  it("returns undefined for unknown code", () => {
    expect(getCptByCode("99999")).toBeUndefined();
  });
});

describe("getDefaultCptCode", () => {
  it("returns 92507 as the default", () => {
    expect(getDefaultCptCode()).toBe("92507");
  });
});
