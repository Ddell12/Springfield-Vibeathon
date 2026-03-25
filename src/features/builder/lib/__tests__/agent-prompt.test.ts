// src/features/builder/lib/__tests__/agent-prompt.test.ts
import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "../agent-prompt";

describe("buildSystemPrompt — therapy-domain system prompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildSystemPrompt();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("includes frontend design principles — spacing and animation", () => {
    const prompt = buildSystemPrompt();
    // Must reference design fundamentals for therapy UI
    expect(prompt.toLowerCase()).toMatch(/spacing|padding|margin/);
    expect(prompt.toLowerCase()).toMatch(/animation|transition|motion/);
  });

  it("includes therapy domain context — ABA and speech therapy", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/ABA|applied behavior analysis/i);
    expect(prompt).toMatch(/speech therapy|speech-language/i);
  });

  it("includes 44px tap target requirement for therapy tools", () => {
    const prompt = buildSystemPrompt();
    // Therapy tools must have accessible touch targets (iPad/tablet use)
    expect(prompt).toMatch(/44px|44 px|tap.target/i);
  });

  it("warns against importing non-existent components", () => {
    const prompt = buildSystemPrompt();
    // Must explicitly tell LLM not to import from ./components/*
    expect(prompt).toMatch(/DO NOT EXIST|NEVER import/i);
    expect(prompt).toMatch(/components.*does not exist|NO component directory/i);
  });

  it("includes available CSS design system classes", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/\.tool-container/);
    expect(prompt).toMatch(/\.card-interactive/);
    expect(prompt).toMatch(/\.btn-primary/);
  });

  it("includes write_file tool instruction", () => {
    const prompt = buildSystemPrompt();
    // Agent must know to use write_file tool to output code
    expect(prompt).toMatch(/write_file/);
  });

  it("includes instruction to write to src/App.tsx", () => {
    const prompt = buildSystemPrompt();
    // The streaming builder writes only App.tsx
    expect(prompt).toMatch(/App\.tsx|src\/App/);
  });

  it("includes React and Tailwind context", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/React/);
    expect(prompt).toMatch(/Tailwind/i);
  });
});
