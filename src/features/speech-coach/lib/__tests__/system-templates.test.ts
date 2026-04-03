import { describe, expect, it } from "vitest";

import { getSystemTemplate, SYSTEM_TEMPLATES } from "../system-templates";

describe("SYSTEM_TEMPLATES", () => {
  it("has exactly 4 templates", () => {
    expect(SYSTEM_TEMPLATES).toHaveLength(4);
  });

  it("each template has required fields", () => {
    for (const template of SYSTEM_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.skills.length).toBeGreaterThan(0);
      expect(template.sessionDefaults.defaultDurationMinutes).toBeGreaterThan(0);
    }
  });

  it("ids are the four expected keys", () => {
    const ids = SYSTEM_TEMPLATES.map((template) => template.id);
    expect(ids).toContain("sound-drill");
    expect(ids).toContain("conversational");
    expect(ids).toContain("listening-first");
    expect(ids).toContain("mixed-practice");
  });

  it("getSystemTemplate returns the matching template by id", () => {
    const template = getSystemTemplate("sound-drill");
    expect(template?.name).toBe("Sound Drill");
  });

  it("getSystemTemplate returns undefined for unknown id", () => {
    expect(getSystemTemplate("nonexistent")).toBeUndefined();
  });
});
