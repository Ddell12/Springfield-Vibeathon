import { describe, expect, it } from "vitest";
import { CATEGORIES, getCategoryById, getEssentialQuestions, getExtendedQuestions } from "../categories";

describe("categories", () => {
  it("has exactly 10 categories", () => {
    expect(CATEGORIES).toHaveLength(10);
  });

  it("every category has required fields", () => {
    for (const cat of CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.icon).toBeTruthy();
      expect(cat.description).toBeTruthy();
      expect(cat.questions.length).toBeGreaterThanOrEqual(2);
      expect(typeof cat.promptTemplate).toBe("function");
    }
  });

  it("every question has label/value options (not bare strings)", () => {
    for (const cat of CATEGORIES) {
      for (const q of cat.questions) {
        if (q.options) {
          for (const opt of q.options) {
            expect(opt).toHaveProperty("label");
            expect(opt).toHaveProperty("value");
          }
        }
      }
    }
  });

  it("getCategoryById returns the correct category", () => {
    const cat = getCategoryById("communication-board");
    expect(cat?.label).toBe("Communication Board");
  });

  it("getCategoryById returns undefined for unknown id", () => {
    expect(getCategoryById("nonexistent")).toBeUndefined();
  });

  it("getEssentialQuestions returns only essential phase questions", () => {
    const essential = getEssentialQuestions("communication-board");
    expect(essential.length).toBeGreaterThanOrEqual(2);
    expect(essential.every((q) => q.phase === "essential")).toBe(true);
  });

  it("getExtendedQuestions returns only extended phase questions", () => {
    const extended = getExtendedQuestions("communication-board");
    expect(extended.length).toBeGreaterThanOrEqual(3);
    expect(extended.every((q) => q.phase === "extended")).toBe(true);
  });

  it("communication-board promptTemplate includes age and word count", () => {
    const cat = getCategoryById("communication-board")!;
    const prompt = cat.promptTemplate({ age_range: "preschool", word_count: "9", word_type: "core" });
    expect(prompt).toContain("preschool");
    expect(prompt).toContain("9");
  });

  it("top 5 categories have correct icons for visual cards", () => {
    const top5 = CATEGORIES.slice(0, 5);
    const expectedIcons = ["forum", "schedule", "star", "menu_book", "favorite"];
    expect(top5.map((c) => c.icon)).toEqual(expectedIcons);
  });
});
