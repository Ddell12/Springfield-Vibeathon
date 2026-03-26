import { isNavActive, NAV_ITEMS } from "../navigation";

describe("NAV_ITEMS", () => {
  it("exports an array with 4 items", () => {
    expect(NAV_ITEMS).toHaveLength(4);
    expect(NAV_ITEMS[0].href).toBe("/dashboard");
    expect(NAV_ITEMS[1].href).toBe("/builder");
  });
});

describe("isNavActive", () => {
  describe("dashboard home branch (/dashboard)", () => {
    it("returns true when on /dashboard with no tab", () => {
      expect(isNavActive("/dashboard", "/dashboard", null)).toBe(true);
    });

    it("returns true when on /dashboard with tab=recent", () => {
      expect(isNavActive("/dashboard", "/dashboard", "recent")).toBe(true);
    });

    it("returns false when on /dashboard with a non-recent tab", () => {
      expect(isNavActive("/dashboard", "/dashboard", "templates")).toBe(false);
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
      expect(isNavActive("/builder", "/dashboard", null)).toBe(false);
    });
  });

  describe("tab-based dashboard routes (/dashboard?tab=...)", () => {
    it("returns true when tab matches the href tab", () => {
      expect(isNavActive("/dashboard?tab=templates", "/dashboard", "templates")).toBe(true);
    });

    it("returns false when tab does not match", () => {
      expect(isNavActive("/dashboard?tab=templates", "/dashboard", "my-projects")).toBe(false);
    });

    it("returns false when pathname is not /dashboard", () => {
      expect(isNavActive("/dashboard?tab=templates", "/builder", "templates")).toBe(false);
    });

    it("handles my-projects tab", () => {
      expect(isNavActive("/dashboard?tab=my-projects", "/dashboard", "my-projects")).toBe(true);
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
