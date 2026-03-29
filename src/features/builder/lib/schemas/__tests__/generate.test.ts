import { GenerateInputSchema } from "../generate";

describe("GenerateInputSchema", () => {
  it("is valid with query only", () => {
    const result = GenerateInputSchema.safeParse({ query: "Build a feelings board" });
    expect(result.success).toBe(true);
  });

  it("is valid with prompt only", () => {
    const result = GenerateInputSchema.safeParse({ prompt: "Build a feelings board" });
    expect(result.success).toBe(true);
  });

  it("is valid with both query and prompt", () => {
    const result = GenerateInputSchema.safeParse({
      query: "Build a feelings board",
      prompt: "Build a feelings board",
    });
    expect(result.success).toBe(true);
  });

  it("is valid with query and sessionId", () => {
    const result = GenerateInputSchema.safeParse({
      query: "Build a schedule",
      sessionId: "sess_abc123",
    });
    expect(result.success).toBe(true);
  });

  it("fails when neither query nor prompt is provided (refine fails)", () => {
    const result = GenerateInputSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Either query or prompt is required");
    }
  });

  it("fails when query is an empty string (min(1) fails)", () => {
    const result = GenerateInputSchema.safeParse({ query: "" });
    expect(result.success).toBe(false);
  });

  it("fails when query exceeds 10,000 characters", () => {
    const result = GenerateInputSchema.safeParse({ query: "a".repeat(10_001) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Prompt too long (max 10,000 characters)"
      );
    }
  });

  it("accepts query exactly at the 10,000 character limit", () => {
    const result = GenerateInputSchema.safeParse({ query: "a".repeat(10_000) });
    expect(result.success).toBe(true);
  });

  describe("patientId field", () => {
    it("accepts a valid patientId string", () => {
      const result = GenerateInputSchema.safeParse({
        prompt: "Build an AAC board",
        patientId: "abc123def456",
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.patientId).toBe("abc123def456");
    });

    it("accepts undefined patientId", () => {
      const result = GenerateInputSchema.safeParse({
        prompt: "Build a card game",
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.patientId).toBeUndefined();
    });

    it("rejects non-string patientId", () => {
      const result = GenerateInputSchema.safeParse({
        prompt: "Build something",
        patientId: 12345,
      });
      expect(result.success).toBe(false);
    });
  });
});
