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

  it("both examples use @/ alias imports for shadcn components", () => {
    const examples = getFewShotExamples();
    const importCount = (examples.match(/from "@\/components\/ui\//g) ?? []).length;
    expect(importCount).toBeGreaterThanOrEqual(2);
  });

  it("both examples use @/ alias imports for therapy components", () => {
    const examples = getFewShotExamples();
    const importCount = (examples.match(/from "@\/components\//g) ?? []).length;
    expect(importCount).toBeGreaterThanOrEqual(2);
  });

  it("examples use useLocalStorage for persistence", () => {
    const examples = getFewShotExamples();
    expect(examples).toContain("useLocalStorage");
  });

  it("examples import useLocalStorage from @/hooks/useLocalStorage", () => {
    const examples = getFewShotExamples();
    expect(examples).toContain('from "@/hooks/useLocalStorage"');
  });

  it("examples import cn from @/lib/utils", () => {
    const examples = getFewShotExamples();
    expect(examples).toContain('from "@/lib/utils"');
  });

  it("examples do not use old relative imports from ./ui or ./components", () => {
    const examples = getFewShotExamples();
    expect(examples).not.toContain('from "./ui"');
    expect(examples).not.toContain('from "./components"');
    expect(examples).not.toContain('from "./lib/utils"');
    expect(examples).not.toContain('from "./hooks/useLocalStorage"');
  });

  it("examples use shadcn tokens instead of CSS custom properties", () => {
    const examples = getFewShotExamples();
    expect(examples).not.toContain("var(--color-primary)");
    expect(examples).not.toContain("var(--color-text)");
    expect(examples).not.toContain("var(--color-border)");
  });
});
