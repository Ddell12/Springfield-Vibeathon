import { describe, expect,it } from "vitest";

import { CAREGIVER_NAV_ITEMS, isNavActive,NAV_ITEMS } from "../navigation";

describe("NAV_ITEMS", () => {
  it("contains Builder as first item", () => {
    expect(NAV_ITEMS[0].label).toBe("Builder");
    expect(NAV_ITEMS[0].href).toBe("/builder");
  });
  it("does not expose Billing in the primary SLP nav", () => {
    expect(NAV_ITEMS.map((item) => item.label)).not.toContain("Billing");
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
  it("has exactly 5 SLP items", () => {
    expect(NAV_ITEMS).toHaveLength(5);
  });
});

describe("CAREGIVER_NAV_ITEMS", () => {
  it("has exactly 5 items", () => {
    expect(CAREGIVER_NAV_ITEMS).toHaveLength(5);
  });
  it("first item is Home linking to /family", () => {
    expect(CAREGIVER_NAV_ITEMS[0].label).toBe("Home");
    expect(CAREGIVER_NAV_ITEMS[0].href).toBe("/family");
  });
  it("contains Sessions, Speech Coach, Tools, and Settings", () => {
    const labels = CAREGIVER_NAV_ITEMS.map((i) => i.label);
    expect(labels).toContain("Sessions");
    expect(labels).toContain("Speech Coach");
    expect(labels).toContain("Tools");
    expect(labels).toContain("Settings");
  });
  it("Tools links to /family (caregiver sees family dashboard, not SLP builder)", () => {
    const tools = CAREGIVER_NAV_ITEMS.find((i) => i.label === "Tools");
    expect(tools?.href).toBe("/family");
  });
  it("does not contain Patients or Billing", () => {
    const labels = CAREGIVER_NAV_ITEMS.map((i) => i.label);
    expect(labels).not.toContain("Patients");
    expect(labels).not.toContain("Billing");
  });
});

describe("isNavActive", () => {
  it("matches /library exactly, not sub-paths", () => {
    expect(isNavActive("/library", "/library")).toBe(true);
    expect(isNavActive("/library", "/library/featured")).toBe(false);
    expect(isNavActive("/library", "/libraries")).toBe(false);
  });
  it("matches /builder prefix", () => {
    expect(isNavActive("/builder", "/builder/abc123")).toBe(true);
  });
  it("matches /builder when on /flashcards (Tools active state)", () => {
    expect(isNavActive("/builder", "/flashcards")).toBe(true);
    expect(isNavActive("/builder", "/my-tools")).toBe(true);
    expect(isNavActive("/builder", "/templates")).toBe(true);
  });
  it("matches /patients prefix", () => {
    expect(isNavActive("/patients", "/patients")).toBe(true);
    expect(isNavActive("/patients", "/patients/abc")).toBe(true);
    expect(isNavActive("/patients", "/sessions")).toBe(false);
  });
  it("matches /sessions prefix", () => {
    expect(isNavActive("/sessions", "/sessions")).toBe(true);
    expect(isNavActive("/sessions", "/sessions/abc/call")).toBe(true);
  });
  it("matches /billing prefix", () => {
    expect(isNavActive("/billing", "/billing")).toBe(true);
    expect(isNavActive("/billing", "/billing/upgrade")).toBe(true);
  });
  it("matches /speech-coach prefix", () => {
    expect(isNavActive("/speech-coach", "/speech-coach")).toBe(true);
    expect(isNavActive("/speech-coach", "/speech-coach/session")).toBe(true);
  });
  it("matches /family prefix", () => {
    expect(isNavActive("/family", "/family")).toBe(true);
    expect(isNavActive("/family", "/family/child/123")).toBe(true);
  });
  it("fallback: matches href exactly", () => {
    expect(isNavActive("/settings", "/settings")).toBe(true);
    expect(isNavActive("/settings", "/settings/profile")).toBe(false);
  });
});
