import { DIAGNOSIS_COLORS, STATUS_COLORS, getInitialsColor } from "../diagnosis-colors";

const EXPECTED_DIAGNOSES = ["articulation", "language", "fluency", "voice", "aac-complex", "other"];
const EXPECTED_STATUSES = ["active", "on-hold", "discharged", "pending-intake"];

describe("DIAGNOSIS_COLORS", () => {
  it("has an entry for every expected diagnosis", () => {
    for (const key of EXPECTED_DIAGNOSES) {
      expect(DIAGNOSIS_COLORS).toHaveProperty(key);
    }
  });

  it("each entry has bg, text, and label properties", () => {
    for (const key of EXPECTED_DIAGNOSES) {
      const entry = DIAGNOSIS_COLORS[key];
      expect(entry).toHaveProperty("bg");
      expect(entry).toHaveProperty("text");
      expect(entry).toHaveProperty("label");
    }
  });

  it("bg values are non-empty strings", () => {
    for (const key of EXPECTED_DIAGNOSES) {
      expect(typeof DIAGNOSIS_COLORS[key].bg).toBe("string");
      expect(DIAGNOSIS_COLORS[key].bg.length).toBeGreaterThan(0);
    }
  });

  it("text values are non-empty strings", () => {
    for (const key of EXPECTED_DIAGNOSES) {
      expect(typeof DIAGNOSIS_COLORS[key].text).toBe("string");
      expect(DIAGNOSIS_COLORS[key].text.length).toBeGreaterThan(0);
    }
  });

  it("label values are human-readable non-empty strings", () => {
    for (const key of EXPECTED_DIAGNOSES) {
      expect(typeof DIAGNOSIS_COLORS[key].label).toBe("string");
      expect(DIAGNOSIS_COLORS[key].label.length).toBeGreaterThan(0);
    }
  });

  it("has no unexpected extra keys beyond the expected set", () => {
    const keys = Object.keys(DIAGNOSIS_COLORS);
    expect(keys.sort()).toEqual([...EXPECTED_DIAGNOSES].sort());
  });
});

describe("STATUS_COLORS", () => {
  it("has an entry for every expected status", () => {
    for (const key of EXPECTED_STATUSES) {
      expect(STATUS_COLORS).toHaveProperty(key);
    }
  });

  it("each entry has bg, text, and label properties", () => {
    for (const key of EXPECTED_STATUSES) {
      const entry = STATUS_COLORS[key];
      expect(entry).toHaveProperty("bg");
      expect(entry).toHaveProperty("text");
      expect(entry).toHaveProperty("label");
    }
  });
});

describe("getInitialsColor", () => {
  it("returns the correct color class for known diagnoses", () => {
    expect(getInitialsColor("articulation")).toBe("bg-emerald-500");
    expect(getInitialsColor("language")).toBe("bg-blue-500");
    expect(getInitialsColor("fluency")).toBe("bg-amber-500");
    expect(getInitialsColor("voice")).toBe("bg-purple-500");
    expect(getInitialsColor("aac-complex")).toBe("bg-rose-500");
    expect(getInitialsColor("other")).toBe("bg-gray-500");
  });

  it("falls back to bg-gray-500 for unknown diagnosis", () => {
    expect(getInitialsColor("unknown-diagnosis")).toBe("bg-gray-500");
    expect(getInitialsColor("")).toBe("bg-gray-500");
  });
});
