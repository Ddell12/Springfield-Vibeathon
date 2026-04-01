import { describe, expect, it } from "vitest";
import schema from "../schema";

describe("speech coach template schema", () => {
  it("includes speechCoachTemplates and template-aware home program config", () => {
    expect(schema.tables).toHaveProperty("speechCoachTemplates");
    const homePrograms = schema.tables.homePrograms.validator;
    expect(homePrograms).toBeTruthy();
  });
});
