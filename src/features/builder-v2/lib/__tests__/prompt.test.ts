import { describe, expect, it } from "vitest";

import { getCodeGenSystemPrompt, getInterviewSystemPrompt } from "../prompt";

describe("getInterviewSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = getInterviewSystemPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("contains therapy-related keywords", () => {
    const prompt = getInterviewSystemPrompt().toLowerCase();
    const therapyKeywords = ["therapy", "therapist", "autism", "aba", "child"];
    const found = therapyKeywords.filter((kw) => prompt.includes(kw));
    expect(found.length).toBeGreaterThan(0);
  });

  it("mentions tool types the system can build", () => {
    const prompt = getInterviewSystemPrompt().toLowerCase();
    // Should mention at least some tool categories
    const toolKeywords = ["visual", "schedule", "board", "communication", "routine"];
    const found = toolKeywords.filter((kw) => prompt.includes(kw));
    expect(found.length).toBeGreaterThan(0);
  });

  it("contains guidance about asking questions or understanding needs", () => {
    const prompt = getInterviewSystemPrompt().toLowerCase();
    const interviewKeywords = ["question", "understand", "describe", "tell", "need", "goal", "help"];
    const found = interviewKeywords.filter((kw) => prompt.includes(kw));
    expect(found.length).toBeGreaterThan(0);
  });
});

describe("getCodeGenSystemPrompt", () => {
  it("returns a non-empty string without context", () => {
    const prompt = getCodeGenSystemPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("contains code generation instructions", () => {
    const prompt = getCodeGenSystemPrompt().toLowerCase();
    const codeKeywords = ["code", "generate", "component", "react", "app", "build"];
    const found = codeKeywords.filter((kw) => prompt.includes(kw));
    expect(found.length).toBeGreaterThan(0);
  });

  it("includes the provided context when given", () => {
    const context = "Build a morning routine app for a 7-year-old with autism";
    const prompt = getCodeGenSystemPrompt(context);
    expect(prompt).toContain(context);
  });

  it("returns a different prompt when context is provided vs not provided", () => {
    const withContext = getCodeGenSystemPrompt("some context about a therapy tool");
    const withoutContext = getCodeGenSystemPrompt();
    expect(withContext).not.toBe(withoutContext);
  });

  it("does not include undefined or null in output when context is omitted", () => {
    const prompt = getCodeGenSystemPrompt();
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("null");
  });

  it("specifies fragment schema requirements (title, description, template, code)", () => {
    const prompt = getCodeGenSystemPrompt().toLowerCase();
    const schemaKeywords = ["title", "description", "template", "code"];
    const found = schemaKeywords.filter((kw) => prompt.includes(kw));
    expect(found.length).toBeGreaterThan(0);
  });
});
