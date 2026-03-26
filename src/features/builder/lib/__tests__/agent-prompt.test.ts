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

  it("documents barrel import for pre-built components", () => {
    const prompt = buildSystemPrompt();
    // Must tell LLM to use barrel import from ./components
    expect(prompt).toMatch(/from "\.\/components"/);
    expect(prompt).toMatch(/TokenBoard/);
    expect(prompt).toMatch(/CelebrationOverlay/);
    expect(prompt).toMatch(/VisualSchedule/);
  });

  it("documents component props for LLM usage", () => {
    const prompt = buildSystemPrompt();
    // Components should be described with their key props
    expect(prompt).toMatch(/goal/);
    expect(prompt).toMatch(/earned/);
    expect(prompt).toMatch(/onEarn/);
    expect(prompt).toMatch(/steps/);
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
    // The builder always writes App.tsx as entry point
    expect(prompt).toMatch(/App\.tsx|src\/App/);
  });

  it("includes React and Tailwind context", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/React/);
    expect(prompt).toMatch(/Tailwind/i);
  });

  it("supports multi-file generation", () => {
    const prompt = buildSystemPrompt();
    // Multi-file support should be documented (structure guidance)
    expect(prompt).toMatch(/multiple files|MULTIPLE|multi.file|src\/types\.ts|src\/data\.ts/i);
  });

  it("documents 4 tools including read_file and list_files", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/write_file/);
    expect(prompt).toMatch(/read_file/);
    expect(prompt).toMatch(/list_files/);
    expect(prompt).toMatch(/set_app_name/);
  });

  it("includes shadcn component reference from ./ui", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/from "\.\/ui"/);
  });

  it("includes layout templates section", () => {
    const prompt = buildSystemPrompt();
    expect(prompt.toLowerCase()).toMatch(/layout template|layout pattern/);
  });

  it("includes spacing scale guidance", () => {
    const prompt = buildSystemPrompt();
    // Should reference the Tailwind spacing scale tokens used in therapy UI
    expect(prompt).toMatch(/p-4|p-6|gap-4|gap-6/);
  });

  it("includes color budget rule", () => {
    const prompt = buildSystemPrompt();
    // Color budget = constrain palette to a small set of intentional colors
    expect(prompt.toLowerCase()).toMatch(/color budget|color palette|2.3 colors|two.three colors/);
  });

  it("includes strengthened anti-patterns with INSTEAD", () => {
    const prompt = buildSystemPrompt();
    // Anti-patterns should include an INSTEAD alternative to guide the LLM
    expect(prompt).toMatch(/INSTEAD/);
  });

  it("includes composition recipes", () => {
    const prompt = buildSystemPrompt();
    // Composition recipe = concrete pattern showing how to combine shadcn + therapy components
    expect(prompt.toLowerCase()).toMatch(/composition recipe|recipe|combine/);
  });

  it("lists radix-ui as pre-installed", () => {
    const prompt = buildSystemPrompt();
    expect(prompt.toLowerCase()).toMatch(/radix/);
  });

  it("includes few-shot examples marked with <example tag", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/<example/);
  });
});
