import { describe, expect, it } from "vitest";

import { TEMPLATE_DESIGN_RULES } from "../../component-registry";
import { buildPremiumToolPrompt } from "../premium-prompt";

describe("buildPremiumToolPrompt", () => {
  it("contains the Child & Autism-Friendly Design Rules section", () => {
    const prompt = buildPremiumToolPrompt({
      description: "Build an articulation game for a 5-year-old working on /s/ sounds.",
      childContext: "Age range: 5-7\nInterests: dinosaurs",
      templateName: "Speech Game",
      schemaNotes: "{ /* schema */ }",
    });

    expect(prompt).toContain("## Child & Autism-Friendly Design Rules");
  });

  it("includes the 60px touch target rule", () => {
    const prompt = buildPremiumToolPrompt({
      description: "Token board",
      childContext: "",
      templateName: "Token Board",
      schemaNotes: "Return default config",
    });

    expect(prompt).toContain("60");
  });

  it("includes the no-autoplay-sounds rule", () => {
    const prompt = buildPremiumToolPrompt({
      description: "AAC board",
      childContext: "",
      templateName: "AAC Communication Board",
      schemaNotes: "Return default config",
    });

    expect(prompt).toContain("autoplay sounds");
  });

  it("includes all rules from TEMPLATE_DESIGN_RULES", () => {
    const prompt = buildPremiumToolPrompt({
      description: "test",
      childContext: "",
      templateName: "Test Template",
      schemaNotes: "test",
    });

    for (const rule of TEMPLATE_DESIGN_RULES) {
      expect(prompt, `missing rule: ${rule.rule}`).toContain(rule.rule);
    }
  });

  it("includes the clinician request verbatim", () => {
    const description = "Create a matching game with dinosaur vocabulary for a 7-year-old";
    const prompt = buildPremiumToolPrompt({
      description,
      childContext: "",
      templateName: "Matching Game",
      schemaNotes: "schema",
    });
    expect(prompt).toContain(description);
  });

  it("includes child context when provided", () => {
    const prompt = buildPremiumToolPrompt({
      description: "test",
      childContext: "Age range: 3-5\nInterests: trains",
      templateName: "Visual Schedule",
      schemaNotes: "schema",
    });
    expect(prompt).toContain("trains");
  });
});
