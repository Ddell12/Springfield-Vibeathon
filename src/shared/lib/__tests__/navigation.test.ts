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
});

describe("CAREGIVER_NAV_ITEMS", () => {
  it("has exactly 4 items", () => {
    expect(CAREGIVER_NAV_ITEMS).toHaveLength(4);
  });
  it("first item is Home linking to /family", () => {
    expect(CAREGIVER_NAV_ITEMS[0].label).toBe("Home");
    expect(CAREGIVER_NAV_ITEMS[0].href).toBe("/family");
  });
  it("contains Sessions, Speech Coach, Tools", () => {
    const labels = CAREGIVER_NAV_ITEMS.map((i) => i.label);
    expect(labels).toContain("Sessions");
    expect(labels).toContain("Speech Coach");
    expect(labels).toContain("Tools");
  });
  it("Tools links to /builder", () => {
    const tools = CAREGIVER_NAV_ITEMS.find((i) => i.label === "Tools");
    expect(tools?.href).toBe("/builder");
  });
  it("does not contain Patients or Billing", () => {
    const labels = CAREGIVER_NAV_ITEMS.map((i) => i.label);
    expect(labels).not.toContain("Patients");
    expect(labels).not.toContain("Billing");
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
  it("matches /builder when on /flashcards (Tools active state)", () => {
    expect(isNavActive("/builder", "/flashcards", null)).toBe(true);
    expect(isNavActive("/builder", "/my-tools", null)).toBe(true);
    expect(isNavActive("/builder", "/templates", null)).toBe(true);
  });
  it("matches /patients prefix", () => {
    expect(isNavActive("/patients", "/patients", null)).toBe(true);
    expect(isNavActive("/patients", "/patients/abc", null)).toBe(true);
    expect(isNavActive("/patients", "/sessions", null)).toBe(false);
  });
  it("matches /sessions prefix", () => {
    expect(isNavActive("/sessions", "/sessions", null)).toBe(true);
    expect(isNavActive("/sessions", "/sessions/abc/call", null)).toBe(true);
  });
  it("matches /billing prefix", () => {
    expect(isNavActive("/billing", "/billing", null)).toBe(true);
    expect(isNavActive("/billing", "/billing/upgrade", null)).toBe(true);
  });
  it("matches /speech-coach prefix", () => {
    expect(isNavActive("/speech-coach", "/speech-coach", null)).toBe(true);
    expect(isNavActive("/speech-coach", "/speech-coach/session", null)).toBe(true);
  });
  it("matches /family prefix", () => {
    expect(isNavActive("/family", "/family", null)).toBe(true);
    expect(isNavActive("/family", "/family/child/123", null)).toBe(true);
  });
  it("fallback: matches href exactly", () => {
    expect(isNavActive("/settings", "/settings", null)).toBe(true);
    expect(isNavActive("/settings", "/settings/profile", null)).toBe(false);
  });
});
