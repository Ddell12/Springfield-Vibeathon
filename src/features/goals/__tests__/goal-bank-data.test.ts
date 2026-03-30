import { describe, expect, it } from "vitest";
import { GOAL_TEMPLATES, getTemplatesByDomain, fillTemplate } from "../lib/goal-bank-data";

describe("goal-bank-data", () => {
  it("has no duplicate template IDs", () => {
    const ids = GOAL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all templates have required fields", () => {
    for (const t of GOAL_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.domain).toBeTruthy();
      expect(t.shortDescription.length).toBeGreaterThan(0);
      expect(t.shortDescription.length).toBeLessThanOrEqual(200);
      expect(t.fullGoalText).toContain("{accuracy}");
      expect(t.fullGoalText).toContain("{sessions}");
      expect(t.defaultTargetAccuracy).toBeGreaterThanOrEqual(1);
      expect(t.defaultTargetAccuracy).toBeLessThanOrEqual(100);
      expect(t.defaultConsecutiveSessions).toBeGreaterThanOrEqual(1);
      expect(t.defaultConsecutiveSessions).toBeLessThanOrEqual(10);
    }
  });

  it("getTemplatesByDomain filters correctly", () => {
    const artic = getTemplatesByDomain("articulation");
    expect(artic.length).toBeGreaterThan(0);
    expect(artic.every((t) => t.domain === "articulation")).toBe(true);
  });

  it("fillTemplate replaces placeholders", () => {
    const template = GOAL_TEMPLATES[0];
    const filled = fillTemplate(template, 85, 4);
    expect(filled).toContain("85%");
    expect(filled).toContain("4 consecutive");
  });
});
