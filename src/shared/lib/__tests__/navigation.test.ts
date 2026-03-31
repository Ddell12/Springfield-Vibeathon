import { describe, it, expect } from "vitest";
import { NAV_ITEMS, CAREGIVER_NAV_ITEMS, isNavActive } from "../navigation";

describe("NAV_ITEMS", () => {
  it("contains Builder as first item", () => {
    expect(NAV_ITEMS[0].label).toBe("Builder");
    expect(NAV_ITEMS[0].href).toBe("/builder");
  });
  it("contains Library", () => {
    expect(NAV_ITEMS.some((i) => i.label === "Library")).toBe(true);
  });
  it("does not contain Home, Flashcards, Templates, My Apps, Settings", () => {
    const labels = NAV_ITEMS.map((i) => i.label);
    expect(labels).not.toContain("Home");
    expect(labels).not.toContain("Flashcards");
    expect(labels).not.toContain("Templates");
    expect(labels).not.toContain("My Apps");
    expect(labels).not.toContain("Settings");
  });
  it("has exactly 6 SLP items", () => {
    expect(NAV_ITEMS).toHaveLength(6);
  });
  it("caregiver nav has exactly 2 items", () => {
    expect(CAREGIVER_NAV_ITEMS).toHaveLength(2);
  });
});

describe("isNavActive", () => {
  it("matches /library exactly", () => {
    expect(isNavActive("/library", "/library", null)).toBe(true);
    expect(isNavActive("/library", "/library?tab=my-apps", null)).toBe(false);
  });
  it("matches /builder prefix", () => {
    expect(isNavActive("/builder", "/builder/abc123", null)).toBe(true);
  });
});
