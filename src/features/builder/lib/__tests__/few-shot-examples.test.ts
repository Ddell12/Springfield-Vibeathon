// src/features/builder/lib/__tests__/few-shot-examples.test.ts
import { describe, it, expect } from "vitest";

import { getFewShotExamples } from "../few-shot-examples";

describe("getFewShotExamples", () => {
  it("returns a non-empty string", () => {
    const examples = getFewShotExamples();
    expect(typeof examples).toBe("string");
    expect(examples.length).toBeGreaterThan(100);
  });

  it("contains exactly two <example> blocks", () => {
    const examples = getFewShotExamples();
    const openTags = (examples.match(/<example/g) ?? []).length;
    expect(openTags).toBe(2);
  });

  it("example 1 uses shadcn Card component", () => {
    const examples = getFewShotExamples();
    // Card should appear before the second <example> tag
    const firstExample = examples.split("<example")[1];
    expect(firstExample).toContain("Card");
  });

  it("example 1 uses therapy TokenBoard component", () => {
    const examples = getFewShotExamples();
    const firstExample = examples.split("<example")[1];
    expect(firstExample).toContain("TokenBoard");
  });

  it("example 2 uses shadcn Badge component", () => {
    const examples = getFewShotExamples();
    const parts = examples.split("<example");
    const secondExample = parts[2];
    expect(secondExample).toContain("Badge");
  });

  it("example 2 uses therapy BoardGrid component", () => {
    const examples = getFewShotExamples();
    const parts = examples.split("<example");
    const secondExample = parts[2];
    expect(secondExample).toContain("BoardGrid");
  });

  it("both examples import from ./ui (shadcn)", () => {
    const examples = getFewShotExamples();
    const importCount = (examples.match(/from "\.\/ui"/g) ?? []).length;
    expect(importCount).toBeGreaterThanOrEqual(2);
  });

  it("both examples import from ./components (therapy components)", () => {
    const examples = getFewShotExamples();
    const importCount = (examples.match(/from "\.\/components"/g) ?? []).length;
    expect(importCount).toBeGreaterThanOrEqual(2);
  });

  it("examples use useLocalStorage for persistence", () => {
    const examples = getFewShotExamples();
    expect(examples).toContain("useLocalStorage");
  });
});
