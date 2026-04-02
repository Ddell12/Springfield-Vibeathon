import { describe, expect, it } from "vitest";

import { buildPremiumToolPrompt } from "../premium-prompt";

describe("buildPremiumToolPrompt", () => {
  it("tells the builder to infer audience and style child-facing apps differently", () => {
    const prompt = buildPremiumToolPrompt({
      description: "Build an articulation game for a 5-year-old working on /s/ sounds.",
      childContext: "Age range: 5-7\nInterests: dinosaurs, trucks",
      templateName: "Speech Game",
      schemaNotes: "{ /* schema */ }",
    });

    expect(prompt).toContain("Infer the primary audience for the generated app");
    expect(prompt).toContain("child-facing");
    expect(prompt).toContain("Do not make child-facing apps look like Vocali's therapist dashboard");
  });
});
