import { describe, expect, it } from "vitest";

import {
  MODIFIERS,
  getAutoModifiers,
  type Modifier,
} from "../modifiers";

describe("MODIFIERS", () => {
  it("contains GP, 95, and KX", () => {
    const codes = MODIFIERS.map((m) => m.code);
    expect(codes).toContain("GP");
    expect(codes).toContain("95");
    expect(codes).toContain("KX");
  });

  it("every modifier has code, description, and autoApply function", () => {
    for (const m of MODIFIERS) {
      expect(m.code.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
      expect(typeof m.autoApply).toBe("function");
    }
  });
});

describe("getAutoModifiers", () => {
  it("always includes GP for in-person", () => {
    const result = getAutoModifiers("in-person");
    expect(result).toContain("GP");
    expect(result).not.toContain("95");
  });

  it("includes GP and 95 for teletherapy", () => {
    const result = getAutoModifiers("teletherapy");
    expect(result).toContain("GP");
    expect(result).toContain("95");
  });

  it("includes GP for parent-consultation", () => {
    const result = getAutoModifiers("parent-consultation");
    expect(result).toContain("GP");
    expect(result).not.toContain("95");
  });

  it("never auto-includes KX", () => {
    const inPerson = getAutoModifiers("in-person");
    const tele = getAutoModifiers("teletherapy");
    expect(inPerson).not.toContain("KX");
    expect(tele).not.toContain("KX");
  });
});
