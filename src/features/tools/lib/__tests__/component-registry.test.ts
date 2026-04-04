import { describe, expect, it } from "vitest";

import {
  COMPONENT_REGISTRY,
  TEMPLATE_DESIGN_RULES,
  registryToPrompt,
} from "../component-registry";

describe("COMPONENT_REGISTRY", () => {
  it("has no duplicate names", () => {
    const names = COMPONENT_REGISTRY.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has no duplicate importPaths", () => {
    const paths = COMPONENT_REGISTRY.map((c) => c.importPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every entry has a non-empty name", () => {
    for (const c of COMPONENT_REGISTRY) {
      expect(c.name.length, `entry has empty name`).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty importPath", () => {
    for (const c of COMPONENT_REGISTRY) {
      expect(c.importPath.length, `${c.name} has empty importPath`).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty therapyUse", () => {
    for (const c of COMPONENT_REGISTRY) {
      expect(c.therapyUse.length, `${c.name} has empty therapyUse`).toBeGreaterThan(0);
    }
  });

  it("all importPaths use the shared/components/ui prefix", () => {
    for (const c of COMPONENT_REGISTRY) {
      expect(c.importPath, `${c.name} wrong prefix`).toMatch(
        /^@\/shared\/components\/ui\//
      );
    }
  });

  it("has at least 40 components", () => {
    expect(COMPONENT_REGISTRY.length).toBeGreaterThanOrEqual(40);
  });
});

describe("TEMPLATE_DESIGN_RULES", () => {
  it("has at least 10 rules", () => {
    expect(TEMPLATE_DESIGN_RULES.length).toBeGreaterThanOrEqual(10);
  });

  it("every rule has a non-empty rule and rationale", () => {
    for (const r of TEMPLATE_DESIGN_RULES) {
      expect(r.rule.length).toBeGreaterThan(0);
      expect(r.rationale.length).toBeGreaterThan(0);
    }
  });
});

describe("registryToPrompt", () => {
  it("contains the Available UI Components section", () => {
    expect(registryToPrompt()).toContain("## Available UI Components");
  });

  it("contains the Child & Autism-Friendly Design Rules section", () => {
    expect(registryToPrompt()).toContain("## Child & Autism-Friendly Design Rules");
  });

  it("contains every component name in the output", () => {
    const prompt = registryToPrompt();
    for (const c of COMPONENT_REGISTRY) {
      expect(prompt, `prompt missing ${c.name}`).toContain(c.name);
    }
  });
});
