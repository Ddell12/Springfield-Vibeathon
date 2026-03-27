import { describe, expect, it } from "vitest";

import { TherapyBlueprintSchema } from "../../schemas";
import { assembleBlueprint } from "../blueprint-assembler";

describe("assembleBlueprint", () => {
  const baseAnswers = {
    age_range: "preschool",
    word_count: "9",
    word_type: "core",
    interaction_style: "tap",
    reinforcement: "tokens",
    accessibility: ["none"],
    color_preference: "cool",
  };

  it("produces a valid TherapyBlueprint from category defaults + answers", () => {
    const result = assembleBlueprint("communication-board", baseAnswers, null);
    const parsed = TherapyBlueprintSchema.safeParse(result.blueprint);
    expect(parsed.success).toBe(true);
  });

  it("maps age_range answer to blueprint ageRange field", () => {
    const result = assembleBlueprint("communication-board", baseAnswers, null);
    expect(result.blueprint.ageRange).toBe("preschool");
  });

  it("maps interaction_style answer to blueprint interactionModel", () => {
    const result = assembleBlueprint("communication-board", baseAnswers, null);
    expect(result.blueprint.interactionModel).toBe("tap");
  });

  it("maps reinforcement answer to reinforcementStrategy.type", () => {
    const result = assembleBlueprint("communication-board", baseAnswers, null);
    expect(result.blueprint.reinforcementStrategy.type).toBe("tokens");
  });

  it("produces a non-empty richPrompt string", () => {
    const result = assembleBlueprint("communication-board", baseAnswers, null);
    expect(result.richPrompt.length).toBeGreaterThan(50);
    expect(result.richPrompt).toContain("preschool");
  });

  it("LLM draft blueprint fields override category defaults", () => {
    const llmDraft = { therapyGoal: "LLM-generated goal", detailedDescription: "LLM detailed desc" };
    const result = assembleBlueprint("communication-board", baseAnswers, llmDraft);
    expect(result.blueprint.therapyGoal).toBe("LLM-generated goal");
  });

  it("user answers take precedence over LLM draft for mapped fields", () => {
    const llmDraft = { ageRange: "adult" };
    const result = assembleBlueprint("communication-board", baseAnswers, llmDraft);
    expect(result.blueprint.ageRange).toBe("preschool");
  });

  it("works for token-board category", () => {
    const tokenAnswers = {
      age_range: "school-age",
      token_count: "5",
      reward_type: "child-choice",
      interaction_style: "tap",
      reinforcement: "tokens",
      accessibility: ["none"],
      color_preference: "warm",
    };
    const result = assembleBlueprint("token-board", tokenAnswers, null);
    const parsed = TherapyBlueprintSchema.safeParse(result.blueprint);
    expect(parsed.success).toBe(true);
    expect(result.blueprint.ageRange).toBe("school-age");
  });
});
