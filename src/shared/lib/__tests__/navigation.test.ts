import { isNavActive, NAV_ITEMS } from "../navigation";

describe("NAV_ITEMS", () => {
  it("exports an array with 10 items in order", () => {
    expect(NAV_ITEMS).toHaveLength(10);
    expect(NAV_ITEMS[0].href).toBe("/dashboard");
    expect(NAV_ITEMS[1].href).toBe("/patients");
    expect(NAV_ITEMS[2].href).toBe("/sessions");
    expect(NAV_ITEMS[3].href).toBe("/billing");
    expect(NAV_ITEMS[4].href).toBe("/builder");
    expect(NAV_ITEMS[5].href).toBe("/flashcards");
    expect(NAV_ITEMS[6].href).toBe("/speech-coach");
    expect(NAV_ITEMS[7].href).toBe("/templates");
    expect(NAV_ITEMS[8].href).toBe("/my-tools");
    expect(NAV_ITEMS[9].href).toBe("/settings");
  });
});

describe("isNavActive", () => {
  describe("home branch (/dashboard)", () => {
    it("returns true when on /dashboard", () => {
      expect(isNavActive("/dashboard", "/dashboard", null)).toBe(true);
    });

    it("returns false when pathname is not /dashboard", () => {
      expect(isNavActive("/dashboard", "/builder", null)).toBe(false);
    });
  });

  describe("builder branch (/builder)", () => {
    it("returns true for exact /builder path", () => {
      expect(isNavActive("/builder", "/builder", null)).toBe(true);
    });

    it("returns true for nested builder paths", () => {
      expect(isNavActive("/builder", "/builder/session-123", null)).toBe(true);
    });

    it("returns false when pathname does not start with /builder", () => {
      expect(isNavActive("/builder", "/", null)).toBe(false);
    });
  });

  describe("flashcards branch (/flashcards)", () => {
    it("returns true for exact /flashcards path", () => {
      expect(isNavActive("/flashcards", "/flashcards", null)).toBe(true);
    });

    it("returns false when pathname is not /flashcards", () => {
      expect(isNavActive("/flashcards", "/builder", null)).toBe(false);
    });
  });

  describe("standalone routes (/templates, /my-tools)", () => {
    it("returns true for exact /templates match", () => {
      expect(isNavActive("/templates", "/templates", null)).toBe(true);
    });

    it("returns false for /templates when on /builder", () => {
      expect(isNavActive("/templates", "/builder", null)).toBe(false);
    });

    it("returns true for exact /my-tools match", () => {
      expect(isNavActive("/my-tools", "/my-tools", null)).toBe(true);
    });

    it("returns false for /my-tools when on /templates", () => {
      expect(isNavActive("/my-tools", "/templates", null)).toBe(false);
    });
  });

  describe("family branch (/family)", () => {
    it("returns true for /family path", () => {
      expect(isNavActive("/family", "/family", null)).toBe(true);
    });

    it("returns true for nested family paths", () => {
      expect(isNavActive("/family", "/family/abc123", null)).toBe(true);
    });

    it("returns false when pathname is not /family", () => {
      expect(isNavActive("/family", "/patients", null)).toBe(false);
    });
  });

  describe("fallback exact match", () => {
    it("returns true for exact pathname match on any other href", () => {
      expect(isNavActive("/settings", "/settings", null)).toBe(true);
    });

    it("returns false when pathname differs", () => {
      expect(isNavActive("/settings", "/profile", null)).toBe(false);
    });
  });
});
