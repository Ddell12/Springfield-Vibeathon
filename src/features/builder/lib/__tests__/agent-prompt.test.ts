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

  it("documents individual @/ imports for pre-built therapy components", () => {
    const prompt = buildSystemPrompt();
    // Must tell LLM to use individual @/ imports instead of barrel import
    expect(prompt).toMatch(/@\/components\/TokenBoard/);
    expect(prompt).toMatch(/@\/components\/CelebrationOverlay/);
    expect(prompt).toMatch(/@\/components\/VisualSchedule/);
  });

  it("documents shadcn/ui individual imports from @/components/ui/", () => {
    const prompt = buildSystemPrompt();
    // Must tell LLM to use individual shadcn imports
    expect(prompt).toMatch(/@\/components\/ui\/button/);
    expect(prompt).toMatch(/@\/components\/ui\/card/);
  });

  it("documents component props for LLM usage", () => {
    const prompt = buildSystemPrompt();
    // Components should be described with their key props
    expect(prompt).toMatch(/goal/);
    expect(prompt).toMatch(/earned/);
    expect(prompt).toMatch(/onEarn/);
    expect(prompt).toMatch(/steps/);
  });

  it("targets React 18 (not React 19)", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/React 18/);
    expect(prompt).not.toMatch(/React 19/);
  });

  it("targets Tailwind v3 with shadcn HSL theming", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/Tailwind CSS v3/i);
    expect(prompt).toMatch(/shadcn\/ui HSL|shadcn.*HSL|HSL.*shadcn/i);
  });

  it("uses shadcn semantic tokens instead of CSS custom property classes", () => {
    const prompt = buildSystemPrompt();
    // Should use shadcn tokens
    expect(prompt).toMatch(/bg-primary|text-primary|text-foreground|bg-background/);
    expect(prompt).toMatch(/text-muted-foreground/);
    // Should NOT use Tailwind v4-style var() classes for primary/text
    expect(prompt).not.toMatch(/bg-\[var\(--color-primary\)\]/);
    expect(prompt).not.toMatch(/text-\[var\(--color-text\)\]/);
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
    // Multi-file support should be documented
    expect(prompt).toMatch(/multiple files|MULTIPLE/i);
    expect(prompt).toMatch(/types\.ts|data\.ts/);
  });

  it("documents @/ hook imports", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/@\/hooks\/useLocalStorage/);
    expect(prompt).toMatch(/@\/hooks\/useTTS/);
  });

  it("documents @/lib/utils import", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/@\/lib\/utils/);
  });

  it("instructs to never use barrel imports from @/components/ui", () => {
    const prompt = buildSystemPrompt();
    // Should warn against barrel imports
    expect(prompt).toMatch(/NEVER barrel|never barrel|individual.*import|individual shadcn/i);
  });

  it("lists protected pre-built files that must not be overwritten", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/src\/components\/ui\//);
    expect(prompt).toMatch(/src\/lib\/utils\.ts/);
  });

  it("appends patient context block when provided", () => {
    const patientBlock = "## Patient Context\nYou are building for Alex.";
    const prompt = buildSystemPrompt(patientBlock);
    expect(prompt).toContain("## Patient Context");
    expect(prompt).toContain("building for Alex");
    expect(prompt).toMatch(/therapy/i);
  });

  it("returns standard prompt when no patient context provided", () => {
    const withContext = buildSystemPrompt("## Patient Context\nTest");
    const without = buildSystemPrompt();
    expect(without).not.toContain("## Patient Context");
    expect(withContext.length).toBeGreaterThan(without.length);
  });
});
