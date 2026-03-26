// src/features/builder/lib/__tests__/review-prompt.test.ts
import { describe, it, expect } from "vitest";

import { DESIGN_REVIEW_PROMPT, buildReviewMessages } from "../review-prompt";

describe("DESIGN_REVIEW_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof DESIGN_REVIEW_PROMPT).toBe("string");
    expect(DESIGN_REVIEW_PROMPT.length).toBeGreaterThan(50);
  });

  it("mentions plain white background as something to avoid", () => {
    expect(DESIGN_REVIEW_PROMPT.toLowerCase()).toMatch(/plain white/);
  });

  it("mentions button styling as a review criterion", () => {
    expect(DESIGN_REVIEW_PROMPT.toLowerCase()).toMatch(/button/);
  });

  it("mentions Card (shadcn component) as a review criterion", () => {
    expect(DESIGN_REVIEW_PROMPT).toMatch(/Card/);
  });

  it("mentions animation as a review criterion", () => {
    expect(DESIGN_REVIEW_PROMPT.toLowerCase()).toMatch(/animation|transition|motion/);
  });

  it("instructs LGTM response for passing code", () => {
    expect(DESIGN_REVIEW_PROMPT).toMatch(/LGTM/);
  });

  it("instructs use of write_file for fixing issues", () => {
    expect(DESIGN_REVIEW_PROMPT).toMatch(/write_file/);
  });
});

describe("buildReviewMessages", () => {
  it("returns an array with a single user message", () => {
    const files = new Map([["src/App.tsx", "export default function App() {}"]]);
    const messages = buildReviewMessages(files);

    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    expect(typeof messages[0].content).toBe("string");
  });

  it("includes all files in XML format with file path attribute", () => {
    const files = new Map([
      ["src/App.tsx", "export default function App() {}"],
      ["src/types.ts", "export interface Task { id: string }"],
    ]);
    const messages = buildReviewMessages(files);
    const content = messages[0].content;

    expect(content).toContain('<file path="src/App.tsx">');
    expect(content).toContain('<file path="src/types.ts">');
    expect(content).toContain("export default function App() {}");
    expect(content).toContain("export interface Task");
  });

  it("handles empty Map without throwing", () => {
    const messages = buildReviewMessages(new Map());

    expect(Array.isArray(messages)).toBe(true);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
  });
});
